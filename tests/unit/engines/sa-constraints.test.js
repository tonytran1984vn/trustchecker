const sa = require('../../../server/engines/infrastructure/sa-constraints');

// Get fresh instance for each test
let constraints;
beforeEach(() => {
    // Create a fresh SuperAdminConstraints instance
    const Cls = sa.constructor;
    constraints = new Cls();
});

describe('SuperAdminConstraints', () => {
    describe('getRestrictions / getForbidden', () => {
        test('returns restricted actions', () => {
            const r = constraints.getRestrictions();
            expect(r.credit_edit).toBeDefined();
            expect(r.credit_edit.severity).toBe('critical');
        });

        test('returns forbidden actions', () => {
            const f = constraints.getForbidden();
            expect(f.length).toBeGreaterThanOrEqual(6);
            expect(f[0].action).toBeDefined();
            expect(f[0].reason).toBeDefined();
        });
    });

    describe('checkAction', () => {
        test('allows unrestricted actions', () => {
            const result = constraints.checkAction('view_dashboard', 'sa1');
            expect(result.allowed).toBe(true);
            expect(result.type).toBe('unrestricted');
        });

        test('requires approval for critical actions', () => {
            const result = constraints.checkAction('credit_edit', 'sa1');
            expect(result.allowed).toBe(false);
            expect(result.requires_approval).toBe(true);
            expect(result.approver_role).toBe('compliance_officer');
        });

        test('permanently forbids credit_delete (daily_limit 0)', () => {
            const result = constraints.checkAction('credit_delete', 'sa1');
            expect(result.allowed).toBe(false);
            expect(result.type).toBe('forbidden');
        });

        test('allows medium severity without approval', () => {
            const result = constraints.checkAction('audit_export', 'sa1');
            expect(result.allowed).toBe(true);
            expect(result.remaining_today).toBe(10);
        });

        test('rate limits after daily cap', () => {
            // Log 10 audit_export actions
            for (let i = 0; i < 10; i++) {
                constraints.logAction('audit_export', 'sa1', 'target');
            }
            const result = constraints.checkAction('audit_export', 'sa1');
            expect(result.allowed).toBe(false);
            expect(result.type).toBe('rate_limited');
        });
    });

    describe('requestApproval', () => {
        test('creates request for valid restricted action', () => {
            const result = constraints.requestApproval({
                action: 'credit_edit', sa_user_id: 'sa1',
                target_entity: 'credit-123', reason: 'Correction needed',
            });
            expect(result.request_id).toMatch(/^SA-REQ-/);
            expect(result.status).toBe('pending');
            expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
        });

        test('returns error for unknown action', () => {
            const result = constraints.requestApproval({ action: 'unknown', sa_user_id: 'sa1' });
            expect(result.error).toBeDefined();
        });

        test('returns error for action not needing approval', () => {
            const result = constraints.requestApproval({ action: 'audit_export', sa_user_id: 'sa1' });
            expect(result.error).toContain('does not require');
        });
    });

    describe('processApproval', () => {
        test('approves valid request', () => {
            const req = constraints.requestApproval({
                action: 'credit_edit', sa_user_id: 'sa1',
                target_entity: 'credit-1', reason: 'Fix',
            });
            const result = constraints.processApproval(req.request_id, {
                approver_id: 'compliance1', role: 'compliance_officer', decision: 'approve',
            });
            expect(result.status).toBe('approved');
        });

        test('rejects request', () => {
            const req = constraints.requestApproval({
                action: 'credit_edit', sa_user_id: 'sa1',
                target_entity: 'credit-1', reason: 'Fix',
            });
            const result = constraints.processApproval(req.request_id, {
                approver_id: 'compliance1', role: 'compliance_officer',
                decision: 'reject', reason: 'Not justified',
            });
            expect(result.status).toBe('rejected');
        });

        test('blocks SA from self-approving (SoD)', () => {
            const req = constraints.requestApproval({
                action: 'credit_edit', sa_user_id: 'sa1',
                target_entity: 'credit-1', reason: 'Fix',
            });
            const result = constraints.processApproval(req.request_id, {
                approver_id: 'sa1', role: 'compliance_officer', decision: 'approve',
            });
            expect(result.error).toContain('SoD');
        });

        test('returns error for unknown request', () => {
            const result = constraints.processApproval('FAKE-ID', { approver_id: 'x', decision: 'approve' });
            expect(result.error).toContain('not found');
        });

        test('blocks double-processing', () => {
            const req = constraints.requestApproval({
                action: 'credit_edit', sa_user_id: 'sa1',
                target_entity: 'credit-1', reason: 'Fix',
            });
            constraints.processApproval(req.request_id, { approver_id: 'c1', role: 'compliance', decision: 'approve' });
            const result = constraints.processApproval(req.request_id, { approver_id: 'c2', decision: 'approve' });
            expect(result.error).toContain('approved');
        });
    });

    describe('Audit trail', () => {
        test('logAction creates hash-linked entry', () => {
            const entry = constraints.logAction('audit_export', 'sa1', 'report-1');
            expect(entry.hash).toMatch(/^[a-f0-9]{64}$/);
            expect(entry.index).toBe(0);
        });

        test('chain integrity maintained', () => {
            constraints.logAction('audit_export', 'sa1', 'r1');
            constraints.logAction('user_role_change', 'sa1', 'u1');
            constraints.logAction('system_config', 'sa1', 'cfg');
            const trail = constraints.getAuditTrail();
            expect(trail.chain_valid).toBe(true);
            expect(trail.total_actions).toBe(3);
        });

        test('getConstraintDashboard returns complete info', () => {
            const dash = constraints.getConstraintDashboard();
            expect(dash.title).toContain('Super Admin');
            expect(dash.restricted_actions).toBeDefined();
            expect(dash.forbidden_actions).toBeDefined();
        });
    });
});
