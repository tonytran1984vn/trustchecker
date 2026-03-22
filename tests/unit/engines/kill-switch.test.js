const killSwitch = require('../../../server/engines/infrastructure/kill-switch-engine');

describe('KillSwitchEngine', () => {
    describe('getKillSwitches', () => {
        test('returns all kill switches', () => {
            const ks = killSwitch.getKillSwitches();
            expect(ks.switches).toBeDefined();
            expect(ks.switches.length).toBe(6);
        });

        test('each switch has required fields', () => {
            for (const sw of killSwitch.getKillSwitches().switches) {
                expect(sw.id).toMatch(/^KS-/);
                expect(sw.name).toBeDefined();
                expect(sw.scope).toBeDefined();
                expect(sw.trigger_authority).toBeDefined();
                expect(sw.cannot_trigger).toBeDefined();
                expect(sw.reversibility).toBeDefined();
            }
        });

        test('KS-01 is Network Freeze', () => {
            const sw = killSwitch.getSwitch('KS-01');
            expect(sw.name).toBe('Network Freeze');
        });

        test('KS-02 is Org Freeze', () => {
            const sw = killSwitch.getSwitch('KS-02');
            expect(sw.name).toBe('Org Freeze');
        });
    });

    describe('getSwitch', () => {
        test('returns specific switch by ID', () => {
            expect(killSwitch.getSwitch('KS-03').name).toBe('Scoring Freeze');
        });

        test('returns null for unknown ID', () => {
            expect(killSwitch.getSwitch('KS-99')).toBeNull();
        });
    });

    describe('getCircuitBreakers', () => {
        test('returns 8 circuit breakers', () => {
            const cb = killSwitch.getCircuitBreakers();
            expect(cb.breakers.length).toBe(8);
        });

        test('each breaker has metric and threshold', () => {
            for (const breaker of killSwitch.getCircuitBreakers().breakers) {
                expect(breaker.id).toMatch(/^CB-/);
                expect(breaker.metric).toBeDefined();
                expect(breaker.threshold).toBeDefined();
            }
        });

        test('recovery requires manual and post-mortem', () => {
            const cb = killSwitch.getCircuitBreakers();
            expect(cb.recovery.manual_recovery_required).toBe(true);
            expect(cb.recovery.post_mortem_required).toBe(true);
        });
    });

    describe('getEscalationLadder', () => {
        test('returns 6 escalation levels', () => {
            const ladder = killSwitch.getEscalationLadder();
            expect(ladder.levels.length).toBe(6);
        });

        test('L0 is auto/immediate', () => {
            const l0 = killSwitch.getEscalationLadder().levels[0];
            expect(l0.level).toContain('L0');
            expect(l0.authority).toBe('System');
        });

        test('L4 is Board level', () => {
            const l4 = killSwitch.getEscalationLadder().levels[4];
            expect(l4.level).toContain('L4');
            expect(l4.authority).toContain('Board');
        });
    });

    describe('assessThreat', () => {
        test('returns assessment with timestamp', () => {
            const result = killSwitch.assessThreat({});
            expect(result.assessed_at).toBeDefined();
            expect(result.circuit_breakers_evaluated).toBe(8);
        });

        test('returns triggered breakers for matching metrics', () => {
            const result = killSwitch.assessThreat({ 'Validator online rate': 0.5 });
            expect(result.triggered.length).toBe(1);
            expect(result.triggered[0].id).toBe('CB-01');
        });

        test('returns empty triggered for no matching metrics', () => {
            const result = killSwitch.assessThreat({ 'unknown_metric': 99 });
            expect(result.triggered.length).toBe(0);
        });
    });

    describe('getFullArchitecture', () => {
        test('returns complete architecture', () => {
            const arch = killSwitch.getFullArchitecture();
            expect(arch.title).toContain('Kill-Switch');
            expect(arch.version).toBe('1.0');
            expect(arch.switches).toBeDefined();
            expect(arch.circuit_breakers).toBeDefined();
            expect(arch.escalation).toBeDefined();
        });
    });
});
