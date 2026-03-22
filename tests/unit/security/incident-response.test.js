const { IncidentResponse } = require('../../../server/security/incident-response');

describe('IncidentResponse', () => {
    describe('constructor', () => {
        test('stores db reference', () => {
            const db = {};
            const ir = new IncidentResponse(db);
            expect(ir.db).toBe(db);
        });

        test('has thresholds config', () => {
            const ir = new IncidentResponse({});
            expect(ir.thresholds).toBeDefined();
        });

        test('failed_logins threshold is 10', () => {
            const ir = new IncidentResponse({});
            expect(ir.thresholds.failed_logins.count).toBe(10);
        });

        test('failed_logins window is 15 minutes', () => {
            const ir = new IncidentResponse({});
            expect(ir.thresholds.failed_logins.window).toBe('15 minutes');
        });

        test('failed_logins severity is high', () => {
            const ir = new IncidentResponse({});
            expect(ir.thresholds.failed_logins.severity).toBe('high');
        });

        test('cross_org_attempt threshold is 1', () => {
            const ir = new IncidentResponse({});
            expect(ir.thresholds.cross_org_attempt.count).toBe(1);
        });

        test('cross_org_attempt severity is critical', () => {
            const ir = new IncidentResponse({});
            expect(ir.thresholds.cross_org_attempt.severity).toBe('critical');
        });

        test('data_export threshold is 5', () => {
            const ir = new IncidentResponse({});
            expect(ir.thresholds.data_export.count).toBe(5);
        });

        test('data_export severity is medium', () => {
            const ir = new IncidentResponse({});
            expect(ir.thresholds.data_export.severity).toBe('medium');
        });

        test('data_export window is 5 minutes', () => {
            const ir = new IncidentResponse({});
            expect(ir.thresholds.data_export.window).toBe('5 minutes');
        });
    });

    describe('checkFailedLogins', () => {
        test('does not lock when below threshold', async () => {
            const db = {
                get: jest.fn().mockResolvedValue({ c: 3 }),
                run: jest.fn().mockResolvedValue(undefined),
            };
            const ir = new IncidentResponse(db);
            await ir.checkFailedLogins('user-1', 'org-1');
            // Should only call get (1 call), not run (lock + incident = 2 calls)
            expect(db.run).not.toHaveBeenCalled();
        });

        test('locks account when at threshold (10)', async () => {
            const db = {
                get: jest.fn().mockResolvedValue({ c: 10 }),
                run: jest.fn().mockResolvedValue(undefined),
            };
            const ir = new IncidentResponse(db);
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            await ir.checkFailedLogins('user-2', 'org-1');
            consoleSpy.mockRestore();
            // Should call run for lock + incident creation
            expect(db.run).toHaveBeenCalledTimes(2);
        });

        test('handles db error gracefully', async () => {
            const db = {
                get: jest.fn().mockRejectedValue(new Error('db fail')),
            };
            const ir = new IncidentResponse(db);
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            await ir.checkFailedLogins('user-3', 'org-1');
            consoleSpy.mockRestore();
            // Should not throw
        });

        test('does not lock when result is null', async () => {
            const db = {
                get: jest.fn().mockResolvedValue(null),
                run: jest.fn(),
            };
            const ir = new IncidentResponse(db);
            await ir.checkFailedLogins('user-4', 'org-1');
            expect(db.run).not.toHaveBeenCalled();
        });
    });

    describe('IncidentResponse class export', () => {
        test('is a constructor', () => {
            expect(typeof IncidentResponse).toBe('function');
        });

        test('has checkFailedLogins method', () => {
            const ir = new IncidentResponse({});
            expect(typeof ir.checkFailedLogins).toBe('function');
        });
    });
});
