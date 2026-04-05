const crypto = require('crypto');

class EventBus {
    constructor() {
        this.subscribers = {};
        this.eventLog = []; // In-memory bus log for current session debugging / snapshotting
    }

    /**
     * Publishes an event to all subscribers of that eventType and to the wildcare (*) subscribers.
     */
    publish(eventType, payloadBase, _unsafe_disable_validation = false) {
        if (!_unsafe_disable_validation) {
            this._validateEnvelope(eventType, payloadBase);
        }

        // Add idempotency key automagically if missing
        if (!payloadBase.idempotency_key) {
            payloadBase.idempotency_key = crypto
                .createHash('sha256')
                .update(`${eventType}|${payloadBase.scenario_hash}|${payloadBase.sequence_no}`)
                .digest('hex');
        }

        // Add core envelope
        const event = {
            schema_version: 'v1.0',
            event_type: eventType,
            emitted_at: new Date().toISOString(),
            ...payloadBase,
        };

        // If trace_id is missing, inject it (simulating framework context)
        if (!event.trace_id) event.trace_id = crypto.randomUUID();
        if (!event.span_id) event.span_id = crypto.randomUUID();

        // 1. Audit trail
        this.eventLog.push(event);

        // 2. Dispatch to dedicated handlers
        if (this.subscribers[eventType]) {
            for (const handler of this.subscribers[eventType]) {
                try {
                    handler(event);
                } catch (e) {
                    console.error(`[EventBus] Subscriber error on ${eventType}:`, e);
                }
            }
        }

        // 3. Dispatch to wildcard handlers (e.g. Risk Memory)
        if (this.subscribers['*']) {
            for (const handler of this.subscribers['*']) {
                try {
                    handler(event);
                } catch (e) {
                    console.error(`[EventBus] Wildcard subscriber error on ${eventType}:`, e);
                }
            }
        }

        return event;
    }

    subscribe(eventType, handler) {
        if (!this.subscribers[eventType]) {
            this.subscribers[eventType] = [];
        }
        this.subscribers[eventType].push(handler);
    }

    _validateEnvelope(eventType, payload) {
        if (!payload.event_id) throw new Error(`[EventBus] Missing event_id for ${eventType}`);
        if (!payload.scenario_hash) throw new Error(`[EventBus] Missing scenario_hash for ${eventType}`);
        if (typeof payload.sequence_no !== 'number') throw new Error(`[EventBus] Missing sequence_no for ${eventType}`);
        if (!payload.producer) throw new Error(`[EventBus] Missing producer for ${eventType}`);
        if (!payload.data) throw new Error(`[EventBus] Missing data for ${eventType}`);
        if (!payload.occurred_at) throw new Error(`[EventBus] Missing occurred_at for ${eventType}`);
    }

    // Expose memory log for PoC pipeline scraping (so UI doesn't break in V4 Phase 1)
    getRecentScenarioEvents(scenario_hash) {
        return this.eventLog
            .filter(e => e.scenario_hash === scenario_hash)
            .sort((a, b) => a.sequence_no - b.sequence_no);
    }

    clearSession() {
        this.eventLog = [];
    }
}

// Export singleton
module.exports = new EventBus();
