const crypto = require('crypto');
const db = require('../../db');

class GovernanceEngine {
    constructor() {
        this.GLOBAL_KILL_SWITCH = false;
    }

    hashKey(str) {
        return crypto.createHash('sha256').update(str).digest('hex');
    }

    classifyRisk({ action, confidence, blastRadius }) {
        if (blastRadius === 'cluster' || confidence < 0.75) return 'HIGH';
        if (action === 'restart_service' || action === 'rollback_release') return 'MEDIUM';
        return 'LOW';
    }

    async resolvePolicy(action, riskTier) {
        const query = await db.all('SELECT * FROM action_policies WHERE action = $1 LIMIT 1', [action]);
        if (query.length > 0) return query[0];

        // Fallback default safe policy
        return {
            action,
            risk_tier: riskTier,
            approval_mode: riskTier === 'LOW' ? 'AUTO' : 'ONE_APPROVER',
            max_concurrency: 1,
            cooldown_sec: 600,
            sla_sec: 120,
        };
    }

    // Propose action safely utilizing Idempotency Deduplication Key
    async proposeAction(input) {
        const dedupeKey = this.hashKey(input.action + JSON.stringify(input.target));

        const existing = await db.all(
            'SELECT * FROM action_proposals WHERE dedupe_key = $1 AND status IN ($2, $3) LIMIT 1',
            [dedupeKey, 'PENDING', 'APPROVED']
        );
        if (existing.length > 0) return existing[0]; // Idempotent block returning the active state

        const risk = this.classifyRisk(input);
        const policy = await this.resolvePolicy(input.action, risk);

        // SLA timeout compute
        const now = new Date();
        const expires_at = new Date(now.getTime() + policy.sla_sec * 1000);

        const insert = await db.all(
            `INSERT INTO action_proposals (action, target, root_cause, confidence, status, risk_tier, dedupe_key, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                input.action,
                JSON.stringify(input.target),
                input.root_cause,
                input.confidence,
                'PENDING',
                risk,
                dedupeKey,
                expires_at.toISOString(),
            ]
        );

        return insert[0];
    }

    // Mathematical circuit breaking blocking repeating identical logic
    async executionGuard(policy, action, targetStr) {
        if (this.GLOBAL_KILL_SWITCH) return false;

        const sinceMs = Date.now() - policy.cooldown_sec * 1000;
        // Cool down restriction
        const recentExecs = await db.all(
            `SELECT COUNT(*) as count FROM action_proposals 
             WHERE action = $1 AND target @> $2::jsonb AND status = 'EXECUTED' 
             AND created_at >= to_timestamp($3 / 1000.0)`,
            [action, targetStr, sinceMs]
        );

        if (recentExecs[0].count >= policy.max_concurrency) return false;

        return true;
    }

    async resolveProcess(proposalId) {
        const targetQuery = await db.all('SELECT * FROM action_proposals WHERE id = $1 LIMIT 1', [proposalId]);
        if (targetQuery.length === 0) return { error: 'Not Found' };

        const proposal = targetQuery[0];
        const policy = await this.resolvePolicy(proposal.action, proposal.risk_tier);

        // Timeout cleanup SLA Degradation mapping
        if (new Date() > new Date(proposal.expires_at)) {
            await db.run('UPDATE action_proposals SET status = $1 WHERE id = $2', ['EXPIRED', proposalId]);
            return { status: 'EXPIRED' };
        }

        const approvals = await db.all('SELECT * FROM action_approvals WHERE proposal_id = $1', [proposalId]);

        let approved = false;
        if (policy.approval_mode === 'AUTO') {
            approved = true;
        } else if (policy.approval_mode === 'ONE_APPROVER') {
            approved = approvals.some(a => a.decision === 'APPROVE');
        } else if (policy.approval_mode === 'TWO_APPROVERS') {
            approved = approvals.filter(a => a.decision === 'APPROVE').length >= 2;
        }

        if (approved) {
            const guardOk = await this.executionGuard(policy, proposal.action, JSON.stringify(proposal.target));
            if (!guardOk) {
                // Failsafe rollback due to cooldown or kill switch
                await db.run('UPDATE action_proposals SET status = $1 WHERE id = $2', ['REJECTED', proposalId]);
                return { status: 'BLOCKED_BY_GUARDRAIL' };
            }

            await db.run('UPDATE action_proposals SET status = $1 WHERE id = $2', ['EXECUTED', proposalId]);
            // Mocking execution log push
            await db.run('INSERT INTO action_executions (proposal_id, result, latency_ms) VALUES ($1, $2, $3)', [
                proposalId,
                'SUCCESS',
                15,
            ]);
            return { status: 'EXECUTED' };
        }

        return { status: 'PENDING' };
    }
}

module.exports = { GovernanceEngine };
