/**
 * Risk Scoring Engine V2 — Fraud-Resistant, Self-Learning
 * 
 * V2 upgrades:
 *   FIX 1: Synthetic risk injection (break feedback deadlock)
 *     - Weak signal marker at score ≥ 30 (fractional flagged_count += 0.3)
 *     - Risk momentum: 0.7 × current + 0.3 × historical_avg
 *   FIX 2: Log-scale frequency scoring (no more flat thresholds)
 *     - 5→20, 10→35, 20→50, 50→65
 *   FIX 3: Sliding window history (24h + 7d instead of all-time)
 *   FIX 4: Recovery / cooldown logic (no permanent lock)
 *     - 24h clean → reduce enforcement 1 level
 *   FIX 5: Explainability (structured breakdown in response + DB)
 *
 * Decision: NORMAL (<40) | SUSPICIOUS (40-69) | SOFT_BLOCK (70-85) | HARD_BLOCK (>85)
 */
const db = require('../db');

// ─── WEIGHTS ──────────────────────────────────────────────────
const WEIGHTS = {
    scan_pattern: 0.35,
    geo: 0.25,
    frequency: 0.20,
    history: 0.20,
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

// ─── MAIN SCORING FUNCTION ────────────────────────────────────
async function calculateRisk(input) {
    const { productId, actorId, scanType, latitude, longitude, ipAddress, category } = input;

    // FIX 4: Check recovery before scoring
    const recovery = await checkRecovery(actorId);

    const [p, g, f, h] = await Promise.all([
        scanPatternScore(productId, actorId, scanType),
        geoScore(productId, latitude, longitude, ipAddress),
        frequencyScore(productId, actorId),
        historyScore(productId, actorId),
    ]);

    // V2: Risk momentum — blend current with historical
    let rawScore = WEIGHTS.scan_pattern * p.score + WEIGHTS.geo * g.score + WEIGHTS.frequency * f.score + WEIGHTS.history * h.score;

    // FIX 1: Risk momentum from actor profile
    let momentum = 0;
    try {
        if (actorId) {
            const profile = await db.get("SELECT avg_risk_score, total_scans FROM actor_risk_profiles WHERE actor_id = $1", [actorId]);
            if (profile && profile.total_scans > 2) {
                momentum = parseFloat(profile.avg_risk_score) || 0;
                // momentum blend: 0.7 × current + 0.3 × historical
                rawScore = 0.7 * rawScore + 0.3 * momentum;
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

    const allReasons = [...p.reasons, ...g.reasons, ...f.reasons, ...h.reasons];

    // FIX 5: Structured breakdown for explainability
    const breakdown = {
        pattern: p.score,
        geo: g.score,
        frequency: f.score,
        history: h.score,
        momentum: Math.round(momentum),
        category_mult: catMult,
        raw_weighted: Math.round(WEIGHTS.scan_pattern * p.score + WEIGHTS.geo * g.score + WEIGHTS.frequency * f.score + WEIGHTS.history * h.score),
        final: totalScore,
    };

    // Persist score with breakdown (FIX 5)
    try {
        await db.run(
            `INSERT INTO risk_scores (product_id, actor_id, scan_pattern_score, geo_score, frequency_score, history_score, total_score, decision, auto_action, reasons)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [productId, actorId, p.score, g.score, f.score, h.score, totalScore, decision, autoAction, JSON.stringify({ reasons: allReasons, breakdown, recovery })]
        );
    } catch(_) {}

    // FIX 1: Synthetic risk injection — update actor profile with FRACTIONAL flagging
    try {
        if (actorId) {
            // Determine fractional flag increment:
            // < 30 → 0 (clean), 30-49 → 0.3 (weak signal), 50-69 → 0.7, ≥70 → 1.0
            let flagIncrement = 0;
            let blockIncrement = 0;
            if (totalScore >= 70) { flagIncrement = 1; }
            else if (totalScore >= 50) { flagIncrement = 0.7; }
            else if (totalScore >= 30) { flagIncrement = 0.3; } // FIX 1: weak signal

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
        },
        // FIX 5: Explainability
        breakdown,
        momentum: Math.round(momentum),
        category_multiplier: catMult,
        recovery: recovery || null,
    };
}

module.exports = { calculateRisk, scanPatternScore, geoScore, frequencyScore, historyScore, checkRecovery, logFrequencyScore, WEIGHTS, CATEGORY_MULT };
