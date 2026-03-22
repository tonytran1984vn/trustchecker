const { computeRisk } = require('../../../server/engines/regulatory-engine/erqf');

describe('ERQF v2.0 — Enterprise Risk Quantification', () => {
    const baseInput = {
        scanStats30d: { total: 1000, suspicious: 20, counterfeit: 10, authentic: 970, avg_trust: 85 },
        scanStatsPrev: { total: 900, flagged: 25 },
        fraudAlerts: { total: 30, critical: 5, high: 8 },
        compRecords: { total: 50, non_compliant: 3, partial: 5 },
        financials: { annual_revenue: 10000000, brand_value_estimate: 5000000, industry_type: 'pharmaceutical', estimated_units_ytd: 100000 },
        geoBreakdown: [{ geo_country: 'VN', scans: 200, flagged: 10, avg_fraud: 0.15 }],
        categoryBreakdown: [],
        dailyScanBreakdown: [],
    };

    test('returns complete exposure object', () => {
        const r = computeRisk(baseInput);
        expect(r.exposure).toBeDefined();
        expect(r.exposure.erqf_version).toBe('2.0');
    });

    test('pharmaceutical maps to cluster A', () => {
        const r = computeRisk(baseInput);
        expect(r.exposure.risk_cluster.id).toBe('A');
    });

    test('TCAR is sum of ERL + EBI + RFE - diversification', () => {
        const r = computeRisk(baseInput);
        const { expected_revenue_loss, expected_brand_impact, regulatory_exposure, diversification_adj } = r.exposure;
        expect(r.exposure.total_capital_at_risk).toBe(expected_revenue_loss + expected_brand_impact + regulatory_exposure - diversification_adj);
    });

    test('5 scenario levels', () => {
        const r = computeRisk(baseInput);
        expect(Object.keys(r.scenarios)).toEqual(['best', 'moderate', 'base', 'stress', 'extreme']);
    });

    test('stress TCAR > base TCAR', () => {
        const r = computeRisk(baseInput);
        expect(r.scenarios.stress.tcar).toBeGreaterThanOrEqual(r.scenarios.base.tcar);
    });

    test('95% confidence interval', () => {
        const r = computeRisk(baseInput);
        expect(r.exposure.tcar_ci_low).toBeLessThanOrEqual(r.exposure.total_capital_at_risk);
    });

    test('geo risk map generated', () => {
        const r = computeRisk(baseInput);
        expect(r.geo_risk.length).toBe(1);
        expect(r.geo_risk[0].country).toBe('VN');
    });

    test('different industry changes cluster', () => {
        const input = { ...baseInput, financials: { ...baseInput.financials, industry_type: 'mining' } };
        const r = computeRisk(input);
        expect(r.exposure.risk_cluster.id).toBe('E');
    });

    test('luxury cluster C', () => {
        const input = { ...baseInput, financials: { ...baseInput.financials, industry_type: 'luxury' } };
        const r = computeRisk(input);
        expect(r.exposure.risk_cluster.id).toBe('C');
    });

    test('banking cluster B', () => {
        const input = { ...baseInput, financials: { ...baseInput.financials, industry_type: 'banking_finance' } };
        const r = computeRisk(input);
        expect(r.exposure.risk_cluster.id).toBe('B');
    });

    test('FMCG cluster D', () => {
        const input = { ...baseInput, financials: { ...baseInput.financials, industry_type: 'fmcg' } };
        const r = computeRisk(input);
        expect(r.exposure.risk_cluster.id).toBe('D');
    });

    test('zero scans produces zero fraud probability', () => {
        const input = { ...baseInput, scanStats30d: { total: 0, suspicious: 0, counterfeit: 0 } };
        const r = computeRisk(input);
        expect(r.exposure.fraud_probability).toBe(0);
    });

    test('time-decay with daily breakdown', () => {
        const daily = [];
        for (let i = 0; i < 30; i++) daily.push({ days_ago: i, total: 100, counterfeit: i < 7 ? 5 : 1, suspicious: 2 });
        const input = { ...baseInput, dailyScanBreakdown: daily };
        const r = computeRisk(input);
        expect(r.exposure.trend_direction).toBeDefined();
    });

    test('per-BU aggregation with buConfig', () => {
        const input = {
            ...baseInput,
            buConfig: {
                brand_architecture: 'branded_house',
                cross_bu_correlation: 0.3,
                contagion_factor: 0.5,
                business_units: [
                    { id: 'BU1', name: 'Pharma', categories: [], revenue_weight: 0.6, industry_type: 'pharmaceutical' },
                    { id: 'BU2', name: 'Consumer', categories: [], revenue_weight: 0.4, industry_type: 'fmcg' },
                ],
            },
        };
        const r = computeRisk(input);
        expect(r.per_bu.length).toBe(2);
        expect(r.group_aggregated).toBeDefined();
        expect(r.group_aggregated.brand_architecture).toBe('branded_house');
    });

    test('empty input produces valid output', () => {
        const r = computeRisk({});
        expect(r.exposure.total_capital_at_risk).toBeDefined();
        expect(r.exposure.erqf_version).toBe('2.0');
    });

    test('custom beta overrides cluster default', () => {
        const input = { ...baseInput, financials: { ...baseInput.financials, custom_beta: 3.0 } };
        const r = computeRisk(input);
        expect(r._internal.preset.beta).toBe(3.0);
    });
});
