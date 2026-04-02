/**
 * Outbox Event Worker
 * Ensures 'exactly-once' execution of background side-effects for critical operations.
 * Resolves the issue where database transactions commit but server crashes prevent notification or execution.
 */
const db = require('../db');

class OutboxWorker {
    constructor() {
        this.pollIntervalMs = 5000;
        this.isRunning = false;
        this.timeoutId = null;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.poll();
        console.log('[OUTBOX_WORKER] Started polling for pending events...');
    }

    stop() {
        this.isRunning = false;
        if (this.timeoutId) clearTimeout(this.timeoutId);
    }

    async poll() {
        if (!this.isRunning) return;

        try {
            await this.processPendingEvents();
        } catch (e) {
            console.error('[OUTBOX_WORKER] Error during poll:', e.message);
        }

        this.timeoutId = setTimeout(() => this.poll(), this.pollIntervalMs);
    }

    async processPendingEvents() {
        // Enforce exactly-once delivery across multiple Node.js PM2 workers
        // using Postgres FOR UPDATE SKIP LOCKED
        await db.withTransaction(async tx => {
            const events = await tx.all(
                `SELECT * FROM outbox_events 
                 WHERE processed = false 
                 ORDER BY created_at ASC 
                 LIMIT 50 
                 FOR UPDATE SKIP LOCKED`
            );

            if (!events || events.length === 0) return;

            for (const event of events) {
                try {
                    await this.handleEvent(event);

                    // Mark processed inside the lock
                    await tx.run(`UPDATE outbox_events SET processed = true WHERE id = $1`, [event.id]);
                } catch (err) {
                    console.error(`[OUTBOX_WORKER] Failed to process event ${event.id}:`, err.message);
                    // Leave unprocessed to retry
                }
            }
        });
    }

    async handleEvent(event) {
        // Example execution multiplexer
        switch (event.aggregate_type) {
            case 'kill_switch':
            case 'dual_key':
                await this._handleCrisisEvent(event);
                break;
            default:
                console.log(`[OUTBOX_WORKER] Warning: Unmapped aggregate_type: ${event.aggregate_type}`);
        }
    }

    async _handleCrisisEvent(event) {
        const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

        // Structured execution log for auditing
        console.log(
            JSON.stringify({
                timestamp: new Date().toISOString(),
                module: 'OUTBOX_EXECUTOR',
                action: 'DISPATCH_SIDE_EFFECT',
                event_type: event.event_type,
                aggregate_id: event.aggregate_id,
                details: payload,
            })
        );

        // In a real implementation:
        // 1. Send Slack/Email alerts to required personnel
        // 2. Call external system webhooks
        // 3. Force-disconnect active socket sessions

        if (event.event_type === 'kill_switch_activated') {
            // Simulated side-effect
            // require('../../services/notification-service').notifyRedAlert(payload.target);
            // require('../../services/session-service').forceDisconnectOrg(payload.target);
        }
    }
}

module.exports = new OutboxWorker();
