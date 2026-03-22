const riskGraph = require('../../../server/engines/core/risk-graph-engine');
const RGClass = riskGraph.constructor;

let engine;
beforeEach(() => { engine = new RGClass(); });

describe('RiskGraphEngine', () => {
    describe('analyzeBehavior', () => {
        test('empty input returns low risk', () => {
            const r = engine.analyzeBehavior();
            expect(r.risk_score).toBe(0);
            expect(r.risk_level).toBe('low');
        });

        test('detects circular routing', () => {
            const shipments = [
                { origin: 'A', destination: 'B', created_at: '2024-01-01' },
                { origin: 'B', destination: 'A', created_at: '2024-01-02' },
            ];
            const r = engine.analyzeBehavior(shipments);
            expect(r.signals.find(s => s.pattern === 'circular_routing')).toBeDefined();
            expect(r.risk_score).toBeGreaterThanOrEqual(25);
        });

        test('detects phantom partners', () => {
            const partners = [{ id: 'P1', status: 'active' }, { id: 'P2', status: 'active' }];
            const scans = []; // no scans at all
            const r = engine.analyzeBehavior([], [], partners, scans);
            expect(r.signals.find(s => s.pattern === 'phantom_partner')).toBeDefined();
        });

        test('detects geographic mismatch', () => {
            const scans = [
                { expected_country: 'US', scan_country: 'CN' },
                { expected_country: 'DE', scan_country: 'VN' },
            ];
            const r = engine.analyzeBehavior([], [], [], scans);
            expect(r.signals.find(s => s.pattern === 'geographic_mismatch')).toBeDefined();
        });

        test('accepts object input format', () => {
            const r = engine.analyzeBehavior({ shipments: [], credits: [] });
            expect(r.risk_level).toBe('low');
        });

        test('critical risk level at score >= 50', () => {
            const shipments = [
                { origin: 'A', destination: 'B', created_at: '2024-01-01' },
                { origin: 'B', destination: 'A', created_at: '2024-01-02' },
            ];
            const scans = [{ expected_country: 'US', scan_country: 'CN' }];
            const partners = [{ id: 'P1', status: 'active' }];
            const r = engine.analyzeBehavior(shipments, [], partners, scans);
            expect(r.risk_score).toBeGreaterThanOrEqual(50);
            expect(r.risk_level).toBe('critical');
        });
    });

    describe('buildFraudGraph', () => {
        test('empty graph', () => {
            const r = engine.buildFraudGraph();
            expect(r.graph.nodes).toBe(0);
        });

        test('detects clusters', () => {
            const entities = [
                { id: 'A', name: 'A', type: 'partner' },
                { id: 'B', name: 'B', type: 'partner' },
                { id: 'C', name: 'C', type: 'partner' },
            ];
            const relationships = [
                { from: 'A', to: 'B', type: 'supplier' },
            ];
            const r = engine.buildFraudGraph(entities, relationships);
            expect(r.graph.clusters).toBe(1); // A-B in one cluster, C isolated
            expect(r.topology.max_cluster_size).toBe(2);
        });

        test('counts suspicious links', () => {
            const entities = [
                { id: 'A', name: 'A', type: 'partner' },
                { id: 'B', name: 'B', type: 'partner' },
            ];
            const relationships = [
                { from: 'A', to: 'B', suspicious: true },
            ];
            const r = engine.buildFraudGraph(entities, relationships);
            expect(r.suspicious_links).toBe(1);
        });

        test('counts high risk nodes', () => {
            const entities = [
                { id: 'A', name: 'A', risk_score: 80 },
                { id: 'B', name: 'B', risk_score: 20 },
            ];
            const r = engine.buildFraudGraph(entities, []);
            expect(r.high_risk_nodes).toBe(1);
        });
    });

    describe('detectHiddenLinks', () => {
        test('detects shared device', () => {
            const scans = [
                { device_id: 'D1', entity_id: 'E1' },
                { device_id: 'D1', entity_id: 'E2' },
            ];
            const r = engine.detectHiddenLinks([], [], scans);
            expect(r.by_type.shared_device).toBe(1);
        });

        test('detects route concentration', () => {
            const shipments = [
                { origin: 'A', destination: 'B', partner_id: 'P1' },
                { origin: 'A', destination: 'B', partner_id: 'P2' },
                { origin: 'A', destination: 'B', partner_id: 'P3' },
                { origin: 'A', destination: 'B', partner_id: 'P4' },
            ];
            const r = engine.detectHiddenLinks([], shipments, []);
            expect(r.by_type.route_concentration).toBe(1);
        });
    });

    describe('detectCrossOrgPatterns', () => {
        test('detects cross-org shared device', () => {
            const orgs = [
                { org_id: 'O1', devices: ['D1', 'D2'] },
                { org_id: 'O2', devices: ['D1', 'D3'] },
            ];
            const r = engine.detectCrossOrgPatterns(orgs);
            expect(r.patterns.find(p => p.type === 'cross_org_device')).toBeDefined();
            expect(r.risk_level).toBe('critical');
        });

        test('detects circular credit transfers', () => {
            const orgs = [
                { org_id: 'O1', devices: [], transfers: [{ from: 'O1', to: 'O2' }] },
                { org_id: 'O2', devices: [], transfers: [{ from: 'O2', to: 'O1' }] },
            ];
            const r = engine.detectCrossOrgPatterns(orgs);
            expect(r.patterns.find(p => p.type === 'circular_credits')).toBeDefined();
        });

        test('clean orgs return low risk', () => {
            const r = engine.detectCrossOrgPatterns([{ org_id: 'O1', devices: ['D1'], transfers: [] }]);
            expect(r.risk_level).toBe('low');
        });
    });

    describe('getPatterns', () => {
        test('has 6 high risk patterns', () => {
            expect(engine.getPatterns().high_risk.length).toBe(6);
        });
    });
});
