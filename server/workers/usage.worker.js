/**
 * Usage Ledger Background Worker (BullMQ Edition)
 * Production-safe event persistence to PostgreSQL (Append-Only)
 */

const { Worker, Queue } = require('bullmq');
const Redis = require('ioredis');
const db = require('../db');

// Reuse existing Redis connections or configure specially for BullMQ
function getBullMQConnection() {
    return new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    });
}

const QUEUE_NAME = 'usage_events_queue';
const connection = getBullMQConnection();

// Create BullMQ Queue for pushing jobs externally
const usageQueue = new Queue(QUEUE_NAME, { connection });

class UsageWorker {
    static start() {
        console.log(`👷 BullMQ UsageWorker starting... Listening on: ${QUEUE_NAME}`);

        this.worker = new Worker(
            QUEUE_NAME,
            async job => {
                await this.processEvent(job.data);
            },
            {
                connection,
                concurrency: 50, // Scale limits: 50 concurrent inserts
                limiter: {
                    max: 5000, // 5000 jobs
                    duration: 1000, // per second
                },
            }
        );

        this.worker.on('completed', job => {
            // console.log(`✅ Job ${job.id} done.`); // Keep quiet for production scale
        });

        this.worker.on('failed', (job, err) => {
            console.error(`❌ Job ${job.id} failed after retries: ${err.message}`);
            // Note: BullMQ automatically pushes these repeatedly before failing to 'failed' (DLQ-like) status.
        });
    }

    static async stop() {
        if (this.worker) {
            console.log('🚧 BullMQ UsageWorker shutting down gracefully...');
            await this.worker.close();
        }
    }

    static async processEvent(evt) {
        try {
            if (!evt.event_id || !evt.org_id || !evt.feature || !evt.occurred_at) {
                throw new Error('Invalid event payload structure');
            }

            // Insert into Truth Ledger DB (Idempotent Append-Only)
            // Bypasses Prisma natively and uses wrapper for speed
            await db.run(
                `INSERT INTO usage_events (
                    event_id, org_id, feature, amount, 
                    occurred_at, idempotency_key, source, user_id, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    evt.event_id,
                    evt.org_id,
                    evt.feature,
                    evt.amount || 1,
                    evt.occurred_at,
                    evt.idempotency_key || null,
                    evt.source || 'api',
                    evt.user_id || null,
                    evt.metadata ? JSON.stringify(evt.metadata) : null,
                ]
            );
        } catch (error) {
            // Idempotency DB-Level check: Unique Constraint Violation (PostgreSQL code 23505)
            // Or message "duplicate key value violates unique constraint"
            if (error.message.includes('unique constraint') || String(error.code) === '23505') {
                console.log(`[UsageWorker] Duplicate event safely skipped (DB Idempotent): ${evt.event_id}`);
                return;
            }

            // Other DB errors (e.g. connection timeout) will throw and Trigger BullMQ's automatic retry backoffs
            throw error;
        }
    }
}

module.exports = { UsageWorker, usageQueue };
