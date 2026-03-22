const contagion = require('../../../server/engines/core/cross-org-contagion-engine');
const COCClass = contagion.constructor;

let engine;
beforeEach(() => { engine = new COCClass(); });

describe('CrossOrgContagionEngine', () => {
    describe('simulateContagion - defaults', () => {
        test('returns affected entities with default connections', () => {
            const r = engine.simulateContagion();
            expect(r.affected_entities.length).toBe(5);
            expect(r.source_trust_drop_pct).toBe(40);
        });

        test('circuit breaker triggered on high severity', () => {
            const r = engine.simulateContagion(80);
            expect(r.circuit_breaker_triggered).toBeDefined();
        });
    });

    describe('simulateContagion - custom', () => {
        test('small drop causes negligible impact', () => {
            const r = engine.simulateContagion(5, [
                { entity: 'A', relationship: 'Same industry/sector', distance: 3 },
            ]);
            expect(r.affected_entities[0].severity).toBe('negligible');
        });

        test('direct supplier at distance 1 gets high impact', () => {
            const r = engine.simulateContagion(50, [
                { entity: 'A', relationship: 'Direct supplier/buyer', distance: 1 },
            ]);
            expect(r.affected_entities[0].trust_impact_pct).toBe(40); // 50 * 0.8 * 1
        });

        test('decay reduces impact at distance 2', () => {
            const r = engine.simulateContagion(50, [
                { entity: 'A', relationship: 'Direct supplier/buyer', distance: 1 },
                { entity: 'B', relationship: 'Direct supplier/buyer', distance: 2 },
            ]);
            expect(r.affected_entities[1].trust_impact_pct).toBeLessThan(r.affected_entities[0].trust_impact_pct);
        });

        test('high severity triggers circuit breaker recommendation', () => {
            const r = engine.simulateContagion(80, [
                { entity: 'A', relationship: 'Direct supplier/buyer', distance: 1 },
            ]);
            expect(r.high_severity_count).toBeGreaterThan(0);
            expect(r.circuit_breaker_triggered).toBe(true);
        });
    });

    describe('getTrustContagion', () => {
        test('has propagation model', () => {
            expect(engine.getTrustContagion().propagation_model.type).toBe('weighted_graph_diffusion');
        });

        test('has 5 edge weight types', () => {
            expect(engine.getTrustContagion().propagation_model.edge_weights.length).toBe(5);
        });

        test('has 5 severity thresholds', () => {
            expect(Object.keys(engine.getTrustContagion().severity_thresholds).length).toBe(5);
        });
    });

    describe('getSharedRouteRisk', () => {
        test('has scenarios', () => {
            expect(engine.getSharedRouteRisk().scenarios.length).toBe(2);
        });

        test('single route max 30%', () => {
            expect(engine.getSharedRouteRisk().concentration_alerts.single_route_max_pct).toBe(30);
        });
    });

    describe('getContagionBreakers', () => {
        test('has 5 circuit breakers', () => {
            expect(engine.getContagionBreakers().breakers.length).toBe(5);
        });
    });

    describe('getFullFramework', () => {
        test('returns v2.0', () => {
            expect(engine.getFullFramework().version).toBe('2.0');
        });
    });
});
