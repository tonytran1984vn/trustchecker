/**
 * Risk Scoring Engine — Fraud-Resistant V2
 * 
 * Features: confidence × severity scoring, time decay, category awareness
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

// ─── FEATURE 1: SCAN PATTERN SCORE ────────────────────────────
async function scanPatternScore(productId, actorId, scanType) {
    let score = 0;
    const reasons = [];
    let confidence = 1.0;

    // Check if product is in SOLD state
    try {
        const state = await db.get(
            "SELECT to_state FROM product_events WHERE product_id = $1 ORDER BY sequence_number DESC, created_at DESC LIMIT 1",
            [productId]
        );
        if (state && !['sell', 'SOLD', 'SCANNED'].includes(state.to_state)) {
            score += 40 * 0.9; // severity=40, confidence=0.9
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
            
            // GPS confidence decreases with indoor/inaccurate readings
            const gpsConfidence = 0.6; // Conservative — GPS can be spoofed

            if (distance > 1000 && timeDiffMin < 10) {
                score += 90 * gpsConfidence; // impossible travel
                reasons.push({ rule: 'impossible_travel', severity: 90, confidence: gpsConfidence, distance_km: Math.round(distance), time_min: Math.round(timeDiffMin) });
            } else if (distance > 500 && timeDiffMin < 5) {
                score += 70 * gpsConfidence;
                reasons.push({ rule: 'suspicious_travel', severity: 70, confidence: gpsConfidence, distance_km: Math.round(distance), time_min: Math.round(timeDiffMin) });
            }

            // Country change
            if (prevScan.geo_country && prevScan.geo_country !== 'unknown') {
                // We'd need current geo_country from IP — approximation
                if (distance > 2000) {
                    score += 30 * 0.5;
                    reasons.push({ rule: 'likely_country_change', severity: 30, confidence: 0.5 });
                }
            }
        }
    } catch(_) {}

    return { score: Math.min(100, Math.round(score)), reasons };
}

// ─── FEATURE 3: FREQUENCY SCORE ──────────────────────────────
async function frequencyScore(productId, actorId) {
    let score = 0;
    const reasons = [];

    // Scans per minute for this product
    try {
        const perMin = await db.get(
            "SELECT COUNT(*) as c FROM scan_events WHERE product_id = $1 AND scanned_at > NOW() - INTERVAL '1 minute'",
            [productId]
        );
        if (perMin) {
            const spm = parseInt(perMin.c);
            if (spm > 20) { score += 70 * 0.95; reasons.push({ rule: 'extreme_frequency', severity: 70, confidence: 0.95, spm }); }
            else if (spm > 10) { score += 50 * 0.9; reasons.push({ rule: 'high_frequency', severity: 50, confidence: 0.9, spm }); }
            else if (spm > 5) { score += 30 * 0.85; reasons.push({ rule: 'elevated_frequency', severity: 30, confidence: 0.85, spm }); }
        }
    } catch(_) {}

    // Same actor scanning many products fast (farming)
    try {
        if (actorId) {
            const actorRate = await db.get(
                "SELECT COUNT(DISTINCT product_id) as products, COUNT(*) as total FROM scan_events WHERE device_fingerprint = $1 AND scanned_at > NOW() - INTERVAL '5 minutes'",
                [actorId]
            );
            if (actorRate && actorRate.products > 10) {
                score += 40 * 0.9;
                reasons.push({ rule: 'scan_farming', severity: 40, confidence: 0.9, products: actorRate.products, total: actorRate.total });
            }
        }
    } catch(_) {}

    // Slow fraud detection: consistent scanning over long period
    try {
        const slowFraud = await db.get(
            "SELECT COUNT(*) as c FROM scan_events WHERE product_id = $1 AND scanned_at > NOW() - INTERVAL '24 hours'",
            [productId]
        );
        if (slowFraud && slowFraud.c > 20) {
            score += 25 * 0.7; // Lower confidence — could be legitimate popular product
            reasons.push({ rule: 'slow_accumulation', severity: 25, confidence: 0.7, scans_24h: slowFraud.c });
        }
    } catch(_) {}

    return { score: Math.min(100, Math.round(score)), reasons };
}

// ─── FEATURE 4: HISTORY SCORE (with time decay) ──────────────
async function historyScore(productId, actorId) {
    let score = 0;
    const reasons = [];

    // Actor history with time decay
    try {
        if (actorId) {
            const profile = await db.get(
                "SELECT flagged_count, blocked_count, avg_risk_score, last_flagged_at, risk_level FROM actor_risk_profiles WHERE actor_id = $1",
                [actorId]
            );
            if (profile) {
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
                if (profile.avg_risk_score > 50) {
                    score += 20 * 0.75;
                    reasons.push({ rule: 'actor_high_avg_risk', severity: 20, confidence: 0.75, avg: profile.avg_risk_score });
                }
            }
            // New actor (no history) — slight signal
            if (!profile) {
                score += 5 * 0.5;
                reasons.push({ rule: 'new_actor', severity: 5, confidence: 0.5 });
            }
        }
    } catch(_) {}

    // Product history
    try {
        const productScans = await db.get(
            "SELECT COUNT(*) as c FROM scan_events WHERE product_id = $1",
            [productId]
        );
        if (productScans && productScans.c > 5) {
            score += 30 * 0.8;
            reasons.push({ rule: 'product_multi_scanned', severity: 30, confidence: 0.8, scan_count: productScans.c });
        }
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

// ─── MAIN SCORING FUNCTION ────────────────────────────────────
async function calculateRisk(input) {
    const { productId, actorId, scanType, latitude, longitude, ipAddress, category } = input;

    const [p, g, f, h] = await Promise.all([
        scanPatternScore(productId, actorId, scanType),
        geoScore(productId, latitude, longitude, ipAddress),
        frequencyScore(productId, actorId),
        historyScore(productId, actorId),
    ]);

    let rawScore = WEIGHTS.scan_pattern * p.score + WEIGHTS.geo * g.score + WEIGHTS.frequency * f.score + WEIGHTS.history * h.score;

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

    // Persist score
    try {
        await db.run(
            `INSERT INTO risk_scores (product_id, actor_id, scan_pattern_score, geo_score, frequency_score, history_score, total_score, decision, auto_action, reasons)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [productId, actorId, p.score, g.score, f.score, h.score, totalScore, decision, autoAction, JSON.stringify(allReasons)]
        );
    } catch(_) {}

    // Update actor profile
    try {
        if (actorId) {
            await db.run(`
                INSERT INTO actor_risk_profiles (actor_id, total_scans, flagged_count, blocked_count, avg_risk_score, last_risk_score, risk_level, last_flagged_at, updated_at)
                VALUES ($1, 1, $2, $3, $4::numeric, $4::integer, $5, $6, NOW())
                ON CONFLICT (actor_id) DO UPDATE SET
                    total_scans = actor_risk_profiles.total_scans + 1,
                    flagged_count = actor_risk_profiles.flagged_count + $2,
                    blocked_count = actor_risk_profiles.blocked_count + $3,
                    avg_risk_score = (actor_risk_profiles.avg_risk_score * actor_risk_profiles.total_scans + $4::numeric) / (actor_risk_profiles.total_scans + 1),
                    last_risk_score = $4::integer,
                    risk_level = $5,
                    last_flagged_at = CASE WHEN $2 > 0 THEN NOW() ELSE actor_risk_profiles.last_flagged_at END,
                    updated_at = NOW()
            `, [actorId, decision === 'SOFT_BLOCK' || decision === 'HARD_BLOCK' ? 1 : 0, decision === 'HARD_BLOCK' ? 1 : 0, totalScore, decision, decision !== 'NORMAL' ? new Date() : null]);
        }
    } catch(_) {}

    // Log action for forensics
    if (decision !== 'NORMAL') {
        try {
            await db.run(
                "INSERT INTO risk_actions_log (product_id, actor_id, risk_score, action, reasons, metadata) VALUES ($1, $2, $3, $4, $5, $6)",
                [productId, actorId, totalScore, decision, JSON.stringify(allReasons), JSON.stringify({ category, catMult, scores: { p: p.score, g: g.score, f: f.score, h: h.score } })]
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
        category_multiplier: catMult,
    };
}

module.exports = { calculateRisk, scanPatternScore, geoScore, frequencyScore, historyScore, WEIGHTS, CATEGORY_MULT };
