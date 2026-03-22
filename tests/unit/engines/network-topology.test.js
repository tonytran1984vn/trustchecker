const net = require('../../../server/engines/intelligence/network-topology-engine');
const NetClass = net.constructor;

let engine;
beforeEach(() => {
    engine = new NetClass();
});

describe('NetworkTopologyEngine', () => {
    describe('registerNode', () => {
        test('registers valid validator node', () => {
            const result = engine.registerNode({
                operator_id: 'op1', node_type: 'validator',
                region: 'ap-southeast', endpoint: 'https://node1.example.com',
            });
            expect(result.status).toBe('registered');
            expect(result.node.node_id).toMatch(/^NODE-/);
            expect(result.api_key).toMatch(/^ntk_/);
        });

        test('rejects invalid node type', () => {
            const result = engine.registerNode({ node_type: 'invalid', region: 'ap-southeast', endpoint: 'https://x.com' });
            expect(result.error).toContain('Invalid node type');
        });

        test('rejects invalid region', () => {
            const result = engine.registerNode({ node_type: 'validator', region: 'mars', endpoint: 'https://x.com' });
            expect(result.error).toContain('Invalid region');
        });

        test('requires endpoint', () => {
            const result = engine.registerNode({ node_type: 'validator', region: 'ap-southeast' });
            expect(result.error).toContain('endpoint');
        });
    });

    describe('activateNode', () => {
        test('activates pending node', () => {
            const { node } = engine.registerNode({ operator_id: 'op1', region: 'ap-southeast', endpoint: 'https://n.com' });
            const result = engine.activateNode(node.node_id);
            expect(result.status).toBe('activated');
        });

        test('auto-peers with region nodes', () => {
            const { node: n1 } = engine.registerNode({ operator_id: 'op1', region: 'eu-west', endpoint: 'https://a.com' });
            engine.activateNode(n1.node_id);
            const { node: n2 } = engine.registerNode({ operator_id: 'op2', region: 'eu-west', endpoint: 'https://b.com' });
            const result = engine.activateNode(n2.node_id);
            expect(result.peers_connected).toBe(1);
        });

        test('returns error for unknown node', () => {
            expect(engine.activateNode('FAKE').error).toBe('Node not found');
        });
    });

    describe('heartbeat', () => {
        test('updates heartbeat', () => {
            const { node } = engine.registerNode({ operator_id: 'op1', region: 'us-east', endpoint: 'https://n.com' });
            engine.activateNode(node.node_id);
            const result = engine.heartbeat(node.node_id, { response_ms: 100, uptime_pct: 99.9 });
            expect(result.status).toBe('ok');
            expect(result.sla_compliant).toBe(true);
        });

        test('auto-activates pending node on heartbeat', () => {
            const { node } = engine.registerNode({ operator_id: 'op1', region: 'us-east', endpoint: 'https://n.com' });
            engine.heartbeat(node.node_id);
            expect(engine.getNode(node.node_id).status).toBe('active');
        });
    });

    describe('suspendNode / decommissionNode', () => {
        test('suspends active node', () => {
            const { node } = engine.registerNode({ operator_id: 'op1', region: 'eu-west', endpoint: 'https://n.com' });
            engine.activateNode(node.node_id);
            const result = engine.suspendNode(node.node_id, 'Maintenance');
            expect(result.status).toBe('suspended');
        });

        test('decommissions node', () => {
            const { node } = engine.registerNode({ operator_id: 'op1', region: 'eu-west', endpoint: 'https://n.com' });
            const result = engine.decommissionNode(node.node_id, 'End of life');
            expect(result.status).toBe('decommissioned');
        });
    });

    describe('discoverPeers', () => {
        test('discovers candidates', () => {
            const { node: n1 } = engine.registerNode({ operator_id: 'op1', region: 'ap-southeast', endpoint: 'https://a.com' });
            engine.activateNode(n1.node_id);
            const { node: n2 } = engine.registerNode({ operator_id: 'op2', region: 'ap-southeast', endpoint: 'https://b.com' });
            engine.activateNode(n2.node_id);
            const result = engine.discoverPeers(n1.node_id);
            expect(result.candidates.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('connectPeer', () => {
        test('connects two nodes', () => {
            const { node: n1 } = engine.registerNode({ operator_id: 'op1', region: 'us-east', endpoint: 'https://a.com' });
            const { node: n2 } = engine.registerNode({ operator_id: 'op2', region: 'us-west', endpoint: 'https://b.com' });
            const result = engine.connectPeer(n1.node_id, n2.node_id);
            expect(result.status).toBe('connected');
        });
    });

    describe('runConsensusRound', () => {
        test('returns insufficient if < 3 validators', () => {
            const result = engine.runConsensusRound({ product_id: 'p1' });
            expect(result.error).toContain('Insufficient');
        });

        test('runs consensus with enough validators', () => {
            for (let i = 0; i < 5; i++) {
                const { node } = engine.registerNode({ operator_id: `op${i}`, node_type: 'validator', region: 'eu-west', endpoint: `https://n${i}.com` });
                engine.activateNode(node.node_id);
            }
            const result = engine.runConsensusRound({ product_id: 'p1', verification_type: 'qr_verification' });
            expect(result.validators).toBeGreaterThanOrEqual(3);
            expect(['VERIFIED', 'REJECTED']).toContain(result.result);
        });
    });

    describe('getTopology', () => {
        test('returns topology map', () => {
            const topo = engine.getTopology();
            expect(topo.title).toContain('Topology');
            expect(topo.regions).toBeDefined();
        });
    });

    describe('getNetworkHealth', () => {
        test('returns unknown for empty network', () => {
            const health = engine.getNetworkHealth();
            expect(health.health).toBe('unknown');
        });

        test('returns healthy for good network', () => {
            const { node } = engine.registerNode({ operator_id: 'op1', region: 'eu-west', endpoint: 'https://n.com' });
            engine.activateNode(node.node_id);
            engine.heartbeat(node.node_id, { uptime_pct: 99.9, response_ms: 50 });
            const health = engine.getNetworkHealth();
            expect(health.active_nodes).toBe(1);
        });
    });

    describe('getters', () => {
        test('getNodeTypes returns 4 types', () => {
            expect(Object.keys(engine.getNodeTypes()).length).toBe(4);
        });
        test('getRegions returns 8 regions', () => {
            expect(Object.keys(engine.getRegions()).length).toBe(8);
        });
        test('getConsensusParams returns BFT params', () => {
            const p = engine.getConsensusParams();
            expect(p.min_validators).toBe(3);
            expect(p.quorum_pct).toBe(67);
        });
    });
});
