/**
 * Digital Twin — Compute full state from event chain
 * Detects physical vs digital state mismatch.
 */
const db = require('../db');
const { verifyChainIntegrity } = require('../middleware/scm-state-machine');

class DigitalTwin {

    async getState(productId) {
        const events = await db.all(
            'SELECT id, event_type, from_state, to_state, actor_id, actor_role, location_id, partner_id, prev_event_hash, hash, created_at, metadata FROM product_events WHERE product_id = $1 ORDER BY created_at ASC',
            [productId]
        );

        if (!events || events.length === 0) {
            // Fallback to legacy
            const legacy = await db.all('SELECT * FROM supply_chain_events WHERE product_id = $1 ORDER BY created_at ASC', [productId]);
            return { source: 'legacy', state: legacy.length > 0 ? legacy[legacy.length - 1].event_type : '_initial', events: legacy, chain_integrity: { valid: true, note: 'legacy — no hash chain' } };
        }

        const current = events[events.length - 1];
        const integrity = await verifyChainIntegrity(productId);

        // Build location history
        const locations = events.filter(e => e.location_id).map(e => ({ location: e.location_id, event: e.event_type, at: e.created_at, actor: e.actor_id }));

        // Build custody chain
        const custody = events.filter(e => e.partner_id).map(e => ({ partner: e.partner_id, event: e.event_type, at: e.created_at }));

        // Detect anomalies
        const anomalies = [];
        for (let i = 1; i < events.length; i++) {
            if (new Date(events[i].created_at) < new Date(events[i-1].created_at)) {
                anomalies.push({ type: 'TIME_TRAVEL', event_index: i, detail: 'Event timestamp before previous event' });
            }
            if (events[i].from_state !== events[i-1].to_state && events[i].from_state !== '_migrated') {
                anomalies.push({ type: 'STATE_MISMATCH', event_index: i, detail: 'from_state(' + events[i].from_state + ') != prev to_state(' + events[i-1].to_state + ')' });
            }
        }

        return {
            source: 'product_events',
            product_id: productId,
            current_state: current.to_state,
            current_location: current.location_id,
            current_partner: current.partner_id,
            total_events: events.length,
            first_event: events[0].created_at,
            last_event: current.created_at,
            chain_integrity: integrity,
            location_history: locations,
            custody_chain: custody,
            anomalies,
            timeline: events.map(e => ({ type: e.event_type, from: e.from_state, to: e.to_state, actor: e.actor_id, role: e.actor_role, at: e.created_at, hash: e.hash?.substring(0, 12) })),
        };
    }

    async reconcile(productId) {
        const twin = await this.getState(productId);
        const product = await db.get('SELECT id, status FROM products WHERE id = $1', [productId]);
        
        const mismatches = [];
        if (product && twin.current_state) {
            // Compare DB product.status with computed state
            const stateMap = { 'sell': 'sold', 'SOLD': 'sold', 'ship': 'in_transit', 'SHIPPED': 'in_transit', 'receive': 'in_warehouse', 'commission': 'active' };
            const expectedStatus = stateMap[twin.current_state] || twin.current_state.toLowerCase();
            if (product.status !== expectedStatus && product.status !== 'active') {
                mismatches.push({ field: 'status', db: product.status, computed: expectedStatus });
            }
        }

        return { ...twin, reconciliation: { mismatches, synced: mismatches.length === 0 } };
    }
}

module.exports = new DigitalTwin();
