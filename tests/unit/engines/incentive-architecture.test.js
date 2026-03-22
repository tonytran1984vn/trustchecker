const ia = require('../../../server/engines/economics-engine/incentive-architecture');
const IAClass = ia.constructor;

let engine;
beforeEach(() => { engine = new IAClass(); });

describe('IncentiveArchitectureEngine', () => {
    describe('getParticipantIncentives', () => {
        test('has 6 participant types', () => {
            expect(engine.getParticipantIncentives().participants.length).toBe(6);
        });

        test('each participant has perverse incentive guards', () => {
            engine.getParticipantIncentives().participants.forEach(p => {
                expect(p.perverse_incentive_guard).toBeDefined();
            });
        });
    });

    describe('getFeeTopology', () => {
        test('has 5 fee flows', () => {
            expect(engine.getFeeTopology().fee_flows.length).toBe(5);
        });

        test('SaaS fee flows sum to 100%', () => {
            const saas = engine.getFeeTopology().fee_flows[0];
            const total = saas.flows_to.reduce((s, f) => s + f.pct, 0);
            expect(total).toBe(100);
        });

        test('settlement fee flows sum to 100%', () => {
            const settle = engine.getFeeTopology().fee_flows[1];
            const total = settle.flows_to.reduce((s, f) => s + f.pct, 0);
            expect(total).toBe(100);
        });

        test('has constitutional floors', () => {
            expect(engine.getFeeTopology().constitutional_floors.validator_pool).toContain('15%');
        });
    });

    describe('getSwitchingMoat', () => {
        test('has 5 moat layers', () => {
            expect(engine.getSwitchingMoat().moat_layers.length).toBe(5);
        });
    });

    describe('getCarbonMarket', () => {
        test('has 4 market layers', () => {
            expect(engine.getCarbonMarket().layers.length).toBe(4);
        });

        test('supports 5 carbon registries', () => {
            const reg = engine.getCarbonMarket().layers[0];
            expect(reg.design.supported_registries.length).toBe(5);
        });
    });

    describe('calculateNetworkValue', () => {
        test('default 50 orgs', () => {
            const r = engine.calculateNetworkValue();
            expect(r.org_count).toBe(50);
            expect(r.theoretical_connections).toBe(1225); // 50*49/2
        });

        test('100 orgs has higher value', () => {
            const r100 = engine.calculateNetworkValue(100);
            const r50 = engine.calculateNetworkValue(50);
            expect(r100.estimated_network_value_usd).toBeGreaterThan(r50.estimated_network_value_usd);
        });

        test('1 org has 0 connections', () => {
            const r = engine.calculateNetworkValue(1);
            expect(r.theoretical_connections).toBe(0);
        });
    });

    describe('getFullArchitecture', () => {
        test('returns version 1.0', () => {
            expect(engine.getFullArchitecture().version).toBe('1.0');
        });
    });
});
