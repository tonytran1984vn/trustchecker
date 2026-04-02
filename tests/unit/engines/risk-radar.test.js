const radar = require('../../../server/engines/intelligence/risk-radar');
const RadarClass = radar.constructor;

let engine;
beforeEach(() => { engine = new RadarClass(); });

describe('RiskRadar', () => {
    describe('resolveAgenticThreatIndex', () => {
        test('returns low threat for empty data', () => {
            const r = engine.resolveAgenticThreatIndex({});
            expect(r.overall_threat_index).toBeLessThanOrEqual(30);
            expect(r.directive.level).toBe('ALERT_ONLY');
            expect(r.active_signals.length).toBe(0); // empty data doesn't trigger 'high' level issues
        });

        test('returns high threat for risky data', () => {
            const r = engine.resolveAgenticThreatIndex({
                partners: [{ kyc_status: 'failed', trust_score: 10, country: 'CN' }],
                violations: Array(10).fill({ penalty_amount: 5000 }),
                leaks: Array(5).fill({ authorized_price: 100, listing_price: 200, region_detected: 'CN' }),
                alerts: Array(5).fill({ alert_type: 'STATISTICAL_ANOMALY', severity: 'high' }),
            });
            expect(r.overall_threat_index).toBeGreaterThan(30);
        });

        test('weights sum to 1.0', () => {
            const weights = { partner_risk: 0.2, geographic_risk: 0.1, route_risk: 0.15, financial_risk: 0.15, compliance_risk: 0.1, cyber_risk: 0.1, environmental_risk: 0.05, supply_disruption: 0.15 };
            const sum = Object.values(weights).reduce((a, b) => a + b, 0);
            expect(sum).toBeCloseTo(1.0);
        });
    });

    describe('assessPartnerRisk', () => {
        test('low risk for empty partners', () => {
            expect(engine.assessPartnerRisk([], []).score).toBe(0);
        });

        test('high risk for KYC failures', () => {
            const partners = [{ kyc_status: 'failed', trust_score: 20 }, { kyc_status: 'pending', trust_score: 30 }];
            const r = engine.assessPartnerRisk(partners, []);
            expect(r.score).toBeGreaterThan(30);
        });
    });

    describe('assessGeographicRisk', () => {
        test('detects high concentration', () => {
            const partners = Array(10).fill({ country: 'CN' });
            const r = engine.assessGeographicRisk(partners, []);
            expect(r.details.herfindahl_index).toBe(10000);
            expect(r.details.concentration_warning).toContain('High');
        });

        test('low concentration with diverse origins', () => {
            const partners = [{ country: 'VN' }, { country: 'US' }, { country: 'JP' }, { country: 'EU' }];
            const r = engine.assessGeographicRisk(partners, []);
            expect(r.details.herfindahl_index).toBe(2500);
        });
    });

    describe('assessRouteRisk', () => {
        test('low for empty shipments', () => {
            expect(engine.assessRouteRisk([]).score).toBe(0);
        });

        test('detects late shipments', () => {
            const shipments = [
                { id: 's1', estimated_delivery: '2024-01-10', actual_delivery: '2024-01-15', carrier: 'DHL' },
                { id: 's2', estimated_delivery: '2024-01-10', actual_delivery: '2024-01-10', carrier: 'DHL' },
            ];
            const r = engine.assessRouteRisk(shipments);
            expect(r.details.late_shipments).toBe(1);
            expect(r.details.on_time_rate).toBe('50%');
        });
    });

    describe('assessFinancialRisk', () => {
        test('detects price leaks', () => {
            const leaks = [{ authorized_price: 100, listing_price: 200 }];
            const r = engine.assessFinancialRisk(leaks, []);
            expect(r.score).toBeGreaterThan(0);
            expect(r.details.gray_market_risk).toBe('normal');
        });

        test('elevated gray market for >3 leaks', () => {
            const leaks = Array(5).fill({ authorized_price: 100, listing_price: 200 });
            const r = engine.assessFinancialRisk(leaks, []);
            expect(r.details.gray_market_risk).toBe('elevated');
        });
    });

    describe('assessComplianceRisk', () => {
        test('default score for no certifications', () => {
            expect(engine.assessComplianceRisk([]).score).toBe(20);
        });

        test('detects expired certifications', () => {
            const certs = [{ expiry_date: '2020-01-01' }, { expiry_date: '2030-01-01' }];
            const r = engine.assessComplianceRisk(certs);
            expect(r.details.expired).toBe(1);
        });
    });

    describe('assessCyberRisk', () => {
        test('baseline cyber risk', () => {
            const r = engine.assessCyberRisk([], []);
            expect(r.score).toBe(10); // base
        });

        test('detects partners without API keys', () => {
            const partners = [{ name: 'P1' }, { name: 'P2', api_key: 'key' }];
            const r = engine.assessCyberRisk(partners, []);
            expect(r.details.partners_without_api_auth).toBe(1);
        });
    });

    describe('assessEnvironmentalRisk', () => {
        test('medium risk for no ESG data', () => {
            expect(engine.assessEnvironmentalRisk([]).score).toBe(30);
        });

        test('low risk for high ESG scores', () => {
            const r = engine.assessEnvironmentalRisk([{ overall_score: 90 }, { overall_score: 85 }]);
            expect(r.score).toBeLessThan(20);
        });
    });

    describe('assessSupplyDisruption', () => {
        test('high risk for single supplier', () => {
            const partners = [{ type: 'manufacturer' }];
            const r = engine.assessSupplyDisruption([], partners, []);
            expect(r.details.single_source_dependencies).toBe(true);
        });

        test('detects low stock', () => {
            const inventory = [
                { quantity: 5, min_stock: 10 },
                { quantity: 100, min_stock: 10 },
            ];
            const r = engine.assessSupplyDisruption(inventory, [], []);
            expect(r.details.low_stock_items).toBe(1);
        });
    });

    describe('generateHeatmap', () => {
        test('generates region heatmap', () => {
            const partners = [{ country: 'VN', trust_score: 80 }, { country: 'CN', trust_score: 30 }];
            const heatmap = engine.generateHeatmap(partners, [], []);
            expect(heatmap.length).toBe(2);
            expect(heatmap[0].region).toBeDefined();
        });

        test('includes leak data', () => {
            const leaks = [{ region_detected: 'EU', risk_score: 0.8 }];
            const heatmap = engine.generateHeatmap([], [], leaks);
            expect(heatmap.length).toBe(1);
            expect(heatmap[0].leak_alerts).toBe(1);
        });
    });
});
