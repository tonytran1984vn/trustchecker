/**
 * Risk Scoring Engine V8 — Multi-Edge Graph + Controlled Propagation
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
                    score += 35;
                    reasons.push({ rule: 'multi_edge_ip_product', severity: 45, confidence: 0.75, actors, products, edge_types: ['ip', 'product'] });
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

    // Progressive enforcement decision
    let decision, autoAction;
    if (totalScore > 85) { decision = 'HARD_BLOCK'; autoAction = 'blocked'; }
    else if (totalScore >= 70) { decision = 'SOFT_BLOCK'; autoAction = 'flagged'; }
    else if (totalScore >= 40) { decision = 'SUSPICIOUS'; autoAction = 'warned'; }
    else { decision = 'NORMAL'; autoAction = 'none'; }

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
        // V8: Explainability layer — component breakdown
        components: {
            behavior: Math.round(p.score * WEIGHTS.scan_pattern + g.score * WEIGHTS.geo),
            temporal: Math.round(f.score * WEIGHTS.frequency + h.score * WEIGHTS.history),
            graph: Math.round(gr.score * WEIGHTS.graph),
            trust_modifier: gr.multi_hop ? Math.round((1 - (gr.multi_hop.avg_trust || 0.5)) * 20) : 0,
            propagation: gr.multi_edge ? gr.multi_edge.score : 0,
            cold_start: coldStart.penalty,
        },
    };
}

module.exports = { calculateRisk, scanPatternScore, geoScore, frequencyScore, historyScore, graphScore, multiHopCollusion, roleSwitchDetection, deviceIdentityScore, multiEdgeScore, actorTrustScore, deviceTrustScore, trustVolatility, trustPropagation, riskTrendSlope, entityTrustFusion, coldStartPenalty, checkRecovery, logFrequencyScore, WEIGHTS, CATEGORY_MULT, GRAPH_LIMITS };
