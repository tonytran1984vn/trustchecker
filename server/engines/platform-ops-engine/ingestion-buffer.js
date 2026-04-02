/**
 * Single-Writer Ingestion Buffer
 * Guarantees zero race conditions on DB flushes and batches throughput safely.
 */
class IngestionBuffer {
    constructor(dbFacade) {
        this.db = dbFacade;

        this.queue = [];
        this.flushing = false;

        this.batchSize = 500;
        this.interval = 2000;

        this.timer = null;
    }

    // O(1) lock-free push from Node event loop
    push(point) {
        this.queue.push(point);
    }

    async flush() {
        if (this.flushing) return; // HARD GUARD

        this.flushing = true;

        try {
            while (this.queue.length > 0) {
                const batch = this.queue.splice(0, this.batchSize);
                await this.safeInsert(batch);
            }
        } finally {
            this.flushing = false;
        }
    }

    start() {
        if (this.timer) return;
        this.timer = setInterval(() => {
            this.flush().catch(err => {
                console.error('Flush error:', err);
            });
        }, this.interval);
    }

    async safeInsert(batch) {
        if (batch.length === 0) return;

        const values = [];
        const params = [];

        let i = 1;
        for (const p of batch) {
            values.push(`($${i++}, $${i++}, $${i++})`);
            params.push(p.metric, p.ts, p.value);
        }

        const sql = `
      INSERT INTO ops_metrics_telemetry (metric_name, ts, value)
      VALUES ${values.join(',')}
      ON CONFLICT DO NOTHING
    `;

        // Execute via mapped db adapter
        await this.db.run(sql, params);
    }
}

module.exports = IngestionBuffer;
