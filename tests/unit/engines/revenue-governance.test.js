const rg = require('../../../server/engines/economics-engine/revenue-governance');
const RGClass = rg.constructor;

let engine;
beforeEach(() => { engine = new RGClass(); });

describe('RevenueGovernanceEngine', () => {
    describe('getPricingAuthority', () => {
        test('has 6 pricing decisions', () => {
            expect(engine.getPricingAuthority().decisions.length).toBe(6);
        });

        test('SaaS pricing requires 75% supermajority', () => {
            const saas = engine.getPricingAuthority().decisions[0];
            expect(saas.authority).toContain('75%');
        });

        test('super_admin cannot approve SaaS pricing', () => {
            const saas = engine.getPricingAuthority().decisions[0];
            expect(saas.cannot_approve).toContain('super_admin');
        });
    });

    describe('getAIRevenueMap', () => {
        test('has 4 AI weight categories', () => {
            expect(engine.getAIRevenueMap().weight_categories.length).toBe(4);
        });

        test('trust score has SEP-3 separation', () => {
            const ts = engine.getAIRevenueMap().weight_categories[0];
            expect(ts.separation).toContain('SEP-3');
        });
    });

    describe('getSettlementControl', () => {
        test('has 4 rail authority actions', () => {
            expect(Object.keys(engine.getSettlementControl().rail_authority).length).toBe(4);
        });

        test('has 4 settlement rails', () => {
            expect(engine.getSettlementControl().rails.length).toBe(4);
        });
    });

    describe('getFeeGovernance', () => {
        test('fee allocation sums to 100%', () => {
            const alloc = engine.getFeeGovernance().fee_flow.allocation;
            const total = Object.values(alloc).reduce((s, v) => s + v, 0);
            expect(total).toBe(100);
        });

        test('has 4 extraction controls', () => {
            expect(engine.getFeeGovernance().extraction_controls.length).toBe(4);
        });
    });

    describe('getFullMap', () => {
        test('returns version 1.0', () => {
            expect(engine.getFullMap().version).toBe('1.0');
        });

        test('has governance principle', () => {
            expect(engine.getFullMap().principle).toContain('separation of powers');
        });
    });
});
