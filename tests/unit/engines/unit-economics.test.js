const ue = require('../../../server/engines/economics-engine/unit-economics');
const UEClass = ue.constructor;

let engine;
beforeEach(() => { engine = new UEClass(); });

describe('UnitEconomicsEngine', () => {
    describe('calculateTransactionCost', () => {
        test('qr_verification breakdown', () => {
            const r = engine.calculateTransactionCost('qr_verification');
            expect(r.cost_breakdown.compute).toBeGreaterThan(0);
            expect(r.cost_breakdown.blockchain_gas).toBe(0);
            expect(r.dominant_cost).toBe('compute');
        });

        test('blockchain_seal includes gas', () => {
            const r = engine.calculateTransactionCost('blockchain_seal');
            expect(r.cost_breakdown.blockchain_gas).toBeGreaterThan(0);
            expect(r.dominant_cost).toBe('blockchain');
        });

        test('nft_mint includes gas', () => {
            const r = engine.calculateTransactionCost('nft_mint');
            expect(r.cost_breakdown.blockchain_gas).toBeGreaterThan(0);
        });

        test('carbon_settlement includes gas', () => {
            const r = engine.calculateTransactionCost('carbon_settlement');
            expect(r.cost_breakdown.blockchain_gas).toBeGreaterThan(0);
        });

        test('unknown type has 0 compute/storage', () => {
            const r = engine.calculateTransactionCost('unknown_type');
            expect(r.cost_breakdown.compute).toBe(0);
            expect(r.cost_breakdown.storage).toBe(0);
        });
    });

    describe('getCostStructure', () => {
        test('returns complete cost structure', () => {
            const cs = engine.getCostStructure();
            expect(cs.compute).toBeDefined();
            expect(cs.storage).toBeDefined();
            expect(cs.blockchain).toBeDefined();
            expect(cs.bandwidth).toBeDefined();
            expect(cs.support).toBeDefined();
            expect(cs.compliance).toBeDefined();
        });
    });

    describe('getMarginTargets', () => {
        test('returns margin targets', () => {
            const m = engine.getMarginTargets();
            expect(m.gross_margin_pct).toBe(75);
            expect(m.contribution_margin_pct).toBe(60);
            expect(m.break_even_warning_pct).toBe(30);
        });
    });

    describe('getChainComparison', () => {
        test('compares 4 chains', () => {
            const r = engine.getChainComparison();
            expect(r.comparison.length).toBe(4);
            expect(r.selected).toBe('polygon');
        });

        test('Polygon is cheapest', () => {
            const r = engine.getChainComparison();
            const polygon = r.comparison.find(c => c.chain === 'Polygon');
            const eth = r.comparison.find(c => c.chain === 'Ethereum L1');
            expect(polygon.seal_cost).toBeLessThan(eth.seal_cost);
        });
    });
});
