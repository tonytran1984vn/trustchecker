const rmg = require('../../../server/engines/risk-model-engine/governance');
const RMGClass = rmg.constructor;

let engine;
beforeEach(() => { engine = new RMGClass(); });

describe('RiskModelGovernance', () => {
    describe('getActiveVersion', () => {
        test('bootstrap version when no model registered', () => {
            const r = engine.getActiveVersion();
            expect(r.version_id).toContain('BOOTSTRAP');
            expect(r.weights).toBeDefined();
        });
    });

    describe('registerVersion', () => {
        test('registers model with weights', () => {
            const r = engine.registerVersion({ weights: { a: 0.5, b: 0.5 }, description: 'v1', registered_by: 'R1', approved_by: 'A1' });
            expect(r.version).toBe('RM-1.0');
            expect(r.weights_frozen).toBe(true);
        });

        test('rejects missing weights', () => {
            expect(engine.registerVersion({ approved_by: 'A' }).error).toBeDefined();
        });

        test('rejects missing approver', () => {
            expect(engine.registerVersion({ weights: { a: 1 } }).error).toBeDefined();
        });

        test('rejects same registerer and approver (SoD)', () => {
            const r = engine.registerVersion({ weights: { a: 1 }, registered_by: 'U1', approved_by: 'U1' });
            expect(r.error).toContain('different');
        });

        test('archives previous version', () => {
            engine.registerVersion({ weights: { a: 1 }, registered_by: 'R', approved_by: 'A' });
            engine.registerVersion({ weights: { a: 2 }, registered_by: 'R', approved_by: 'A' });
            const history = engine.getVersionHistory();
            expect(history.versions[0].status).toBe('archived');
        });
    });

    describe('rollback', () => {
        test('rolls back to previous version', () => {
            engine.registerVersion({ weights: { a: 1 }, registered_by: 'R', approved_by: 'A' });
            engine.registerVersion({ weights: { a: 2 }, registered_by: 'R', approved_by: 'A' });
            const r = engine.rollback('RM-1.0', 'U1', 'U2');
            expect(r.version).toBe('RM-1.0');
        });

        test('rejects self-approval (SoD)', () => {
            engine.registerVersion({ weights: { a: 1 }, registered_by: 'R', approved_by: 'A' });
            expect(engine.rollback('RM-1.0', 'U1', 'U1').error).toContain('SoD');
        });

        test('rejects unknown version', () => {
            expect(engine.rollback('RM-999.0', 'U1', 'U2').error).toBeDefined();
        });
    });

    describe('detectDrift', () => {
        test('insufficient data with <20 scores', () => {
            expect(engine.detectDrift().status).toBe('insufficient_data');
        });

        test('no drift with stable scores', () => {
            for (let i = 0; i < 50; i++) engine.recordScore(50 + Math.random() * 2);
            const r = engine.detectDrift();
            expect(r.drifted).toBe(false);
        });

        test('detects drift with shifted scores', () => {
            for (let i = 0; i < 25; i++) engine.recordScore(50);
            for (let i = 0; i < 25; i++) engine.recordScore(80);
            const r = engine.detectDrift();
            expect(r.drifted).toBe(true);
        });
    });

    describe('proposeWeightChange', () => {
        test('creates pending change', () => {
            const r = engine.proposeWeightChange({ proposed_weights: { route_gaming: 0.30 }, reason: 'Adjust', proposed_by: 'P1' });
            expect(r.change_id).toContain('WC-');
            expect(r.status).toBe('pending_review');
        });

        test('rejects missing params', () => {
            expect(engine.proposeWeightChange({}).error).toBeDefined();
        });
    });

    describe('reviewWeightChange', () => {
        test('approves with 2 approvals', () => {
            const c = engine.proposeWeightChange({ proposed_weights: { route_gaming: 0.30 }, reason: 'Test', proposed_by: 'P1' });
            engine.reviewWeightChange(c.change_id, { reviewer_id: 'R1', role: 'Compliance', decision: 'approve' });
            const r = engine.reviewWeightChange(c.change_id, { reviewer_id: 'R2', role: 'Risk', decision: 'approve' });
            expect(r.status).toBe('approved');
        });

        test('rejects on any rejection', () => {
            const c = engine.proposeWeightChange({ proposed_weights: { route_gaming: 0.30 }, reason: 'Test', proposed_by: 'P1' });
            const r = engine.reviewWeightChange(c.change_id, { reviewer_id: 'R1', role: 'Compliance', decision: 'reject' });
            expect(r.status).toBe('rejected');
        });

        test('proposer cannot approve own change', () => {
            const c = engine.proposeWeightChange({ proposed_weights: { route_gaming: 0.30 }, reason: 'Test', proposed_by: 'P1' });
            const r = engine.reviewWeightChange(c.change_id, { reviewer_id: 'P1', role: 'Risk', decision: 'approve' });
            expect(r.error).toContain('own change');
        });
    });

    describe('logOverride', () => {
        test('logs override with dual approval', () => {
            const r = engine.logOverride({ action: 'score_override', entity_id: 'E1', original_score: 80, override_score: 50, reason: 'Manual', overridden_by: 'O1', approved_by: 'A1' });
            expect(r.sod_verified).toBe(true);
        });

        test('rejects same user (SoD)', () => {
            const r = engine.logOverride({ overridden_by: 'U1', approved_by: 'U1' });
            expect(r.error).toContain('different');
        });

        test('hash chain is valid after multiple overrides', () => {
            for (let i = 0; i < 5; i++) {
                engine.logOverride({ action: 'test', entity_id: `E${i}`, overridden_by: 'O', approved_by: 'A' });
            }
            expect(engine.getOverrideLog().chain_valid).toBe(true);
        });
    });
});
