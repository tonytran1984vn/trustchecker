const obs = require('../../../server/engines/platform-ops-engine/observability');
const OBSClass = obs.constructor;

let engine;
beforeEach(() => { engine = new OBSClass(); });

describe('ObservabilityEngine', () => {
    describe('collectSystemHealth', () => {
        test('returns real system metrics', () => {
            const r = engine.collectSystemHealth();
            expect(r.process.pid).toBe(process.pid);
            expect(r.process.node_version).toBe(process.version);
            expect(r.memory.heap_used_mb).toBeGreaterThan(0);
            expect(r.cpu.cores).toBeGreaterThan(0);
        });

        test('has request metrics', () => {
            const r = engine.collectSystemHealth();
            expect(r.requests.total_tracked).toBe(0);
        });
    });

    describe('recordRequest', () => {
        test('records normal request', () => {
            engine.recordRequest('GET', '/api/test', 200, 50);
            const r = engine.collectSystemHealth();
            expect(r.requests.total_tracked).toBe(1);
        });

        test('500 errors recorded to error log', () => {
            engine.recordRequest('GET', '/api/fail', 500, 100);
            const r = engine.collectSystemHealth();
            expect(r.requests.errors_5min).toBe(1);
        });

        test('tracks response times', () => {
            engine.recordRequest('GET', '/api/fast', 200, 10);
            engine.recordRequest('GET', '/api/slow', 200, 200);
            engine.recordRequest('GET', '/api/med', 200, 100);
            const r = engine.collectSystemHealth();
            expect(r.requests.p50_ms).toBeDefined();
        });
    });

    describe('addAlertRule', () => {
        test('adds a response time alert', () => {
            const r = engine.addAlertRule({ name: 'Slow Response', metric: 'response_time', operator: '>', threshold: 1000, severity: 'critical' });
            expect(r.rule_id).toBe('ALERT-1');
        });
    });

    describe('getAlertStatus', () => {
        test('returns empty alerts initially', () => {
            const r = engine.getAlertStatus();
            expect(r.total_rules).toBe(0);
        });

        test('alert triggered by slow request', () => {
            engine.addAlertRule({ name: 'Slow', metric: 'response_time', operator: '>', threshold: 100 });
            engine.recordRequest('GET', '/slow', 200, 500);
            const r = engine.getAlertStatus();
            expect(r.recently_triggered.length).toBe(1);
        });
    });

    describe('trackIncidentSLA', () => {
        test('tracks SEV1 incident within SLA', () => {
            const r = engine.trackIncidentSLA({
                incident_id: 'INC-1', severity: 'SEV1',
                created_at: '2024-01-01T00:00:00Z',
                acknowledged_at: '2024-01-01T00:10:00Z',
                resolved_at: '2024-01-01T01:00:00Z'
            });
            expect(r.ack_sla_met).toBe(true);
            expect(r.actual_ack_min).toBe(10);
        });

        test('tracks SEV1 incident breaching SLA', () => {
            const r = engine.trackIncidentSLA({
                incident_id: 'INC-2', severity: 'SEV1',
                created_at: '2024-01-01T00:00:00Z',
                acknowledged_at: '2024-01-01T00:30:00Z'
            });
            expect(r.ack_sla_met).toBe(false);  // 30 min > 15 min SLA
        });
    });

    describe('getSLAPerformance', () => {
        test('empty when no incidents', () => {
            const r = engine.getSLAPerformance();
            expect(r.total).toBe(0);
        });

        test('calculates compliance after incidents', () => {
            engine.trackIncidentSLA({ incident_id: 'I1', severity: 'SEV1', created_at: '2024-01-01T00:00:00Z', acknowledged_at: '2024-01-01T00:10:00Z' });
            engine.trackIncidentSLA({ incident_id: 'I2', severity: 'SEV2', created_at: '2024-01-01T00:00:00Z', acknowledged_at: '2024-01-01T00:20:00Z' });
            const r = engine.getSLAPerformance();
            expect(r.total_incidents).toBe(2);
            expect(r.ack_sla_met).toBe(2);
        });
    });

    describe('getErrorBreakdown', () => {
        test('empty when no errors', () => {
            const r = engine.getErrorBreakdown();
            expect(r.total_errors).toBe(0);
        });

        test('groups errors by path', () => {
            engine.recordRequest('GET', '/api/a', 500, 10);
            engine.recordRequest('GET', '/api/a', 500, 10);
            engine.recordRequest('GET', '/api/b', 502, 10);
            const r = engine.getErrorBreakdown();
            expect(r.total_errors).toBe(3);
            expect(r.by_path[0].path).toBe('/api/a');
            expect(r.by_path[0].count).toBe(2);
        });
    });
});
