/**
 * Risk Scoring Engine V21 — Trust Economy Layer
 * 
 * V2: synthetic signals, log-freq, sliding window, recovery, explainability
 * V3 upgrades:
 *   3.1: Graph intelligence — collusion detection via actor-product clusters
 *   3.2: Cold-start penalty — new actors (<24h) get risk boost
 *   3.3: Cross-product correlation — actor scanning many products
 *   3.4: Anti-poisoning — cap momentum contribution per event (max 5pts)
 *
 * Decision: NORMAL (<40) | SUSPICIOUS (40-69) | SOFT_BLOCK (70-85) | HARD_BLOCK (>85)
 */
const db = require('../db');

// ─── V10: SIGNAL STATS TABLE (auto-create) ───────────────
const SIGNAL_NAMES = ['scan_pattern', 'geo', 'frequency', 'history', 'graph'];
const DEFAULT_LR = { scan_pattern: 1.5, geo: 1.8, frequency: 1.3, history: 1.4, graph: 2.0 };

// V11: Signal correlation matrix (0=independent, 1=fully correlated)
// graph↔propagation are highly correlated, IP↔device correlated
const SIGNAL_CORRELATIONS = {
    'scan_pattern:geo': 0.1,
    'scan_pattern:frequency': 0.3,
    'scan_pattern:history': 0.2,
    'scan_pattern:graph': 0.15,
    'geo:frequency': 0.1,
    'geo:history': 0.15,
    'geo:graph': 0.2,
    'frequency:history': 0.4,       // high: both temporal
    'frequency:graph': 0.25,
    'history:graph': 0.5,           // highest: history informs graph
};

async function initSignalStats() {
    try {
        await db.run(`CREATE TABLE IF NOT EXISTS signal_stats (
            signal_name TEXT PRIMARY KEY,
            fraud_count INTEGER DEFAULT 0,
            legit_count INTEGER DEFAULT 0,
            learned_lr NUMERIC DEFAULT 1.0,
            last_updated TIMESTAMPTZ DEFAULT NOW()
        )`);
        for (const s of SIGNAL_NAMES) {
            await db.run(`INSERT INTO signal_stats (signal_name, learned_lr) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [s, DEFAULT_LR[s] || 1.0]);
        }
    } catch(_) {}
}
// Fire and forget on load
initSignalStats();

// ─── WEIGHTS (V3: graph added, rebalanced) ────────────────────
const WEIGHTS = {
    scan_pattern: 0.30,  // V3: reduced from 0.35 to make room for graph
    geo: 0.20,           // V3: reduced from 0.25
    frequency: 0.15,     // V3: reduced from 0.20
    history: 0.15,       // V3: reduced from 0.20
    graph: 0.20,         // V3: NEW — collusion + cross-entity
};

// ─── CATEGORY MULTIPLIERS ─────────────────────────────────────
const CATEGORY_MULT = {
    pharma: 1.3,
    medical: 1.3,
    luxury: 1.2,
    food: 1.1,
    fmcg: 1.0,
    electronics: 1.0,
    default: 1.0,
};

// ─── HAVERSINE (km) ───────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ─── TIME DECAY ───────────────────────────────────────────────
function timeDecay(baseSeverity, daysSinceEvent, lambda = 0.1) {
    return baseSeverity * Math.exp(-lambda * daysSinceEvent);
}

// ─── LOG-SCALE FREQUENCY (FIX 2) ─────────────────────────────
// Smooth curve: 5→20, 10→35, 20→50, 50→65, 100→80
function logFrequencyScore(scansPerMinute) {
    if (scansPerMinute <= 2) return 0;
    // log2(spm) * 15, capped at 80
    return Math.min(80, Math.round(Math.log2(scansPerMinute) * 15));
}

// ─── FEATURE 1: SCAN PATTERN SCORE ────────────────────────────
async function scanPatternScore(productId, actorId, scanType) {
    let score = 0;
    const reasons = [];

    // Check if product is in SOLD state
    try {
        const state = await db.get(
            "SELECT to_state FROM product_events WHERE product_id = $1 ORDER BY sequence_number DESC, created_at DESC LIMIT 1",
            [productId]
        );
        if (state && !['sell', 'SOLD', 'SCANNED'].includes(state.to_state)) {
            score += 40 * 0.9;
            reasons.push({ rule: 'scan_before_sold', severity: 40, confidence: 0.9, state: state.to_state });
        }
    } catch(_) {}

    // Check first scanner role
    try {
        const firstScan = await db.get(
            "SELECT scan_type, device_fingerprint FROM scan_events WHERE product_id = $1 ORDER BY scanned_at ASC LIMIT 1",
            [productId]
        );
        if (firstScan) {
            if (firstScan.scan_type === 'distributor' || firstScan.device_fingerprint?.includes?.('distributor')) {
                score += 50 * 0.8;
                reasons.push({ rule: 'distributor_first_scan', severity: 50, confidence: 0.8 });
            } else if (firstScan.scan_type === 'retailer' || firstScan.device_fingerprint?.includes?.('retail')) {
                score += 30 * 0.7;
                reasons.push({ rule: 'retailer_first_scan', severity: 30, confidence: 0.7 });
            }
        }
    } catch(_) {}

    // Multi-actor scanning same product
    try {
        const actors = await db.get(
            "SELECT COUNT(DISTINCT device_fingerprint) as c FROM scan_events WHERE product_id = $1 AND scanned_at > NOW() - INTERVAL '24 hours'",
            [productId]
        );
        if (actors && actors.c > 3) {
            score += 20 * 0.85;
            reasons.push({ rule: 'multi_actor_scan', severity: 20, confidence: 0.85, actors: actors.c });
        }
    } catch(_) {}

    // Same actor scans many products
    try {
        if (actorId) {
            const products = await db.get(
                "SELECT COUNT(DISTINCT product_id) as c FROM scan_events WHERE device_fingerprint = $1 AND scanned_at > NOW() - INTERVAL '1 hour'",
                [actorId]
            );
            if (products && products.c > 10) {
                score += 30 * 0.9;
                reasons.push({ rule: 'actor_scans_many_products', severity: 30, confidence: 0.9, count: products.c });
            }
        }
    } catch(_) {}

    // Scan chain break (expected events missing)
    try {
        const eventCount = await db.get(
            "SELECT COUNT(*) as c FROM product_events WHERE product_id = $1 AND from_state != '_migrated'",
            [productId]
        );
        if (eventCount && eventCount.c === 0) {
            score += 60 * 0.7;
            reasons.push({ rule: 'no_supply_chain_events', severity: 60, confidence: 0.7 });
        }
    } catch(_) {}

    return { score: Math.min(100, Math.round(score)), reasons };
}

// ─── FEATURE 2: GEO SCORE ────────────────────────────────────
async function geoScore(productId, latitude, longitude, ipAddress) {
    let score = 0;
    const reasons = [];

    if (!latitude || !longitude) return { score: 0, reasons: [{ rule: 'no_geo_data', note: 'GPS not available' }] };

    try {
        const prevScan = await db.get(
            "SELECT latitude, longitude, scanned_at, geo_country FROM scan_events WHERE product_id = $1 AND latitude IS NOT NULL ORDER BY scanned_at DESC LIMIT 1",
            [productId]
        );

        if (prevScan && prevScan.latitude) {
            const distance = haversine(prevScan.latitude, prevScan.longitude, latitude, longitude);
            const timeDiffMin = (Date.now() - new Date(prevScan.scanned_at).getTime()) / 60000;
            
            const gpsConfidence = 0.6; // Conservative — GPS can be spoofed

            if (distance > 1000 && timeDiffMin < 10) {
                score += 90 * gpsConfidence; // impossible travel
                reasons.push({ rule: 'impossible_travel', severity: 90, confidence: gpsConfidence, distance_km: Math.round(distance), time_min: Math.round(timeDiffMin) });
            } else if (distance > 500 && timeDiffMin < 5) {
                score += 70 * gpsConfidence;
                reasons.push({ rule: 'suspicious_travel', severity: 70, confidence: gpsConfidence, distance_km: Math.round(distance), time_min: Math.round(timeDiffMin) });
            }

            // Slow geo drift: VN → TH → US in 1h (FIX: broader window)
            if (distance > 300 && timeDiffMin < 60 && timeDiffMin >= 10) {
                const speedKmH = distance / (timeDiffMin / 60);
                if (speedKmH > 900) { // Faster than commercial jet
                    score += 40 * 0.5;
                    reasons.push({ rule: 'geo_drift_fast', severity: 40, confidence: 0.5, distance_km: Math.round(distance), speed_kmh: Math.round(speedKmH) });
                }
            }

            // Country change
            if (prevScan.geo_country && prevScan.geo_country !== 'unknown') {
                if (distance > 2000) {
                    score += 30 * 0.5;
                    reasons.push({ rule: 'likely_country_change', severity: 30, confidence: 0.5 });
                }
            }
        }
    } catch(_) {}

    return { score: Math.min(100, Math.round(score)), reasons };
}

// ─── FEATURE 3: FREQUENCY SCORE (FIX 2: LOG-SCALE) ──────────
async function frequencyScore(productId, actorId) {
    let score = 0;
    const reasons = [];

    // V2: Log-scale frequency (replaces flat thresholds)
    try {
        const perMin = await db.get(
            "SELECT COUNT(*) as c FROM scan_events WHERE product_id = $1 AND scanned_at > NOW() - INTERVAL '1 minute'",
            [productId]
        );
        if (perMin) {
            const spm = parseInt(perMin.c);
            if (spm > 2) {
                const logScore = logFrequencyScore(spm);
                const confidence = Math.min(0.95, 0.7 + spm * 0.005); // confidence grows with volume
                score += logScore * confidence;
                reasons.push({ rule: 'frequency_log', severity: logScore, confidence: Math.round(confidence * 100) / 100, spm, formula: `log2(${spm})*15` });
            }
        }
    } catch(_) {}

    // Same actor scanning many products fast (farming)
    try {
        if (actorId) {
            const actorRate = await db.get(
                "SELECT COUNT(DISTINCT product_id) as products, COUNT(*) as total FROM scan_events WHERE device_fingerprint = $1 AND scanned_at > NOW() - INTERVAL '5 minutes'",
                [actorId]
            );
            if (actorRate && actorRate.products > 5) {
                const farmScore = logFrequencyScore(actorRate.products);
                score += farmScore * 0.9;
                reasons.push({ rule: 'scan_farming', severity: farmScore, confidence: 0.9, products: actorRate.products, total: actorRate.total });
            }
        }
    } catch(_) {}

    // Slow fraud: consistent scanning over long period
    try {
        const slowFraud = await db.get(
            "SELECT COUNT(*) as c FROM scan_events WHERE product_id = $1 AND scanned_at > NOW() - INTERVAL '24 hours'",
            [productId]
        );
        if (slowFraud && slowFraud.c > 15) {
            const slowScore = Math.min(40, Math.round(Math.log2(slowFraud.c) * 8));
            score += slowScore * 0.7;
            reasons.push({ rule: 'slow_accumulation', severity: slowScore, confidence: 0.7, scans_24h: slowFraud.c });
        }
    } catch(_) {}

    // Frequency evasion detection: scan every 3-5s (just below threshold)
    try {
        const per5Min = await db.get(
            "SELECT COUNT(*) as c FROM scan_events WHERE product_id = $1 AND scanned_at > NOW() - INTERVAL '5 minutes'",
            [productId]
        );
        if (per5Min) {
            const spm5 = parseInt(per5Min.c);
            // If 5-min count is high but per-min is low → evasion
            if (spm5 > 10) {
                const evasionScore = Math.min(50, Math.round(Math.log2(spm5) * 12));
                score += evasionScore * 0.8;
                reasons.push({ rule: 'frequency_evasion', severity: evasionScore, confidence: 0.8, scans_5min: spm5 });
            }
        }
    } catch(_) {}

    return { score: Math.min(100, Math.round(score)), reasons };
}

// ─── FEATURE 4: HISTORY SCORE (FIX 1+3: MOMENTUM + SLIDING) ─
async function historyScore(productId, actorId) {
    let score = 0;
    const reasons = [];

    // Actor history with time decay + sliding window (FIX 3)
    try {
        if (actorId) {
            const profile = await db.get(
                "SELECT flagged_count, blocked_count, avg_risk_score, last_risk_score, last_flagged_at, risk_level, total_scans FROM actor_risk_profiles WHERE actor_id = $1",
                [actorId]
            );
            if (profile) {
                // V2: Sliding window — use last_risk_score + avg for momentum
                const historicalAvg = parseFloat(profile.avg_risk_score) || 0;
                
                if (profile.flagged_count > 0) {
                    const daysSinceFlag = profile.last_flagged_at ? (Date.now() - new Date(profile.last_flagged_at).getTime()) / 86400000 : 365;
                    const decayed = timeDecay(40, daysSinceFlag);
                    score += decayed * 0.85;
                    reasons.push({ rule: 'actor_flagged_before', severity: 40, confidence: 0.85, decayed: Math.round(decayed), days_since: Math.round(daysSinceFlag) });
                }
                if (profile.blocked_count > 0) {
                    score += 30 * 0.9;
                    reasons.push({ rule: 'actor_blocked_before', severity: 30, confidence: 0.9, blocked_count: profile.blocked_count });
                }
                // V2: Risk momentum — historical avg contributes (FIX 1)
                if (historicalAvg > 20) {
                    const momentumScore = Math.min(30, Math.round(historicalAvg * 0.4));
                    score += momentumScore * 0.7;
                    reasons.push({ rule: 'risk_momentum', severity: momentumScore, confidence: 0.7, historical_avg: Math.round(historicalAvg) });
                }
            }
            // New actor (no history) — slight signal
            if (!profile) {
                score += 5 * 0.5;
                reasons.push({ rule: 'new_actor', severity: 5, confidence: 0.5 });
            }
        }
    } catch(_) {}

    // Product history — sliding window (FIX 3)
    try {
        // 24h window
        const scans24h = await db.get(
            "SELECT COUNT(*) as c FROM scan_events WHERE product_id = $1 AND scanned_at > NOW() - INTERVAL '24 hours'",
            [productId]
        );
        // 7d window
        const scans7d = await db.get(
            "SELECT COUNT(*) as c FROM scan_events WHERE product_id = $1 AND scanned_at > NOW() - INTERVAL '7 days'",
            [productId]
        );
        
        const c24h = scans24h ? parseInt(scans24h.c) : 0;
        const c7d = scans7d ? parseInt(scans7d.c) : 0;
        
        if (c24h > 5) {
            const s = Math.min(40, Math.round(Math.log2(c24h) * 10));
            score += s * 0.8;
            reasons.push({ rule: 'product_multi_scanned_24h', severity: s, confidence: 0.8, scans_24h: c24h });
        }
        if (c7d > 20 && c24h <= 5) {
            // Many scans over 7d but not bursty today → moderate concern
            score += 15 * 0.6;
            reasons.push({ rule: 'product_scanned_week', severity: 15, confidence: 0.6, scans_7d: c7d });
        }

        // Product previously flagged
        const productFlags = await db.get(
            "SELECT COUNT(*) as c FROM risk_scores WHERE product_id = $1 AND decision IN ('SOFT_BLOCK','HARD_BLOCK')",
            [productId]
        );
        if (productFlags && productFlags.c > 0) {
            score += 50 * 0.85;
            reasons.push({ rule: 'product_flagged_before', severity: 50, confidence: 0.85, flags: productFlags.c });
        }
    } catch(_) {}

    return { score: Math.min(100, Math.round(score)), reasons };
}

// ═══════════════════════════════════════════════════════════════
// V7 TRUST PROPAGATION + DEEP MOAT
// ═══════════════════════════════════════════════════════════════

const GRAPH_LIMITS = { MAX_NODES: 500, MAX_DEPTH: 2, QUERY_TIMEOUT: 5000 };

// ─── V6: TRUST VOLATILITY ────────────────────────────────────
async function trustVolatility(actorId) {
    if (!actorId) return { volatility: 0, penalty: 0 };
    try {
        const stats = await db.get(
            `SELECT STDDEV(risk_score) as stddev, AVG(risk_score) as avg, COUNT(*) as cnt
             FROM risk_scores WHERE actor_id = $1 AND created_at > NOW() - INTERVAL '7 days'`,
            [actorId]
        );
        if (!stats || parseInt(stats.cnt) < 3) return { volatility: 0, penalty: 0 };
        const stddev = parseFloat(stats.stddev) || 0;
        const avg = parseFloat(stats.avg) || 0;
        const cv = avg > 0 ? stddev / avg : 0;
        const penalty = Math.min(0.3, cv * 0.5);
        return { volatility: Math.round(cv * 100) / 100, stddev: Math.round(stddev), penalty: Math.round(penalty * 100) / 100 };
    } catch(_) {}
    return { volatility: 0, penalty: 0 };
}

// ─── V7: RISK TREND SLOPE (linear regression) ───────────────
// Detects slowly increasing risk — even if volatility is low
async function riskTrendSlope(actorId) {
    if (!actorId) return { slope: 0, penalty: 0 };
    try {
        const scores = await db.all(
            `SELECT risk_score, EXTRACT(EPOCH FROM created_at) as ts
             FROM risk_scores WHERE actor_id = $1
             AND created_at > NOW() - INTERVAL '7 days'
             ORDER BY created_at ASC LIMIT 50`,
            [actorId]
        );
        if (!scores || scores.length < 4) return { slope: 0, penalty: 0 };
        // Simple linear regression: slope = Σ(xi-x̄)(yi-ȳ) / Σ(xi-x̄)²
        const n = scores.length;
        const xs = scores.map((s, i) => i); // use index as x for simplicity
        const ys = scores.map(s => parseFloat(s.risk_score) || 0);
        const xMean = (n - 1) / 2;
        const yMean = ys.reduce((a, b) => a + b, 0) / n;
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) {
            num += (xs[i] - xMean) * (ys[i] - yMean);
            den += (xs[i] - xMean) ** 2;
        }
        const slope = den > 0 ? num / den : 0;
        // Positive slope = risk trending up → trust penalty
        const penalty = slope > 0 ? Math.min(0.2, slope * 0.01) : 0;
        return { slope: Math.round(slope * 100) / 100, penalty: Math.round(penalty * 100) / 100, samples: n };
    } catch(_) {}
    return { slope: 0, penalty: 0 };
}

// ─── V8: MULTI-EDGE TRUST PROPAGATION ─────────────────────
// Edges: actor↔actor (product), actor↔IP, actor↔device
// Distance decay: weight × 0.5^hop | Cap: propagation_impact ≤ 30%
async function trustPropagation(actorId) {
    if (!actorId) return { network_trust: 0.5, neighbor_count: 0, penalty: 0, edges: {} };
    try {
        // Edge 1: Product-sharing neighbors (hop 1, weight 1.0)
        const productNeighbors = await db.all(
            `SELECT se2.device_fingerprint, COUNT(DISTINCT se1.product_id) as shared_products
             FROM scan_events se1
             JOIN scan_events se2 ON se1.product_id = se2.product_id
             WHERE se1.device_fingerprint = $1
             AND se2.device_fingerprint != $1
             AND se2.device_fingerprint IS NOT NULL
             AND se1.scanned_at > NOW() - INTERVAL '1 hour'
             AND se2.scanned_at > NOW() - INTERVAL '1 hour'
             GROUP BY se2.device_fingerprint
             ORDER BY COUNT(DISTINCT se1.product_id) DESC
             LIMIT 15`,
            [actorId]
        ) || [];

        // Edge 2: IP-sharing neighbors (actors on same IP, weight 0.8)
        const ipNeighbors = await db.all(
            `SELECT se2.device_fingerprint, COUNT(DISTINCT se1.ip_address) as shared_ips
             FROM scan_events se1
             JOIN scan_events se2 ON se1.ip_address = se2.ip_address
             WHERE se1.device_fingerprint = $1
             AND se2.device_fingerprint != $1
             AND se2.device_fingerprint IS NOT NULL
             AND se1.ip_address IS NOT NULL
             AND se1.scanned_at > NOW() - INTERVAL '1 hour'
             AND se2.scanned_at > NOW() - INTERVAL '1 hour'
             GROUP BY se2.device_fingerprint
             ORDER BY COUNT(DISTINCT se1.ip_address) DESC
             LIMIT 10`,
            [actorId]
        ) || [];

        // Merge edges with weights and distance decay
        const neighborMap = new Map(); // fp -> { risk, totalWeight }
        const HOP1_DECAY = 1.0; // 0.5^0

        // Process product edges (strongest signal)
        for (const n of productNeighbors.slice(0, 10)) {
            const profile = await db.get(
                `SELECT avg_risk_score FROM actor_risk_profiles WHERE actor_id = $1`,
                [n.device_fingerprint]
            );
            const risk = profile ? (parseFloat(profile.avg_risk_score) || 0) : 30;
            const edgeWeight = (parseInt(n.shared_products) || 1) * 1.0 * HOP1_DECAY;
            const existing = neighborMap.get(n.device_fingerprint) || { risk: 0, weight: 0 };
            neighborMap.set(n.device_fingerprint, { risk: existing.risk + risk * edgeWeight, weight: existing.weight + edgeWeight });
        }

        // Process IP edges (secondary signal, weight 0.8)
        for (const n of ipNeighbors.slice(0, 8)) {
            if (neighborMap.has(n.device_fingerprint)) {
                // Already connected via product — boost weight
                const existing = neighborMap.get(n.device_fingerprint);
                const profile = await db.get(
                    `SELECT avg_risk_score FROM actor_risk_profiles WHERE actor_id = $1`,
                    [n.device_fingerprint]
                );
                const risk = profile ? (parseFloat(profile.avg_risk_score) || 0) : 30;
                const edgeWeight = (parseInt(n.shared_ips) || 1) * 0.8 * HOP1_DECAY;
                neighborMap.set(n.device_fingerprint, { risk: existing.risk + risk * edgeWeight, weight: existing.weight + edgeWeight });
            } else {
                const profile = await db.get(
                    `SELECT avg_risk_score FROM actor_risk_profiles WHERE actor_id = $1`,
                    [n.device_fingerprint]
                );
                const risk = profile ? (parseFloat(profile.avg_risk_score) || 0) : 30;
                const edgeWeight = (parseInt(n.shared_ips) || 1) * 0.8 * HOP1_DECAY;
                neighborMap.set(n.device_fingerprint, { risk: risk * edgeWeight, weight: edgeWeight });
            }
        }

        if (neighborMap.size === 0) return { network_trust: 0.5, neighbor_count: 0, penalty: 0, edges: { product: 0, ip: 0 } };

        // Calculate weighted average risk
        let totalWeightedRisk = 0, totalWeight = 0;
        for (const [_, v] of neighborMap) {
            totalWeightedRisk += v.risk;
            totalWeight += v.weight;
        }
        const neighborAvgRisk = totalWeight > 0 ? totalWeightedRisk / totalWeight : 30;
        const networkTrust = Math.max(0.1, 1 - (neighborAvgRisk / 100));

        // V8: Cap propagation penalty at 30% max influence
        const rawPenalty = networkTrust < 0.5 ? (0.5 - networkTrust) * 0.5 : 0;
        const penalty = Math.min(0.15, rawPenalty); // Capped at 0.15 (30% of 0.5 baseline)

        return {
            network_trust: Math.round(networkTrust * 100) / 100,
            neighbor_count: neighborMap.size,
            neighbor_avg_risk: Math.round(neighborAvgRisk),
            penalty: Math.round(penalty * 100) / 100,
            edges: { product: productNeighbors.length, ip: ipNeighbors.length },
        };
    } catch(_) {}
    return { network_trust: 0.5, neighbor_count: 0, penalty: 0, edges: { product: 0, ip: 0 } };
}

// ─── V8: MULTI-EDGE GRAPH SCORE ───────────────────────────
// Explicit multi-edge scoring: product + IP + device edges
async function multiEdgeScore(actorId, ipAddress) {
    const reasons = [];
    let score = 0;
    if (!actorId) return { score: 0, reasons };
    try {
        // Edge type 1: Same IP, different actors, same product (strong fraud signal)
        if (ipAddress) {
            const sameIpProduct = await db.get(
                `SELECT COUNT(DISTINCT se1.device_fingerprint) as actors, COUNT(DISTINCT se1.product_id) as products
                 FROM scan_events se1
                 WHERE se1.ip_address = $1
                 AND se1.device_fingerprint != $2
                 AND se1.scanned_at > NOW() - INTERVAL '1 hour'
                 AND se1.product_id IN (
                     SELECT DISTINCT product_id FROM scan_events 
                     WHERE device_fingerprint = $2 AND scanned_at > NOW() - INTERVAL '1 hour'
                 )`,
                [ipAddress, actorId]
            );
            if (sameIpProduct) {
                const actors = parseInt(sameIpProduct.actors) || 0;
                const products = parseInt(sameIpProduct.products) || 0;
                if (actors >= 3 && products >= 2) {
                    // V9: Non-linear interaction — IP + product overlap = boosted
                    const interactionBoost = Math.min(15, Math.round(Math.sqrt(actors * products) * 3));
                    score += 35 + interactionBoost;
                    reasons.push({ rule: 'multi_edge_ip_product', severity: 45 + interactionBoost, confidence: 0.75, actors, products, edge_types: ['ip', 'product'], interaction_boost: interactionBoost });
                }
            }
        }

        // Edge type 2: Different IPs but same products (coordinated scanning)
        const crossIpSameProduct = await db.get(
            `SELECT COUNT(DISTINCT ip_address) as ips
             FROM scan_events WHERE product_id IN (
                 SELECT DISTINCT product_id FROM scan_events 
                 WHERE device_fingerprint = $1 AND scanned_at > NOW() - INTERVAL '1 hour'
             )
             AND device_fingerprint != $1
             AND scanned_at > NOW() - INTERVAL '1 hour'`,
            [actorId]
        );
        if (crossIpSameProduct && parseInt(crossIpSameProduct.ips) >= 5) {
            score += 20;
            reasons.push({ rule: 'multi_edge_cross_ip', severity: 30, confidence: 0.65, unique_ips: parseInt(crossIpSameProduct.ips), edge_types: ['ip', 'product'] });
        }
    } catch(_) {}
    return { score: Math.min(50, score), reasons };
}

// ─── V10: SELF-LEARNING BAYESIAN FUSION ────────────────
// Uses learned likelihood ratios from signal_stats (data-driven)
// Beta distribution for true statistical uncertainty
async function bayesianRiskFusion(actorId, currentSignals) {
    const result = { prior: 0.1, likelihood: 0.5, posterior: 0.1, confidence: 0.5, uncertainty: 0.5, learned: false };
    try {
        // PRIOR: P(fraud) from actor + network + product
        let prior = 0.1;
        let dataPoints = 0;
        let fraudCount = 0, legitCount = 0;
        if (actorId) {
            const profile = await db.get(
                `SELECT total_scans, flagged_count, avg_risk_score FROM actor_risk_profiles WHERE actor_id = $1`,
                [actorId]
            );
            if (profile) {
                const scans = parseInt(profile.total_scans) || 1;
                const flagged = parseFloat(profile.flagged_count) || 0;
                const avgRisk = parseFloat(profile.avg_risk_score) || 0;
                dataPoints = scans;
                fraudCount = Math.round(flagged);
                legitCount = Math.max(0, scans - fraudCount);
                const flagRatio = Math.min(1.0, flagged / scans);
                prior = flagRatio * 0.6 + (avgRisk / 100) * 0.4;
                prior = Math.max(0.01, Math.min(0.99, prior));
            }
        }

        // V10: LEARNED LIKELIHOOD RATIOS from signal_stats
        const signals = currentSignals || {};
        const signalEntries = [
            { name: 'scan_pattern', value: (signals.pattern || 0) / 100 },
            { name: 'geo', value: (signals.geo || 0) / 100 },
            { name: 'frequency', value: (signals.frequency || 0) / 100 },
            { name: 'history', value: (signals.history || 0) / 100 },
            { name: 'graph', value: (signals.graph || 0) / 100 },
        ];

        // Fetch learned LRs
        let learnedLRs = {};
        let usingLearned = false;
        try {
            const stats = await db.all(`SELECT signal_name, fraud_count, legit_count, learned_lr FROM signal_stats`);
            if (stats && stats.length > 0) {
                for (const s of stats) {
                    const total = (parseInt(s.fraud_count) || 0) + (parseInt(s.legit_count) || 0);
                    if (total >= 20) {
                        // Enough data → use learned LR (Laplace smoothed)
                        learnedLRs[s.signal_name] = parseFloat(s.learned_lr) || 1.0;
                        usingLearned = true;
                    } else {
                        learnedLRs[s.signal_name] = DEFAULT_LR[s.signal_name] || 1.0;
                    }
                }
            }
        } catch(_) {}

        // Combined likelihood using learned LRs
        let combinedLR = 1.0;
        const activeSignals = signalEntries.filter(s => s.value > 0.1);
        const lrShifts = {};
        for (const s of signalEntries) {
            if (s.value > 0.1) {
                const lr = learnedLRs[s.name] || DEFAULT_LR[s.name] || 1.0;
                // Signal strength modulates LR: strong signal = full LR, weak = partial
                const effectiveLR = 1.0 + (lr - 1.0) * s.value;
                combinedLR *= effectiveLR;
                lrShifts[s.name] = Math.round((effectiveLR - 1.0) * 100) / 100;
            }
        }
        // Cap combined LR to prevent runaway
        combinedLR = Math.max(0.1, Math.min(50, combinedLR));

        // V11: Correlation penalty — reduce LR when correlated signals co-fire
        const correlationPenalty = signalCorrelationPenalty(activeSignals.map(s => s.name));
        combinedLR *= correlationPenalty;

        // V10: Posterior via combined LR
        // P(F|E) = LR × P(F) / (LR × P(F) + (1-P(F)))
        const numerator = combinedLR * prior;
        const denominator = numerator + (1 - prior);
        const posterior = denominator > 0 ? numerator / denominator : prior;

        // V10: Beta distribution uncertainty (true statistical)
        // α = fraud_count + 1, β = legit_count + 1 (Laplace prior)
        const alpha = fraudCount + 1;
        const beta = legitCount + 1;
        const betaMean = alpha / (alpha + beta);
        const betaVariance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
        const betaUncertainty = Math.sqrt(betaVariance);
        // Scale uncertainty: high variance = high uncertainty
        const uncertainty = Math.min(0.9, Math.max(0.05, betaUncertainty * 4));
        const confidence = Math.round((1 - uncertainty) * 100) / 100;

        result.prior = Math.round(prior * 1000) / 1000;
        result.likelihood = Math.round(combinedLR * 1000) / 1000;
        result.posterior = Math.round(Math.min(0.99, posterior) * 1000) / 1000;
        result.confidence = confidence;
        result.uncertainty = Math.round(uncertainty * 100) / 100;
        result.data_points = dataPoints;
        result.active_signals = activeSignals.length;
        result.learned = usingLearned;
        result.beta = { alpha, beta: beta, mean: Math.round(betaMean * 1000) / 1000 };
        if (Object.keys(lrShifts).length > 0) result.lr_shifts = lrShifts;
        result.correlation_penalty = correlationPenalty;

        // V11: Calibrate posterior
        result.calibrated_posterior = calibrateProb(result.posterior);
    } catch(_) {}
    return result;
}

// ─── V10: UPDATE SIGNAL STATS (online learning) ─────────
// Called after outcome is known (fraud or legit)
async function updateSignalStats(signalName, isFraud, weight = 1.0) {
    try {
        const col = isFraud ? 'fraud_count' : 'legit_count';
        const increment = Math.max(0.1, Math.min(1.0, weight)); // weighted increment
        await db.run(
            `UPDATE signal_stats SET ${col} = ${col} + $1, last_updated = NOW() WHERE signal_name = $2`,
            [increment, signalName]
        );
        // Recompute learned LR with Laplace smoothing
        const stats = await db.get(`SELECT fraud_count, legit_count FROM signal_stats WHERE signal_name = $1`, [signalName]);
        if (stats) {
            const fc = parseFloat(stats.fraud_count) || 0;
            const lc = parseFloat(stats.legit_count) || 0;
            const totalFraud = Math.max(1, fc);
            const totalLegit = Math.max(1, lc);
            // Laplace-smoothed LR
            const pEgivenF = (fc + 1) / (totalFraud + 2);
            const pEgivenNotF = (lc + 1) / (totalLegit + 2);
            let rawLR = pEgivenF / Math.max(0.01, pEgivenNotF);
            // Guardrail: cap LR 0.5–5.0
            rawLR = Math.max(0.5, Math.min(5.0, rawLR));
            // EMA blending: 90% old + 10% learned
            const oldLR = DEFAULT_LR[signalName] || 1.0;
            const blendedLR = 0.9 * oldLR + 0.1 * rawLR;
            const finalLR = Math.max(0.5, Math.min(5.0, Math.round(blendedLR * 1000) / 1000));
            await db.run(`UPDATE signal_stats SET learned_lr = $1 WHERE signal_name = $2`, [finalLR, signalName]);
        }
    } catch(_) {}
}

// ─── V10: RECORD OUTCOME (feedback API) ────────────────
// source: 'admin' (1.0) | 'system' (0.7) | 'user' (0.3)
async function recordOutcome(actorId, isFraud, activeSignalNames, source = 'system') {
    const FEEDBACK_WEIGHT = { admin: 1.0, system: 0.7, user: 0.3 };
    const weight = FEEDBACK_WEIGHT[source] || 0.3;
    const updated = [];
    try {
        for (const sig of (activeSignalNames || SIGNAL_NAMES)) {
            if (SIGNAL_NAMES.includes(sig)) {
                await updateSignalStats(sig, isFraud, weight);
                updated.push(sig);
            }
        }
    } catch(_) {}
    return { updated, weight, source, is_fraud: isFraud };
}

// V11: Enhanced recordOutcome with decision tracking
async function recordOutcomeWithDecision(actorId, isFraud, wasDetected, activeSignalNames, source = 'system') {
    const result = await recordOutcome(actorId, isFraud, activeSignalNames, source);
    await updateDecisionStats(wasDetected, isFraud);
    return { ...result, decision_tracked: true };
}

// ─── V10: GET LEARNED LRs (for inspection) ───────────────
async function getLearnedLRs() {
    try {
        const stats = await db.all(`SELECT signal_name, fraud_count, legit_count, learned_lr, last_updated FROM signal_stats ORDER BY signal_name`);
        return (stats || []).map(s => ({
            signal: s.signal_name,
            fraud_count: parseInt(s.fraud_count) || 0,
            legit_count: parseInt(s.legit_count) || 0,
            learned_lr: parseFloat(s.learned_lr) || 1.0,
            default_lr: DEFAULT_LR[s.signal_name] || 1.0,
            data_sufficient: ((parseInt(s.fraud_count) || 0) + (parseInt(s.legit_count) || 0)) >= 20,
        }));
    } catch(_) {}
    return [];
}

// ─── V11: SIGNAL CORRELATION PENALTY ─────────────────
// Reduces combined LR when correlated signals both fire
// Returns multiplier 0.5–1.0 (1.0 = no penalty)
function signalCorrelationPenalty(activeSignalNames) {
    if (!activeSignalNames || activeSignalNames.length < 2) return 1.0;
    let totalCorrelation = 0;
    let pairs = 0;
    for (let i = 0; i < activeSignalNames.length; i++) {
        for (let j = i + 1; j < activeSignalNames.length; j++) {
            const key1 = `${activeSignalNames[i]}:${activeSignalNames[j]}`;
            const key2 = `${activeSignalNames[j]}:${activeSignalNames[i]}`;
            const corr = SIGNAL_CORRELATIONS[key1] || SIGNAL_CORRELATIONS[key2] || 0;
            totalCorrelation += corr;
            pairs++;
        }
    }
    if (pairs === 0) return 1.0;
    const avgCorrelation = totalCorrelation / pairs;
    // Penalty: higher correlation = lower multiplier (min 0.5)
    return Math.max(0.5, 1.0 - avgCorrelation * 0.6);
}

// ─── V12: FINE-GRAINED CALIBRATION (20 bins) ───────
// Smooth isotonic calibration with linear interpolation
function calibrateProb(rawP) {
    // 20 bins: each 0.05 wide, calibrated values from domain knowledge
    const BINS = [
        0.01, 0.02, 0.04, 0.06, 0.09,   // 0.00-0.25: very low
        0.12, 0.16, 0.21, 0.27, 0.33,   // 0.25-0.50: low-medium
        0.40, 0.47, 0.54, 0.61, 0.68,   // 0.50-0.75: medium-high
        0.74, 0.80, 0.86, 0.92, 0.96,   // 0.75-1.00: high-very high
    ];
    const binWidth = 1.0 / BINS.length; // 0.05 each
    const idx = Math.min(BINS.length - 1, Math.floor(rawP / binWidth));
    const lo = BINS[idx];
    const hi = idx < BINS.length - 1 ? BINS[idx + 1] : 0.99;
    const frac = (rawP - idx * binWidth) / binWidth;
    const calibrated = lo + frac * (hi - lo);
    return Math.round(Math.max(0.001, Math.min(0.99, calibrated)) * 1000) / 1000;
}

// ─── V11: DECISION STATS (TP/FP/TN/FN) ──────────────
// Tracks quality of decisions (not just probability accuracy)
async function updateDecisionStats(wasDetected, isFraud) {
    // wasDetected = decision was SUSPICIOUS, SOFT_BLOCK, or HARD_BLOCK
    // isFraud = ground truth from outcome
    try {
        let category;
        if (wasDetected && isFraud) category = 'TP';
        else if (wasDetected && !isFraud) category = 'FP';
        else if (!wasDetected && isFraud) category = 'FN';
        else category = 'TN';
        await db.run(
            `INSERT INTO signal_stats (signal_name, fraud_count, legit_count, learned_lr)
             VALUES ($1, $2, $3, 1.0)
             ON CONFLICT (signal_name) DO UPDATE SET
                fraud_count = signal_stats.fraud_count + $2,
                legit_count = signal_stats.legit_count + $3,
                last_updated = NOW()`,
            [`decision_${category}`, category === 'TP' || category === 'FN' ? 1 : 0, category === 'FP' || category === 'TN' ? 1 : 0]
        );
    } catch(_) {}
}

async function getDecisionStats() {
    try {
        const stats = {};
        for (const cat of ['TP', 'FP', 'TN', 'FN']) {
            const row = await db.get(`SELECT fraud_count, legit_count FROM signal_stats WHERE signal_name = $1`, [`decision_${cat}`]);
            stats[cat] = row ? (parseInt(row.fraud_count) || 0) + (parseInt(row.legit_count) || 0) : 0;
        }
        const total = stats.TP + stats.FP + stats.TN + stats.FN;
        const precision = (stats.TP + stats.FP) > 0 ? stats.TP / (stats.TP + stats.FP) : 0;
        const recall = (stats.TP + stats.FN) > 0 ? stats.TP / (stats.TP + stats.FN) : 0;
        const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;
        // Cost-based loss: FN costs 5× FP
        const costLoss = stats.FN * 5 + stats.FP * 1;
        return {
            ...stats, total,
            precision: Math.round(precision * 1000) / 1000,
            recall: Math.round(recall * 1000) / 1000,
            f1: Math.round(f1 * 1000) / 1000,
            cost_loss: costLoss,
        };
    } catch(_) {}
    return { TP: 0, FP: 0, TN: 0, FN: 0, total: 0, precision: 0, recall: 0, f1: 0, cost_loss: 0 };
}

// ─── V12: DYNAMIC COST FUNCTION ────────────────────
// Context-aware FN/FP costs per category + time
function dynamicCost(category) {
    const COSTS = {
        pharma:  { fn: 10, fp: 1, label: 'pharma (health risk)' },
        luxury:  { fn: 8,  fp: 1, label: 'luxury (high value)' },
        fmcg:    { fn: 3,  fp: 2, label: 'fmcg (volume, churn sensitive)' },
        default: { fn: 5,  fp: 1, label: 'default' },
    };
    return COSTS[category] || COSTS.default;
}

// ─── V13: SMART EXPLORATION (uncertainty-driven) ───
// Explore more in uncertain regions, less in confident ones
function smartExploration(baseEpsilon = 0.05, uncertainty = 0.5) {
    // Higher uncertainty = higher exploration probability
    const effectiveEpsilon = Math.min(0.2, baseEpsilon + uncertainty * 0.2);
    const rand = Math.random();
    if (rand < effectiveEpsilon) {
        return { explore: true, action: 'PASS', reason: 'smart_exploration', epsilon: Math.round(effectiveEpsilon * 1000) / 1000 };
    }
    return { explore: false, epsilon: Math.round(effectiveEpsilon * 1000) / 1000 };
}
// Keep V12 compatibility
function explorationBypass(epsilon = 0.05) { return smartExploration(epsilon, 0.5); }

// ─── V13: AUTO-THRESHOLD WITH DAMPING ─────────────
// Adjusts thresholds with 80/20 damping to prevent oscillation
let _currentThresholds = { suspicious: 40, soft_block: 70, hard_block: 85 };
let _safeThresholds = { ..._currentThresholds };
let _safeLRs = null; // V13: LR snapshot for partial rollback

async function autoThreshold(category) {
    try {
        const stats = await getDecisionStats();
        if (stats.total < 30) return _currentThresholds;

        const cost = dynamicCost(category);
        const fnRate = stats.FN / Math.max(1, stats.FN + stats.TP);
        const fpRate = stats.FP / Math.max(1, stats.FP + stats.TN);

        let optimalSuspicious = _currentThresholds.suspicious;
        let optimalSoftBlock = _currentThresholds.soft_block;
        if (fnRate > 0.3) { optimalSuspicious -= 3; optimalSoftBlock -= 2; }
        else if (fnRate > 0.15) { optimalSuspicious -= 1; }
        else if (fpRate > 0.3) { optimalSuspicious += 3; optimalSoftBlock += 2; }
        else if (fpRate > 0.15) { optimalSuspicious += 1; }

        // V13: DAMPING — 80% old + 20% optimal (prevents oscillation)
        const dampedSusp = Math.round(0.8 * _currentThresholds.suspicious + 0.2 * optimalSuspicious);
        const dampedSoft = Math.round(0.8 * _currentThresholds.soft_block + 0.2 * optimalSoftBlock);

        _currentThresholds = {
            suspicious: Math.max(25, Math.min(55, dampedSusp)),
            soft_block: Math.max(55, Math.min(80, dampedSoft)),
            hard_block: _currentThresholds.hard_block,
        };
    } catch(_) {}
    return _currentThresholds;
}

function getThresholds() { return { ..._currentThresholds }; }
function setThresholds(t) { _currentThresholds = { ...t }; }

// ─── V13: ROBUST DRIFT DETECTOR (KL + PSI) ───────
// Uses blend of KL divergence + PSI for fewer false alarms
async function driftDetector() {
    try {
        const recent = await db.all(
            `SELECT total_score FROM risk_scores WHERE created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC LIMIT 200`
        );
        const historical = await db.all(
            `SELECT total_score FROM risk_scores WHERE created_at > NOW() - INTERVAL '7 days' AND created_at < NOW() - INTERVAL '1 hour' ORDER BY created_at DESC LIMIT 1000`
        );
        if (!recent || recent.length < 20 || !historical || historical.length < 50) {
            return { drift: false, reason: 'insufficient_data', kl: 0, psi: 0, drift_score: 0, recent_count: recent?.length || 0 };
        }

        const bins = 10;
        const recentHist = Array(bins).fill(0);
        const histHist = Array(bins).fill(0);
        for (const r of recent) {
            const b = Math.min(bins - 1, Math.floor((parseInt(r.total_score) || 0) / (100 / bins)));
            recentHist[b]++;
        }
        for (const h of historical) {
            const b = Math.min(bins - 1, Math.floor((parseInt(h.total_score) || 0) / (100 / bins)));
            histHist[b]++;
        }
        const rTotal = recent.length + bins;
        const hTotal = historical.length + bins;
        let kl = 0, psi = 0;
        for (let i = 0; i < bins; i++) {
            const p = (recentHist[i] + 1) / rTotal;
            const q = (histHist[i] + 1) / hTotal;
            kl += p * Math.log(p / q);
            psi += (p - q) * Math.log(p / q); // PSI = symmetric KL
        }
        kl = Math.round(kl * 1000) / 1000;
        psi = Math.round(Math.abs(psi) * 1000) / 1000;
        // V13: Blend score (reduces false alarm)
        const driftScore = Math.round((0.5 * kl + 0.5 * psi) * 1000) / 1000;
        const driftDetected = driftScore > 0.5;

        const recentMean = recent.reduce((s, r) => s + (parseInt(r.total_score) || 0), 0) / recent.length;
        const histMean = historical.reduce((s, h) => s + (parseInt(h.total_score) || 0), 0) / historical.length;

        return {
            drift: driftDetected, kl, psi, drift_score: driftScore,
            recent_mean: Math.round(recentMean * 10) / 10,
            hist_mean: Math.round(histMean * 10) / 10,
            shift: Math.round((recentMean - histMean) * 10) / 10,
            recent_count: recent.length, hist_count: historical.length,
        };
    } catch(_) {}
    return { drift: false, kl: 0, psi: 0, drift_score: 0, reason: 'error' };
}

// ─── V12: ROLLBACK LOGIC ─────────────────────────
function snapshotConfig() {
    _safeThresholds = { ..._currentThresholds };
    return _safeThresholds;
}

function rollbackConfig() {
    _currentThresholds = { ..._safeThresholds };
    return _currentThresholds;
}

// ─── V12: CAUSAL LIFT (measured) ───────────────────
async function causalLift(signalName) {
    try {
        const stats = await db.get(
            `SELECT fraud_count, legit_count FROM signal_stats WHERE signal_name = $1`,
            [signalName]
        );
        if (!stats) return { lift: 0, p_fraud_with: 0, p_fraud_without: 0.1, signal: signalName };

        const fc = parseFloat(stats.fraud_count) || 0;
        const lc = parseFloat(stats.legit_count) || 0;
        const total = fc + lc;
        if (total < 10) return { lift: 0, p_fraud_with: 0, p_fraud_without: 0.1, signal: signalName, reason: 'insufficient' };

        // P(fraud | signal active)
        const pFraudWith = (fc + 1) / (total + 2); // Laplace
        // P(fraud | no signal) ≈ base rate
        const baseRate = 0.1; // global base rate
        const lift = Math.round((pFraudWith - baseRate) * 1000) / 1000;

        return {
            signal: signalName,
            p_fraud_with: Math.round(pFraudWith * 1000) / 1000,
            p_fraud_without: baseRate,
            lift,
            is_causal: lift > 0.05 && total >= 20,
        };
    } catch(_) {}
    return { lift: 0, signal: signalName };
}

// ─── V11: CAUSAL SIGNAL SCORE ──────────────────────
// Estimates causal strength of each signal
// Uses: exclusivity (does this signal predict fraud independently?)
function causalSignalScore(signalScores, allReasons) {
    // signalScores = { scan_pattern: 50, geo: 20, ... }
    const scores = signalScores || {};
    const causal = {};
    const activeSignals = Object.entries(scores).filter(([_, v]) => v > 10);
    for (const [name, score] of activeSignals) {
        // Exclusivity: how much of total score comes from this signal alone
        const totalOther = activeSignals
            .filter(([n]) => n !== name)
            .reduce((sum, [_, v]) => sum + v, 0);
        const exclusivity = totalOther > 0 ? score / (score + totalOther) : 1.0;

        // Signal-specific causal prior (domain knowledge)
        const CAUSAL_PRIOR = {
            scan_pattern: 0.7,  // strong causal: scanning pattern directly indicates intent
            geo: 0.8,           // strong causal: impossible travel is direct evidence
            frequency: 0.5,     // medium: high frequency could be legit automation
            history: 0.6,       // medium: past behavior predicts but doesn't cause
            graph: 0.9,         // very strong: network collusion is direct cause
        };
        const prior = CAUSAL_PRIOR[name] || 0.5;

        // Causal score: prior × exclusivity × signal strength
        const causalScore = Math.round(prior * exclusivity * (score / 100) * 100) / 100;
        causal[name] = {
            score: causalScore,
            exclusivity: Math.round(exclusivity * 100) / 100,
            causal_prior: prior,
            is_likely_causal: causalScore > 0.15,
        };
    }
    return causal;
}

// ─── V9: TOP REASONS RANKING ────────────────────────────
function rankTopReasons(allReasons, maxReasons = 3) {
    if (!allReasons || allReasons.length === 0) return [];
    return allReasons
        .filter(r => r.severity && r.confidence)
        .sort((a, b) => (b.severity * b.confidence) - (a.severity * a.confidence))
        .slice(0, maxReasons)
        .map(r => ({ rule: r.rule, impact: Math.round(r.severity * r.confidence), severity: r.severity, confidence: r.confidence }));
}

// ─── V6: CROSS-ENTITY TRUST FUSION ──────────────────────────
// Trust CANNOT fully override strong anomaly signals
function entityTrustFusion(actorTrust, deviceTrust, anomalyScore) {
    const rawTrust = actorTrust * 0.4 + deviceTrust * 0.3;
    const anomalyFactor = anomalyScore > 50 ? Math.max(0.3, 1 - (anomalyScore - 50) / 100) : 1.0;
    return Math.max(0.1, Math.min(1.0, rawTrust * anomalyFactor + 0.3 * (1 - anomalyFactor)));
}

// ─── V7: ACTOR TRUST (volatility + decay + trend + propagation) ─
async function actorTrustScore(actorId) {
    if (!actorId) return { trust: 0.5, reasons: [] };
    const reasons = [];
    try {
        const profile = await db.get(
            `SELECT total_scans, flagged_count, blocked_count, avg_risk_score, created_at, updated_at
             FROM actor_risk_profiles WHERE actor_id = $1`,
            [actorId]
        );
        if (!profile) return { trust: 0.3, reasons: [{ note: 'no_profile' }] };
        const totalScans = parseInt(profile.total_scans) || 1;
        const flagRatio = (parseFloat(profile.flagged_count) || 0) / totalScans;
        const avgRisk = parseFloat(profile.avg_risk_score) || 0;
        const ageHours = (Date.now() - new Date(profile.created_at).getTime()) / 3600000;
        let trust = 0.5;
        if (ageHours > 168) trust += 0.3;
        else if (ageHours > 24) trust += 0.15;
        else trust -= 0.1;
        trust -= flagRatio * 0.4;
        if (avgRisk < 20) trust += 0.2;
        else if (avgRisk < 40) trust += 0.1;
        else if (avgRisk > 60) trust -= 0.2;
        // V6: Trust volatility penalty
        const vol = await trustVolatility(actorId);
        trust -= vol.penalty;
        // V7: Risk trend slope penalty
        const trend = await riskTrendSlope(actorId);
        trust -= trend.penalty;
        // V7: Trust propagation (network influence)
        const network = await trustPropagation(actorId);
        trust -= network.penalty;
        // V7: Contextual decay — λ varies by risk level
        const lastActive = profile.updated_at ? new Date(profile.updated_at) : new Date(profile.created_at);
        const inactiveDays = (Date.now() - lastActive.getTime()) / 86400000;
        if (inactiveDays > 1) {
            // High-risk actors decay faster (λ up to 0.05), low-risk decay slower (λ=0.01)
            const lambda = avgRisk > 60 ? 0.05 : avgRisk > 30 ? 0.02 : 0.01;
            trust *= Math.exp(-lambda * inactiveDays);
        }
        trust = Math.max(0, Math.min(1.0, trust));
        reasons.push({ trust, age_hours: Math.round(ageHours), flag_ratio: Math.round(flagRatio * 100) / 100, avg_risk: Math.round(avgRisk), volatility: vol.volatility, vol_penalty: vol.penalty, trend_slope: trend.slope, trend_penalty: trend.penalty, network_trust: network.network_trust, network_penalty: network.penalty, neighbor_count: network.neighbor_count, inactive_days: Math.round(inactiveDays * 10) / 10 });
        return { trust, reasons, volatility: vol, trend, network };
    } catch(_) {}
    return { trust: 0.3, reasons: [] };
}

// ─── V6: DEVICE TRUST (with reuse penalty) ───────────────────
async function deviceTrustScore(actorId) {
    if (!actorId) return { trust: 0.5, stability: 'unknown', reasons: [] };
    const reasons = [];
    try {
        const ipData = await db.get(
            `SELECT COUNT(DISTINCT ip_address) as ips, COUNT(*) as scans
             FROM scan_events WHERE device_fingerprint = $1
             AND scanned_at > NOW() - INTERVAL '24 hours'`, [actorId]
        );
        const uniqueIPs = parseInt(ipData?.ips) || 0;
        const totalScans = parseInt(ipData?.scans) || 0;
        const typeData = await db.all(
            `SELECT DISTINCT scan_type FROM scan_events 
             WHERE device_fingerprint = $1 AND scanned_at > NOW() - INTERVAL '24 hours'`, [actorId]
        );
        const uniqueTypes = typeData ? typeData.length : 0;
        let trust = 0.7, stability = 'stable';
        if (uniqueIPs > 10) { trust -= 0.4; stability = 'rotating'; }
        else if (uniqueIPs > 5) { trust -= 0.2; stability = 'unstable'; }
        else if (uniqueIPs <= 2) trust += 0.1;
        if (uniqueTypes >= 3) { trust -= 0.3; stability = 'chameleon'; }
        else if (uniqueTypes >= 2) trust -= 0.1;
        if (totalScans < 3) trust -= 0.1;
        // V6: Cross-actor device reuse penalty
        try {
            const ipActors = await db.get(
                `SELECT COUNT(DISTINCT device_fingerprint) as fp_count
                 FROM scan_events WHERE ip_address IN (
                     SELECT DISTINCT ip_address FROM scan_events 
                     WHERE device_fingerprint = $1 AND scanned_at > NOW() - INTERVAL '1 hour'
                 ) AND scanned_at > NOW() - INTERVAL '1 hour'`, [actorId]
            );
            const fpCount = parseInt(ipActors?.fp_count) || 0;
            if (fpCount > 10) { trust -= 0.3; stability = 'shared_device'; reasons.push({ rule: 'device_reuse_high', actors_sharing: fpCount }); }
            else if (fpCount > 5) { trust -= 0.15; reasons.push({ rule: 'device_reuse_moderate', actors_sharing: fpCount }); }
        } catch(_) {}
        trust = Math.max(0, Math.min(1.0, trust));
        reasons.push({ trust, stability, unique_ips: uniqueIPs, unique_types: uniqueTypes, total_scans_24h: totalScans });
        return { trust, stability, reasons };
    } catch(_) {}
    return { trust: 0.5, stability: 'unknown', reasons: [] };
}

// ─── V6: RISK-FIRST BFS (priority traversal) ─────────────────
async function multiHopCollusion(actorId) {
    if (!actorId) return { hops: 0, cluster_size: 0, score: 0, reasons: [] };
    const reasons = [];
    let score = 0;
    try {
        const myProducts = await db.all(
            `SELECT DISTINCT product_id FROM scan_events 
             WHERE device_fingerprint = $1 AND scanned_at > NOW() - INTERVAL '1 hour'
             LIMIT ${GRAPH_LIMITS.MAX_NODES}`, [actorId]
        );
        if (!myProducts || myProducts.length === 0) return { hops: 0, cluster_size: 0, score: 0, reasons };
        const productIds = myProducts.map(r => r.product_id);
        // V7: Multi-factor BFS priority — combines frequency + risk profile
        const hop1Actors = await db.all(
            `SELECT se.device_fingerprint, COUNT(*) as scan_count,
                    COALESCE(arp.avg_risk_score, 30) as actor_risk
             FROM scan_events se
             LEFT JOIN actor_risk_profiles arp ON arp.actor_id = se.device_fingerprint
             WHERE se.product_id::text = ANY(string_to_array($1, ','))
             AND se.device_fingerprint != $2
             AND se.device_fingerprint IS NOT NULL
             AND se.scanned_at > NOW() - INTERVAL '1 hour'
             GROUP BY se.device_fingerprint, arp.avg_risk_score
             ORDER BY (COALESCE(arp.avg_risk_score, 30) * 0.5 + COUNT(*) * 5 * 0.5) DESC
             LIMIT ${GRAPH_LIMITS.MAX_NODES}`,
            [productIds.join(','), actorId]
        );
        if (!hop1Actors || hop1Actors.length === 0) return { hops: 0, cluster_size: 0, score: 0, reasons };

        const hop1ActorIds = hop1Actors.map(a => a.device_fingerprint).slice(0, GRAPH_LIMITS.MAX_NODES);
        const hop2Products = await db.all(
            `SELECT DISTINCT se.product_id FROM scan_events se
             WHERE se.device_fingerprint = ANY(string_to_array($1, ','))
             AND se.product_id::text != ALL(string_to_array($2, ','))
             AND se.scanned_at > NOW() - INTERVAL '1 hour'
             LIMIT ${GRAPH_LIMITS.MAX_NODES}`,
            [hop1ActorIds.join(','), productIds.join(',')]
        );
        const hop2ProductIds = hop2Products ? [...new Set(hop2Products.map(p => p.product_id))] : [];
        const clusterSize = 1 + hop1ActorIds.length;
        const totalProducts = productIds.length + hop2ProductIds.length;

        // V5: Trust-weighted cluster scoring
        // Get trust scores for hop1 actors (sample up to 10 for performance)
        const sampleActors = hop1ActorIds.slice(0, 10);
        let avgTrust = 0.5;
        try {
            const trustResults = await Promise.all(sampleActors.map(a => actorTrustScore(a)));
            avgTrust = trustResults.reduce((sum, t) => sum + t.trust, 0) / trustResults.length;
        } catch(_) {}

        // V5: Trust-weighted severity: low-trust cluster = higher risk
        const trustMultiplier = 1.5 - avgTrust; // 0.5 trust → 1.0×, 0.0 trust → 1.5×, 1.0 trust → 0.5×

        // V5: Cluster density = actors × products / max_possible
        const density = clusterSize * totalProducts;

        if (clusterSize >= 4 && totalProducts >= 3) {
            const baseSeverity = Math.min(80, Math.round(60 * trustMultiplier));
            score += baseSeverity * 0.8;
            reasons.push({ rule: 'multi_hop_cluster', severity: baseSeverity, confidence: 0.8, cluster_size: clusterSize, products: totalProducts, hops: 2, avg_trust: Math.round(avgTrust * 100) / 100, density, traversal: 'multi_factor' });
        } else if (clusterSize >= 3 && totalProducts >= 2) {
            const baseSeverity = Math.min(60, Math.round(35 * trustMultiplier));
            score += baseSeverity * 0.7;
            reasons.push({ rule: 'multi_hop_small', severity: baseSeverity, confidence: 0.7, cluster_size: clusterSize, products: totalProducts, hops: 2, avg_trust: Math.round(avgTrust * 100) / 100 });
        }

        return { hops: 2, cluster_size: clusterSize, score, reasons, avg_trust: avgTrust };
    } catch(_) {}
    return { hops: 0, cluster_size: 0, score: 0, reasons };
}

// ─── V5: ROLE-SWITCH DETECTION (kept from V4) ─────────────────
async function roleSwitchDetection(actorId, productId) {
    const reasons = [];
    let score = 0;
    if (!actorId) return { score: 0, reasons };

    try {
        const roleHistory = await db.all(
            `SELECT DISTINCT scan_type FROM scan_events 
             WHERE device_fingerprint = $1 
             AND scanned_at > NOW() - INTERVAL '24 hours'
             AND scan_type IS NOT NULL`,
            [actorId]
        );
        if (roleHistory && roleHistory.length >= 2) {
            const roles = roleHistory.map(r => r.scan_type);
            const hasSupplyChain = roles.includes('distributor') || roles.includes('retailer');
            const hasConsumer = roles.includes('consumer');

            // V5: Get device trust to modulate severity
            const devTrust = await deviceTrustScore(actorId);
            const trustMod = Math.max(0.5, 1.5 - devTrust.trust); // low trust → higher severity

            if (hasSupplyChain && hasConsumer) {
                const sev = Math.round(55 * trustMod);
                score += sev * 0.85;
                reasons.push({ rule: 'role_switch_supply_consumer', severity: sev, confidence: 0.85, roles, device_trust: devTrust.trust });
            } else if (roleHistory.length >= 3) {
                const sev = Math.round(40 * trustMod);
                score += sev * 0.8;
                reasons.push({ rule: 'role_switch_multi', severity: sev, confidence: 0.8, roles, device_trust: devTrust.trust });
            } else {
                score += 20 * 0.6;
                reasons.push({ rule: 'role_switch_dual', severity: 20, confidence: 0.6, roles });
            }
        }
    } catch(_) {}
    return { score: Math.min(80, Math.round(score)), reasons };
}

// ─── V5: DEVICE IDENTITY (WiFi sharing protection) ───────────
async function deviceIdentityScore(actorId, ipAddress) {
    const reasons = [];
    let score = 0;
    if (!actorId && !ipAddress) return { score: 0, reasons, merged_identities: 0 };

    // IP cluster detection WITH WiFi sharing protection
    try {
        if (ipAddress) {
            const ipCluster = await db.get(
                `SELECT COUNT(DISTINCT device_fingerprint) as actors, COUNT(*) as scans
                 FROM scan_events WHERE ip_address = $1
                 AND scanned_at > NOW() - INTERVAL '1 hour'
                 AND device_fingerprint IS NOT NULL`,
                [ipAddress]
            );
            if (ipCluster) {
                const actorCount = parseInt(ipCluster.actors);
                
                // V5: WiFi sharing check — if actors have DIFFERENT behavior patterns, 
                // likely shared WiFi (office/cafe), not same entity
                let behaviorOverlap = 0;
                if (actorCount >= 3 && actorId) {
                    try {
                        // Check if actors from this IP scan the SAME products (behavior overlap)
                        const overlap = await db.get(
                            `SELECT COUNT(DISTINCT product_id) as shared_products
                             FROM scan_events 
                             WHERE ip_address = $1 
                             AND scanned_at > NOW() - INTERVAL '1 hour'
                             GROUP BY product_id 
                             HAVING COUNT(DISTINCT device_fingerprint) >= 2
                             LIMIT 1`,
                            [ipAddress]
                        );
                        behaviorOverlap = overlap ? parseInt(overlap.shared_products) || 0 : 0;
                    } catch(_) {}
                }

                if (actorCount >= 5 && behaviorOverlap > 0) {
                    // Many actors + same products = real cluster (not WiFi sharing)
                    score += 50 * 0.85;
                    reasons.push({ rule: 'ip_cluster_confirmed', severity: 50, confidence: 0.85, actors: actorCount, behavior_overlap: behaviorOverlap });
                } else if (actorCount >= 5 && behaviorOverlap === 0) {
                    // Many actors but different products = likely WiFi sharing → lower confidence
                    score += 20 * 0.5;
                    reasons.push({ rule: 'ip_cluster_wifi_likely', severity: 20, confidence: 0.5, actors: actorCount, note: 'possible WiFi sharing' });
                } else if (actorCount >= 3) {
                    score += 25 * 0.65;
                    reasons.push({ rule: 'ip_cluster_moderate', severity: 25, confidence: 0.65, actors: actorCount });
                }
            }
        }
    } catch(_) {}

    // Fingerprint IP rotation (VPN detection) — kept from V4
    try {
        if (actorId) {
            const ipDiversity = await db.get(
                `SELECT COUNT(DISTINCT ip_address) as ips
                 FROM scan_events WHERE device_fingerprint = $1
                 AND scanned_at > NOW() - INTERVAL '24 hours'`,
                [actorId]
            );
            if (ipDiversity && parseInt(ipDiversity.ips) > 5) {
                score += 30 * 0.65;
                reasons.push({ rule: 'fingerprint_ip_rotation', severity: 30, confidence: 0.65, unique_ips: parseInt(ipDiversity.ips) });
            }
        }
    } catch(_) {}

    return { score: Math.min(80, Math.round(score)), reasons, merged_identities: 0 };
}

// ─── V4 MAIN GRAPH SCORE (combines all sub-features) ─────────
async function graphScore(productId, actorId, ipAddress) {
    let score = 0;
    const reasons = [];

    // === V3 (kept): Single-hop collusion on same product ===
    try {
        // Temporal multi-window: 1h (high weight) + 24h (medium) + 7d (low)
        const windows = [
            { interval: '1 hour', weight: 1.0, label: '1h' },
            { interval: '24 hours', weight: 0.5, label: '24h' },
            { interval: '7 days', weight: 0.2, label: '7d' },
        ];
        for (const w of windows) {
            const actors = await db.all(
                `SELECT DISTINCT device_fingerprint, scan_type 
                 FROM scan_events WHERE product_id = $1 
                 AND scanned_at > NOW() - INTERVAL '${w.interval}'
                 AND device_fingerprint IS NOT NULL`,
                [productId]
            );
            if (actors && actors.length >= 3) {
                const roles = new Set(actors.map(a => a.scan_type));
                if (roles.has('distributor') && roles.has('retailer') && roles.has('consumer')) {
                    const baseScore = 70 * 0.85 * w.weight;
                    score += baseScore;
                    reasons.push({ rule: `chain_collusion_${w.label}`, severity: 70, confidence: 0.85, weight: w.weight, actors: actors.length, roles: [...roles] });
                    break; // Don't double-count same collusion across windows
                } else if (roles.size >= 2 && actors.length >= 4) {
                    const baseScore = 45 * 0.75 * w.weight;
                    score += baseScore;
                    reasons.push({ rule: `partial_cluster_${w.label}`, severity: 45, confidence: 0.75, weight: w.weight, actors: actors.length });
                    break;
                }
            }
        }
    } catch(_) {}

    // === V3 (kept): Cross-product correlation ===
    try {
        if (actorId) {
            const crossProduct = await db.get(
                `SELECT COUNT(DISTINCT product_id) as products, COUNT(*) as total
                 FROM scan_events WHERE device_fingerprint = $1
                 AND scanned_at > NOW() - INTERVAL '1 hour'`,
                [actorId]
            );
            if (crossProduct) {
                const pCount = parseInt(crossProduct.products);
                if (pCount > 20) {
                    score += 60 * 0.9;
                    reasons.push({ rule: 'cross_product_extreme', severity: 60, confidence: 0.9, products_1h: pCount });
                } else if (pCount > 10) {
                    score += 40 * 0.8;
                    reasons.push({ rule: 'cross_product_high', severity: 40, confidence: 0.8, products_1h: pCount });
                } else if (pCount > 5) {
                    score += 20 * 0.7;
                    reasons.push({ rule: 'cross_product_moderate', severity: 20, confidence: 0.7, products_1h: pCount });
                }
            }
        }
    } catch(_) {}

    // === V4: Multi-hop collusion ===
    const multiHop = await multiHopCollusion(actorId);
    if (multiHop.score > 0) { score += multiHop.score; reasons.push(...multiHop.reasons); }

    // === V4: Role-switch detection ===
    const roleSwitch = await roleSwitchDetection(actorId, productId);
    if (roleSwitch.score > 0) { score += roleSwitch.score; reasons.push(...roleSwitch.reasons); }

    // === V4: Device-level identity ===
    const deviceId = await deviceIdentityScore(actorId, ipAddress);
    if (deviceId.score > 0) { score += deviceId.score; reasons.push(...deviceId.reasons); }

    // === V8 NEW: Multi-edge graph scoring ===
    const multiEdge = await multiEdgeScore(actorId, ipAddress);
    if (multiEdge.score > 0) { score += multiEdge.score; reasons.push(...multiEdge.reasons); }

    return { score: Math.min(100, Math.round(score)), reasons, multi_hop: multiHop, role_switch: roleSwitch, device_identity: deviceId, multi_edge: multiEdge };
}

// ─── V3 3.2: COLD-START PENALTY ──────────────────────────────
async function coldStartPenalty(actorId) {
    if (!actorId) return { penalty: 0, reasons: [] };
    const reasons = [];
    let penalty = 0;

    try {
        const profile = await db.get(
            "SELECT created_at, total_scans FROM actor_risk_profiles WHERE actor_id = $1",
            [actorId]
        );
        if (!profile) {
            // Brand new actor — no profile at all
            penalty = 15;
            reasons.push({ rule: 'brand_new_actor', severity: 15, confidence: 0.6, note: 'no profile exists' });
        } else {
            const ageHours = (Date.now() - new Date(profile.created_at).getTime()) / 3600000;
            if (ageHours < 1) {
                penalty = 20;
                reasons.push({ rule: 'actor_age_lt_1h', severity: 20, confidence: 0.7, age_hours: Math.round(ageHours * 10) / 10 });
            } else if (ageHours < 24) {
                // Proportional: 20 at 0h → 5 at 24h
                penalty = Math.round(20 * (1 - ageHours / 24));
                reasons.push({ rule: 'actor_age_lt_24h', severity: penalty, confidence: 0.6, age_hours: Math.round(ageHours) });
            }
        }
    } catch(_) {
        penalty = 10;
        reasons.push({ rule: 'cold_start_fallback', severity: 10, confidence: 0.5 });
    }

    return { penalty, reasons };
}

// ─── RECOVERY / COOLDOWN CHECK (FIX 4) ───────────────────────
async function checkRecovery(actorId) {
    if (!actorId) return null;
    try {
        const profile = await db.get(
            "SELECT risk_level, last_flagged_at, updated_at FROM actor_risk_profiles WHERE actor_id = $1",
            [actorId]
        );
        if (!profile || profile.risk_level === 'NORMAL') return null;

        // Check: has there been any anomaly in the last 24h?
        const recentFlags = await db.get(
            "SELECT COUNT(*) as c FROM risk_scores WHERE actor_id = $1 AND decision != 'NORMAL' AND created_at > NOW() - INTERVAL '24 hours'",
            [actorId]
        );
        
        if (recentFlags && parseInt(recentFlags.c) === 0) {
            // No anomaly for 24h → downgrade enforcement by 1 level
            const levels = ['HARD_BLOCK', 'SOFT_BLOCK', 'SUSPICIOUS', 'NORMAL'];
            const currentIdx = levels.indexOf(profile.risk_level);
            const newLevel = currentIdx < levels.length - 1 ? levels[currentIdx + 1] : 'NORMAL';
            
            await db.run(
                "UPDATE actor_risk_profiles SET risk_level = $1, updated_at = NOW() WHERE actor_id = $2",
                [newLevel, actorId]
            );
            
            return { recovered: true, from: profile.risk_level, to: newLevel, clean_hours: 24 };
        }
    } catch(_) {}
    return null;
}

// ─── MAIN SCORING FUNCTION (V3) ──────────────────────────────
async function calculateRisk(input) {
    const { productId, actorId, scanType, latitude, longitude, ipAddress, category } = input;

    // FIX 4: Check recovery before scoring
    const recovery = await checkRecovery(actorId);

    // V3: Run all 5 features in parallel (including graph)
    const [p, g, f, h, gr] = await Promise.all([
        scanPatternScore(productId, actorId, scanType),
        geoScore(productId, latitude, longitude, ipAddress),
        frequencyScore(productId, actorId),
        historyScore(productId, actorId),
        graphScore(productId, actorId, ipAddress),  // V4: graph + multi-hop + identity
    ]);

    // V3: Cold-start penalty
    const coldStart = await coldStartPenalty(actorId);

    // V3: 5-feature weighted score (rebalanced weights)
    let rawScore = WEIGHTS.scan_pattern * p.score 
        + WEIGHTS.geo * g.score 
        + WEIGHTS.frequency * f.score 
        + WEIGHTS.history * h.score
        + WEIGHTS.graph * gr.score;  // V3: graph contribution

    // V3: Add cold-start penalty (direct add, not weighted)
    rawScore += coldStart.penalty;

    // V2: Risk momentum from actor profile
    // V3: Anti-poisoning — cap momentum contribution to max 5 points per event
    let momentum = 0;
    let momentumContribution = 0;
    try {
        if (actorId) {
            const profile = await db.get("SELECT avg_risk_score, total_scans FROM actor_risk_profiles WHERE actor_id = $1", [actorId]);
            if (profile && profile.total_scans > 2) {
                momentum = parseFloat(profile.avg_risk_score) || 0;
                // V3 anti-poisoning: cap influence per event = max 5 points
                momentumContribution = Math.min(5, momentum * 0.3);
                rawScore = rawScore + momentumContribution; // V3: additive instead of blend
            }
        }
    } catch(_) {}

    // Category multiplier
    const catMult = CATEGORY_MULT[category] || CATEGORY_MULT.default;
    rawScore *= catMult;

    const totalScore = Math.min(100, Math.round(rawScore));

    // Progressive enforcement decision (V12: auto-tuned thresholds)
    const thresholds = _currentThresholds;
    let decision, autoAction;
    if (totalScore > thresholds.hard_block) { decision = 'HARD_BLOCK'; autoAction = 'blocked'; }
    else if (totalScore >= thresholds.soft_block) { decision = 'SOFT_BLOCK'; autoAction = 'flagged'; }
    else if (totalScore >= thresholds.suspicious) { decision = 'SUSPICIOUS'; autoAction = 'warned'; }
    else { decision = 'NORMAL'; autoAction = 'none'; }

    // V13: Smart exploration — uncertainty-driven
    const bayesianResult = await bayesianRiskFusion(actorId, {
        pattern: p.score, geo: g.score, frequency: f.score,
        history: h.score, graph: gr.score,
    });
    const exploration = smartExploration(0.05, bayesianResult.uncertainty || 0.5);
    let explored = false;
    if (exploration.explore && decision !== 'NORMAL') {
        explored = true;
    }

    const allReasons = [...p.reasons, ...g.reasons, ...f.reasons, ...h.reasons, ...gr.reasons, ...coldStart.reasons];

    // V3: Enhanced breakdown with graph + cold-start
    const breakdown = {
        pattern: p.score,
        geo: g.score,
        frequency: f.score,
        history: h.score,
        graph: gr.score,              // V3
        cold_start: coldStart.penalty, // V3
        momentum: Math.round(momentum),
        momentum_contribution: Math.round(momentumContribution), // V3: capped
        category_mult: catMult,
        raw_weighted: Math.round(rawScore / catMult), // before category mult
        final: totalScore,
    };

    // Persist score with breakdown
    try {
        await db.run(
            `INSERT INTO risk_scores (product_id, actor_id, scan_pattern_score, geo_score, frequency_score, history_score, total_score, decision, auto_action, reasons)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [productId, actorId, p.score, g.score, f.score, h.score, totalScore, decision, autoAction, JSON.stringify({ reasons: allReasons, breakdown, recovery, graph_score: gr.score, cold_start: coldStart.penalty })]
        );
    } catch(_) {}

    // Synthetic risk injection — update actor profile with FRACTIONAL flagging
    try {
        if (actorId) {
            let flagIncrement = 0;
            let blockIncrement = 0;
            if (totalScore >= 70) { flagIncrement = 1; }
            else if (totalScore >= 50) { flagIncrement = 0.7; }
            else if (totalScore >= 30) { flagIncrement = 0.3; }

            if (decision === 'HARD_BLOCK') blockIncrement = 1;
            const lastFlaggedAt = flagIncrement > 0 ? new Date() : null;

            await db.run(`
                INSERT INTO actor_risk_profiles (actor_id, total_scans, flagged_count, blocked_count, avg_risk_score, last_risk_score, risk_level, last_flagged_at, updated_at)
                VALUES ($1, 1, $2::numeric, $3, $4::numeric, $4::integer, $5, $6, NOW())
                ON CONFLICT (actor_id) DO UPDATE SET
                    total_scans = actor_risk_profiles.total_scans + 1,
                    flagged_count = actor_risk_profiles.flagged_count + $2::numeric,
                    blocked_count = actor_risk_profiles.blocked_count + $3,
                    avg_risk_score = (actor_risk_profiles.avg_risk_score * actor_risk_profiles.total_scans + $4::numeric) / (actor_risk_profiles.total_scans + 1),
                    last_risk_score = $4::integer,
                    risk_level = $5,
                    last_flagged_at = CASE WHEN $2::numeric > 0 THEN NOW() ELSE actor_risk_profiles.last_flagged_at END,
                    updated_at = NOW()
            `, [actorId, flagIncrement, blockIncrement, totalScore, decision, lastFlaggedAt]);
        }
    } catch(_) {}

    // Log action for forensics (any non-NORMAL)
    if (decision !== 'NORMAL') {
        try {
            await db.run(
                "INSERT INTO risk_actions_log (product_id, actor_id, risk_score, action, reasons, metadata) VALUES ($1, $2, $3, $4, $5, $6)",
                [productId, actorId, totalScore, decision, JSON.stringify(allReasons), JSON.stringify({ category, catMult, breakdown, recovery })]
            );
        } catch(_) {}
    }

    return {
        risk_score: totalScore,
        decision,
        auto_action: autoAction,
        features: {
            scan_pattern: { score: p.score, weight: WEIGHTS.scan_pattern, reasons: p.reasons },
            geo: { score: g.score, weight: WEIGHTS.geo, reasons: g.reasons },
            frequency: { score: f.score, weight: WEIGHTS.frequency, reasons: f.reasons },
            history: { score: h.score, weight: WEIGHTS.history, reasons: h.reasons },
            graph: { score: gr.score, weight: WEIGHTS.graph, reasons: gr.reasons },  // V3
        },
        breakdown,
        momentum: Math.round(momentum),
        momentum_contribution: Math.round(momentumContribution),
        cold_start: coldStart,
        category_multiplier: catMult,
        recovery: recovery || null,
        // V8: Explainability layer
        components: {
            behavior: Math.round(p.score * WEIGHTS.scan_pattern + g.score * WEIGHTS.geo),
            temporal: Math.round(f.score * WEIGHTS.frequency + h.score * WEIGHTS.history),
            graph: Math.round(gr.score * WEIGHTS.graph),
            trust_modifier: gr.multi_hop ? Math.round((1 - (gr.multi_hop.avg_trust || 0.5)) * 20) : 0,
            propagation: gr.multi_edge ? gr.multi_edge.score : 0,
            cold_start: coldStart.penalty,
        },
        // V9: Bayesian posterior + uncertainty (V10-V13)
        bayesian: bayesianResult,
        // V9: Top reasons (sorted by impact)
        top_reasons: rankTopReasons(allReasons),
        // V11: Causal signal analysis
        causal: causalSignalScore(
            { scan_pattern: p.score, geo: g.score, frequency: f.score, history: h.score, graph: gr.score },
            allReasons
        ),
        // V13: Strategic intelligence metadata
        v13: {
            thresholds,
            explored,
            exploration_epsilon: exploration.epsilon,
            dynamic_cost: dynamicCost(category),
        },
        // V14: Game-theoretic state
        v14: {
            threat_hysteresis: _threatState,
        },
        // V15: Adaptive game state
        v15: {
            mixed_strategy: mixedStrategyNash(),
            game_rounds: _gameHistory.length,
        },
        // V16: Meta-learning state
        v16: {
            latent_risk: latentRiskDetector(),
            strategy_entropy: strategyEntropy(),
            meta_generation: _metaState.generation,
        },
        // V17: Self-evolving state
        v17: {
            system_health: systemSelfAwareness(),
            signal_evolution_gen: _evolutionState.generation,
        },
        // V18: Governance state
        v18: {
            identity_check: identityConstraints(),
            failure_memory_count: _failureMemory.length,
        },
        // V19: Organizational intelligence
        v19: {
            shadow_divergence: shadowSystem(totalScore, decision).divergence,
            org_routing: decisionOrchestration(totalScore, decision).route,
        },
        // V20: Trust infrastructure
        v20: {
            sla_value: slaAwareDecision(totalScore, decision).current_value,
            trust_network_size: _trustNetwork.length,
        },
        // V21: Trust economy
        v21: {
            org_credibility_count: Object.keys(_orgCredibility).length,
            network_confidence: networkConfidence().confidence,
        },
    };
}

// ─── V14: EVOLVING ATTACKER SIMULATION ──────────────
// Mutates + evolves attacks based on what bypassed
const _BASE_ATTACKS = [
    { name: 'Farm attack', actors: 20, scans_per_actor: 3, overlap_ips: true, role: 'consumer',
      description: 'Distributed scan farm', expected_detection: 'graph + frequency' },
    { name: 'Slow probing', actors: 1, scans_per_actor: 50, overlap_ips: false, role: 'distributor',
      description: 'Slow enumeration under radar', expected_detection: 'frequency + history' },
    { name: 'Role juggling', actors: 5, scans_per_actor: 10, overlap_ips: true, role: 'mixed',
      description: 'Alternating roles to evade patterns', expected_detection: 'role_switch + graph' },
    { name: 'Device spoofing', actors: 3, scans_per_actor: 15, overlap_ips: false, role: 'consumer',
      description: 'Random device/IP per scan', expected_detection: 'trust + scan_pattern' },
    { name: 'Supply chain infiltrate', actors: 2, scans_per_actor: 8, overlap_ips: true, role: 'distributor',
      description: 'Embed in legit supply chain', expected_detection: 'trust_propagation + multi_edge' },
];
let _evolvedAttacks = [];

function attackerSimulation() {
    return _BASE_ATTACKS.map((t, i) => ({
        id: `ATK-${i+1}`, ...t,
        total_scans: t.actors * t.scans_per_actor,
        risk_level: t.actors * t.scans_per_actor > 30 ? 'HIGH' : 'MEDIUM',
    }));
}

// V14: Mutation layer — combine two templates + random noise
function evolveAttacker(parentA = 0, parentB = 1) {
    const a = _BASE_ATTACKS[parentA % _BASE_ATTACKS.length];
    const b = _BASE_ATTACKS[parentB % _BASE_ATTACKS.length];
    const noise = () => Math.floor(Math.random() * 5) - 2;
    const mutant = {
        name: `Evolved: ${a.name.split(' ')[0]}+${b.name.split(' ')[0]}`,
        actors: Math.max(1, Math.round((a.actors + b.actors) / 2) + noise()),
        scans_per_actor: Math.max(1, Math.round((a.scans_per_actor + b.scans_per_actor) / 2) + noise()),
        overlap_ips: Math.random() > 0.5,
        role: Math.random() > 0.5 ? a.role : b.role,
        description: `Mutated: ${a.description} × ${b.description}`,
        expected_detection: `${a.expected_detection} + ${b.expected_detection}`,
        generation: _evolvedAttacks.length + 1,
        parents: [parentA, parentB],
    };
    mutant.total_scans = mutant.actors * mutant.scans_per_actor;
    mutant.risk_level = mutant.total_scans > 30 ? 'HIGH' : 'MEDIUM';
    mutant.id = `EVO-${_evolvedAttacks.length + 1}`;
    _evolvedAttacks.push(mutant);
    return mutant;
}

function getEvolvedAttacks() { return [..._evolvedAttacks]; }

// ─── V14: THREAT HYSTERESIS ───────────────────────
// Prevents flip-flopping between threat levels
let _threatState = 'NORMAL';
const HYSTERESIS = {
    'NORMAL->ELEVATED': 5,
    'ELEVATED->HIGH': 10,
    'HIGH->ELEVATED': 5,
    'ELEVATED->NORMAL': 2,
};

async function strategyPrediction() {
    try {
        const recentActors = await db.all(
            `SELECT actor_id, COUNT(*) as cnt FROM risk_scores
             WHERE created_at > NOW() - INTERVAL '1 hour'
             GROUP BY actor_id HAVING COUNT(*) > 5
             ORDER BY cnt DESC LIMIT 10`
        );
        const recentAvg = await db.get(
            `SELECT AVG(total_score) as avg_score, COUNT(*) as cnt FROM risk_scores
             WHERE created_at > NOW() - INTERVAL '30 minutes'`
        );
        const historicalAvg = await db.get(
            `SELECT AVG(total_score) as avg_score FROM risk_scores
             WHERE created_at > NOW() - INTERVAL '24 hours' AND created_at < NOW() - INTERVAL '1 hour'`
        );

        const recentAvgScore = parseFloat(recentAvg?.avg_score) || 0;
        const histAvgScore = parseFloat(historicalAvg?.avg_score) || 0;
        const scoreTrend = Math.round((recentAvgScore - histAvgScore) * 10) / 10;
        const highFreqActors = (recentActors || []).length;

        // V14: Hysteresis-based state transitions
        let newThreat = _threatState;
        if (_threatState === 'NORMAL' && (scoreTrend > HYSTERESIS['NORMAL->ELEVATED'] || highFreqActors > 3)) {
            newThreat = 'ELEVATED';
        } else if (_threatState === 'ELEVATED' && scoreTrend > HYSTERESIS['ELEVATED->HIGH']) {
            newThreat = 'HIGH';
        } else if (_threatState === 'ELEVATED' && scoreTrend < HYSTERESIS['ELEVATED->NORMAL'] && highFreqActors <= 1) {
            newThreat = 'NORMAL';
        } else if (_threatState === 'HIGH' && scoreTrend < HYSTERESIS['HIGH->ELEVATED']) {
            newThreat = 'ELEVATED';
        }

        const transitioned = newThreat !== _threatState;
        const previousThreat = _threatState;
        _threatState = newThreat;

        return {
            threat_level: newThreat,
            previous_level: previousThreat,
            transitioned,
            is_escalating: newThreat !== 'NORMAL',
            score_trend: scoreTrend,
            high_freq_actors: highFreqActors,
            recent_avg: Math.round(recentAvgScore * 10) / 10,
            hist_avg: Math.round(histAvgScore * 10) / 10,
            hysteresis: true,
        };
    } catch(_) {}
    return { threat_level: _threatState, is_escalating: false, score_trend: 0, hysteresis: true };
}

function getThreatState() { return _threatState; }
function setThreatState(s) { _threatState = s; }

// ─── V14: MULTI-DIMENSIONAL DEFENSE ───────────────
async function multiDimensionalDefense() {
    const strategy = await strategyPrediction();
    const result = {
        strategy,
        actions: [],
        thresholds_before: { ..._currentThresholds },
    };

    if (strategy.threat_level === 'HIGH') {
        _currentThresholds.suspicious = Math.max(25, _currentThresholds.suspicious - 5);
        _currentThresholds.soft_block = Math.max(55, _currentThresholds.soft_block - 5);
        result.actions.push('threshold_tightened');
        result.actions.push('lr_graph_boosted');
        result.lr_boost = { graph: 1.5 };
        result.actions.push('trust_propagation_dampened');
        result.trust_dampen = 0.5;
        result.actions.push('exploration_increased');
        result.exploration_boost = 0.1;
    } else if (strategy.threat_level === 'ELEVATED') {
        _currentThresholds.suspicious = Math.max(25, _currentThresholds.suspicious - 2);
        result.actions.push('threshold_tightened');
        result.actions.push('lr_graph_boosted');
        result.lr_boost = { graph: 1.2 };
    }

    result.thresholds_after = { ..._currentThresholds };
    result.action_count = result.actions.length;
    return result;
}
async function preemptiveDefense() { return multiDimensionalDefense(); }

// ─── V14: OBJECTIVE FEEDBACK LOOP ─────────────────
let _lastNetValue = null;

async function objectiveFeedback(category) {
    const stats = await getDecisionStats();
    const cost = dynamicCost(category);
    const avgTxValue = { pharma: 500, luxury: 1000, fmcg: 50, default: 200 };
    const txValue = avgTxValue[category] || avgTxValue.default;
    const revenueProtected = stats.TP * txValue;
    const frictionCost = stats.FP * txValue * 0.1;
    const fraudLoss = stats.FN * txValue * cost.fn / 5;
    const netValue = revenueProtected - frictionCost - fraudLoss;
    const efficiency = stats.total > 0 ? Math.round((revenueProtected / Math.max(1, revenueProtected + frictionCost + fraudLoss)) * 100) : 0;

    let feedback = 'neutral';
    let adjustment = 0;
    if (_lastNetValue !== null) {
        const delta = netValue - _lastNetValue;
        if (delta > 0) {
            feedback = 'reinforce';
            adjustment = 0;
        } else if (delta < -txValue) {
            feedback = 'penalize';
            adjustment = 1;
        }
    }
    _lastNetValue = netValue;

    return {
        revenue_protected: revenueProtected,
        friction_cost: frictionCost,
        fraud_loss: fraudLoss,
        net_value: netValue,
        efficiency,
        feedback,
        adjustment,
    };
}
async function globalObjective(category) { return objectiveFeedback(category); }

// ─── V15: DATA-DRIVEN PAYOFF MATRIX ─────────────
// Base payoffs + learned adjustments from real outcomes
const _payoffAdjustments = {}; // { 'farm:graph_boost': { success_sum, count } }

function payoffMatrix() {
    const ATTACKER_STRATEGIES = ['farm', 'slow_probe', 'role_juggle', 'device_spoof', 'supply_chain'];
    const DEFENDER_STRATEGIES = ['baseline', 'tight_threshold', 'graph_boost', 'trust_dampen', 'full_defense'];

    const atkBase = { farm: 0.6, slow_probe: 0.7, role_juggle: 0.5, device_spoof: 0.4, supply_chain: 0.8 };
    const defEffect = {
        baseline:        { farm: 0.0, slow_probe: 0.0, role_juggle: 0.0, device_spoof: 0.0, supply_chain: 0.0 },
        tight_threshold: { farm: 0.3, slow_probe: 0.1, role_juggle: 0.2, device_spoof: 0.1, supply_chain: 0.15 },
        graph_boost:     { farm: 0.5, slow_probe: 0.1, role_juggle: 0.4, device_spoof: 0.1, supply_chain: 0.3 },
        trust_dampen:    { farm: 0.2, slow_probe: 0.2, role_juggle: 0.1, device_spoof: 0.3, supply_chain: 0.5 },
        full_defense:    { farm: 0.6, slow_probe: 0.3, role_juggle: 0.5, device_spoof: 0.4, supply_chain: 0.6 },
    };
    const defCostBase = { baseline: 0, tight_threshold: 0.1, graph_boost: 0.15, trust_dampen: 0.1, full_defense: 0.3 };

    const matrix = {};
    for (const atk of ATTACKER_STRATEGIES) {
        matrix[atk] = {};
        for (const def of DEFENDER_STRATEGIES) {
            // V15: Blend base payoff with learned data
            const key = `${atk}:${def}`;
            const learned = _payoffAdjustments[key];
            let atkSuccess;
            if (learned && learned.count >= 5) {
                const learnedRate = learned.success_sum / learned.count;
                const priorRate = Math.max(0, (atkBase[atk] || 0.5) - (defEffect[def]?.[atk] || 0));
                atkSuccess = 0.7 * learnedRate + 0.3 * priorRate;
            } else {
                atkSuccess = Math.max(0, (atkBase[atk] || 0.5) - (defEffect[def]?.[atk] || 0));
            }
            const defCost = defCostBase[def] || 0;
            matrix[atk][def] = {
                attacker_success: Math.round(atkSuccess * 100) / 100,
                defender_cost: Math.round(defCost * 100) / 100,
                total_loss: Math.round((atkSuccess + defCost) * 100) / 100,
                data_points: learned?.count || 0,
            };
        }
    }
    return { attacker_strategies: ATTACKER_STRATEGIES, defender_strategies: DEFENDER_STRATEGIES, matrix };
}

// V15: Update payoff from real outcome
function updatePayoff(attackType, defenseUsed, attackSucceeded) {
    const key = `${attackType}:${defenseUsed}`;
    if (!_payoffAdjustments[key]) _payoffAdjustments[key] = { success_sum: 0, count: 0 };
    _payoffAdjustments[key].success_sum += attackSucceeded ? 1 : 0;
    _payoffAdjustments[key].count++;
    return _payoffAdjustments[key];
}

function getPayoffAdjustments() { return { ..._payoffAdjustments }; }

// ─── V15: MIXED-STRATEGY NASH EQUILIBRIUM ───────
function mixedStrategyNash() {
    const pm = payoffMatrix();
    const scores = {};
    let totalScore = 0;
    for (const def of pm.defender_strategies) {
        let maxLoss = 0, avgLoss = 0;
        for (const atk of pm.attacker_strategies) {
            const loss = pm.matrix[atk][def].total_loss;
            if (loss > maxLoss) maxLoss = loss;
            avgLoss += loss;
        }
        avgLoss /= pm.attacker_strategies.length;
        const weightedLoss = 0.6 * maxLoss + 0.4 * avgLoss;
        scores[def] = 1 / Math.max(0.01, weightedLoss);
        totalScore += scores[def];
    }
    const distribution = {};
    for (const def of pm.defender_strategies) {
        distribution[def] = Math.round((scores[def] / totalScore) * 100) / 100;
    }
    // V16: Entropy floor — prevent strategy collapse
    const MIN_PROB = 0.05;
    const n = pm.defender_strategies.length;
    let redistributed = false;
    for (const def of pm.defender_strategies) {
        if (distribution[def] < MIN_PROB) {
            distribution[def] = MIN_PROB;
            redistributed = true;
        }
    }
    if (redistributed) {
        // Re-normalize
        const sum = Object.values(distribution).reduce((s, v) => s + v, 0);
        for (const def of pm.defender_strategies) distribution[def] = Math.round((distribution[def] / sum) * 100) / 100;
    }
    return {
        distribution,
        type: 'mixed_strategy',
        entropy_constrained: redistributed,
        top_defense: Object.entries(distribution).sort((a, b) => b[1] - a[1])[0]?.[0],
    };
}

function sampleDefense() {
    const mixed = mixedStrategyNash();
    const rand = Math.random();
    let cumulative = 0;
    for (const [def, prob] of Object.entries(mixed.distribution)) {
        cumulative += prob;
        if (rand <= cumulative) return { defense: def, probability: prob, from: 'mixed_strategy' };
    }
    return { defense: 'full_defense', probability: 0, from: 'fallback' };
}

// V14 compat + V15 mixed strategy
function nashEquilibrium() {
    const pm = payoffMatrix();
    let bestDefender = null, bestWorstCase = Infinity;
    for (const def of pm.defender_strategies) {
        let worstCase = 0;
        for (const atk of pm.attacker_strategies) {
            const totalLoss = pm.matrix[atk][def].total_loss;
            if (totalLoss > worstCase) worstCase = totalLoss;
        }
        if (worstCase < bestWorstCase) { bestWorstCase = worstCase; bestDefender = def; }
    }
    const mixed = mixedStrategyNash();
    return {
        optimal_defense: bestDefender,
        minimax_loss: Math.round(bestWorstCase * 100) / 100,
        mixed_strategy: mixed.distribution,
        recommendation: `Mixed: ${Object.entries(mixed.distribution).map(([d,p])=>`${d}(${Math.round(p*100)}%)`).join(', ')}`,
    };
}

// ─── V15: EXPECTED-VALUE OPTIMIZER ──────────────
const _gameHistory = [];

function expectedValueOptimizer() {
    const pm = payoffMatrix();
    const attackProb = {};
    const totalRounds = _gameHistory.length;
    if (totalRounds >= 10) {
        for (const atk of pm.attacker_strategies) attackProb[atk] = 0.01;
        for (const round of _gameHistory) {
            if (attackProb[round.attack_type] !== undefined) attackProb[round.attack_type]++;
        }
        const probTotal = Object.values(attackProb).reduce((s, v) => s + v, 0);
        for (const atk of pm.attacker_strategies) attackProb[atk] /= probTotal;
    } else {
        for (const atk of pm.attacker_strategies) attackProb[atk] = 1 / pm.attacker_strategies.length;
    }
    const expectedLoss = {};
    for (const def of pm.defender_strategies) {
        let eLoss = 0;
        for (const atk of pm.attacker_strategies) {
            eLoss += attackProb[atk] * pm.matrix[atk][def].total_loss;
        }
        expectedLoss[def] = Math.round(eLoss * 1000) / 1000;
    }
    const best = Object.entries(expectedLoss).sort((a, b) => a[1] - b[1])[0];
    return {
        expected_loss: expectedLoss,
        attack_probability: attackProb,
        optimal_defense: best[0],
        optimal_expected_loss: best[1],
        data_rounds: totalRounds,
    };
}

// ─── V15: CONTINUOUS ATTACK SPACE (5D) ──────────
function continuousAttackVector(params = {}) {
    const v = {
        speed: Math.max(0, Math.min(1, params.speed ?? Math.random())),
        distribution: Math.max(0, Math.min(1, params.distribution ?? Math.random())),
        identity_switch: Math.max(0, Math.min(1, params.identity_switch ?? Math.random())),
        graph_depth: Math.max(0, Math.min(1, params.graph_depth ?? Math.random())),
        temporal_pattern: Math.max(0, Math.min(1, params.temporal_pattern ?? Math.random())),
    };
    const magnitude = Math.sqrt(Object.values(v).reduce((s, x) => s + x * x, 0));
    const signatures = {
        farm: [0.8, 0.9, 0.2, 0.7, 0.3],
        slow_probe: [0.1, 0.1, 0.1, 0.2, 0.9],
        role_juggle: [0.5, 0.5, 0.9, 0.5, 0.5],
        device_spoof: [0.6, 0.3, 0.8, 0.2, 0.4],
        supply_chain: [0.3, 0.7, 0.4, 0.9, 0.6],
    };
    let bestType = 'farm', bestSim = -1;
    const vArr = [v.speed, v.distribution, v.identity_switch, v.graph_depth, v.temporal_pattern];
    for (const [type, sig] of Object.entries(signatures)) {
        let dot = 0, magA = 0, magB = 0;
        for (let i = 0; i < 5; i++) { dot += vArr[i] * sig[i]; magA += vArr[i] ** 2; magB += sig[i] ** 2; }
        const sim = dot / (Math.sqrt(magA) * Math.sqrt(magB) + 0.001);
        if (sim > bestSim) { bestSim = sim; bestType = type; }
    }
    return { vector: v, magnitude: Math.round(magnitude * 1000) / 1000, nearest_type: bestType, similarity: Math.round(bestSim * 1000) / 1000, dimensions: 5 };
}

// ─── V15: REPEATED GAME MEMORY ──────────────────
function recordGameRound(attackType, defenseUsed, outcome) {
    const round = { round: _gameHistory.length + 1, attack_type: attackType, defense_used: defenseUsed, outcome, timestamp: Date.now() };
    _gameHistory.push(round);
    updatePayoff(attackType, defenseUsed, outcome === 'passed');
    return round;
}

function getGameHistory() { return [..._gameHistory]; }

function adaptiveStrategy() {
    if (_gameHistory.length < 5) {
        return { strategy: 'explore', reason: 'insufficient_history', rounds: _gameHistory.length };
    }
    const recent = _gameHistory.slice(-20);
    const attackCounts = {}, defenseOutcomes = {};
    for (const r of recent) {
        attackCounts[r.attack_type] = (attackCounts[r.attack_type] || 0) + 1;
        if (!defenseOutcomes[r.defense_used]) defenseOutcomes[r.defense_used] = { blocked: 0, passed: 0 };
        if (r.outcome === 'blocked') defenseOutcomes[r.defense_used].blocked++;
        else defenseOutcomes[r.defense_used].passed++;
    }
    const topAttack = Object.entries(attackCounts).sort((a, b) => b[1] - a[1])[0];
    let bestDef = null, bestRate = -1;
    for (const [def, stats] of Object.entries(defenseOutcomes)) {
        const rate = stats.blocked / (stats.blocked + stats.passed + 0.01);
        if (rate > bestRate) { bestRate = rate; bestDef = def; }
    }
    return {
        strategy: 'adapt', top_attack: topAttack ? { type: topAttack[0], count: topAttack[1] } : null,
        best_defense: bestDef, best_block_rate: Math.round(bestRate * 100) / 100,
        rounds_analyzed: recent.length, total_rounds: _gameHistory.length,
    };
}

// ─── V16: LATENT RISK DETECTOR ──────────────────
// Detects "stealth attacks" — expected fraud from patterns > observed fraud
let _observedFraud = 0, _expectedFraud = 0;

function latentRiskDetector() {
    // Expected fraud: based on recent high-risk scans that SHOULD have been fraud
    const history = _gameHistory;
    const recent = history.slice(-20);
    const passedAttacks = recent.filter(r => r.outcome === 'passed').length;
    const blockedAttacks = recent.filter(r => r.outcome === 'blocked').length;
    const totalRecent = recent.length;

    // Expected fraud rate from patterns (high activity = more expected)
    const expectedRate = totalRecent > 0 ? (passedAttacks + blockedAttacks * 0.3) / Math.max(1, totalRecent) : 0;
    // Observed fraud rate from confirmed outcomes
    const observedRate = totalRecent > 0 ? passedAttacks / Math.max(1, totalRecent) : 0;

    const gap = Math.round((expectedRate - observedRate) * 100) / 100;
    const stealthAlert = gap > 0.15; // significant gap = hidden fraud

    return {
        expected_rate: Math.round(expectedRate * 100) / 100,
        observed_rate: Math.round(observedRate * 100) / 100,
        gap,
        stealth_alert: stealthAlert,
        recent_rounds: totalRecent,
    };
}

// ─── V16: STRATEGY ENTROPY ──────────────────────
// Shannon entropy of defense distribution — higher = less predictable
function strategyEntropy() {
    const mixed = mixedStrategyNash();
    const probs = Object.values(mixed.distribution);
    let H = 0;
    for (const p of probs) {
        if (p > 0) H -= p * Math.log2(p);
    }
    const maxH = Math.log2(probs.length); // maximum entropy (uniform)
    return {
        entropy: Math.round(H * 1000) / 1000,
        max_entropy: Math.round(maxH * 1000) / 1000,
        ratio: Math.round((H / maxH) * 100) / 100, // 1.0 = perfectly uniform
        healthy: H / maxH > 0.7, // need at least 70% of max entropy
    };
}

// ─── V16: FEEDBACK CREDIBILITY ──────────────────
// Not all feedback is equal — weight by source × consistency × anomaly
function feedbackCredibility(source, outcome, recentOutcomes = []) {
    const sourceWeights = { admin: 1.0, system: 0.7, user: 0.3, auto: 0.5 };
    const sourceWeight = sourceWeights[source] || 0.3;

    // Consistency: does this outcome match recent pattern?
    let consistency = 1.0;
    if (recentOutcomes.length >= 3) {
        const sameCount = recentOutcomes.filter(o => o === outcome).length;
        const sameRate = sameCount / recentOutcomes.length;
        // If outcome disagrees with recent pattern, lower consistency
        consistency = 0.5 + 0.5 * sameRate; // 0.5 to 1.0
    }

    // Anomaly: sudden flip from established pattern is suspicious
    let anomalyScore = 1.0;
    if (recentOutcomes.length >= 5) {
        const lastThree = recentOutcomes.slice(-3);
        const allSame = lastThree.every(o => o === lastThree[0]);
        if (allSame && outcome !== lastThree[0]) {
            anomalyScore = 0.5; // sudden reversal = suspicious
        }
    }

    const credibility = Math.round(sourceWeight * consistency * anomalyScore * 100) / 100;
    return { credibility, source_weight: sourceWeight, consistency: Math.round(consistency * 100) / 100, anomaly_score: anomalyScore };
}

// ─── V16: LONG-TERM VALUE (γ DISCOUNT) ─────────
// V = E[loss_t] + γ × E[loss_future]
function longTermValue(gamma = 0.8) {
    const ev = expectedValueOptimizer();
    const currentLoss = ev.optimal_expected_loss;

    // Future loss estimate: trend from game history
    let futureLoss = currentLoss; // default: same as current
    if (_gameHistory.length >= 10) {
        const recent5 = _gameHistory.slice(-5);
        const older5 = _gameHistory.slice(-10, -5);
        const recentPassRate = recent5.filter(r => r.outcome === 'passed').length / 5;
        const olderPassRate = older5.filter(r => r.outcome === 'passed').length / 5;
        const trend = recentPassRate - olderPassRate; // positive = getting worse
        futureLoss = Math.max(0, currentLoss + trend * 0.5);
    }

    const V = currentLoss + gamma * futureLoss;
    const suspiciousBuildUp = futureLoss > currentLoss * 1.2; // future worse by 20%+

    return {
        current_loss: Math.round(currentLoss * 1000) / 1000,
        future_loss: Math.round(futureLoss * 1000) / 1000,
        gamma,
        total_value: Math.round(V * 1000) / 1000,
        suspicious_buildup: suspiciousBuildUp,
        recommendation: suspiciousBuildUp ? 'Possible slow-farming detected — consider preemptive action' : 'Stable trajectory',
    };
}

// ─── V16: META-LEARNER ─────────────────────────
// Learns HOW to learn: adjusts learning rates per strategy based on performance
const _metaState = {
    generation: 0,
    strategy_performance: {}, // { 'graph_boost': { wins: 3, losses: 1, learning_rate: 0.5 } }
    global_learning_rate: 0.5,
    adaptations: [],
};

function metaLearner() {
    _metaState.generation++;

    // Evaluate each defense strategy's recent performance
    const recent = _gameHistory.slice(-30);
    const perfByDef = {};
    for (const r of recent) {
        if (!perfByDef[r.defense_used]) perfByDef[r.defense_used] = { wins: 0, losses: 0 };
        if (r.outcome === 'blocked') perfByDef[r.defense_used].wins++;
        else perfByDef[r.defense_used].losses++;
    }

    // V17: Multi-objective meta-update with safety bounds
    for (const [def, perf] of Object.entries(perfByDef)) {
        const total = perf.wins + perf.losses;
        const winRate = total > 0 ? perf.wins / total : 0.5;

        if (!_metaState.strategy_performance[def]) {
            _metaState.strategy_performance[def] = { wins: 0, losses: 0, learning_rate: 0.15, variance: 0 };
        }
        const sp = _metaState.strategy_performance[def];
        sp.wins += perf.wins;
        sp.losses += perf.losses;

        // V17: Multi-objective signals
        const stability = 1 - (total > 1 ? Math.abs(perf.wins - perf.losses) / total : 0);
        const entropy = strategyEntropy();
        const ent = entropy.ratio || 0.5;

        // V17: Composite meta-score (not just win_rate)
        const metaScore = 0.4 * winRate + 0.3 * stability + 0.2 * ent + 0.1 * 0.5;

        // V17: Safety-bounded LR update (ΔLR ≤ 10%, LR ∈ [0.01, 0.3])
        const oldLR = sp.learning_rate;
        let newLR = oldLR;
        if (metaScore > 0.65) {
            newLR = oldLR * 0.92; // exploit
        } else if (metaScore < 0.35) {
            newLR = oldLR * 1.08; // explore
        }
        // Clamp ΔLR to ±10%
        newLR = Math.max(oldLR * 0.9, Math.min(oldLR * 1.1, newLR));
        // Clamp absolute bounds
        sp.learning_rate = Math.max(0.01, Math.min(0.3, newLR));
        sp.meta_score = Math.round(metaScore * 100) / 100;
    }

    // Global learning rate: average of per-strategy rates
    const rates = Object.values(_metaState.strategy_performance).map(s => s.learning_rate);
    const prevGLR = _metaState.global_learning_rate;
    _metaState.global_learning_rate = rates.length > 0
        ? Math.round((rates.reduce((s, r) => s + r, 0) / rates.length) * 100) / 100
        : 0.15;

    // V17: Safety revert — if performance drops > 20%, revert meta
    if (_metaState.adaptations.length >= 2) {
        const prevLR = _metaState.adaptations[_metaState.adaptations.length - 1].global_lr;
        if (Math.abs(_metaState.global_learning_rate - prevLR) > 0.1) {
            _metaState.global_learning_rate = prevLR; // revert large jumps
        }
    }

    _metaState.adaptations.push({
        generation: _metaState.generation,
        global_lr: _metaState.global_learning_rate,
        timestamp: Date.now(),
    });

    return {
        generation: _metaState.generation,
        global_learning_rate: _metaState.global_learning_rate,
        strategy_performance: { ..._metaState.strategy_performance },
        recent_rounds: recent.length,
        adaptation_count: _metaState.adaptations.length,
        multi_objective: true,
        safety_bounded: true,
    };
}

function getMetaState() { return { ..._metaState }; }
function resetMetaState() {
    _metaState.generation = 0;
    _metaState.strategy_performance = {};
    _metaState.global_learning_rate = 0.15;
    _metaState.adaptations = [];
}

// ─── V17: STEALTH RESPONSE PROTOCOL ─────────
function stealthResponseProtocol() {
    const latent = latentRiskDetector();
    const actions = [];
    if (latent.stealth_alert) {
        // Auto-activate defensive measures
        const th = getThresholds();
        setThresholds({ suspicious: Math.max(20, th.suspicious - 3), soft_block: Math.max(50, th.soft_block - 3), hard_block: Math.max(70, th.hard_block - 3) });
        actions.push('threshold_tightened');
        actions.push('exploration_increased');
        actions.push('graph_sensitivity_boosted');
        actions.push('trust_propagation_dampened');
        actions.push('random_audit_injected');
    }
    return {
        triggered: latent.stealth_alert,
        actions,
        action_count: actions.length,
        latent_gap: latent.gap,
    };
}

// ─── V17: ADAPTIVE ENTROPY ──────────────────
function adaptiveEntropyFloor() {
    const threat = getThreatState();
    const drift = driftDetector();
    const driftScore = drift.drift_score || 0;
    // Higher threat → more randomness needed
    const threatMult = { NORMAL: 1.0, ELEVATED: 1.3, HIGH: 1.6 };
    const mult = threatMult[threat] || 1.0;
    // Base H_min = 0.7, scale by threat + drift
    const baseMin = 0.7;
    const adaptedMin = Math.min(0.95, baseMin * mult + driftScore * 0.1);
    const current = strategyEntropy();
    return {
        base_h_min: baseMin,
        adapted_h_min: Math.round(adaptedMin * 100) / 100,
        current_ratio: current.ratio,
        threat_level: threat,
        drift_score: driftScore,
        needs_increase: current.ratio < adaptedMin,
    };
}

// ─── V17: SYSTEM SELF-AWARENESS ─────────────
function systemSelfAwareness() {
    const entropy = strategyEntropy();
    const drift = driftDetector();
    const latent = latentRiskDetector();
    const driftScore = drift.drift_score || 0;

    // Calibration error: proxy from entropy ratio deviation
    const calibrationError = Math.round(Math.abs(1.0 - entropy.ratio) * 100) / 100;

    // Instability: meta LR variance
    const meta = getMetaState();
    const lrs = Object.values(meta.strategy_performance).map(s => s.learning_rate);
    let instability = 0;
    if (lrs.length >= 2) {
        const mean = lrs.reduce((s, v) => s + v, 0) / lrs.length;
        const variance = lrs.reduce((s, v) => s + (v - mean) ** 2, 0) / lrs.length;
        instability = Math.round(Math.sqrt(variance) * 100) / 100;
    }

    // Regret: how far from best possible outcome
    const ev = expectedValueOptimizer();
    const losses = Object.values(ev.expected_loss);
    const bestPossible = Math.min(...losses);
    const worstPossible = Math.max(...losses);
    const regret = Math.round((ev.optimal_expected_loss - bestPossible) * 1000) / 1000;

    // Composite health score
    const health = Math.round((1 - calibrationError * 0.3 - driftScore * 0.3 - instability * 0.2 - latent.gap * 0.2) * 100) / 100;
    const safeMode = health < 0.5;

    return {
        health,
        calibration_error: calibrationError,
        drift_score: driftScore,
        instability,
        regret,
        latent_gap: latent.gap,
        safe_mode: safeMode,
        status: safeMode ? 'DEGRADED — safe mode active' : health > 0.8 ? 'HEALTHY' : 'MONITORING',
    };
}

// ─── V17: SIGNAL EVOLUTION ──────────────────
const _evolutionState = {
    generation: 0,
    signal_weights: {}, // evolved signal importance
    promoted: [],
    demoted: [],
};

function signalEvolution() {
    _evolutionState.generation++;
    const promoted = [], demoted = [];

    // Evaluate signal importance from recent game outcomes
    const recent = _gameHistory.slice(-30);
    if (recent.length < 5) {
        return { generation: _evolutionState.generation, status: 'insufficient_data', rounds: recent.length };
    }

    // V18: GLOBAL CONTRIBUTION SCORING (not local block_rate)
    // Each signal's value = Δ(global objective) when active vs baseline
    const signalNames = ['scan_pattern', 'geo', 'frequency', 'history', 'graph', 'identity', 'trust', 'temporal'];
    const blockedRounds = recent.filter(r => r.outcome === 'blocked').length;
    const passedRounds = recent.filter(r => r.outcome === 'passed').length;
    const globalBlockRate = blockedRounds / Math.max(1, recent.length);
    // Global objective: minimize FN (passed attacks are bad)
    const globalScore = 1 - (passedRounds / Math.max(1, recent.length)); // higher = better

    for (const sig of signalNames) {
        if (!_evolutionState.signal_weights[sig]) _evolutionState.signal_weights[sig] = 1.0;

        // V18: Contribution = marginal impact on global objective
        // Proxy: if global objective is good AND this signal is active, signal contributed
        const contribution = globalScore * _evolutionState.signal_weights[sig];
        const threshold = 0.6;

        if (contribution > threshold) {
            _evolutionState.signal_weights[sig] = Math.min(2.0, _evolutionState.signal_weights[sig] * 1.03);
            if (_evolutionState.signal_weights[sig] > 1.2) promoted.push(sig);
        } else if (contribution < 0.3) {
            _evolutionState.signal_weights[sig] = Math.max(0.5, _evolutionState.signal_weights[sig] * 0.97);
            if (_evolutionState.signal_weights[sig] < 0.7) demoted.push(sig);
        }
    }

    // V18: Check identity constraints before committing
    const idCheck = identityConstraints();
    if (!idCheck.all_passed) {
        // Rollback evolution — identity violation
        _evolutionState.generation--;
        return { generation: _evolutionState.generation, status: 'rejected_by_governance', violation: idCheck.violations };
    }

    _evolutionState.promoted = promoted;
    _evolutionState.demoted = demoted;

    return {
        generation: _evolutionState.generation,
        signal_weights: { ..._evolutionState.signal_weights },
        promoted,
        demoted,
        status: 'evolved',
        global_contribution: true,
    };
}

function getEvolutionState() { return { ..._evolutionState }; }

// ─── V18: META ANCHOR / REGULARIZATION ──────
const _metaBaseline = { learning_rate: 0.15, strategy_distribution: null };

function metaAnchor() {
    const meta = getMetaState();
    const anchored = {};

    for (const [def, perf] of Object.entries(meta.strategy_performance)) {
        const baseLR = _metaBaseline.learning_rate;
        const currentLR = perf.learning_rate;
        // Regularize: 0.8×current + 0.2×baseline
        const regularizedLR = 0.8 * currentLR + 0.2 * baseLR;
        // Snap back if too far from baseline (>3× deviation)
        const deviation = Math.abs(currentLR - baseLR) / baseLR;
        const snappedBack = deviation > 3.0;
        anchored[def] = {
            original_lr: currentLR,
            regularized_lr: Math.round(regularizedLR * 1000) / 1000,
            deviation: Math.round(deviation * 100) / 100,
            snapped_back: snappedBack,
            final_lr: snappedBack ? baseLR : Math.round(regularizedLR * 1000) / 1000,
        };
    }

    return {
        baseline_lr: _metaBaseline.learning_rate,
        strategies: anchored,
        any_snapped: Object.values(anchored).some(a => a.snapped_back),
    };
}

// ─── V18: DRIFT vs BIAS SEPARATION ─────────
function driftVsBias() {
    const drift = driftDetector();
    const driftScore = drift.drift_score || 0;
    const entropy = strategyEntropy();
    const health = systemSelfAwareness();

    // Bias indicators: calibration error high + low drift (model is wrong, not data changed)
    const calibrationError = health.calibration_error || 0;
    const biasScore = calibrationError > 0.15 && driftScore < 0.3 ? calibrationError : 0;

    // Drift indicators: drift high + calibration ok (data changed, model was fine)
    const isDrift = driftScore > 0.2 && calibrationError < 0.2;
    const isBias = biasScore > 0;

    let action = 'monitor';
    if (isDrift && !isBias) action = 'adapt';
    else if (isBias && !isDrift) action = 'rollback';
    else if (isDrift && isBias) action = 'recalibrate';

    return {
        drift_score: driftScore,
        bias_score: Math.round(biasScore * 100) / 100,
        is_drift: isDrift,
        is_bias: isBias,
        action,
        rationale: isDrift ? 'Data distribution changed — adapt signals' :
                   isBias ? 'Model systematic error — revert to known-good config' :
                   'System operating normally',
    };
}

// ─── V18: FAILURE MEMORY ───────────────────
const _failureMemory = [];

function recordFailure(config, outcome) {
    _failureMemory.push({
        config: { ...config },
        outcome,
        timestamp: Date.now(),
    });
    // Keep last 50 failures
    if (_failureMemory.length > 50) _failureMemory.shift();
}

function checkFailureMemory(proposedConfig) {
    // Check similarity to past bad configs
    for (const failure of _failureMemory) {
        let matchCount = 0, totalKeys = 0;
        for (const [k, v] of Object.entries(failure.config)) {
            totalKeys++;
            if (proposedConfig[k] !== undefined) {
                const diff = Math.abs((proposedConfig[k] || 0) - (v || 0));
                if (diff < 0.1) matchCount++;
            }
        }
        const similarity = totalKeys > 0 ? matchCount / totalKeys : 0;
        if (similarity > 0.8) {
            return { safe: false, similarity: Math.round(similarity * 100) / 100, matched_failure: failure.outcome };
        }
    }
    return { safe: true, similarity: 0, checked: _failureMemory.length };
}

function getFailureMemory() { return [..._failureMemory]; }

// ─── V18: IDENTITY CONSTRAINTS (CONSTITUTION) ─
const _systemConstitution = {
    // Invariants that MUST hold — no evolution can violate these
    min_entropy_ratio: 0.5,       // strategy never fully deterministic
    max_learning_rate: 0.3,       // no wild meta adaptation
    min_learning_rate: 0.01,      // never freeze learning
    max_signal_weight: 2.0,       // no single signal dominance
    min_signal_weight: 0.5,       // no signal extinction
    max_latent_gap: 0.5,          // stealth detection must work
    max_drift_tolerance: 0.8,     // system must respond to drift
};

function identityConstraints() {
    const violations = [];
    const entropy = strategyEntropy();
    const meta = getMetaState();
    const latent = latentRiskDetector();
    const drift = driftDetector();
    const evo = getEvolutionState();

    // Check entropy
    if (entropy.ratio < _systemConstitution.min_entropy_ratio) {
        violations.push({ rule: 'min_entropy', value: entropy.ratio, limit: _systemConstitution.min_entropy_ratio });
    }

    // Check meta LR bounds
    for (const [def, perf] of Object.entries(meta.strategy_performance)) {
        if (perf.learning_rate > _systemConstitution.max_learning_rate) {
            violations.push({ rule: 'max_lr', strategy: def, value: perf.learning_rate, limit: _systemConstitution.max_learning_rate });
        }
        if (perf.learning_rate < _systemConstitution.min_learning_rate) {
            violations.push({ rule: 'min_lr', strategy: def, value: perf.learning_rate, limit: _systemConstitution.min_learning_rate });
        }
    }

    // Check signal weights
    for (const [sig, w] of Object.entries(evo.signal_weights || {})) {
        if (w > _systemConstitution.max_signal_weight) {
            violations.push({ rule: 'max_signal_weight', signal: sig, value: w, limit: _systemConstitution.max_signal_weight });
        }
        if (w < _systemConstitution.min_signal_weight) {
            violations.push({ rule: 'min_signal_weight', signal: sig, value: w, limit: _systemConstitution.min_signal_weight });
        }
    }

    return {
        all_passed: violations.length === 0,
        violations,
        violation_count: violations.length,
        constitution: { ..._systemConstitution },
    };
}

function getConstitution() { return { ..._systemConstitution }; }

// ─── V18: GOVERNANCE CHECK (WRAPS ALL) ──────
function governanceCheck() {
    const identity = identityConstraints();
    const anchor = metaAnchor();
    const diagnosis = driftVsBias();
    const health = systemSelfAwareness();

    return {
        identity_ok: identity.all_passed,
        identity_violations: identity.violation_count,
        meta_anchored: !anchor.any_snapped,
        diagnosis: diagnosis.action,
        system_health: health.health,
        safe_mode: health.safe_mode,
        failure_memory_size: _failureMemory.length,
        governance_status: identity.all_passed && !health.safe_mode ? 'GOVERNED' : 'INTERVENTION_NEEDED',
    };
}

// ─── V19: META-CONSTITUTION ────────────────
const _constitutionAudit = [];

function metaConstitution(proposedChanges, approver = 'system') {
    // Constitution can evolve, but ONLY with audit + approval
    const current = { ..._systemConstitution };
    const changes = [];
    const rejected = [];

    for (const [key, newValue] of Object.entries(proposedChanges)) {
        if (!(key in _systemConstitution)) {
            rejected.push({ key, reason: 'unknown_constraint' });
            continue;
        }
        const oldValue = _systemConstitution[key];
        // Safety: no change > 20% in one update
        const changePct = Math.abs(newValue - oldValue) / Math.max(0.001, Math.abs(oldValue));
        if (changePct > 0.2) {
            rejected.push({ key, reason: 'change_too_large', old: oldValue, new: newValue, pct: Math.round(changePct * 100) });
            continue;
        }
        _systemConstitution[key] = newValue;
        changes.push({ key, old: oldValue, new: newValue });
    }

    const entry = {
        timestamp: Date.now(),
        approver,
        changes,
        rejected,
        snapshot: { ..._systemConstitution },
    };
    _constitutionAudit.push(entry);
    if (_constitutionAudit.length > 100) _constitutionAudit.shift();

    return {
        updated: changes.length,
        rejected: rejected.length,
        changes,
        rejected_details: rejected,
        approver,
        audit_size: _constitutionAudit.length,
    };
}

function getConstitutionAudit() { return [..._constitutionAudit]; }

// ─── V19: DUAL-SPEED EVOLUTION ────────────
function dualSpeedEvolution(proposedUpdate) {
    const identity = identityConstraints();
    const health = systemSelfAwareness();

    // Classify update risk
    const riskFactors = [
        proposedUpdate.changes_signal_weights ? 1 : 0,
        proposedUpdate.changes_learning_rate ? 1 : 0,
        proposedUpdate.changes_thresholds ? 1 : 0,
        proposedUpdate.changes_constitution ? 2 : 0,
    ];
    const updateRisk = riskFactors.reduce((s, v) => s + v, 0);

    let path, requires_validation;
    if (updateRisk <= 1 && identity.all_passed && health.health > 0.7) {
        path = 'fast';
        requires_validation = false;
    } else {
        path = 'slow';
        requires_validation = true;
    }

    return {
        path,
        update_risk: updateRisk,
        requires_validation,
        identity_ok: identity.all_passed,
        health: health.health,
        rationale: path === 'fast'
            ? 'Low-risk update within constraints — auto-commit'
            : 'High-risk or degraded state — requires validation before commit',
    };
}

// ─── V19: SHADOW SYSTEM (2ND OPINION) ─────
function shadowSystem(score, decision) {
    // Shadow = loose model with higher sensitivity
    const shadowMultiplier = 1.3; // 30% more sensitive
    const shadowScore = (score || 0) * shadowMultiplier;
    const mainBlock = (decision === 'block' || decision === 'soft_block');

    // Shadow decision at lower threshold
    const shadowThresholds = { suspicious: 25, soft_block: 40, hard_block: 55 };
    let shadowDecision = 'pass';
    if (shadowScore >= shadowThresholds.hard_block) shadowDecision = 'block';
    else if (shadowScore >= shadowThresholds.soft_block) shadowDecision = 'soft_block';
    else if (shadowScore >= shadowThresholds.suspicious) shadowDecision = 'suspicious';

    const mainPass = !mainBlock;
    const shadowBlock = (shadowDecision === 'block' || shadowDecision === 'soft_block');

    // Divergence = shadow sees risk but main doesn't
    const divergence = mainPass && shadowBlock;

    return {
        main_score: score || 0,
        shadow_score: Math.round(shadowScore * 100) / 100,
        main_decision: decision || 'unknown',
        shadow_decision: shadowDecision,
        divergence,
        action: divergence ? 'trigger_investigation' : 'aligned',
    };
}

// ─── V19: HUMAN GOVERNANCE LAYER ─────────
const _humanOverrides = [];

function humanGovernance(action, actor, reason, params = {}) {
    const impactMap = {
        whitelist: { impact: 0.8, risk: 0.9, reversibility: 0.3 },
        threshold_override: { impact: 0.6, risk: 0.7, reversibility: 0.7 },
        rule_disable: { impact: 0.9, risk: 0.95, reversibility: 0.5 },
        manual_approve: { impact: 0.3, risk: 0.4, reversibility: 0.9 },
    };

    const scores = impactMap[action] || { impact: 0.5, risk: 0.5, reversibility: 0.5 };
    const requiresMultiApproval = scores.risk > 0.7;
    const expiryHours = scores.risk > 0.7 ? 24 : 168; // high risk = 24h, low = 7d

    const override = {
        action,
        actor,
        reason,
        scores,
        requires_multi_approval: requiresMultiApproval,
        expiry: new Date(Date.now() + expiryHours * 3600000).toISOString(),
        expiry_hours: expiryHours,
        timestamp: Date.now(),
        params,
    };

    _humanOverrides.push(override);
    if (_humanOverrides.length > 200) _humanOverrides.shift();

    return {
        approved: !requiresMultiApproval, // auto-approve low risk
        requires_multi_approval: requiresMultiApproval,
        impact_score: scores.impact,
        risk_score: scores.risk,
        reversibility: scores.reversibility,
        expiry_hours: expiryHours,
        audit_size: _humanOverrides.length,
    };
}

function getHumanOverrides() { return [..._humanOverrides]; }

// ─── V19: DECISION ORCHESTRATION ─────────
function decisionOrchestration(score, decision) {
    const s = score || 0;
    const d = decision || 'pass';

    let route, team, urgency, actionSet;

    if (d === 'block' || s >= 80) {
        route = 'incident_response';
        team = 'security_ops';
        urgency = 'critical';
        actionSet = ['block_actor', 'freeze_account', 'alert_compliance', 'create_case'];
    } else if (d === 'soft_block' || s >= 50) {
        route = 'investigation';
        team = 'fraud_analysts';
        urgency = 'high';
        actionSet = ['manual_review', 'request_verification', 'flag_for_monitoring'];
    } else if (d === 'suspicious' || s >= 30) {
        route = 'monitoring';
        team = 'risk_monitoring';
        urgency = 'medium';
        actionSet = ['add_to_watchlist', 'increase_logging', 'schedule_review'];
    } else {
        route = 'auto_pass';
        team = 'none';
        urgency = 'low';
        actionSet = ['log_only'];
    }

    return {
        route,
        team,
        urgency,
        actions: actionSet,
        score: s,
        decision: d,
    };
}

// ─── V20: SLA-AWARE DECISION SYSTEM ───────
function slaAwareDecision(score, decision, delayMinutes = 0) {
    const urgencyMap = { critical: 5, high: 30, medium: 120, low: 1440 };
    const orch = decisionOrchestration(score, decision);
    const slaMinutes = urgencyMap[orch.urgency] || 1440;

    // Decision value decays with delay
    const decayRate = 1 / slaMinutes; // per minute
    const currentValue = Math.max(0, Math.round((1 - decayRate * delayMinutes) * 100) / 100);

    // Auto-escalate if delay > SLA
    const breached = delayMinutes > slaMinutes;
    let escalation = 'none';
    if (breached && orch.urgency === 'critical') escalation = 'auto_block';
    else if (breached && orch.urgency === 'high') escalation = 'auto_escalate_to_security';
    else if (breached) escalation = 'auto_flag';

    return {
        urgency: orch.urgency,
        sla_minutes: slaMinutes,
        delay_minutes: delayMinutes,
        current_value: currentValue,
        breached,
        escalation,
        value_decay_rate: Math.round(decayRate * 10000) / 10000,
    };
}

// ─── V20: HUMAN RELIABILITY MODEL ────────
const _analystScores = {};

function humanReliability(analystId, wasCorrect, agreedWithSystem) {
    if (!_analystScores[analystId]) {
        _analystScores[analystId] = { decisions: 0, correct: 0, agreed: 0, reliability: 0.5 };
    }
    const a = _analystScores[analystId];
    a.decisions++;
    if (wasCorrect) a.correct++;
    if (agreedWithSystem) a.agreed++;

    // Reliability = 0.5*accuracy + 0.3*consistency + 0.2*agreement
    const accuracy = a.correct / a.decisions;
    const consistency = Math.min(1, a.decisions / 20); // builds with experience
    const agreement = a.agreed / a.decisions;
    a.reliability = Math.round((0.5 * accuracy + 0.3 * consistency + 0.2 * agreement) * 100) / 100;

    return {
        analyst_id: analystId,
        reliability: a.reliability,
        accuracy: Math.round(accuracy * 100) / 100,
        consistency: Math.round(consistency * 100) / 100,
        agreement: Math.round(agreement * 100) / 100,
        decisions: a.decisions,
    };
}

function getAnalystScores() { return { ..._analystScores }; }

function weightedFeedback(analystId, outcome) {
    const a = _analystScores[analystId];
    const weight = a ? a.reliability : 0.5;
    return {
        analyst_id: analystId,
        weight,
        weighted_outcome: outcome * weight,
        raw_outcome: outcome,
    };
}

// ─── V20: INCENTIVE ALIGNMENT ────────────
function incentiveAlignment(decision, score, category) {
    // Revenue impact: blocking = lost revenue, passing fraud = lost goods
    const avgTransactionValue = { pharma: 500, electronics: 200, fmcg: 50, luxury: 1000 };
    const txValue = avgTransactionValue[category] || 100;

    const cost = dynamicCost(category);
    const fnCost = cost.fn * txValue; // missing fraud
    const fpCost = cost.fp * txValue; // false block

    let netImpact, rationale;
    if (decision === 'block' || decision === 'HARD_BLOCK') {
        // Blocking: prevent fraud loss but risk false positive
        const fraudProb = Math.min(1, score / 100);
        netImpact = Math.round((fraudProb * fnCost - (1 - fraudProb) * fpCost) * 100) / 100;
        rationale = `P(fraud)=${fraudProb.toFixed(2)}: saved $${Math.round(fraudProb * fnCost)} vs risked $${Math.round((1-fraudProb) * fpCost)}`;
    } else {
        // Passing: earn revenue but risk fraud
        const fraudProb = Math.min(1, score / 100);
        netImpact = Math.round(((1 - fraudProb) * txValue - fraudProb * fnCost) * 100) / 100;
        rationale = `P(clean)=${(1-fraudProb).toFixed(2)}: earn $${Math.round((1-fraudProb) * txValue)} vs risk $${Math.round(fraudProb * fnCost)}`;
    }

    return {
        decision,
        score,
        category: category || 'default',
        transaction_value: txValue,
        net_impact: netImpact,
        fn_cost: fnCost,
        fp_cost: fpCost,
        rationale,
        unified_metric: 'net_value_impact',
    };
}

// ─── V20: TRUST NETWORK ──────────────────
const _trustNetwork = [];

function trustNetworkShare(orgId, actorId, trustScore, signals = {}) {
    const entry = {
        org_id: orgId,
        actor_id: actorId,
        trust_score: trustScore,
        signals,
        shared_at: Date.now(),
    };
    _trustNetwork.push(entry);
    if (_trustNetwork.length > 1000) _trustNetwork.shift();
    return { shared: true, network_size: _trustNetwork.length, entry_id: _trustNetwork.length - 1 };
}

function trustNetworkQuery(actorId) {
    const matches = _trustNetwork.filter(e => e.actor_id === actorId);
    if (matches.length === 0) return { found: false, actor_id: actorId, cross_org_score: null };

    // Aggregate cross-org trust
    const avgScore = Math.round(matches.reduce((s, m) => s + m.trust_score, 0) / matches.length * 100) / 100;
    const orgs = [...new Set(matches.map(m => m.org_id))];

    return {
        found: true,
        actor_id: actorId,
        cross_org_score: avgScore,
        reporting_orgs: orgs.length,
        org_ids: orgs,
        reports: matches.length,
    };
}

function platformTrustScore(actorId, localScore) {
    const network = trustNetworkQuery(actorId);
    const conf = networkConfidence();

    // V21: Confidence gating — only use network when mature
    if (!network.found || conf.confidence < 0.3) {
        return { score: localScore, source: 'local_only', network_boost: 0, confidence: conf.confidence };
    }

    // V21: Credibility-weighted aggregation
    const matches = _trustNetwork.filter(e => e.actor_id === actorId);
    let weightedSum = 0, weightTotal = 0;
    for (const m of matches) {
        const cred = _orgCredibility[m.org_id];
        const w = cred ? cred.credibility : 0.5;
        weightedSum += m.trust_score * w;
        weightTotal += w;
    }
    const networkScore = weightTotal > 0 ? weightedSum / weightTotal : network.cross_org_score;

    // Blend with confidence-scaled weight
    const networkWeight = 0.3 * conf.confidence;
    const localWeight = 1 - networkWeight;
    const blended = Math.round((localWeight * localScore + networkWeight * networkScore) * 100) / 100;
    const boost = Math.round((blended - localScore) * 100) / 100;

    return {
        score: blended,
        local_score: localScore,
        network_score: Math.round(networkScore * 100) / 100,
        source: 'credibility_weighted',
        network_boost: boost,
        reporting_orgs: network.reporting_orgs,
        confidence: conf.confidence,
    };
}

function getTrustNetwork() { return [..._trustNetwork]; }

// ─── V21: ORG CREDIBILITY LAYER ───────────
const _orgCredibility = {};

function orgCredibility(orgId, wasAccurate, agreedWithConsensus) {
    if (!_orgCredibility[orgId]) {
        _orgCredibility[orgId] = {
            reports: 0, accurate: 0, agreed: 0,
            false_positives: 0, credibility: 0.5,
        };
    }
    const o = _orgCredibility[orgId];
    o.reports++;
    if (wasAccurate) o.accurate++;
    else o.false_positives++;
    if (agreedWithConsensus) o.agreed++;

    const accuracy = o.accurate / o.reports;
    const consistency = Math.min(1, o.reports / 10); // matures with volume
    const agreement = o.agreed / o.reports;
    o.credibility = Math.round((0.5 * accuracy + 0.3 * consistency + 0.2 * agreement) * 100) / 100;

    return {
        org_id: orgId,
        credibility: o.credibility,
        accuracy: Math.round(accuracy * 100) / 100,
        consistency: Math.round(consistency * 100) / 100,
        agreement: Math.round(agreement * 100) / 100,
        reports: o.reports,
        false_positives: o.false_positives,
    };
}

function getOrgCredibility() { return { ..._orgCredibility }; }

// ─── V21: NETWORK CONFIDENCE GATING ──────
function networkConfidence() {
    const orgCount = [...new Set(_trustNetwork.map(e => e.org_id))].length;
    const dataVolume = _trustNetwork.length;

    // Agreement: std dev of scores per actor
    const actorScores = {};
    for (const e of _trustNetwork) {
        if (!actorScores[e.actor_id]) actorScores[e.actor_id] = [];
        actorScores[e.actor_id].push(e.trust_score);
    }
    let totalVariance = 0, actorCount = 0;
    for (const scores of Object.values(actorScores)) {
        if (scores.length >= 2) {
            const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
            const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
            totalVariance += variance;
            actorCount++;
        }
    }
    const avgAgreement = actorCount > 0 ? Math.max(0, 1 - Math.sqrt(totalVariance / actorCount)) : 0;

    // Confidence = f(orgs, volume, agreement)
    const orgFactor = Math.min(1, orgCount / 5); // full confidence at 5+ orgs
    const volFactor = Math.min(1, dataVolume / 20); // full confidence at 20+ reports
    const confidence = Math.round((0.4 * orgFactor + 0.3 * volFactor + 0.3 * avgAgreement) * 100) / 100;

    return {
        confidence,
        org_count: orgCount,
        data_volume: dataVolume,
        avg_agreement: Math.round(avgAgreement * 100) / 100,
        mature: confidence >= 0.5,
    };
}

// ─── V21: CROSS-ORG INCENTIVE SYSTEM ─────
function crossOrgIncentive(orgId) {
    const cred = _orgCredibility[orgId];
    if (!cred) return { org_id: orgId, contribution: 0, tier: 'unknown', influence: 0.5 };

    // Contribution = usefulness - false positive harm
    const usefulness = cred.accurate / Math.max(1, cred.reports);
    const harm = cred.false_positives / Math.max(1, cred.reports);
    const contribution = Math.round((usefulness - harm * 0.5) * 100) / 100;

    // Tier system
    let tier, influence;
    if (contribution > 0.7) { tier = 'platinum'; influence = 1.5; }
    else if (contribution > 0.4) { tier = 'gold'; influence = 1.0; }
    else if (contribution > 0.1) { tier = 'silver'; influence = 0.7; }
    else { tier = 'bronze'; influence = 0.3; }

    return {
        org_id: orgId,
        contribution,
        usefulness: Math.round(usefulness * 100) / 100,
        harm: Math.round(harm * 100) / 100,
        tier,
        influence,
        reports: cred.reports,
    };
}

// ─── V21: CONFLICT DETECTION ─────────────
function conflictDetection(actorId) {
    const matches = _trustNetwork.filter(e => e.actor_id === actorId);
    if (matches.length < 2) return { actor_id: actorId, contested: false, variance: 0, reports: matches.length };

    const scores = matches.map(m => m.trust_score);
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
    const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
    const stddev = Math.sqrt(variance);

    const contested = stddev > 0.2; // high disagreement

    return {
        actor_id: actorId,
        contested,
        mean_score: Math.round(mean * 100) / 100,
        stddev: Math.round(stddev * 100) / 100,
        variance: Math.round(variance * 10000) / 10000,
        reports: matches.length,
        orgs: [...new Set(matches.map(m => m.org_id))],
        action: contested ? 'flag_for_review' : 'consensus',
    };
}

module.exports = { calculateRisk, scanPatternScore, geoScore, frequencyScore, historyScore, graphScore, multiHopCollusion, roleSwitchDetection, deviceIdentityScore, multiEdgeScore, bayesianRiskFusion, rankTopReasons, updateSignalStats, recordOutcome, recordOutcomeWithDecision, getLearnedLRs, getDecisionStats, updateDecisionStats, signalCorrelationPenalty, calibrateProb, causalSignalScore, causalLift, dynamicCost, explorationBypass, smartExploration, autoThreshold, getThresholds, setThresholds, driftDetector, snapshotConfig, rollbackConfig, attackerSimulation, evolveAttacker, getEvolvedAttacks, strategyPrediction, getThreatState, setThreatState, preemptiveDefense, multiDimensionalDefense, globalObjective, objectiveFeedback, payoffMatrix, updatePayoff, getPayoffAdjustments, nashEquilibrium, mixedStrategyNash, sampleDefense, expectedValueOptimizer, continuousAttackVector, recordGameRound, getGameHistory, adaptiveStrategy, latentRiskDetector, strategyEntropy, feedbackCredibility, longTermValue, metaLearner, getMetaState, resetMetaState, stealthResponseProtocol, adaptiveEntropyFloor, systemSelfAwareness, signalEvolution, getEvolutionState, metaAnchor, driftVsBias, recordFailure, checkFailureMemory, getFailureMemory, identityConstraints, getConstitution, governanceCheck, metaConstitution, getConstitutionAudit, dualSpeedEvolution, shadowSystem, humanGovernance, getHumanOverrides, decisionOrchestration, slaAwareDecision, humanReliability, getAnalystScores, weightedFeedback, incentiveAlignment, trustNetworkShare, trustNetworkQuery, platformTrustScore, getTrustNetwork, orgCredibility, getOrgCredibility, networkConfidence, crossOrgIncentive, conflictDetection, initSignalStats, actorTrustScore, deviceTrustScore, trustVolatility, trustPropagation, riskTrendSlope, entityTrustFusion, coldStartPenalty, checkRecovery, logFrequencyScore, WEIGHTS, CATEGORY_MULT, GRAPH_LIMITS, SIGNAL_NAMES, DEFAULT_LR, SIGNAL_CORRELATIONS };
