const reserve = require('../../../server/engines/risk-model-engine/reserve');
const RRClass = reserve.constructor;

let engine;
beforeEach(() => { engine = new RRClass(); });

describe('RiskReserveEngine', () => {
    describe('getReservePolicy', () => {
        test('has 5 reserve pools', () => {
            expect(Object.keys(engine.getReservePolicy()).length).toBe(5);
        });

        test('fraud reserve at 3%', () => {
            expect(engine.getReservePolicy().fraud_reserve.contribution_pct).toBe(3);
        });

        test('insurance pool min $100K', () => {
            expect(engine.getReservePolicy().insurance_pool.min_balance).toBe(100000);
        });
    });

    describe('contribute', () => {
        test('distributes revenue to all 5 pools', () => {
            const r = engine.contribute(100000);
            expect(Object.keys(r.contributions).length).toBe(5);
            expect(r.total_contributed).toBeGreaterThan(0);
        });

        test('fraud reserve gets 3% of revenue', () => {
            const r = engine.contribute(100000);
            expect(r.contributions.fraud_reserve.amount).toBe(3000);
        });

        test('carbon reversal pool uses carbon revenue breakdown', () => {
            const r = engine.contribute(100000, { carbon_revenue: 50000 });
            expect(r.contributions.reversal_pool.amount).toBe(2500); // 5% of 50K
        });
    });

    describe('fileClaim', () => {
        test('auto-approves claim < $50', () => {
            engine.contribute(100000); // fund reserves
            const r = engine.fileClaim('fraud_reserve', 30, 'Small claim', 'user1');
            expect(r.claim.status).toBe('paid_out');
        });

        test('submits claim > $50 for review', () => {
            engine.contribute(100000);
            const r = engine.fileClaim('fraud_reserve', 100, 'Test', 'user1');
            expect(r.claim.status).toBe('submitted');
        });

        test('rejects claim exceeding max percentage', () => {
            engine.contribute(1000); // small fund
            const r = engine.fileClaim('fraud_reserve', 999, 'Too big', 'user1');
            expect(r.error).toBeDefined();
        });

        test('flags claims > $100 needing evidence', () => {
            engine.contribute(100000);
            const r = engine.fileClaim('fraud_reserve', 200, 'Needs proof', 'user1');
            expect(r.claim.requires_evidence).toBe(true);
        });

        test('invalid reserve returns error', () => {
            const r = engine.fileClaim('fake_reserve', 100, 'Test', 'user1');
            expect(r.error).toBeDefined();
        });
    });

    describe('resolveClaim', () => {
        test('approves and pays out', () => {
            engine.contribute(100000);
            const c = engine.fileClaim('fraud_reserve', 100, 'Test', 'user1');
            const r = engine.resolveClaim(c.claim.id, 'approve', { user: 'admin' });
            expect(r.claim.status).toBe('paid_out');
        });

        test('denies claim', () => {
            engine.contribute(100000);
            const c = engine.fileClaim('fraud_reserve', 100, 'Test', 'user1');
            const r = engine.resolveClaim(c.claim.id, 'deny', { user: 'admin', reason: 'Insufficient evidence' });
            expect(r.claim.status).toBe('denied');
        });

        test('cannot resolve already resolved claim', () => {
            engine.contribute(100000);
            const c = engine.fileClaim('fraud_reserve', 30, 'Auto', 'user1'); // auto-approved
            const r = engine.resolveClaim(c.claim.id, 'approve', { user: 'admin' });
            expect(r.error).toBeDefined();
        });
    });

    describe('getReserveHealth', () => {
        test('empty reserves are critical', () => {
            expect(engine.getReserveHealth().overall_status).toBe('critical');
        });

        test('fully funded after large contribution', () => {
            for (let i = 0; i < 100; i++) engine.contribute(1000000);
            expect(engine.getReserveHealth().overall_status).toBe('fully_funded');
        });
    });

    describe('getChargebackProtocol', () => {
        test('48h investigation SLA', () => {
            expect(engine.getChargebackProtocol().investigation_sla_hours).toBe(48);
        });

        test('3 escalation tiers', () => {
            expect(Object.keys(engine.getChargebackProtocol().escalation_thresholds).length).toBe(3);
        });
    });
});
