const eventBus = require('./event-bus');
const crypto = require('crypto');

class PolicyEngine {
    constructor() {
        // Source of Truth is RiskMemory, but we keep an active cache
        this.approvalCache = new Map();
        eventBus.subscribe('*', payload => this.handleEvent(payload));
    }

    handleEvent(payload) {
        const { event_type, data } = payload;

        if (event_type === 'APPROVAL_REQUESTED') {
            this.approvalCache.set(data.request_id, {
                request_id: data.request_id,
                required_signatures: data.required_signatures,
                target_action: data.target_action,
                target_params: data.target_params,
                signatures: new Set(),
                status: 'PENDING',
            });
        }

        if (event_type === 'APPROVAL_GRANTED') {
            const req = this.approvalCache.get(data.request_id);
            if (!req || req.status === 'COMMITTED') return;

            req.signatures.add(data.actor.user_id);

            if (req.signatures.size >= req.required_signatures) {
                req.status = 'COMMITTED';
                this.executeApprovedAction(req);
            }
        }
    }

    executeApprovedAction(req) {
        // Late Bind resolution to avoid circular dependencies during initialization
        if (req.target_action === 'ROLLBACK') {
            const rollbackEngine = require('./rollback-engine');
            rollbackEngine.rollback(req.target_params.scenario_hash, 'multi-sig-committed', req.target_params);
        } else if (req.target_action === 'KILL_SWITCH') {
            eventBus.publish('KILL_SWITCH_TRIGGERED', {
                event_id: crypto.randomUUID(),
                producer: 'policy-engine',
                occurred_at: new Date().toISOString(),
                scenario_hash: req.target_params.scenario_hash || 'GLOBAL',
                sequence_no: 0,
                data: {
                    switch_id: req.target_params.switch_id,
                    mode: 'multi-sig-committed',
                    actor: req.target_params.options.actor,
                },
            });
        }
    }

    // Returns: { status: 'auto' | 'requires_approval' | 'denied', required?: number }
    evaluateRollback(actor, event_count) {
        // actor: { user_id, role, org_id, session_id }
        if (!actor || !actor.role) return { status: 'denied', reason: 'unauthenticated' };

        if (actor.role === 'system_admin') {
            if (event_count > 1000) return { status: 'requires_approval', required: 2, group: 'crisis_council' };
            return { status: 'auto' };
        }

        if (['cto', 'risk_chair', 'ggc_chair'].includes(actor.role)) {
            if (event_count > 5000) return { status: 'requires_approval', required: 2, group: 'crisis_council' };
            return { status: 'auto' };
        }

        return { status: 'denied', reason: 'insufficient_clearance' };
    }

    evaluateKillSwitch(actor, switch_id) {
        if (!actor || !actor.role) return { status: 'denied', reason: 'unauthenticated' };

        // Hardcoded critical KS rules mapped from KS Registry Governance Docs
        if (switch_id === 'KS-01') {
            return { status: 'requires_approval', required: 2, group: 'crisis_council' };
        }

        if (switch_id === 'KS-02') {
            if (actor.role === 'system_admin') return { status: 'denied', reason: 'system_admin_cannot_freeze_orgs' };
            if (['risk_chair', 'compliance_officer'].includes(actor.role)) return { status: 'auto' };
            return { status: 'requires_approval', required: 1, group: 'risk_committee' };
        }

        // Generic KS logic
        if (actor.role === 'system_admin' || ['cto', 'risk_chair', 'ggc_chair'].includes(actor.role)) {
            return { status: 'auto' };
        }

        return { status: 'denied', reason: 'insufficient_clearance' };
    }

    grantApproval(actor, request_id) {
        const req = this.approvalCache.get(request_id);
        if (!req) throw new Error('Approval Request not found');
        if (req.status === 'COMMITTED') throw new Error('Already COMMITTED');
        if (req.signatures.has(actor.user_id)) throw new Error('Double signature detected');

        // Audit log push (this triggers the event listener loop back above)
        eventBus.publish('APPROVAL_GRANTED', {
            event_id: crypto.randomUUID(),
            scenario_hash: req.target_params.scenario_hash || 'GLOBAL',
            sequence_no: 0,
            producer: 'policy-engine',
            occurred_at: new Date().toISOString(),
            data: { request_id, actor },
        });

        return { status: 'signature_accepted' };
    }
}

module.exports = new PolicyEngine();
