const fin = require('../../../server/engines/intelligence/financial-reporting-engine');
const FinClass = fin.constructor;

let engine;
beforeEach(() => { engine = new FinClass(); });

describe('FinancialReportingEngine', () => {
    describe('recognizeRevenue', () => {
        test('SaaS subscription — over time pro-rata', () => {
            const r = engine.recognizeRevenue('REV-01', 12000, 12, 6);
            expect(r.recognized_revenue).toBe(6000);
            expect(r.deferred_revenue).toBe(6000);
            expect(r.recognition_pct).toBe(50);
        });

        test('SaaS full period', () => {
            const r = engine.recognizeRevenue('REV-01', 6000, 12, 12);
            expect(r.recognized_revenue).toBe(6000);
            expect(r.deferred_revenue).toBe(0);
        });

        test('Transaction fee — point in time', () => {
            const r = engine.recognizeRevenue('REV-02', 50000, 12, 3);
            expect(r.recognized_revenue).toBe(50000);
            expect(r.deferred_revenue).toBe(0);
        });

        test('Carbon settlement — point in time (principal)', () => {
            const r = engine.recognizeRevenue('REV-03', 100000, 1, 1);
            expect(r.recognized_revenue).toBe(100000);
        });

        test('API licensing — over time', () => {
            const r = engine.recognizeRevenue('REV-06', 24000, 12, 3);
            expect(r.recognized_revenue).toBe(6000);
            expect(r.deferred_revenue).toBe(18000);
        });

        test('certification — point in time', () => {
            const r = engine.recognizeRevenue('REV-05', 5000, 1, 1);
            expect(r.recognized_revenue).toBe(5000);
        });

        test('staking — over time', () => {
            const r = engine.recognizeRevenue('REV-04', 12000, 12, 4);
            expect(r.recognized_revenue).toBe(4000);
        });

        test('rejects unknown stream', () => {
            const r = engine.recognizeRevenue('FAKE-01', 1000, 12, 6);
            expect(r.error).toContain('Unknown');
        });

        test('caps recognition at contract value', () => {
            const r = engine.recognizeRevenue('REV-01', 1000, 12, 24);
            expect(r.recognized_revenue).toBe(1000);
        });
    });

    describe('generateConsolidatedPL', () => {
        test('generates P&L with defaults', () => {
            const pl = engine.generateConsolidatedPL('Q1 2025');
            expect(pl.period).toBe('Q1 2025');
            expect(pl.revenue.total).toBeGreaterThan(0);
            expect(pl.gross_profit).toBeGreaterThan(0);
            expect(pl.ifrs_compliant).toBe(true);
        });

        test('calculates margins correctly', () => {
            const pl = engine.generateConsolidatedPL('Q1 2025', {
                saas: 100000, transaction_fees: 50000, settlement: 20000,
                staking: 10000, certification: 5000, api_licensing: 5000,
                cloud: 30000, validator_costs: 10000, settlement_processing: 5000, support: 5000,
                rnd: 40000, sales: 20000, ga: 10000, depreciation: 5000, insurance: 3000, regulatory: 2000,
            });
            expect(pl.revenue.total).toBe(190000);
            expect(pl.cost_of_revenue.total).toBe(50000);
            expect(pl.gross_profit).toBe(140000);
            expect(pl.gross_margin_pct).toBeGreaterThan(70);
        });

        test('handles zero revenue', () => {
            const pl = engine.generateConsolidatedPL('Q1', {
                saas: 0, transaction_fees: 0, settlement: 0, staking: 0,
                certification: 0, api_licensing: 0,
                cloud: 0, validator_costs: 0, settlement_processing: 0, support: 0,
                rnd: 0, sales: 0, ga: 0, depreciation: 0, insurance: 0, regulatory: 0,
            });
            expect(pl.revenue.total).toBe(0);
        });
    });

    describe('getters', () => {
        test('getRevenueStreams returns 6 streams', () => {
            const rs = engine.getRevenueStreams();
            expect(rs.streams.length).toBe(6);
        });

        test('getDeferredLiabilities returns 5 categories', () => {
            const dl = engine.getDeferredLiabilities();
            expect(dl.categories.length).toBe(5);
        });

        test('getIFRSMap returns 8 standards', () => {
            const m = engine.getIFRSMap();
            expect(m.standards_applicable.length).toBe(8);
        });

        test('getStatementStructure has income_statement and balance_sheet', () => {
            const s = engine.getStatementStructure();
            expect(s.income_statement.revenue.length).toBe(6);
        });

        test('getFullFramework returns complete framework', () => {
            const f = engine.getFullFramework();
            expect(f.title).toContain('Financial');
            expect(f.standards.length).toBe(5);
        });
    });
});
