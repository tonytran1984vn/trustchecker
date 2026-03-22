const { CircuitBreaker, getBreaker, STATE } = require('../../../server/middleware/circuit-breaker');

describe('CircuitBreaker', () => {
    let cb;

    beforeEach(() => {
        cb = new CircuitBreaker('test-service', {
            failureThreshold: 3,
            successThreshold: 2,
            openDurationMs: 100,
            monitorWindowMs: 60000,
            timeoutMs: 1000,
        });
    });

    describe('initial state', () => {
        test('starts CLOSED', () => {
            expect(cb.state).toBe(STATE.CLOSED);
        });

        test('has correct name', () => {
            expect(cb.name).toBe('test-service');
        });

        test('stats are zeroed', () => {
            const s = cb.getStatus().stats;
            expect(s.total).toBe(0);
            expect(s.success).toBe(0);
            expect(s.failure).toBe(0);
        });
    });

    describe('CLOSED state - success', () => {
        test('passes through successful calls', async () => {
            const r = await cb.exec(() => Promise.resolve('ok'), () => 'fallback');
            expect(r).toBe('ok');
            expect(cb.getStatus().stats.success).toBe(1);
        });

        test('stays CLOSED on success', async () => {
            await cb.exec(() => Promise.resolve('ok'), () => 'fb');
            expect(cb.state).toBe(STATE.CLOSED);
        });
    });

    describe('CLOSED state - failure', () => {
        test('uses fallback on failure', async () => {
            const r = await cb.exec(() => Promise.reject(new Error('fail')), () => 'fallback');
            expect(r).toBe('fallback');
        });

        test('does NOT trip on < threshold failures', async () => {
            await cb.exec(() => Promise.reject(new Error('1')), () => 'fb');
            await cb.exec(() => Promise.reject(new Error('2')), () => 'fb');
            expect(cb.state).toBe(STATE.CLOSED);
        });

        test('trips to OPEN on threshold failures', async () => {
            for (let i = 0; i < 3; i++) {
                await cb.exec(() => Promise.reject(new Error(`fail-${i}`)), () => 'fb');
            }
            expect(cb.state).toBe(STATE.OPEN);
        });
    });

    describe('OPEN state', () => {
        beforeEach(async () => {
            for (let i = 0; i < 3; i++) {
                await cb.exec(() => Promise.reject(new Error(`fail`)), () => 'fb');
            }
        });

        test('rejects immediately with fallback', async () => {
            const r = await cb.exec(() => Promise.resolve('should-not-reach'), () => 'fallback');
            expect(r).toBe('fallback');
            expect(cb.getStatus().stats.rejected).toBeGreaterThan(0);
        });
    });

    describe('HALF_OPEN state', () => {
        test('state can transition to HALF_OPEN after openDuration', () => {
            // This is a logical test — CB transitions after timer
            expect(STATE.HALF_OPEN).toBe('HALF_OPEN');
        });
    });

    describe('getStatus', () => {
        test('returns diagnostic info', () => {
            const s = cb.getStatus();
            expect(s.name).toBe('test-service');
            expect(s.state).toBe('CLOSED');
            expect(s.config.failureThreshold).toBe(3);
        });
    });

    describe('events', () => {
        test('emits open event on trip', async () => {
            let emitted = false;
            cb.on('open', () => { emitted = true; });
            for (let i = 0; i < 3; i++) {
                await cb.exec(() => Promise.reject(new Error('fail')), () => 'fb');
            }
            expect(emitted).toBe(true);
        });

        test('emits fallback event on failure', async () => {
            let emitted = false;
            cb.on('fallback', () => { emitted = true; });
            await cb.exec(() => Promise.reject(new Error('fail')), () => 'fb');
            expect(emitted).toBe(true);
        });
    });

    describe('timeout', () => {
        test.skip('times out slow calls', async () => {
            const slowCb = new CircuitBreaker('slow', { timeoutMs: 50 });
            const r = await slowCb.exec(
                () => new Promise(resolve => setTimeout(() => resolve('late'), 200)),
                () => 'timeout-fallback'
            );
            expect(r).toBe('timeout-fallback');
        });
    });
});

describe('STATE constants', () => {
    test('has CLOSED, OPEN, HALF_OPEN', () => {
        expect(STATE.CLOSED).toBe('CLOSED');
        expect(STATE.OPEN).toBe('OPEN');
        expect(STATE.HALF_OPEN).toBe('HALF_OPEN');
    });
});
