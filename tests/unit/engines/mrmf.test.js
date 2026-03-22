const mrmf = require('../../../server/engines/risk-model-engine/mrmf');
const MRMFClass = mrmf.constructor;

let engine;
beforeEach(() => { engine = new MRMFClass(); });

describe('MRMFEngine', () => {
    describe('getInventory', () => {
        test('has 6 model types', () => {
            expect(engine.getInventory().total_models).toBe(6);
        });

        test('has critical, high, medium, low classes', () => {
            const cls = engine.getInventory().by_class;
            expect(cls.Critical + cls.High + cls.Medium + cls.Low).toBe(6);
        });

        test('ERS and BRI require dual validation', () => {
            expect(engine.getInventory().dual_validation_required.length).toBe(2);
        });
    });

    describe('registerModel', () => {
        test('registers a valid ERS model', () => {
            const r = engine.registerModel({ model_type: 'ERS', semver: '2.0.0', owner_role: 'risk', validator_role: 'mro', approver_role: 'cro' });
            expect(r.model.model_id).toContain('MDL-');
            expect(r.model.deployment_hash).toBeDefined();
        });

        test('rejects unknown model type', () => {
            const r = engine.registerModel({ model_type: 'FAKE', owner_role: 'r', validator_role: 'v', approver_role: 'a' });
            expect(r.error).toBeDefined();
        });

        test('rejects owner = validator', () => {
            const r = engine.registerModel({ model_type: 'ERS', owner_role: 'risk', validator_role: 'risk', approver_role: 'cro' });
            expect(r.error).toContain('Owner ≠ Validator');
        });
    });

    describe('getMDLC', () => {
        test('has 10 steps', () => {
            expect(engine.getMDLC().total_steps).toBe(10);
        });
    });

    describe('advanceMDLC', () => {
        test('advances step for registered model', () => {
            const reg = engine.registerModel({ model_type: 'ERS', owner_role: 'r', validator_role: 'v', approver_role: 'a' });
            const r = engine.advanceMDLC(reg.model.model_id, 1);
            expect(r.progress).toBe('1/10');
        });

        test('returns error for unknown model', () => {
            const r = engine.advanceMDLC('MDL-FAKE', 1);
            expect(r.error).toBeDefined();
        });
    });

    describe('getStressLibrary', () => {
        test('has 6 mandatory stress tests', () => {
            expect(engine.getStressLibrary().total).toBe(6);
        });

        test('4 tests have auto-freeze', () => {
            expect(engine.getStressLibrary().auto_freeze_count).toBe(4);
        });
    });

    describe('runStressTest', () => {
        test('run STL-01 (scan flood)', () => {
            const r = engine.runStressTest('STL-01', { passed: true });
            expect(r.passed).toBe(true);
            expect(r.test_name).toContain('Scan Flood');
        });

        test('failed test triggers rollback', () => {
            const r = engine.runStressTest('STL-01', { passed: false });
            expect(r.rollback_triggered).toBe(true);
            expect(r.auto_freeze_triggered).toBe(true);
        });

        test('unknown test returns error', () => {
            const r = engine.runStressTest('FAKE');
            expect(r.error).toBeDefined();
        });
    });

    describe('getIVUChecklist', () => {
        test('has 8 validation checks', () => {
            expect(engine.getIVUChecklist().total_checks).toBe(8);
        });

        test('7 checks are critical', () => {
            expect(engine.getIVUChecklist().critical_checks).toBe(7);
        });
    });

    describe('submitValidation', () => {
        test('rejects ML lead as validator', () => {
            const r = engine.submitValidation({ model_id: 'MDL-1', validator_id: 'V1', validator_role: 'ml_lead' });
            expect(r.error).toContain('independence');
        });

        test('validates model with checks', () => {
            engine.registerModel({ model_type: 'ERS', owner_role: 'r', validator_role: 'v', approver_role: 'a' });
            const checks = [
                { check_id: 'IVU-01', passed: true }, { check_id: 'IVU-02', passed: true },
                { check_id: 'IVU-03', passed: true }, { check_id: 'IVU-04', passed: true },
                { check_id: 'IVU-05', passed: true }, { check_id: 'IVU-06', passed: true },
                { check_id: 'IVU-07', passed: true }, { check_id: 'IVU-08', passed: true },
            ];
            const r = engine.submitValidation({ model_id: 'MDL-1', validator_id: 'V1', validator_role: 'mro', checks });
            expect(r.pass_rate).toBe(100);
        });
    });

    describe('calculateMHI', () => {
        test('default metrics give grade A or B', () => {
            const r = engine.calculateMHI();
            expect(['A', 'B']).toContain(r.grade);
            expect(r.mhi_score).toBeGreaterThan(60);
        });

        test('poor metrics give low grade', () => {
            const r = engine.calculateMHI({ auc: 0.5, precision: 0.5, fp_volatility: 0.1 });
            expect(r.mhi_score).toBeLessThan(80);
        });

        test('has 7 factors', () => {
            expect(engine.calculateMHI().factors.length).toBe(7);
        });
    });

    describe('calculateResidualRisk', () => {
        test('default is Controlled', () => {
            const r = engine.calculateResidualRisk();
            expect(r.grade).toBe('Controlled');
        });

        test('high drift produces High grade', () => {
            const r = engine.calculateResidualRisk({ drift_index: 0.9, fp_volatility: 0.1, bias_variance: 0.5, override_rate: 0.1, model_age_days: 365 });
            expect(r.grade).toBe('High');
            expect(r.cro_review_required).toBe(true);
        });
    });

    describe('getMaterialChangePolicy', () => {
        test('has 6 material change triggers', () => {
            expect(engine.getMaterialChangePolicy().total_triggers).toBe(6);
        });
    });

    describe('requestMaterialChange', () => {
        test('creates a change request', () => {
            const r = engine.requestMaterialChange({ change_type: 'MC-01', description: 'Threshold shift', proposed_by: 'P1' });
            expect(r.change_id).toBeDefined();
            expect(r.material).toBe(true);
        });
    });

    describe('approveMaterialChange', () => {
        test('approves with enough eyes', () => {
            const c = engine.requestMaterialChange({ change_type: 'MC-01', description: 'test', proposed_by: 'P1' });
            engine.approveMaterialChange(c.change_id, { approver_id: 'A1', role: 'CRO' });
            engine.approveMaterialChange(c.change_id, { approver_id: 'A2', role: 'MRO' });
            const r = engine.approveMaterialChange(c.change_id, { approver_id: 'A3', role: 'Compliance' });
            expect(r.status).toBe('approved');
        });

        test('rejects self-approval', () => {
            const c = engine.requestMaterialChange({ change_type: 'MC-01', description: 'test', proposed_by: 'P1' });
            const r = engine.approveMaterialChange(c.change_id, { approver_id: 'P1', role: 'CRO' });
            expect(r.error).toContain('own change');
        });
    });

    describe('getMRCCharter', () => {
        test('has 6 members', () => {
            expect(engine.getMRCCharter().members.length).toBe(6);
        });

        test('quorum is 4', () => {
            expect(engine.getMRCCharter().quorum).toBe(4);
        });
    });

    describe('assessMaturity', () => {
        test('current level is L4', () => {
            expect(engine.assessMaturity().current).toBe('L4');
        });
    });

    describe('logDecision + getDecisionAudit', () => {
        test('logs and retrieves decision', () => {
            engine.logDecision({ entity_id: 'E1', model_type: 'ERS' });
            const r = engine.getDecisionAudit();
            expect(r.total).toBe(1);
            expect(r.chain_valid).toBe(true);
        });

        test('hash chain is valid after multiple logs', () => {
            for (let i = 0; i < 10; i++) engine.logDecision({ entity_id: `E${i}`, model_type: 'ERS' });
            expect(engine.getDecisionAudit().chain_valid).toBe(true);
        });
    });
});
