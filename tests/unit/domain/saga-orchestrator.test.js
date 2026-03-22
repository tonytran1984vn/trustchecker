const { SagaOrchestrator, SAGA_DEFINITIONS, SAGA_STATES } = require('../../../server/domain/saga-orchestrator');

describe('SAGA_STATES', () => {
    test('defines all states', () => {
        expect(SAGA_STATES.CREATED).toBe('CREATED');
        expect(SAGA_STATES.RUNNING).toBe('RUNNING');
        expect(SAGA_STATES.COMPLETED).toBe('COMPLETED');
        expect(SAGA_STATES.COMPENSATING).toBe('COMPENSATING');
        expect(SAGA_STATES.FAILED).toBe('FAILED');
        expect(SAGA_STATES.TIMED_OUT).toBe('TIMED_OUT');
    });
});

describe('SAGA_DEFINITIONS', () => {
    test('defines 3 sagas', () => {
        expect(Object.keys(SAGA_DEFINITIONS)).toHaveLength(3);
        expect(SAGA_DEFINITIONS.SCAN_VERIFICATION).toBeDefined();
        expect(SAGA_DEFINITIONS.SHIPMENT_LIFECYCLE).toBeDefined();
        expect(SAGA_DEFINITIONS.FRAUD_INVESTIGATION).toBeDefined();
    });

    test('each saga has steps and timeout', () => {
        for (const saga of Object.values(SAGA_DEFINITIONS)) {
            expect(saga.name).toBeDefined();
            expect(saga.triggerEvent).toBeDefined();
            expect(saga.timeoutMs).toBeGreaterThan(0);
            expect(saga.steps.length).toBeGreaterThan(0);
        }
    });
});

describe('SagaOrchestrator', () => {
    let orch;

    beforeEach(() => {
        orch = new SagaOrchestrator();
    });

    test('registers built-in definitions', () => {
        expect(orch.definitions.size).toBe(3);
    });

    test('start throws for unknown saga', async () => {
        await expect(orch.start('NONEXISTENT', {})).rejects.toThrow('Unknown saga');
    });

    test('executes saga with all pass-through steps (no handlers)', async () => {
        const instance = await orch.start('SCAN_VERIFICATION', { productId: 'p1' });
        expect(instance.state).toBe(SAGA_STATES.COMPLETED);
        expect(instance.completedSteps).toHaveLength(4);
        expect(orch.stats.completed).toBeGreaterThanOrEqual(1);
    });

    test('executes saga with registered handlers', async () => {
        orch.registerHandler('PRODUCT_AUTHENTICITY', 'validateProductExists', async () => ({ valid: true }));
        orch.registerHandler('RISK_INTELLIGENCE', 'runFraudDetection', async () => ({ fraud: false }));
        orch.registerHandler('PRODUCT_AUTHENTICITY', 'recalculateTrustScore', async () => ({ score: 85 }));
        orch.registerHandler('IDENTITY', 'notifyScanResult', async () => ({ sent: true }));

        const instance = await orch.start('SCAN_VERIFICATION', { productId: 'p1' });
        expect(instance.state).toBe(SAGA_STATES.COMPLETED);
        expect(instance.stepResults.validate_product).toEqual({ valid: true });
        expect(instance.stepResults.run_fraud_check).toEqual({ fraud: false });
    });

    test('compensates on step failure', async () => {
        const compensated = [];
        orch.registerHandler('PRODUCT_AUTHENTICITY', 'validateProductExists', async () => ({ ok: true }));
        orch.registerHandler('RISK_INTELLIGENCE', 'runFraudDetection', async () => {
            throw new Error('Fraud service down');
        });
        orch.registerHandler('RISK_INTELLIGENCE', 'cancelFraudAlert', async () => {
            compensated.push('cancelFraudAlert');
        });

        const instance = await orch.start('SCAN_VERIFICATION', { productId: 'p1' });
        expect(instance.state).toBe(SAGA_STATES.FAILED);
        expect(instance.error).toContain('Fraud service down');
        expect(orch.stats.failed).toBeGreaterThanOrEqual(1);
    });

    test('archives saga after completion', async () => {
        await orch.start('SCAN_VERIFICATION', {});
        expect(orch.activeSagas.size).toBe(0);
        expect(orch.completedSagas.length).toBeGreaterThanOrEqual(1);
    });

    test('getActiveSagas returns empty after completion', async () => {
        await orch.start('SCAN_VERIFICATION', {});
        expect(orch.getActiveSagas()).toEqual([]);
    });

    test('getRecentSagas returns completed sagas', async () => {
        await orch.start('SCAN_VERIFICATION', {});
        const recent = orch.getRecentSagas(5);
        expect(recent.length).toBeGreaterThanOrEqual(1);
        expect(recent[0].name).toBe('ScanVerificationSaga');
    });

    test('getSagaById finds completed saga', async () => {
        const instance = await orch.start('SCAN_VERIFICATION', {});
        const found = orch.getSagaById(instance.id);
        expect(found).not.toBeNull();
        expect(found.id).toBe(instance.id);
    });

    test('getStats returns counts', async () => {
        await orch.start('SCAN_VERIFICATION', {});
        const stats = orch.getStats();
        expect(stats.started).toBeGreaterThanOrEqual(1);
        expect(stats.definitions).toContain('SCAN_VERIFICATION');
    });

    test('registerHandler stores handler', () => {
        const handler = async () => {};
        orch.registerHandler('TEST', 'action', handler);
        expect(orch.stepHandlers.get('TEST:action')).toBe(handler);
    });
});
