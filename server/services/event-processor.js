/**
 * Event Processor — Sequential per product_id
 * Prevents race conditions by queueing events per product.
 */
const { insertProductEvent, verifyChainIntegrity, validateRBAC } = require('../middleware/scm-state-machine');

class EventProcessor {
    constructor() {
        this.queues = new Map(); // product_id → Promise chain
        this.stats = { processed: 0, rejected: 0, errors: 0 };
    }

    async processEvent(productId, eventType, actorId, actorRole, locationId, partnerId, batchId, orgId, metadata) {
        // Get or create queue for this product
        if (!this.queues.has(productId)) {
            this.queues.set(productId, Promise.resolve());
        }

        // Chain onto the product's queue (sequential processing)
        const result = await new Promise((resolve) => {
            const current = this.queues.get(productId);
            const next = current.then(async () => {
                try {
                    const r = await insertProductEvent(productId, eventType, actorId, actorRole, locationId, partnerId, batchId, orgId, metadata);
                    if (r.success) {
                        this.stats.processed++;
                        // Run post-insert anomaly checks
                        this._checkAnomalies(productId, eventType, actorId, locationId, orgId);
                    } else {
                        this.stats.rejected++;
                    }
                    resolve(r);
                } catch(err) {
                    this.stats.errors++;
                    resolve({ success: false, error: err.message, code: 'PROCESSOR_ERROR' });
                }
            });
            this.queues.set(productId, next);
        });

        // Clean up completed queues periodically
        if (this.queues.size > 10000) this._cleanup();
        return result;
    }

    async _checkAnomalies(productId, eventType, actorId, locationId, orgId) {
        try {
            const engine = require('./anomaly-engine');
            await engine.checkEvent(productId, eventType, actorId, locationId, orgId);
        } catch(_) {}
    }

    _cleanup() {
        for (const [k, v] of this.queues.entries()) {
            v.then(() => this.queues.delete(k)).catch(() => this.queues.delete(k));
        }
    }

    getStats() { return { ...this.stats, activeQueues: this.queues.size }; }
}

module.exports = new EventProcessor();
