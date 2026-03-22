const scheduler = require('../../../server/engines/infrastructure/scheduler');
const SCClass = scheduler.constructor;

let engine;
beforeEach(() => { engine = new SCClass(); });

describe('ScheduledTasks', () => {
    describe('register + getStatus', () => {
        test('initial state is not running', () => {
            expect(engine.getStatus().running).toBe(false);
        });

        test('registers tasks', () => {
            engine.register('test_task', 60, () => {});
            const status = engine.getStatus();
            expect(status.tasks.length).toBe(1);
            expect(status.tasks[0].name).toBe('test_task');
        });

        test('interval stored in seconds', () => {
            engine.register('task1', 120, () => {});
            expect(engine.getStatus().tasks[0].interval_seconds).toBe(120);
        });

        test('last run is "never" initially', () => {
            engine.register('task1', 60, () => {});
            expect(engine.getStatus().tasks[0].last_run).toBe('never');
        });
    });

    describe('start + stop', () => {
        test('start sets running to true', () => {
            engine.start();
            expect(engine.running).toBe(true);
            engine.stop();
        });

        test('stop clears timer', () => {
            engine.start();
            engine.stop();
            expect(engine.running).toBe(false);
        });

        test('multiple starts are idempotent', () => {
            engine.start();
            engine.start();
            expect(engine.running).toBe(true);
            engine.stop();
        });
    });

    describe('acquireLock', () => {
        test('returns true when no Redis', async () => {
            const result = await engine.acquireLock('test');
            expect(result).toBe(true);
        });
    });

    describe('releaseLock', () => {
        test('completes without error', async () => {
            await expect(engine.releaseLock('test')).resolves.not.toThrow();
        });
    });
});
