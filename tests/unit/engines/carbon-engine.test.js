const carbon = require('../../../server/engines/intelligence/carbon-engine');
const CarbonClass = carbon.constructor;

let engine;
beforeEach(() => { engine = new CarbonClass(); });

describe('CarbonEngine', () => {
    describe('calculateFootprint', () => {
        test('calculates total footprint', () => {
            const product = { id: 'p1', name: 'Widget', category: 'Electronics' };
            const result = engine.calculateFootprint(product);
            expect(result.total_footprint_kgCO2e).toBeGreaterThan(0);
            expect(result.scopes.length).toBe(3);
            expect(result.grade).toBeDefined();
            expect(result.eas_version).toBe('3.0');
        });

        test('Scope 1 uses manufacturing factors', () => {
            const product = { id: 'p1', name: 'Food', category: 'F&B' };
            const r = engine.calculateFootprint(product);
            expect(r.scopes[0].value).toBe(2.5);
        });

        test('Scope 2 includes cold storage for Healthcare', () => {
            const product = { id: 'p1', category: 'Healthcare' };
            const events = [{ event_type: 'store' }, { event_type: 'receive' }];
            const r = engine.calculateFootprint(product, [], events);
            expect(r.scopes[1].warehouse_type).toBe('cold_storage');
        });

        test('Scope 3 includes transport', () => {
            const product = { id: 'p1', category: 'General', weight: 1.0 };
            const shipments = [{ id: 's1', carrier: 'FedEx Air', distance_km: 1000 }];
            const r = engine.calculateFootprint(product, shipments);
            expect(r.scopes[2].value).toBeGreaterThan(0);
            expect(r.scopes[2].transport_breakdown.length).toBe(1);
        });

        test('includes equivalents', () => {
            const r = engine.calculateFootprint({ id: 'p1', category: 'Electronics' });
            expect(r.equivalent.trees_needed).toBeGreaterThan(0);
            expect(r.equivalent.driving_km).toBeGreaterThan(0);
        });

        test('includes v3.0 intensity and confidence', () => {
            const r = engine.calculateFootprint({ id: 'p1', category: 'Electronics' });
            expect(r.intensity).toBeDefined();
            expect(r.confidence).toBeDefined();
            expect(r.grade_method).toBe('percentile');
        });
    });

    describe('aggregateByScope', () => {
        test('aggregates multiple products', () => {
            const products = [
                { id: '1', name: 'P1', category: 'Electronics' },
                { id: '2', name: 'P2', category: 'F&B' },
            ];
            const r = engine.aggregateByScope(products, [], []);
            expect(r.products_assessed).toBe(2);
            expect(r.scope_1.total).toBeGreaterThan(0);
            expect(r.total_emissions_kgCO2e).toBeGreaterThan(0);
        });

        test('calculates Paris targets', () => {
            const r = engine.aggregateByScope([{ id: '1', category: 'Electronics' }], [], []);
            expect(r.reduction_targets.paris_aligned_2030).toBeGreaterThan(0);
        });

        test('handles empty products', () => {
            const r = engine.aggregateByScope([], [], []);
            expect(r.products_assessed).toBe(0);
            expect(r.total_emissions_kgCO2e).toBe(0);
        });

        test('includes confidence breakdown', () => {
            const r = engine.aggregateByScope([{ id: '1', category: 'F&B' }], [], []);
            expect(r.confidence_breakdown).toBeDefined();
            expect(r.high_confidence_ratio_pct).toBeDefined();
        });
    });

    describe('partnerLeaderboard', () => {
        test('ranks partners by ESG score', () => {
            const partners = [
                { id: 'p1', name: 'A', trust_score: 90, kyc_status: 'approved' },
                { id: 'p2', name: 'B', trust_score: 30, kyc_status: 'failed' },
            ];
            const lb = engine.partnerLeaderboard(partners, [], []);
            expect(lb.length).toBe(2);
            expect(lb[0].esg_score).toBeGreaterThan(lb[1].esg_score);
        });

        test('penalizes violations', () => {
            const partners = [{ id: 'p1', name: 'A', trust_score: 80 }];
            const violations = [{ partner_id: 'p1' }, { partner_id: 'p1' }];
            const lb = engine.partnerLeaderboard(partners, [], violations);
            expect(lb[0].metrics.sla_violations).toBe(2);
        });
    });

    describe('generateGRIReport', () => {
        test('generates GRI 305 disclosures', () => {
            const scopeData = { scope_1: { total: 100 }, scope_2: { total: 50 }, scope_3: { total: 200 }, reduction_targets: { paris_aligned_2030: 192.5 } };
            const r = engine.generateGRIReport({ scopeData, leaderboard: [], certifications: [] });
            expect(r.disclosures['GRI 305-1'].value).toBe(100);
            expect(r.disclosures['GRI 305-2'].value).toBe(50);
            expect(r.disclosures['GRI 305-3'].value).toBe(200);
        });
    });

    describe('calculateRiskFactors', () => {
        test('detects emission spike', () => {
            const r = engine.calculateRiskFactors({ total_emissions_kgCO2e: 3000, products_assessed: 1, avg_confidence: 3 }, []);
            const spike = r.risk_factors.find(f => f.id === 'emission_spike');
            expect(spike).toBeDefined();
            expect(spike.severity).toBe('critical');
        });

        test('detects low confidence', () => {
            const r = engine.calculateRiskFactors({ total_emissions_kgCO2e: 100, products_assessed: 10, avg_confidence: 1.2 }, []);
            const lc = r.risk_factors.find(f => f.id === 'data_confidence_risk');
            expect(lc).toBeDefined();
        });
    });

    describe('assessRegulatory', () => {
        test('assesses all regulatory frameworks', () => {
            const r = engine.assessRegulatory({
                scope_1: { total: 100 }, scope_2: { total: 50 }, scope_3: { total: 200 },
                products_assessed: 5,
            }, [], 3);
            expect(r.length).toBe(6);
            expect(r[0].checks.length).toBeGreaterThan(0);
        });
    });

    describe('assessMaturity', () => {
        test('level 0 with no features', () => {
            const r = engine.assessMaturity([]);
            expect(r.current_level).toBe(0);
        });

        test('level 1 with scope_calculation', () => {
            const r = engine.assessMaturity(['scope_calculation']);
            expect(r.current_level).toBe(1);
        });

        test('level 2 with full governance', () => {
            const r = engine.assessMaturity(['scope_calculation', 'gri_reporting', 'offset_recording', 'blockchain_anchor']);
            expect(r.current_level).toBe(2);
        });
    });

    describe('getRoleMatrix', () => {
        test('returns action × role matrix', () => {
            const m = engine.getRoleMatrix();
            expect(m.actions.length).toBe(9);
            expect(Object.keys(m.matrix).length).toBe(6);
            expect(m.matrix.super_admin.cross_org_benchmark).toBe(true);
            expect(m.matrix.scm_ops.configure_factors).toBe(false);
        });
    });

    describe('getGovernanceFlow', () => {
        test('returns 6-step flow', () => {
            const f = engine.getGovernanceFlow();
            expect(f.flow.length).toBe(6);
        });
    });
});
