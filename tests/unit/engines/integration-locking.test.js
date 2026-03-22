const il = require('../../../server/engines/infrastructure/integration-locking-engine');
const ILClass = il.constructor;

let engine;
beforeEach(() => { engine = new ILClass(); });

describe('IntegrationLockingEngine', () => {
    describe('evaluateSystemState - capital triggers', () => {
        test('GREEN state with healthy defaults', () => {
            const r = engine.evaluateSystemState({});
            expect(r.system_severity).toBe('GREEN');
            expect(r.triggers_fired).toBe(0);
        });

        test('CAR < 12% triggers ADVISORY', () => {
            const r = engine.evaluateSystemState({ car_pct: 11 });
            expect(r.triggers.find(t => t.binding_id === 'CT-01' && t.severity === 'ADVISORY')).toBeDefined();
        });

        test('CAR < 10% triggers WARNING', () => {
            const r = engine.evaluateSystemState({ car_pct: 9 });
            expect(r.triggers.filter(t => t.binding_id === 'CT-01').length).toBeGreaterThan(1);
        });

        test('CAR < 6% triggers EMERGENCY with KS-05', () => {
            const r = engine.evaluateSystemState({ car_pct: 5 });
            expect(r.auto_kill_switches).toContain('KS-05');
            expect(r.system_severity).toBe('EMERGENCY');
        });

        test('LCR < 80% triggers EMERGENCY', () => {
            const r = engine.evaluateSystemState({ lcr_pct: 75 });
            expect(r.triggers.find(t => t.binding_id === 'CT-02')).toBeDefined();
        });

        test('Reserve drawdown > 50% triggers EMERGENCY', () => {
            const r = engine.evaluateSystemState({ reserve_drawdown_pct: 55 });
            expect(r.auto_kill_switches).toContain('KS-05');
        });
    });

    describe('evaluateSystemState - revenue stabilizer', () => {
        test('Revenue decline 20% triggers YELLOW', () => {
            const r = engine.evaluateSystemState({ revenue_change_pct: -20 });
            expect(r.triggers.find(t => t.severity === 'YELLOW')).toBeDefined();
        });

        test('Revenue decline 35% triggers ORANGE', () => {
            const r = engine.evaluateSystemState({ revenue_change_pct: -35 });
            expect(r.triggers.find(t => t.severity === 'ORANGE')).toBeDefined();
        });

        test('Revenue decline 55% triggers RED', () => {
            const r = engine.evaluateSystemState({ revenue_change_pct: -55 });
            expect(r.triggers.find(t => t.severity === 'RED')).toBeDefined();
        });
    });

    describe('evaluateSystemState - RiskLab triggers', () => {
        test('VaR > 80% triggers WARNING', () => {
            const r = engine.evaluateSystemState({ var_vs_capital_pct: 85 });
            expect(r.triggers.find(t => t.binding_id === 'RL-01')).toBeDefined();
        });

        test('VaR > 100% triggers EMERGENCY with KS-05', () => {
            const r = engine.evaluateSystemState({ var_vs_capital_pct: 105 });
            const rl = r.triggers.find(t => t.binding_id === 'RL-01');
            expect(rl.severity).toBe('EMERGENCY');
            expect(rl.kill_switch).toBe('KS-05');
        });

        test('Nodes > 30% offline triggers WARNING', () => {
            const r = engine.evaluateSystemState({ nodes_offline_pct: 35 });
            expect(r.triggers.find(t => t.binding_id === 'RL-03')).toBeDefined();
        });

        test('Nodes > 50% offline triggers KS-04', () => {
            const r = engine.evaluateSystemState({ nodes_offline_pct: 55 });
            expect(r.auto_kill_switches).toContain('KS-04');
        });
    });

    describe('evaluateSystemState - escalation levels', () => {
        test('EMERGENCY -> L3-L4', () => {
            const r = engine.evaluateSystemState({ car_pct: 5 });
            expect(r.escalation_level).toBe('L3-L4');
        });

        test('MANDATORY -> L2-L3', () => {
            const r = engine.evaluateSystemState({ car_pct: 7 });
            expect(['L2-L3', 'L3-L4']).toContain(r.escalation_level);
        });
    });

    describe('evaluateSystemState - cascade scenario', () => {
        test('multiple simultaneous failures', () => {
            const r = engine.evaluateSystemState({
                car_pct: 5,
                lcr_pct: 70,
                revenue_change_pct: -60,
                nodes_offline_pct: 55,
            });
            expect(r.triggers_fired).toBeGreaterThan(5);
            expect(r.auto_kill_switches.length).toBeGreaterThan(0);
        });
    });

    describe('getCapitalTriggers', () => {
        test('has 3 bindings', () => {
            expect(engine.getCapitalTriggers().bindings.length).toBe(3);
        });
    });

    describe('getRiskLabBindings', () => {
        test('has 5 bindings', () => {
            expect(engine.getRiskLabBindings().bindings.length).toBe(5);
        });
    });

    describe('getRevenueStabilizer', () => {
        test('has 4 stabilization rules', () => {
            expect(engine.getRevenueStabilizer().stabilization_rules.length).toBe(4);
        });

        test('constitutional floors are 15% and 8%', () => {
            const floors = engine.getRevenueStabilizer().constitutional_floors;
            expect(floors.validator_reward_min_pct).toBe(15);
            expect(floors.capital_reserve_min_pct).toBe(8);
        });
    });

    describe('getCharterAmendment', () => {
        test('standard process is 65 days', () => {
            expect(engine.getCharterAmendment().standard_process.total_days).toBe(65);
        });

        test('emergency is 48 hours', () => {
            expect(engine.getCharterAmendment().emergency_amendment.fast_track_process.duration_hours).toBe(48);
        });
    });

    describe('getCoherenceMap', () => {
        test('has 18 total linkages', () => {
            expect(engine.getCoherenceMap().enforcement_summary.total_linkages).toBe(18);
        });
    });

    describe('getFullArchitecture', () => {
        test('returns v1.0', () => {
            expect(engine.getFullArchitecture().version).toBe('1.0');
        });
    });
});
