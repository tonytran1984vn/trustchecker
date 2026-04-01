/**
 * Causal Inference Math Core (Phase 17: Autonomous Decision System).
 * Implements Context-Aware Doubly Robust (DR) Estimator, Stabilized IPS, and Policy Gate Constraints.
 */

/**
 * Computes Doubly Robust (DR) Uplift Score using Localized Context Arrays.
 * DR = \mu_{1,X} - \mu_{0,X} + [T * (Y - \mu_{1,X}) / P] - [(1 - T) * (Y - \mu_{0,X}) / (1 - P)]
 *
 * @param {Array} observations [{ contextKey, variant, reward, propensityScore }]
 * @returns {Number} Estimated Global Incremental Uplift
 */
function computeDoublyRobust(observations, treatmentVar = 'B_OFFER_DISCOUNT') {
    // 1. Calculate Baselines grouped by Context (\mu_{1,X}, \mu_{0,X})
    const contextMu = {};
    for (const obs of observations) {
        if (!contextMu[obs.contextKey]) {
            contextMu[obs.contextKey] = { sumY1: 0, n1: 0, sumY0: 0, n0: 0 };
        }
        if (obs.variant === treatmentVar) {
            contextMu[obs.contextKey].sumY1 += obs.reward;
            contextMu[obs.contextKey].n1++;
        } else {
            contextMu[obs.contextKey].sumY0 += obs.reward;
            contextMu[obs.contextKey].n0++;
        }
    }

    const mu_hat = (contextKey, T) => {
        const bucket = contextMu[contextKey] || { sumY1: 0, n1: 0, sumY0: 0, n0: 0 };
        if (T === 1) return bucket.n1 > 0 ? bucket.sumY1 / bucket.n1 : 0;
        return bucket.n0 > 0 ? bucket.sumY0 / bucket.n0 : 0;
    };

    // 2. Compute Stabilized Causal Corrections
    let drSum = 0;
    for (const obs of observations) {
        const T = obs.variant === treatmentVar ? 1 : 0;
        const Y = obs.reward;

        // Stabilized IPS bounds
        const P_safe = Math.max(obs.propensityScore, 0.05);

        const mu1 = mu_hat(obs.contextKey, 1);
        const mu0 = mu_hat(obs.contextKey, 0);

        const drCorrection = T ? (Y - mu1) / P_safe : -((Y - mu0) / (1 - P_safe));

        drSum += mu1 - mu0 + drCorrection;
    }

    return observations.length > 0 ? drSum / observations.length : 0;
}

/**
 * Evaluates a new proposed Policy deterministically against historical exposures.
 * V(\pi) = E[ Y * \pi(T|X) / P(T|X) ]
 */
function evaluatePolicy(observations, newPolicy) {
    const rawWeights = [];

    // 1. Pre-calculate Softmax Probabilities
    for (const obs of observations) {
        const p_logged = Math.max(obs.propensityScore, 0.05);
        let p_new = 0.5;
        if (newPolicy[obs.contextKey] && newPolicy[obs.contextKey][obs.variant] !== undefined) {
            p_new = newPolicy[obs.contextKey][obs.variant];
        } else if (newPolicy['GLOBAL'] && newPolicy['GLOBAL'][obs.variant] !== undefined) {
            p_new = newPolicy['GLOBAL'][obs.variant];
        }

        const w = p_new / p_logged;
        rawWeights.push(w);
    }

    // Stabilized IPS Mathematics: w = w / mean(w)
    const sumW = rawWeights.reduce((a, b) => a + b, 0);
    const meanW = sumW > 0 ? sumW / rawWeights.length : 1;

    const normWeights = rawWeights.map(w => w / meanW);

    // P95 Clipping to prevent Explosion Bias
    const sortedW = [...normWeights].sort((a, b) => a - b);
    const p95 = sortedW[Math.floor(sortedW.length * 0.95)] || 10;

    let weightedRewardSum = 0;
    let weightSum = 0;
    let weightSqSum = 0;

    for (let i = 0; i < observations.length; i++) {
        const w_clipped = Math.min(normWeights[i], p95);

        weightedRewardSum += w_clipped * observations[i].reward;
        weightSum += w_clipped;
        weightSqSum += w_clipped * w_clipped;
    }

    const n = observations.length;
    const V_pi = weightSum > 0 ? weightedRewardSum / weightSum : 0;
    const ESS = weightSqSum > 0 ? (weightSum * weightSum) / weightSqSum : 0;
    const ESS_ratio = n > 0 ? ESS / n : 0;

    return { V_pi, ESS, ESS_ratio, N: n };
}

/**
 * Autonomous Decision Engine: The Final Kill Switch.
 */
function policyGate(metrics, baselineV) {
    // 1. Missing Observation Threshold
    if (metrics.ESS_ratio < 0.1) return 'REJECT_LACK_OF_EXPLORATION';

    // 2. Mathematically Weaker Model
    if (metrics.V_pi < baselineV - 0.02) return 'REJECT_DESTRUCTIVE_LTV';

    // 3. Shadow Approval (Extreme Variance Drop but acceptable average)
    // (We could implement real variance measurement here, placeholder for now)
    if (metrics.N < 100) return 'SHADOW_ONLY_LOW_TRAFFIC';

    return 'APPROVE_10_PERCENT'; // Gradual Rollout Recommended
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * V2.5 AGENTIC ENGINE: THE VALUATION GUARD (MONTE CARLO)
 * ════════════════════════════════════════════════════════════════════════════
 */

/**
 * 1. Fat-tail Random Generator (Student-t)
 * Uses Box-Muller transform for standard normal, then scales by Chi-Square
 * to produce thick-tailed random variables (modeling Market Panic).
 * @param {Number} df - Degrees of freedom (default 4 for robust tails)
 */
function generateStudentT(df = 4) {
    // Standard Normal via Box-Muller
    let u1 = 0,
        u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    // Chi-Square distribution (sum of squared normals)
    let chiSq = 0;
    for (let i = 0; i < df; i++) {
        let n1 = 0,
            n2 = 0;
        while (n1 === 0) n1 = Math.random();
        while (n2 === 0) n2 = Math.random();
        const sq = Math.sqrt(-2.0 * Math.log(n1)) * Math.cos(2.0 * Math.PI * n2);
        chiSq += sq * sq;
    }

    // Student-t Transformation
    const t = z / Math.sqrt(chiSq / df);
    return t;
}

/**
 * 2. Governance Penalty Mathematics
 * @param {Number} p_fraud - Probability of Fraud [0..1]
 * @param {Number} wcrs - Compliance Risk Score [0..1]
 * @param {Number} m_scale - Scale of the leak (Volume > 1000 ? 2.0 : 1.0)
 * @param {Number} kappa - ESG Sensitivity Coefficient (e.g., 20.0 for Life Critical)
 * @param {Number} zeta - Risk Amplifier (e.g., 100.0)
 * @returns {Number} Negative ESG points [0 .. -100]
 */
function calculateESGPenalty(p_fraud, wcrs, m_scale = 1.0, kappa = 20.0, zeta = 100.0, alpha = 2.0) {
    // V3.1: Dual-Shock Amplification — when both P_fraud AND WCRS are high,
    // the interaction term (alpha * P * WCRS) amplifies the penalty nonlinearly.
    // This models the real-world cascade: fraud + compliance failure = catastrophic ESG event.
    const dualShockFactor = 1 + alpha * p_fraud * wcrs;
    const shockTerm = 1 + zeta * p_fraud * wcrs * m_scale * dualShockFactor;
    const penalty = -kappa * Math.log(shockTerm);

    // Cap maximum penalty at -100 to prevent theoretical infinity
    return Math.max(penalty, -100);
}

/**
 * 3. WACC Shock (Cost of Capital Increase)
 * @param {Number} deltaESG - Governance penalty (Negative number)
 * @param {Number} lambda_esg - Yield premium per notch (e.g., 5 bps = 0.0005)
 * @returns {Number} WACC Increase (e.g., 0.0025 for 0.25%)
 */
function calculateWACCShock(deltaESG, lambda_esg = 0.0005) {
    // V3.1: Piecewise 3-Zone WACC Shock — models real capital market behavior:
    // Zone 1 (Tolerance, |ESG| < 5):  Market ignores minor ESG noise → 30% sensitivity
    // Zone 2 (Normal, 5-30):          Linear WACC premium → standard sensitivity
    // Zone 3 (Crisis, > 30):          Rating downgrade cliff → 2.5x multiplier
    const absESG = Math.abs(deltaESG);
    if (absESG < 5) return lambda_esg * absESG * 0.3;
    if (absESG < 30) return lambda_esg * 5 * 0.3 + lambda_esg * (absESG - 5);
    return lambda_esg * 5 * 0.3 + lambda_esg * 25 + lambda_esg * (absESG - 30) * 2.5;
}

/**
 * 4. Enterprise Value Destruction (Gordon Growth Baseline)
 * @param {Number} fcf - Free Cash Flow (Target USD)
 * @param {Number} wacc_0 - Original WACC (e.g., 0.08 for 8%)
 * @param {Number} deltaWACC - Shock from ESG (e.g., 0.0025)
 * @param {Number} g - Long term growth rate (e.g., 0.02 for 2%)
 */
function calculateEVD(fcf, wacc_0, deltaWACC, g = 0.02) {
    const origDenominator = Math.max(wacc_0 - g, 0.001);
    const origMultiplier = 1 / origDenominator;

    const shockedWACC = wacc_0 + deltaWACC;
    const shockedDenominator = Math.max(shockedWACC - g, 0.001);
    const shockedMultiplier = 1 / shockedDenominator;

    const evDestruction = fcf * (origMultiplier - shockedMultiplier);
    return evDestruction;
}

/**
 * 5. Monte Carlo V3.2 Agentic Simulation Engine
 * V3.1: Cholesky correlation, piecewise WACC, dual-shock ESG
 * V3.2: Per-industry df, confidence bands (P25/P75), denominator warnings, data quality
 */
function runMonteCarloESGSimulation(baseParams, iterations = 10000) {
    const {
        basePFraud,
        baseWCRS,
        m_scale = 1.0,
        kappa = 20.0,
        zeta = 100.0,
        fcf = 10000000,
        wacc_0 = 0.08,
        g = 0.02,
        lambda_esg = 0.0005,
        df = 4,
        volP = 0.03,
        volW = 0.02,
        volM = 0.5,
        volMacro = 0.005,
        gamma = 0,
        alpha = 2.0,
        rho_pw = 0.4,
        rho_pm = 0.3,
        rho_macro = 0.2,
        // V3.2: Data quality tracking
        data_quality = 'estimated', // 'configured' if org has financials set
    } = baseParams;

    const results = [];
    const effectiveZeta = zeta * (1 + gamma);

    // Cholesky orthogonal coefficients
    const cW = Math.sqrt(Math.max(1 - rho_pw * rho_pw, 0.01));
    const cM = Math.sqrt(Math.max(1 - rho_pm * rho_pm, 0.01));
    const cMacro = Math.sqrt(Math.max(1 - rho_macro * rho_macro, 0.01));

    // Baseline Enterprise Value
    const baselineDenom = Math.max(wacc_0 - g, 0.001);
    const baselineEV = fcf / baselineDenom;

    // V3.2: Track denominator warnings
    let denomWarnings = 0;

    for (let i = 0; i < iterations; i++) {
        const z1 = generateStudentT(df);
        const z2 = generateStudentT(df);
        const z3 = generateStudentT(df);
        const z4 = generateStudentT(df);

        // Cholesky-correlated noise
        const noiseP = z1 * volP;
        const noiseW = (rho_pw * z1 + cW * z2) * volW;
        const noiseM = (rho_pm * z1 + cM * z3) * volM;
        const noiseMacro = (rho_macro * z1 + cMacro * z4) * volMacro;

        const simPFraud = Math.max(Math.min(basePFraud + noiseP, 1.0), 0.001);
        const simWCRS = Math.max(Math.min(baseWCRS + noiseW, 1.0), 0.001);
        const simMScale = Math.max(m_scale + noiseM, 0.1);
        const simWaccBase = Math.max(wacc_0 + noiseMacro, g + 0.005);

        const dropESG = calculateESGPenalty(simPFraud, simWCRS, simMScale, kappa, effectiveZeta, alpha);
        const shockWACC = calculateWACCShock(dropESG, lambda_esg);
        const evd = calculateEVD(fcf, simWaccBase, shockWACC, g);

        // V3.2: Track denominator warnings
        const shockedDenom = simWaccBase + shockWACC - g;
        if (shockedDenom < 0.01) denomWarnings++;

        results.push({ dropESG, shockWACC, evd });
    }

    // Sort descending by EVD (worst case first)
    results.sort((a, b) => b.evd - a.evd);

    const p99Index = Math.floor(iterations * 0.01);
    const p95Index = Math.floor(iterations * 0.05);
    const p75Index = Math.floor(iterations * 0.25);
    const p50Index = Math.floor(iterations * 0.5);
    const p25Index = Math.floor(iterations * 0.75);

    return {
        P50: results[p50Index],
        P95: results[p95Index],
        P99: results[p99Index],
        // V3.2: Confidence band (P25–P75 range around median)
        P25: results[p25Index],
        P75: results[p75Index],
        meta: {
            engine_version: '3.2',
            iterations,
            df,
            baseline_ev: baselineEV,
            evd_ratio_p95: baselineEV > 0 ? results[p95Index].evd / baselineEV : 0,
            evd_ratio_p99: baselineEV > 0 ? results[p99Index].evd / baselineEV : 0,
            max_evd: results[0].evd,
            correlation_model: 'cholesky',
            wacc_model: 'piecewise_3zone',
            data_quality,
            // V3.2: Denominator warning — % of paths where WACC-g < 0.01
            denom_warning_pct: Math.round((denomWarnings / iterations) * 10000) / 100,
            // V3.2: Confidence band width (uncertainty measure)
            confidence_band_evd: {
                p25: results[p25Index].evd,
                p75: results[p75Index].evd,
                iqr: results[p25Index].evd - results[p75Index].evd, // InterQuartile Range
            },
        },
    };
}

module.exports = {
    computeDoublyRobust,
    evaluatePolicy,
    policyGate,
    generateStudentT,
    calculateESGPenalty,
    calculateWACCShock,
    calculateEVD,
    runMonteCarloESGSimulation,
};
