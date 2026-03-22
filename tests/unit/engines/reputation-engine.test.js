const rep = require('../../../server/engines/intelligence/reputation-engine');
const RepClass = rep.constructor;

let engine;
beforeEach(() => { engine = new RepClass(); });

describe('ReputationEngine', () => {
    describe('calculateTrustScore', () => {
        test('default 50-each yields score ~50', () => {
            const r = engine.calculateTrustScore({});
            expect(r.trust_score).toBe(35);  // 50-15 penalty for no products
        });

        test('high scores yield AAA grade', () => {
            const r = engine.calculateTrustScore({ product_authenticity: 95, supply_chain_transparency: 90, esg_performance: 85, carbon_integrity: 90, compliance_readiness: 88, partner_reliability: 92, total_products: 10 });
            expect(r.trust_score).toBeGreaterThanOrEqual(85);
            expect(r.trust_grade).toBe('AAA');
        });

        test('blockchain bonus adds 3 points', () => {
            const base = engine.calculateTrustScore({ total_products: 1 });
            const withBC = engine.calculateTrustScore({ total_products: 1, blockchain_anchored: true });
            expect(withBC.trust_score).toBe(base.trust_score + 3);
        });

        test('verified credentials bonus', () => {
            const base = engine.calculateTrustScore({ total_products: 1 });
            const withCreds = engine.calculateTrustScore({ total_products: 1, verified_credentials: 5 });
            expect(withCreds.trust_score).toBe(base.trust_score + 5);
        });

        test('incident penalty', () => {
            const clean = engine.calculateTrustScore({ total_products: 1 });
            const incidents = engine.calculateTrustScore({ total_products: 1, incident_count: 10 });
            expect(incidents.trust_score).toBe(clean.trust_score - 10);
        });

        test('no products penalty', () => {
            const r = engine.calculateTrustScore({});
            expect(r.penalties.no_products).toBe(true);
        });

        test('publishable above 50', () => {
            const low = engine.calculateTrustScore({ product_authenticity: 10, total_products: 0 });
            expect(low.publishable).toBe(false);
        });

        test('grade boundaries', () => {
            expect(engine.calculateTrustScore({ product_authenticity: 95, supply_chain_transparency: 95, esg_performance: 95, carbon_integrity: 95, compliance_readiness: 95, partner_reliability: 95, total_products: 10 }).trust_grade).toBe('AAA');
            expect(engine.calculateTrustScore({ product_authenticity: 75, supply_chain_transparency: 75, esg_performance: 75, carbon_integrity: 75, compliance_readiness: 75, partner_reliability: 75, total_products: 10 }).trust_grade).toBe('AA');
        });
    });

    describe('calculateTransparencyIndex', () => {
        test('opaque with no data', () => {
            const r = engine.calculateTransparencyIndex({});
            expect(r.index).toBe(0);
            expect(r.grade).toBe('Opaque');
        });

        test('full transparency', () => {
            const r = engine.calculateTransparencyIndex({
                total_products: 100, tracked_products: 100,
                total_partners: 10, verified_partners: 10,
                total_shipments: 50, traced_shipments: 50,
                has_did: true, has_vc: true, has_blockchain: true,
                scope_3_covered: true, gri_reported: true,
            });
            expect(r.index).toBe(100);
            expect(r.grade).toBe('Transparent');
        });

        test('partial transparency', () => {
            const r = engine.calculateTransparencyIndex({
                total_products: 100, tracked_products: 80,
                total_partners: 10, verified_partners: 8,
                total_shipments: 50, traced_shipments: 40,
            });
            expect(r.grade).toBe('Partial');
        });
    });

    describe('calculateCarbonIntegrity', () => {
        test('high integrity yields AAA', () => {
            const r = engine.calculateCarbonIntegrity({
                total_credits: 100, verified_credits: 100,
                avg_mrv_confidence: 95, double_count_incidents: 0,
                avg_additionality_pass_rate: 90, blockchain_anchored_pct: 100,
                retired_pct: 80, third_party_verified: true,
            });
            expect(r.integrity_score).toBeGreaterThanOrEqual(80);
            expect(r.grade).toBe('AAA');
        });

        test('double counting reduces score', () => {
            const clean = engine.calculateCarbonIntegrity({ avg_mrv_confidence: 90 });
            const dirty = engine.calculateCarbonIntegrity({ avg_mrv_confidence: 90, double_count_incidents: 3 });
            expect(dirty.integrity_score).toBeLessThan(clean.integrity_score);
        });
    });

    describe('buildPlatformIndex', () => {
        test('ranks orgs by composite', () => {
            const orgs = [
                { org_id: 'o1', org_name: 'A', trust_score: 90, transparency_index: 80, carbon_integrity: 85 },
                { org_id: 'o2', org_name: 'B', trust_score: 40, transparency_index: 30, carbon_integrity: 25 },
            ];
            const r = engine.buildPlatformIndex(orgs);
            expect(r.total_orgs).toBe(2);
            expect(r.index[0].rank).toBe(1);
            expect(r.index[0].composite).toBeGreaterThan(r.index[1].composite);
        });

        test('empty orgs', () => {
            const r = engine.buildPlatformIndex([]);
            expect(r.total_orgs).toBe(0);
            expect(r.avg_composite).toBe(0);
        });
    });
});
