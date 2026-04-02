require('dotenv').config();
const assert = require('assert');
const db = require('./db');
const { GovernanceEngine } = require('./engines/platform-ops-engine/governance-engine');

async function testL51() {
    await db._readyPromise;
    console.log('[Test L5.1: Governed Autonomous Ops]');

    const engine = new GovernanceEngine();

    try {
        console.log('[+] Initializing clean state (Truncating tables)');
        await db.run('TRUNCATE TABLE action_executions, action_approvals, action_proposals RESTART IDENTITY CASCADE');

        console.log('[Test 1] Idempotency Deduping (Anti Action-Storm)');
        const inputPayload = {
            action: 'restart_service',
            target: { service: 'auth-gateway' },
            root_cause: 'latency_spike',
            confidence: 0.82,
            blastRadius: 'single_node',
        };

        const proposal1 = await engine.proposeAction(inputPayload);
        const proposal2 = await engine.proposeAction(inputPayload);

        // Assert identical dedupe_key matching prevents duplicates
        assert(
            proposal1.id === proposal2.id,
            `Idempotency failure! AI spammed duplicate requests: ${proposal1.id} vs ${proposal2.id}`
        );
        console.log('✅ Action Storm suppressed. Duplicate request intelligently dropped.');

        console.log('[Test 2] Policy Escalation (MEDIUM requires ONE_APPROVER)');
        // A Medium risk requires manual override via `action_approvals` mapping to SLA
        // Verify it isn't auto-executed
        let state = await engine.resolveProcess(proposal1.id);
        assert(state.status === 'PENDING', 'AI maliciously bypassed ONE_APPROVER requirement!');

        // Simulate Human Officer Approval
        await db.run('INSERT INTO action_approvals (proposal_id, approver_id, decision) VALUES ($1, $2, $3)', [
            proposal1.id,
            'ops-chief',
            'APPROVE',
        ]);

        // Retry execution loop
        state = await engine.resolveProcess(proposal1.id);
        assert(
            state.status === 'EXECUTED',
            `Execution system failed after acquiring valid Approval Quorum! Status was ${state.status}`
        );
        console.log('✅ Human-in-the-Loop approval cleanly bridged safe execution.');

        console.log('[Test 3] Cooldown Circuit Breaker (Execution Guard)');
        // Assuming Admin presses Restart again during Cooldown bounds, or AI spams it
        // The Dedupe allows us if the old one is EXECUTED. Let's create a new proposal that slips past dedupe via forced new key
        const nextPayload = { ...inputPayload, confidence: 0.83 };
        const nextProposal = await engine.proposeAction(nextPayload); // Resolves to new ID because dedupe uses whole payload struct in old design conceptually (wait, dedupe hashes action + target).
        // wait, dedupe_key = hash(action + target). Target is identical, but old status is EXECUTED!
        // PENDING/APPROVED are blocked by dedupe, but EXECUTED lets a new proposal form.
        assert(nextProposal.id !== proposal1.id, 'Dedupe wrongly blocked a post-execution retry tracking!');

        // Approve it instantly
        await db.run('INSERT INTO action_approvals (proposal_id, approver_id, decision) VALUES ($1, $2, $3)', [
            nextProposal.id,
            'ops-chief',
            'APPROVE',
        ]);

        const breakerState = await engine.resolveProcess(nextProposal.id);
        assert(
            breakerState.status === 'BLOCKED_BY_GUARDRAIL',
            `Circuit Breaker failed! System spam-executed restarts! Status: ${breakerState.status}`
        );
        console.log('✅ Circuit breaker suppressed rapid repetitive execution! Cooldown enforced.');

        console.log('[Test 4] SLA Expiry Timeout Degradation');
        const slowPayload = {
            action: 'rollback_release',
            target: { service: 'payment_engine' },
            root_cause: 'error_spike',
            confidence: 0.9,
            blastRadius: 'cluster',
        };
        const slowProp = await engine.proposeAction(slowPayload);

        // Manipulate expires_at to simulate missed 60s SLA
        await db.run("UPDATE action_proposals SET expires_at = now() - interval '1 minute' WHERE id = $1", [
            slowProp.id,
        ]);

        const expiredState = await engine.resolveProcess(slowProp.id);
        assert(expiredState.status === 'EXPIRED', 'SLA engine missed expiration deadline!');
        console.log('✅ Missed SLA logically decayed to EXPIRED preventing unsafe stale execution.');

        console.log('🎉 L5.1 AI Control Action Quorum firmly established!');
        process.exit(0);
    } catch (e) {
        console.error('⛔ Validation Failed:', e);
        process.exit(1);
    }
}
testL51();
