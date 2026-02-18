/**
 * TrustChecker Event Bus
 * Event-driven architecture backbone. Emits events and broadcasts via WebSocket.
 */

const EventEmitter = require('events');

class TrustEventBus extends EventEmitter {
    constructor() {
        super();
        this.wsClients = new Set();
        this.eventLog = [];
    }

    /** Register a WebSocket client for real-time broadcasts */
    addClient(ws) {
        this.wsClients.add(ws);
        ws.on('close', () => this.wsClients.delete(ws));
    }

    /** Broadcast event to all connected WebSocket clients */
    broadcast(eventType, data) {
        const payload = JSON.stringify({
            type: eventType,
            data,
            timestamp: new Date().toISOString()
        });

        this.wsClients.forEach(ws => {
            if (ws.readyState === 1) { // OPEN
                ws.send(payload);
            }
        });

        // Keep in-memory log (last 500 events)
        this.eventLog.push({ type: eventType, data, timestamp: new Date().toISOString() });
        if (this.eventLog.length > 500) this.eventLog.shift();
    }

    /** Emit + broadcast a system event */
    emitEvent(eventType, data) {
        this.emit(eventType, data);
        this.broadcast(eventType, data);
    }

    /** Get recent events */
    getRecentEvents(limit = 50) {
        return this.eventLog.slice(-limit).reverse();
    }

    /** Get event bus statistics */
    getStats() {
        return {
            total_events: this.eventLog.length,
            connected_clients: this.wsClients.size,
            recent_types: [...new Set(this.eventLog.slice(-20).map(e => e.type))],
        };
    }
}

const eventBus = new TrustEventBus();

// Event type constants
const EVENT_TYPES = {
    QR_SCANNED: 'QRScanned',
    QR_VALIDATED: 'QRValidated',
    QR_INVALID: 'QRInvalid',
    FRAUD_FLAGGED: 'FraudFlagged',
    FRAUD_RESOLVED: 'FraudResolved',
    TRUST_SCORE_UPDATED: 'TrustScoreUpdated',
    PRODUCT_REGISTERED: 'ProductRegistered',
    BLOCKCHAIN_SEALED: 'BlockchainSealed',
    EDGE_SYNCED: 'EdgeSynced',
    USER_LOGIN: 'UserLogin',
    SYSTEM_ALERT: 'SystemAlert'
};

module.exports = { eventBus, EVENT_TYPES };
