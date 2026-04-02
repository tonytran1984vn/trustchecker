/**
 * Crisis Governance Repository
 * Handles Dual-Key event-sourcing, strict state machine, concurrency locks, and replay-safety.
 */
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

class CrisisRepository {
    // Concurrency / Idempotency constraint ensuring only 1 active switch per scope
    async activateKillSwitch(type, target, activatedBy, role, reason, minLevel, drill) {
        return db.withTransaction(async tx => {
            // LOCK ORDERING: 1. kill_switch_logs, 2. ops_incidents_v2, 3. outbox_events

            // Idempotency / Concurrency Check (Pessimistic Lock)
            const existingActive = await tx.get(
                `SELECT * FROM kill_switch_logs 
                 WHERE kill_switch_type = $1 AND target = $2 AND status = 'active'
                 FOR UPDATE`,
                [type, target]
            );

            if (existingActive) {
                // Replay-safe return (deterministic snapshot pattern)
                if (existingActive.activated_by === activatedBy && existingActive.reason === reason) {
                    return JSON.parse(existingActive.details || '{}');
                }
                return { error: 'ALREADY_ACTIVE', message: `Kill-switch already active for ${type}:${target}` };
            }

            const id = uuidv4();
            const responsePayload = { id, type, target, status: 'active', crisis_level: minLevel };

            await tx.run(
                `INSERT INTO kill_switch_logs (
                    id, kill_switch_type, target, status, activated_by, activated_role, reason, drill_mode, details, created_at
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
                [id, type, target, 'active', activatedBy, role, reason, drill, JSON.stringify(responsePayload)]
            );

            // OUTBOX PATTERN INSERT
            await tx.run(
                `INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [uuidv4(), 'kill_switch', id, 'kill_switch_activated', JSON.stringify(responsePayload)]
            );

            return responsePayload;
        });
    }

    async initiateDualKey(type, target, activatedBy, role, reason, requestId) {
        return db.withTransaction(async tx => {
            // Expire stale dual keys first
            await tx.run(
                `UPDATE kill_switch_logs 
                 SET status = 'expired' 
                 WHERE kill_switch_type = 'dual_key_event' AND status = 'pending' 
                 AND created_at < NOW() - INTERVAL '15 minutes'`
            );

            // Replay protection & Concurrency Lock
            const existing = await tx.get(
                `SELECT * FROM kill_switch_logs 
                 WHERE kill_switch_type = 'dual_key_event' AND target = $1 AND status = 'pending' 
                 FOR UPDATE`,
                [`${type}:${target}`]
            );

            if (existing) {
                // Replay-safe return if same user just double-clicked (Deterministic Snapshot)
                if (existing.activated_by === activatedBy) {
                    return JSON.parse(existing.details || '{}');
                }
                return { status: 'already_pending', approval: existing };
            }

            const id = requestId || uuidv4();
            const responsePayload = { id, type, target, status: 'awaiting_second_key', warning: 'replay_detected' };
            const firstRunPayload = { id, type, target, status: 'awaiting_second_key' }; // Saved for first time

            await tx.run(
                `INSERT INTO kill_switch_logs (
                    id, kill_switch_type, target, status, activated_by, activated_role, reason, details, created_at
                 ) VALUES ($1, 'dual_key_event', $2, 'pending', $3, $4, $5, $6, NOW())`,
                [id, `${type}:${target}`, activatedBy, role, reason, JSON.stringify(responsePayload)]
            );

            // OUTBOX PATTERN: Send notification event
            await tx.run(
                `INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [
                    uuidv4(),
                    'dual_key',
                    id,
                    'dual_key_initiated',
                    JSON.stringify({ ...firstRunPayload, activatedBy, role }),
                ]
            );

            return firstRunPayload;
        });
    }

    async approveDualKey(pendingId, secondApprover, role, drill, minLevel) {
        return db.withTransaction(async tx => {
            // Lock the specific dual-key event
            const pending = await tx.get(
                `SELECT * FROM kill_switch_logs 
                 WHERE id = $1 AND kill_switch_type = 'dual_key_event'
                 FOR UPDATE`,
                [pendingId]
            );

            if (!pending) return { error: 'Approval request not found.' };

            // State Machine Guard
            if (pending.status === 'approved') {
                return JSON.parse(pending.details || '{}'); // Cached deterministic snapshot
            }
            if (pending.status === 'rejected')
                return { error: 'INVALID_TRANSITION', message: 'Already rejected.', id: pending.id };
            if (pending.status === 'expired')
                return { error: 'INVALID_TRANSITION', message: 'Already expired.', id: pending.id };
            if (pending.status !== 'pending')
                return {
                    error: 'INVALID_TRANSITION',
                    message: `Cannot transition from ${pending.status} to approved.`,
                };

            // TTL Post-Lock Check (Shifted to PostgreSQL for timezone immunity)
            const ttlCheck = await tx.get(
                `SELECT (NOW() > created_at + INTERVAL '15 minutes') as is_expired FROM kill_switch_logs WHERE id = $1`,
                [pendingId]
            );
            if (ttlCheck && ttlCheck.is_expired) {
                await tx.run(`UPDATE kill_switch_logs SET status = 'expired' WHERE id = $1`, [pendingId]);
                return { error: 'EXPIRED', message: 'Dual-key approval period expired (15 min limitation).' };
            }

            // User segregation guard
            if (pending.activated_by === secondApprover) {
                return { error: 'SAME_USER', message: 'Dual-key requires two DIFFERENT users.' };
            }

            // Create actual active kill switch log
            const [type, ...targetParts] = pending.target.split(':');
            const target = targetParts.join(':');

            const resultPayload = { id: pendingId, type, target, status: 'activated', crisis_level: minLevel };

            // Valid Transition -> "approved" + Store snapshot
            await tx.run(
                `UPDATE kill_switch_logs SET status = 'approved', deactivated_by = $2, deactivated_at = NOW(), details = $3 WHERE id = $1`,
                [pendingId, secondApprover, JSON.stringify(resultPayload)]
            );

            // Handle uniqueness to prevent duplications if they clicked it twice
            const currentActive = await tx.get(
                `SELECT id FROM kill_switch_logs WHERE kill_switch_type = $1 AND target = $2 AND status = 'active' FOR UPDATE`,
                [type, target]
            );
            if (!currentActive) {
                const id = uuidv4();
                await tx.run(
                    `INSERT INTO kill_switch_logs (
                        id, kill_switch_type, target, status, activated_by, activated_role, reason, drill_mode, details, created_at
                     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
                    [
                        id,
                        type,
                        target,
                        'active',
                        pending.activated_by,
                        'dual-key',
                        pending.reason,
                        drill,
                        JSON.stringify(resultPayload),
                    ]
                );
            }

            // OUTBOX LOG
            await tx.run(
                `INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, created_at)
                          VALUES ($1, $2, $3, $4, $5, NOW())`,
                [
                    uuidv4(),
                    'dual_key',
                    pendingId,
                    'dual_key_approved',
                    JSON.stringify({ pendingId, secondApprover, target }),
                ]
            );

            return resultPayload;
        });
    }

    async deactivateKillSwitch(killSwitchId, deactivatedBy, reason) {
        return db.withTransaction(async tx => {
            const ks = await tx.get(`SELECT * FROM kill_switch_logs WHERE id = $1 FOR UPDATE`, [killSwitchId]);
            if (!ks) return { error: 'NOT_FOUND', message: 'Kill-switch not found.' };

            // FSM
            if (ks.status === 'deactivated') {
                return JSON.parse(ks.details || '{}'); // Cached deterministic snapshot
            }
            if (ks.status !== 'active')
                return { error: 'INVALID_TRANSITION', message: `Cannot deactivate a ${ks.status} kill switch.` };

            const resultPayload = { ...ks, status: 'deactivated', deactivated_by: deactivatedBy };

            await tx.run(
                `UPDATE kill_switch_logs SET status = 'deactivated', deactivated_by = $2, deactivated_at = NOW(), details = $3 WHERE id = $1`,
                [killSwitchId, deactivatedBy, JSON.stringify(resultPayload)]
            );

            // OUTBOX PATTERN
            await tx.run(
                `INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, created_at)
                          VALUES ($1, $2, $3, $4, $5, NOW())`,
                [
                    uuidv4(),
                    'kill_switch',
                    killSwitchId,
                    'kill_switch_deactivated',
                    JSON.stringify({ killSwitchId, deactivatedBy, target: ks.target }),
                ]
            );

            return resultPayload;
        });
    }

    async getActiveKillSwitches() {
        return db.all(`SELECT * FROM kill_switch_logs WHERE status = 'active'`);
    }

    async getPendingApprovals() {
        // Enforce TTL on query level
        return db.all(
            `SELECT * FROM kill_switch_logs WHERE kill_switch_type = 'dual_key_event' AND status = 'pending' AND created_at >= NOW() - INTERVAL '15 minutes'`
        );
    }
}

module.exports = new CrisisRepository();
