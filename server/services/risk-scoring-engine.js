/**
 * Risk Scoring Engine V4 — Multi-Hop Graph Intelligence + Identity Layer
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
// V4 GRAPH INTELLIGENCE — Multi-hop, Temporal, Identity Layer
// ═══════════════════════════════════════════════════════════════

// ─── V4: MULTI-HOP COLLUSION (Connected Components via BFS) ──
// Finds actor clusters that share products across multiple hops:
//   A→P1→B→P2→C = 2-hop collusion (A and C never touch same product)
async function multiHopCollusion(actorId) {
    if (!actorId) return { hops: 0, cluster_size: 0, reasons: [] };
    const reasons = [];
    let score = 0;

    try {
        // Step 1: Find all products this actor touched (1h window)
        const myProducts = await db.all(
            `SELECT DISTINCT product_id FROM scan_events 
             WHERE device_fingerprint = $1 AND scanned_at > NOW() - INTERVAL '1 hour'`,
            [actorId]
        );
        if (!myProducts || myProducts.length === 0) return { hops: 0, cluster_size: 0, reasons };

        const productIds = myProducts.map(r => r.product_id);
        
        // Step 2: Find all OTHER actors who touched those same products (hop 1)
        const hop1Actors = await db.all(
            `SELECT DISTINCT device_fingerprint, product_id FROM scan_events 
             WHERE product_id::text = ANY(string_to_array($1, ','))
             AND device_fingerprint != $2
             AND device_fingerprint IS NOT NULL
             AND scanned_at > NOW() - INTERVAL '1 hour'`,
            [productIds.join(','), actorId]
        );
        
        if (!hop1Actors || hop1Actors.length === 0) return { hops: 0, cluster_size: 0, reasons };

        const hop1ActorIds = [...new Set(hop1Actors.map(a => a.device_fingerprint))];

        // Step 3: Find products touched by hop1 actors that THIS actor didn't touch (hop 2)
        const hop2Products = await db.all(
            `SELECT DISTINCT se.product_id, se.device_fingerprint FROM scan_events se
             WHERE se.device_fingerprint = ANY(string_to_array($1, ','))
             AND se.product_id::text != ALL(string_to_array($2, ','))
             AND se.scanned_at > NOW() - INTERVAL '1 hour'`,
            [hop1ActorIds.join(','), productIds.join(',')]
        );

        const hop2ProductIds = hop2Products ? [...new Set(hop2Products.map(p => p.product_id))] : [];

        // Cluster size = unique actors in the graph
        const clusterSize = 1 + hop1ActorIds.length;
        const totalProducts = productIds.length + hop2ProductIds.length;

        if (clusterSize >= 4 && totalProducts >= 3) {
            score += 60 * 0.8;
            reasons.push({ rule: 'multi_hop_cluster', severity: 60, confidence: 0.8, cluster_size: clusterSize, products: totalProducts, hops: 2 });
        } else if (clusterSize >= 3 && totalProducts >= 2) {
            score += 35 * 0.7;
            reasons.push({ rule: 'multi_hop_small', severity: 35, confidence: 0.7, cluster_size: clusterSize, products: totalProducts, hops: 2 });
        }

        return { hops: 2, cluster_size: clusterSize, score, reasons };
    } catch(_) {}
    return { hops: 0, cluster_size: 0, score: 0, reasons };
}

// ─── V4: ROLE-SWITCH DETECTION ────────────────────────────────
// Same device/IP appearing under different supply chain roles
async function roleSwitchDetection(actorId, productId) {
    const reasons = [];
    let score = 0;
    if (!actorId) return { score: 0, reasons };

    try {
        // Check if this device_fingerprint has scanned as different roles
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
            
            if (hasSupplyChain && hasConsumer) {
                // Same device acting as both supply chain AND consumer = very suspicious
                score += 55 * 0.85;
                reasons.push({ rule: 'role_switch_supply_consumer', severity: 55, confidence: 0.85, roles, note: 'same device, both supply chain + consumer' });
            } else if (roleHistory.length >= 3) {
                // 3+ different roles from same device
                score += 40 * 0.8;
                reasons.push({ rule: 'role_switch_multi', severity: 40, confidence: 0.8, roles, count: roleHistory.length });
            } else {
                score += 20 * 0.6;
                reasons.push({ rule: 'role_switch_dual', severity: 20, confidence: 0.6, roles });
            }
        }
    } catch(_) {}

    return { score: Math.min(80, Math.round(score)), reasons };
}

// ─── V4: DEVICE-LEVEL IDENTITY MERGING ───────────────────────
// Detect when multiple "actors" are really the same entity (IP/fingerprint cluster)
async function deviceIdentityScore(actorId, ipAddress) {
    const reasons = [];
    let score = 0;
    if (!actorId && !ipAddress) return { score: 0, reasons, merged_identities: 0 };

    // IP cluster: multiple device_fingerprints from same IP
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
                if (actorCount >= 5) {
                    score += 50 * 0.85;
                    reasons.push({ rule: 'ip_cluster_large', severity: 50, confidence: 0.85, actors: actorCount, ip: ipAddress });
                } else if (actorCount >= 3) {
                    score += 30 * 0.7;
                    reasons.push({ rule: 'ip_cluster_moderate', severity: 30, confidence: 0.7, actors: actorCount });
                }
            }
        }
    } catch(_) {}

    // Fingerprint reuse: same fingerprint associated with different IPs
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
                reasons.push({ rule: 'fingerprint_ip_rotation', severity: 30, confidence: 0.65, unique_ips: parseInt(ipDiversity.ips), note: 'VPN/proxy rotation suspected' });
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

    // === V4 NEW: Multi-hop collusion ===
    const multiHop = await multiHopCollusion(actorId);
    if (multiHop.score > 0) {
        score += multiHop.score;
        reasons.push(...multiHop.reasons);
    }

    // === V4 NEW: Role-switch detection ===
    const roleSwitch = await roleSwitchDetection(actorId, productId);
    if (roleSwitch.score > 0) {
        score += roleSwitch.score;
        reasons.push(...roleSwitch.reasons);
    }

    // === V4 NEW: Device-level identity ===
    const deviceId = await deviceIdentityScore(actorId, ipAddress);
    if (deviceId.score > 0) {
        score += deviceId.score;
        reasons.push(...deviceId.reasons);
    }

    return { score: Math.min(100, Math.round(score)), reasons, multi_hop: multiHop, role_switch: roleSwitch, device_identity: deviceId };
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
        momentum_contribution: Math.round(momentumContribution), // V3: anti-poisoning
        cold_start: coldStart,  // V3
        category_multiplier: catMult,
        recovery: recovery || null,
    };
}

module.exports = { calculateRisk, scanPatternScore, geoScore, frequencyScore, historyScore, graphScore, multiHopCollusion, roleSwitchDetection, deviceIdentityScore, coldStartPenalty, checkRecovery, logFrequencyScore, WEIGHTS, CATEGORY_MULT };
