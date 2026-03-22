const txFee = require('../../../server/engines/economics-engine/transaction-fee');
const TxFeeClass = txFee.constructor;

let engine;
beforeEach(() => { engine = new TxFeeClass(); });

describe('TransactionFeeEngine', () => {
    describe('getFeeSchedule', () => {
        test('returns 5 transaction types', () => {
            const r = engine.getFeeSchedule();
            expect(r.total_transaction_types).toBe(5);
            expect(r.revenue_split.platform_percent).toBe(70);
        });
    });

    describe('calculateFee', () => {
        test('qr_verification — tier 1', () => {
            const r = engine.calculateFee('qr_verification', 500);
            expect(r.total_cost).toBe(10); // 500 × $0.02
            expect(r.effective_rate).toBe(0.02);
        });

        test('qr_verification — tier 2 (volume discount)', () => {
            const r = engine.calculateFee('qr_verification', 5000);
            expect(r.total_cost).toBe(80); // 1000×0.02 + 4000×0.015
        });

        test('qr_verification — tier 3', () => {
            const r = engine.calculateFee('qr_verification', 50000);
            expect(r.breakdown.length).toBe(3);
        });

        test('qr_verification — tier 4 (unlimited)', () => {
            const r = engine.calculateFee('qr_verification', 200000);
            expect(r.breakdown.length).toBe(4);
            expect(r.effective_rate).toBeLessThan(0.01);
        });

        test('carbon_settlement — tier 1', () => {
            const r = engine.calculateFee('carbon_settlement', 50);
            expect(r.total_cost).toBe(25); // 50 × $0.50
        });

        test('nft_certificate single', () => {
            const r = engine.calculateFee('nft_certificate', 1);
            expect(r.total_cost).toBe(1.50);
        });

        test('blockchain_seal medium volume', () => {
            const r = engine.calculateFee('blockchain_seal', 2000);
            expect(r.total_cost).toBe(395); // 500×0.25 + 1500×0.18
        });

        test('api_call_external high volume', () => {
            const r = engine.calculateFee('api_call_external', 50000);
            expect(r.breakdown.length).toBe(2);
        });

        test('unknown type returns error', () => {
            const r = engine.calculateFee('unknown', 10);
            expect(r.error).toContain('Unknown');
        });

        test('zero volume', () => {
            const r = engine.calculateFee('qr_verification', 0);
            expect(r.total_cost).toBe(0);
        });

        test('revenue split computed correctly', () => {
            const r = engine.calculateFee('qr_verification', 1000);
            expect(r.revenue_split.platform).toBe(r.total_cost * 0.7);
        });
    });

    describe('recordTransaction', () => {
        test('records and increments volume', () => {
            const r1 = engine.recordTransaction('org1', 'qr_verification');
            expect(r1.volume_this_month).toBe(1);
            const r2 = engine.recordTransaction('org1', 'qr_verification');
            expect(r2.volume_this_month).toBe(2);
        });

        test('returns error for unknown type', () => {
            const r = engine.recordTransaction('org1', 'fake');
            expect(r.error).toBeDefined();
        });

        test('tracks per-org-period', () => {
            engine.recordTransaction('org1', 'qr_verification');
            engine.recordTransaction('org2', 'qr_verification');
            engine.recordTransaction('org1', 'nft_certificate');
            expect(engine.transactions.length).toBe(3);
        });
    });

    describe('generateRevenueReport', () => {
        test('empty report', () => {
            const r = engine.generateRevenueReport();
            expect(r.total_revenue).toBe(0);
            expect(r.total_transactions).toBe(0);
        });

        test('report with transactions', () => {
            for (let i = 0; i < 10; i++) engine.recordTransaction('org1', 'qr_verification');
            const r = engine.generateRevenueReport();
            expect(r.total_transactions).toBe(10);
            expect(r.total_revenue).toBeGreaterThan(0);
        });
    });

    describe('generateOrgInvoice', () => {
        test('generates invoice for org', () => {
            for (let i = 0; i < 5; i++) engine.recordTransaction('org1', 'qr_verification');
            engine.recordTransaction('org1', 'nft_certificate');
            const inv = engine.generateOrgInvoice('org1');
            expect(inv.line_items.length).toBe(2);
            expect(inv.total).toBeGreaterThan(0);
            expect(inv.status).toBe('draft');
        });
    });

    describe('simulate', () => {
        test('simulates multi-type usage', () => {
            const r = engine.simulate({ qr_verification: 5000, carbon_settlement: 100, nft_certificate: 50 });
            expect(r.grand_total).toBeGreaterThan(0);
            expect(Object.keys(r.simulation).length).toBe(3);
        });
    });
});
