const om = require('../../../server/engines/platform-ops-engine/ops-monitoring');
const OMClass = om.constructor;

let engine;
beforeEach(() => { engine = new OMClass(); });

describe('OpsMonitoringEngine', () => {
    describe('checkPipelineHealth', () => {
        test('healthy with good metrics', () => {
            const r = engine.checkPipelineHealth({ uptime_pct: 99.99, error_rate_pct: 0.01 });
            expect(r.overall).toBe('healthy');
        });

        test('critical with bad uptime', () => {
            const r = engine.checkPipelineHealth({ uptime_pct: 98.0 });
            expect(r.overall).toMatch(/critical|degraded/);
        });

        test('has 8 SLO checks', () => {
            expect(engine.checkPipelineHealth().checks.length).toBe(8);
        });
    });

    describe('createIncident', () => {
        test('creates SEV1 incident', () => {
            const r = engine.createIncident({ title: 'System Down', severity: 'SEV1' });
            expect(r.incident_id).toContain('INC-');
            expect(r.severity.key).toBe('SEV1');
            expect(r.status).toBe('open');
        });

        test('invalid severity returns error', () => {
            const r = engine.createIncident({ title: 'Test', severity: 'SEV9' });
            expect(r.error).toBeDefined();
        });

        test('attaches runbook when specified', () => {
            const r = engine.createIncident({ title: 'Fraud', severity: 'SEV1', runbook_key: 'fraud_outbreak' });
            expect(r.runbook).toBeDefined();
            expect(r.runbook.name).toContain('Fraud');
        });
    });

    describe('assignIncident', () => {
        test('assigns and acknowledges', () => {
            const inc = engine.createIncident({ title: 'Test', severity: 'SEV3' });
            const r = engine.assignIncident(inc.incident_id, 'user-1', 'lead');
            expect(r.incident.status).toBe('acknowledged');
            expect(r.incident.assigned_to).toBe('user-1');
        });

        test('unknown incident returns error', () => {
            const r = engine.assignIncident('FAKE', 'user-1', 'lead');
            expect(r.error).toBeDefined();
        });
    });

    describe('escalateIncident', () => {
        test('escalates from SEV3 to SEV1', () => {
            const inc = engine.createIncident({ title: 'Test', severity: 'SEV3' });
            const r = engine.escalateIncident(inc.incident_id, 'lead', 'Getting worse', 'SEV1');
            expect(r.incident.severity.key).toBe('SEV1');
        });
    });

    describe('resolveIncident', () => {
        test('resolves and calculates SLA', () => {
            const inc = engine.createIncident({ title: 'Test', severity: 'SEV3' });
            const r = engine.resolveIncident(inc.incident_id, 'user-1', 'Fixed', 'Config error');
            expect(r.incident.status).toBe('resolved');
            expect(r.incident.root_cause).toBe('Config error');
        });
    });

    describe('activateWarRoom', () => {
        test('activates war room for incident', () => {
            const inc = engine.createIncident({ title: 'Critical', severity: 'SEV1' });
            const r = engine.activateWarRoom(inc.incident_id, 'commander');
            expect(r.war_room.status).toBe('active');
            expect(r.war_room.commander).toBe('commander');
        });
    });

    describe('createPostMortem', () => {
        test('creates post-mortem for resolved incident', () => {
            const inc = engine.createIncident({ title: 'Outage', severity: 'SEV1' });
            engine.resolveIncident(inc.incident_id, 'u1', 'Fixed', 'Root cause');
            const r = engine.createPostMortem(inc.incident_id, 'u1');
            expect(r.post_mortem.template).toBe('blameless');
        });

        test('rejects post-mortem for open incident', () => {
            const inc = engine.createIncident({ title: 'Open', severity: 'SEV3' });
            const r = engine.createPostMortem(inc.incident_id, 'u1');
            expect(r.error).toContain('resolved');
        });
    });

    describe('getMTTR', () => {
        test('zero when no incidents', () => {
            expect(engine.getMTTR().total_resolved).toBe(0);
        });

        test('calculates after resolution', () => {
            const inc = engine.createIncident({ title: 'Test', severity: 'SEV3' });
            engine.assignIncident(inc.incident_id, 'u1', 'l1');
            engine.resolveIncident(inc.incident_id, 'u1', 'Fixed', 'Bug');
            const r = engine.getMTTR();
            expect(r.total_resolved).toBe(1);
            expect(r.sla_compliance_pct).toBeDefined();
        });
    });

    describe('getCorrelation', () => {
        test('groups incidents by module', () => {
            engine.createIncident({ title: 'A', severity: 'SEV3', module: 'auth' });
            engine.createIncident({ title: 'B', severity: 'SEV3', module: 'auth' });
            engine.createIncident({ title: 'C', severity: 'SEV3', module: 'billing' });
            const r = engine.getCorrelation();
            expect(r.correlated_groups).toBe(1);
            expect(r.groups[0].module).toBe('auth');
        });
    });

    describe('getters', () => {
        test('getSeverities has 4 levels', () => {
            expect(Object.keys(engine.getSeverities()).length).toBe(4);
        });

        test('getRunbooks has 6 runbooks', () => {
            expect(Object.keys(engine.getRunbooks()).length).toBe(6);
        });

        test('getSLOs has 8 thresholds', () => {
            expect(Object.keys(engine.getSLOs()).length).toBe(8);
        });

        test('getOpsBoundary has forbidden actions', () => {
            expect(engine.getOpsBoundary().cannot_do.length).toBe(6);
        });
    });
});
