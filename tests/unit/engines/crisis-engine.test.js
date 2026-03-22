const crisis = require('../../../server/engines/crisis-module/crisis');
const CrisisClass = crisis.constructor;

let engine;
beforeEach(() => { engine = new CrisisClass(); });

describe('CrisisEngine', () => {
    describe('getStatus', () => {
        test('initial status is MONITOR', () => {
            const r = engine.getStatus();
            expect(r.crisis_level).toBe('MONITOR');
            expect(r.active_kill_switches).toBe(0);
            expect(r.drill_mode).toBe(false);
        });
    });

    describe('getCrisisLevels', () => {
        test('returns 5 levels', () => {
            const levels = engine.getCrisisLevels();
            expect(Object.keys(levels).length).toBe(5);
            expect(levels.MONITOR.level).toBe(0);
            expect(levels.BLACK.level).toBe(4);
        });
    });

    describe('getPlaybooks', () => {
        test('returns 5 playbooks', () => {
            const pb = engine.getPlaybooks();
            expect(Object.keys(pb).length).toBe(5);
            expect(pb.data_breach).toBeDefined();
            expect(pb.insider_threat).toBeDefined();
        });
    });

    describe('getPlaybook', () => {
        test('returns specific playbook', () => {
            expect(engine.getPlaybook('data_breach').name).toBe('Data Breach Response');
        });

        test('returns null for unknown', () => {
            expect(engine.getPlaybook('unknown')).toBeNull();
        });
    });

    describe('killModule', () => {
        test('activates ORANGE level', () => {
            const r = engine.killModule('billing', 'admin1', 'suspicious activity', 'super_admin');
            expect(r.status).toBe('activated');
            expect(r.crisis_level).toBe('ORANGE');
        });

        test('rejects unauthorized role', () => {
            const r = engine.killModule('billing', 'user1', 'test', 'viewer');
            expect(r.error).toContain('not authorized');
        });
    });

    describe('killOrg (dual-key)', () => {
        test('first key returns awaiting_second_key', () => {
            const r = engine.killOrg('org1', 'admin1', 'breach', 'super_admin');
            expect(r.status).toBe('awaiting_second_key');
        });

        test('same user cannot provide both keys', () => {
            engine.killOrg('org1', 'admin1', 'breach', 'super_admin');
            const r = engine.killOrg('org1', 'admin1', 'confirmed', 'super_admin');
            expect(r.error).toContain('two DIFFERENT users');
        });

        test('two different users activates kill-switch', () => {
            engine.killOrg('org1', 'admin1', 'breach', 'super_admin');
            const r = engine.killOrg('org1', 'admin2', 'confirmed', 'platform_security');
            expect(r.status).toBe('activated');
            expect(r.crisis_level).toBe('RED');
        });
    });

    describe('killGlobal (dual-key)', () => {
        test('first key requires second', () => {
            const r = engine.killGlobal('admin1', 'catastrophe', 'super_admin');
            expect(r.status).toBe('awaiting_second_key');
        });

        test('dual-key activates BLACK level', () => {
            engine.killGlobal('admin1', 'catastrophe', 'super_admin');
            const r = engine.killGlobal('admin2', 'confirmed', 'super_admin');
            expect(r.status).toBe('activated');
            expect(r.crisis_level).toBe('BLACK');
        });

        test('non-super_admin cannot activate global', () => {
            const r = engine.killGlobal('user1', 'test', 'ops_manager');
            expect(r.error).toContain('not authorized');
        });
    });

    describe('deactivate', () => {
        test('deactivates active kill-switch', () => {
            const act = engine.killModule('billing', 'admin1', 'test', 'super_admin');
            const r = engine.deactivate(act.kill_switch.id, 'admin1', 'resolved', 'super_admin');
            expect(r.status).toBe('deactivated');
            expect(r.crisis_level).toBe('MONITOR');
        });

        test('returns error for invalid id', () => {
            const r = engine.deactivate('fake-id', 'admin1', 'test', 'super_admin');
            expect(r.error).toBeDefined();
        });

        test('rejects unauthorized role', () => {
            const act = engine.killModule('billing', 'admin1', 'test', 'super_admin');
            const r = engine.deactivate(act.kill_switch.id, 'user1', 'test', 'viewer');
            expect(r.error).toContain('cannot deactivate');
        });
    });

    describe('escalate', () => {
        test('escalates MONITOR to YELLOW', () => {
            const r = engine.escalate('MONITOR', 'YELLOW', 'anomaly_detected', 'admin1', 'super_admin');
            expect(r.status).toBe('escalated');
            expect(r.to).toBe('YELLOW');
        });

        test('rejects invalid escalation path', () => {
            const r = engine.escalate('MONITOR', 'BLACK', 'test', 'admin1', 'super_admin');
            expect(r.error).toContain('No escalation path');
        });
    });

    describe('startDrill / endDrill', () => {
        test('starts drill with playbook', () => {
            const r = engine.startDrill('admin1', 'data_breach');
            expect(r.status).toBe('drill_active');
            expect(r.drill_mode).toBe(true);
        });

        test('unknown playbook returns error', () => {
            const r = engine.startDrill('admin1', 'unknown');
            expect(r.error).toBeDefined();
        });

        test('ends drill and resets', () => {
            engine.startDrill('admin1', 'data_breach');
            engine.killModule('billing', 'admin1', 'drill test', 'super_admin');
            const r = engine.endDrill('admin1');
            expect(r.status).toBe('drill_ended');
            expect(r.crisis_level).toBe('MONITOR');
        });
    });

    describe('isHalted', () => {
        test('not halted when no kill-switches', () => {
            expect(engine.isHalted('module', 'billing')).toBe(false);
        });

        test('halted when module kill-switch active', () => {
            engine.killModule('billing', 'admin1', 'test', 'super_admin');
            expect(engine.isHalted('module', 'billing')).toBe(true);
        });

        test('drill mode does not halt', () => {
            engine.startDrill('admin1', 'data_breach');
            engine.killModule('billing', 'admin1', 'drill', 'super_admin');
            expect(engine.isHalted('module', 'billing')).toBe(false);
        });
    });

    describe('getAuditTrail', () => {
        test('records all actions', () => {
            engine.killModule('billing', 'admin1', 'test', 'super_admin');
            const trail = engine.getAuditTrail();
            expect(trail.length).toBeGreaterThan(0);
        });
    });

    describe('getEscalationMatrix', () => {
        test('returns 8 escalation paths', () => {
            expect(engine.getEscalationMatrix().length).toBe(8);
        });
    });

    describe('getAutoDeactivationPolicy', () => {
        test('returns policy for 4 levels', () => {
            const p = engine.getAutoDeactivationPolicy();
            expect(p.BLACK.max_hours).toBe(12);
            expect(p.RED.max_hours).toBe(24);
        });
    });
});
