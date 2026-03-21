'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
// ERQF v2.0 — Enterprise Risk Quantification Framework
// Protected Module — Compiled to V8 Bytecode for Production
// ═══════════════════════════════════════════════════════════════════════════════

const _C = {
    A: { l: 'Life-Critical Regulated', b: { m: 2.8, s: 0.30 }, k: { m: 2.2, s: 0.50 }, r: { m: 0.286, s: 0.16 } },
    B: { l: 'Financial & Systemic Trust', b: { m: 2.5, s: 0.40 }, k: { m: 2.8, s: 0.70 }, r: { m: 0.429, s: 0.17 } },
    C: { l: 'Luxury & Brand-Driven', b: { m: 2.2, s: 0.30 }, k: { m: 1.9, s: 0.50 }, r: { m: 0.571, s: 0.17 } },
    D: { l: 'Consumer Mass Market', b: { m: 1.4, s: 0.20 }, k: { m: 1.5, s: 0.40 }, r: { m: 0.625, s: 0.16 } },
    E: { l: 'Industrial & Commodity', b: { m: 1.2, s: 0.20 }, k: { m: 1.25, s: 0.30 }, r: { m: 0.750, s: 0.14 } },
};

const _M = {
    pharmaceutical: 'A', aviation: 'A', nuclear_energy: 'A', blood_vaccine: 'A', life_medical_device: 'A', baby_food: 'A', waste_management: 'A', oil_gas: 'A',
    banking_finance: 'B', fund_management: 'B', cybersecurity: 'B', saas: 'B', telecom: 'B',
    luxury: 'C', jewelry_gems: 'C', premium_wine: 'C', cosmetics_skincare: 'C', premium_watches: 'C', luxury_auto: 'C', art_antiques: 'C', premium_hospitality: 'C', premium_real_estate: 'C', yacht_jet: 'C',
    fmcg: 'D', retail: 'D', fast_fashion: 'D', toys: 'D', animal_feed: 'D', furniture: 'D', household_chemicals: 'D', sporting_goods: 'D', publishing: 'D', restaurant: 'D', electronics: 'D', electronic_parts: 'D', ecommerce: 'D', home_appliances: 'D', automotive: 'D',
    mining: 'E', steel_metals: 'E', heavy_chemicals: 'E', wood_forestry: 'E', cement: 'E', water_utilities: 'E', shipbuilding: 'E', fertilizer_pesticide: 'E', machinery: 'E', construction: 'E', renewable_energy: 'E', logistics: 'E',
};

const _F = {
    pharmaceutical: 50000, aviation: 500000, banking_finance: 250000, nuclear_energy: 1000000, baby_food: 200000, blood_vaccine: 500000,
    cybersecurity: 150000, life_medical_device: 300000, fund_management: 200000, oil_gas: 400000, luxury: 30000, jewelry_gems: 50000,
    premium_wine: 40000, cosmetics_skincare: 60000, premium_watches: 35000, luxury_auto: 80000, art_antiques: 20000, premium_hospitality: 45000,
    premium_real_estate: 30000, yacht_jet: 50000, electronics: 25000, electronic_parts: 20000, telecom: 80000, logistics: 15000,
    ecommerce: 50000, saas: 40000, automotive: 75000, home_appliances: 25000, construction: 30000, renewable_energy: 20000,
    fmcg: 15000, retail: 10000, fast_fashion: 12000, toys: 80000, animal_feed: 30000, furniture: 8000, household_chemicals: 25000,
    sporting_goods: 10000, publishing: 5000, restaurant: 35000, mining: 100000, steel_metals: 20000, heavy_chemicals: 150000,
    wood_forestry: 25000, cement: 15000, waste_management: 200000, water_utilities: 80000, shipbuilding: 40000, fertilizer_pesticide: 100000, machinery: 20000,
};

const _SW = {
    A: [0.25, 0.40, 0.15, 0.20], B: [0.30, 0.35, 0.20, 0.15], C: [0.40, 0.20, 0.20, 0.20],
    D: [0.35, 0.25, 0.20, 0.20], E: [0.30, 0.25, 0.25, 0.20],
};

const _SIG = (x, mid, steep, lo, hi) => lo + (hi - lo) / (1 + Math.exp(-steep * (x - mid)));
const _RHO = 0.7;
const _LAMBDA = 0.05;
const _Z = 1.96;

function _div(erl, ebi) {
    const s = erl + ebi;
    if (s <= 0) return 0;
    const w1 = erl / s, w2 = ebi / s;
    return Math.round(s * (1 - Math.sqrt(w1 * w1 + w2 * w2 + 2 * _RHO * w1 * w2)));
}

/**
 * ERQF v2.0 — Compute enterprise risk quantification
 * @param {Object} input - All required data
 * @returns {Object} Complete risk assessment with exposure, scenarios, CI, geo, BU breakdown
 */
function computeRisk(input) {
    const { scanStats30d, scanStatsPrev, fraudAlerts, compRecords, geoBreakdown,
        categoryBreakdown, financials, dailyScanBreakdown, buConfig } = input;

    const s30 = scanStats30d || {};
    const sPrev = scanStatsPrev || {};
    const fa = fraudAlerts || {};
    const cr = compRecords || {};
    const fin = financials || {};

    const annualRevenue = Number(fin.annual_revenue) || 0;
    const brandValue = Number(fin.brand_value_estimate) || 0;
    const totalScans = parseInt(s30.total) || 0;
    const suspicious30 = parseInt(s30.suspicious) || 0;
    const counterfeit30 = parseInt(s30.counterfeit) || 0;
    const authentic30 = parseInt(s30.authentic) || 0;
    const prevFlagged = parseInt(sPrev.flagged) || 0;
    const prevTotal = parseInt(sPrev.total) || 1;

    const industry = fin.industry_type || 'pharmaceutical';
    const clusterId = _M[industry] || 'A';
    const cluster = _C[clusterId];
    const avgFine = _F[industry] || 50000;

    const preset = {
        beta: fin.custom_beta > 0 ? fin.custom_beta : cluster.b.m,
        k: fin.custom_k > 0 ? fin.custom_k : cluster.k.m,
        avgFine: fin.custom_avg_fine > 0 ? fin.custom_avg_fine : avgFine,
    };

    // §1 — P(Fraud) with Time-Decay
    const faTotal = parseInt(fa.total) || 0;
    const faCritical = parseInt(fa.critical) || 0;
    const faHigh = parseInt(fa.high) || 0;
    const confirmedProxy = faCritical + faHigh;
    const confirmationRate = faTotal > 0 ? Math.min(confirmedProxy / faTotal, 1) : 0.3;

    let pFraud;
    let trendDirection = 0;
    const dailyData = dailyScanBreakdown || [];

    if (dailyData.length >= 3) {
        let wF = 0, wT = 0;
        for (const d of dailyData) {
            const da = parseInt(d.days_ago) || 0;
            const w = Math.exp(-_LAMBDA * da);
            wF += w * ((parseInt(d.counterfeit) || 0) + (parseInt(d.suspicious) || 0) * confirmationRate);
            wT += w * (parseInt(d.total) || 0);
        }
        pFraud = wT > 0 ? wF / wT : 0;

        let r7 = { f: 0, t: 0 }, o7 = { f: 0, t: 0 };
        for (const d of dailyData) {
            const da = parseInt(d.days_ago) || 0;
            const f = (parseInt(d.counterfeit) || 0) + (parseInt(d.suspicious) || 0);
            const t = parseInt(d.total) || 0;
            if (da <= 7) { r7.f += f; r7.t += t; }
            else if (da <= 14) { o7.f += f; o7.t += t; }
        }
        const rR = r7.t > 0 ? r7.f / r7.t : 0;
        const oR = o7.t > 0 ? o7.f / o7.t : 0;
        if (rR > oR * 1.2) trendDirection = 1;
        else if (rR < oR * 0.8) trendDirection = -1;
    } else {
        pFraud = totalScans > 0 ? (counterfeit30 + suspicious30 * confirmationRate) / totalScans : 0;
    }

    // §2 — ERL
    const estimatedUnits = Number(fin.estimated_units_ytd) || 0;
    const coverageRatio = estimatedUnits > 0 ? Math.min(totalScans / (estimatedUnits / 12), 1) : 1;
    const recoveryRate = Number(fin.recovery_rate) || 0.2;
    const severity = 1 - recoveryRate;
    const revenueCovered = annualRevenue * coverageRatio;
    const ERL = Math.round(revenueCovered * pFraud * severity);

    // §3 — EBI
    const trustScore = Math.min(parseFloat(s30.avg_trust) || 90, 100);
    const brandRiskFactor = Math.pow(1 - trustScore / 100, preset.beta);
    const incidentEscalation = 1 - Math.exp(-preset.k * pFraud);
    const EBI = Math.round(brandValue * brandRiskFactor * incidentEscalation);

    // §4 — WCRS + RFE (Sigmoid)
    const crTotal = parseInt(cr.total) || 0;
    const crNonCompliant = parseInt(cr.non_compliant) || 0;
    const crPartial = parseInt(cr.partial) || 0;
    const WCRS = crTotal > 0 ? (crNonCompliant * 1.0 + crPartial * 0.5) / crTotal : 0;
    const enforcementProbability = _SIG(WCRS, 0.2, 12, 0.08, 0.65);
    const RFE = Math.round(WCRS * preset.avgFine * enforcementProbability * crNonCompliant);

    // §5 — SCRI (Cluster-Dynamic)
    const geoRiskList = geoBreakdown || [];
    const maxGeoFraud = geoRiskList.length > 0 ? Math.max(...geoRiskList.map(g => parseFloat(g.avg_fraud) || 0)) : 0;
    const prevFraudRate = prevTotal > 0 ? prevFlagged / prevTotal : 0;
    const currentFraudRate = totalScans > 0 ? (suspicious30 + counterfeit30) / totalScans : 0;
    const volatility = Math.abs(currentFraudRate - prevFraudRate);
    const sw = _SW[clusterId] || _SW.D;
    const SCRI = Math.round((sw[0] * pFraud + sw[1] * WCRS + sw[2] * Math.min(maxGeoFraud, 1) + sw[3] * Math.min(volatility * 10, 1)) * 1000) / 1000;

    // §6 — TCAR (ρ-based diversification)
    const diversification = _div(ERL, EBI);
    const TCAR = ERL + EBI + RFE - diversification;

    // §7 — 5-Point Scenarios
    function calcS(fm, td, em) {
        const sp = pFraud * fm;
        const se = Math.round(revenueCovered * sp * severity);
        const st = Math.max(0, Math.min(100, trustScore + td));
        const sb = Math.pow(1 - st / 100, preset.beta);
        const si = 1 - Math.exp(-preset.k * sp);
        const sei = Math.round(brandValue * sb * si);
        const senf = Math.min(_SIG(WCRS * em, 0.2, 12, 0.08, 0.65), 1);
        const sr = Math.round(WCRS * preset.avgFine * senf * crNonCompliant);
        const sd = _div(se, sei);
        return { erl: se, ebi: sei, rfe: sr, tcar: se + sei + sr - sd };
    }
    const scenarios = {
        best: calcS(0.6, +5, 0.3),
        moderate: calcS(0.8, +3, 0.5),
        base: { erl: ERL, ebi: EBI, rfe: RFE, tcar: TCAR },
        stress: calcS(1.5, -10, 2.0),
        extreme: calcS(2.5, -20, 3.0),
    };

    // §8 — 95% CI
    const hasCustom = fin.custom_beta > 0 || fin.custom_k > 0;
    let tcar_ci_low = TCAR, tcar_ci_high = TCAR;
    if (!hasCustom) {
        const oB = Math.max(1.0, cluster.b.m - _Z * cluster.b.s);
        const oK = Math.max(0.5, cluster.k.m - _Z * cluster.k.s);
        const oR = Math.min(0.9, cluster.r.m + _Z * cluster.r.s);
        const oSev = 1 - oR;
        const oERL = Math.round(revenueCovered * pFraud * oSev);
        const oBRF = Math.pow(1 - trustScore / 100, oB);
        const oIE = 1 - Math.exp(-oK * pFraud);
        const oEBI = Math.round(brandValue * oBRF * oIE);
        const oRFE = Math.round(WCRS * preset.avgFine * enforcementProbability * crNonCompliant);
        tcar_ci_low = Math.round(oERL + oEBI + oRFE - 0.3 * Math.min(oERL, oEBI));

        const pB = Math.min(3.5, cluster.b.m + _Z * cluster.b.s);
        const pK = Math.min(8.0, cluster.k.m + _Z * cluster.k.s);
        const pR = Math.max(0.2, cluster.r.m - _Z * cluster.r.s);
        const pSev = 1 - pR;
        const pERL = Math.round(revenueCovered * pFraud * pSev);
        const pBRF = Math.pow(1 - trustScore / 100, pB);
        const pIE = 1 - Math.exp(-pK * pFraud);
        const pEBI = Math.round(brandValue * pBRF * pIE);
        const pRFE = Math.round(WCRS * preset.avgFine * enforcementProbability * crNonCompliant);
        tcar_ci_high = Math.round(pERL + pEBI + pRFE - 0.3 * Math.min(pERL, pEBI));
    }

    // Geo Risk Map
    const geoRisk = geoRiskList.map(g => ({
        country: g.geo_country,
        scans: parseInt(g.scans),
        flagged: parseInt(g.flagged),
        fraud_rate: parseInt(g.scans) > 0 ? Math.round((parseInt(g.flagged) / parseInt(g.scans)) * 100) : 0,
        avg_fraud_score: parseFloat(g.avg_fraud) || 0,
        risk_level: parseFloat(g.avg_fraud) > 0.5 ? 'critical' : parseFloat(g.avg_fraud) > 0.3 ? 'high' : parseFloat(g.avg_fraud) > 0.1 ? 'medium' : 'low',
    }));

    // §10 — Per-BU Aggregation
    let perBU = null;
    let groupAggregated = null;

    if (buConfig && buConfig.business_units && buConfig.business_units.length > 0) {
        const catData = {};
        for (const c of (categoryBreakdown || [])) {
            catData[c.category] = {
                scans: parseInt(c.scans) || 0,
                suspicious: parseInt(c.suspicious) || 0,
                counterfeit: parseInt(c.counterfeit) || 0,
                authentic: parseInt(c.authentic) || 0,
                products: parseInt(c.products) || 0,
                avg_trust: parseFloat(c.avg_trust) || 85,
            };
        }

        const estUnits = Number(fin.estimated_units_ytd) || totalScans * 12;

        perBU = buConfig.business_units.map(bu => {
            let bS = 0, bSu = 0, bC = 0, bA = 0, bP = 0, tS = 0, tC = 0;
            for (const cat of (bu.categories || [])) {
                const cd = catData[cat];
                if (cd) {
                    bS += cd.scans; bSu += cd.suspicious; bC += cd.counterfeit;
                    bA += cd.authentic; bP += cd.products;
                    if (cd.avg_trust > 0) { tS += cd.avg_trust * cd.scans; tC += cd.scans; }
                }
            }
            const bT = tC > 0 ? tS / tC : 85;
            const bW = Number(bu.revenue_weight) || 0;
            const bRev = annualRevenue * bW;
            const bBV = brandValue * bW;
            const bPF = bS > 0 ? (bC + bSu * confirmationRate) / bS : 0;
            const bU = estUnits * bW;
            const bCov = bU > 0 ? Math.min(bS / (bU / 12), 1) : 1;
            const bRC = bRev * bCov;
            const bCI = bu.industry_type ? (_M[bu.industry_type] || 'D') : 'D';
            const bCl = _C[bCI];
            const bBeta = bu.beta || bCl.b.m;
            const bK = bu.k || bCl.k.m;
            const bAF = bu.avg_fine || (bu.industry_type ? (_F[bu.industry_type] || 25000) : 25000);
            const bERL = Math.round(bRC * bPF * severity);
            const bBRF = Math.pow(Math.max(1 - bT / 100, 0.001), bBeta);
            const bIE = 1 - Math.exp(-bK * bPF);
            const bEBI = Math.round(bBV * bBRF * bIE);
            const bRFE = Math.round(WCRS * bAF * enforcementProbability * Math.max(crNonCompliant * bW, 0.1));
            const bTCAR = bERL + bEBI + bRFE;

            return {
                id: bu.id, name: bu.name, categories: bu.categories,
                beta: bu.beta, k: bu.k, avg_fine: bu.avg_fine,
                revenue_weight: bW, scans: bS, products: bP,
                trust_score: Math.round(bT * 10) / 10,
                p_fraud: Math.round(bPF * 10000) / 100,
                erl: bERL, ebi: bEBI, rfe: bRFE, tcar: bTCAR,
            };
        });

        // Group Aggregation
        const rho = buConfig.cross_bu_correlation || 0.3;
        const gamma = buConfig.contagion_factor || 0;
        const isBH = buConfig.brand_architecture === 'branded_house';
        let gERL = 0, gEBI = 0, gRFE = 0, tW = 0;
        for (const bu of perBU) {
            gERL += bu.erl; gEBI += bu.ebi; gRFE += bu.rfe;
            tW += bu.revenue_weight || (1 / perBU.length);
        }
        let cAdj = 0;
        if (isBH && gamma > 0) {
            for (const bu of perBU) {
                const bBV = brandValue * (bu.revenue_weight || 1 / perBU.length);
                cAdj += bu.p_fraud / 100 * gamma * (brandValue - bBV) * 0.01;
            }
            cAdj = Math.round(cAdj);
            gEBI += cAdj;
        }
        const rT = gERL + gEBI + gRFE;
        const dD = Math.round(rT * (1 - rho) * 0.15);
        const gT = rT - dD;

        groupAggregated = {
            erl: gERL, ebi: gEBI, rfe: gRFE, tcar: gT,
            raw_tcar: rT, diversification_discount: dD,
            contagion_adjustment: cAdj,
            brand_architecture: buConfig.brand_architecture,
            cross_bu_correlation: rho, contagion_factor: gamma,
        };
    }

    return {
        exposure: {
            total_capital_at_risk: TCAR,
            tcar_ci_low, tcar_ci_high,
            expected_revenue_loss: ERL,
            expected_brand_impact: EBI,
            regulatory_exposure: RFE,
            diversification_adj: diversification,
            diversification_rho: _RHO,
            fraud_probability: Math.round(pFraud * 10000) / 100,
            coverage_ratio: Math.round(coverageRatio * 100),
            compliance_wcrs: Math.round(WCRS * 1000) / 1000,
            enforcement_probability: Math.round(enforcementProbability * 1000) / 1000,
            enforcement_model: 'sigmoid',
            supply_chain_scri: SCRI,
            scri_cluster_weights: sw,
            brand_risk_factor: Math.round(brandRiskFactor * 10000) / 10000,
            incident_escalation: Math.round(incidentEscalation * 10000) / 10000,
            risk_cluster: { id: clusterId, label: cluster.l },
            trend_direction: trendDirection,
            erqf_version: '2.0',
        },
        scenarios,
        geo_risk: geoRisk,
        per_bu: perBU,
        group_aggregated: groupAggregated,
        _internal: {
            pFraud, confirmationRate, severity, coverageRatio,
            trustScore, WCRS, enforcementProbability,
            currentFraudRate, prevFraudRate, volatility,
            preset, clusterId, crNonCompliant, crPartial, crTotal,
        },
    };
}

module.exports = { computeRisk };
