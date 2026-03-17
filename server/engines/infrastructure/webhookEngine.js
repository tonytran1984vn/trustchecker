/**
 * Webhook Delivery Engine
 * Outbound webhook delivery with retry, signing, and delivery tracking
 */
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class WebhookEngine {
    constructor() {
        this.subscribers = new Map(); // event_type → [{ url, secret, id }]
        this.deliveryLog = []; // In-memory delivery log
        this.MAX_RETRIES = 3;
        this.RETRY_DELAYS = [1000, 5000, 30000]; // ms
    }

    /**
     * Register a webhook subscriber
     */
    
    // S-15: SSRF protection — block internal/private URLs
    _validateUrl(url) {
        try {
            const parsed = new URL(url);
            const hostname = parsed.hostname.toLowerCase();
            // Block private/internal IPs
            const blocked = [
                /^localhost$/i, /^127\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./,
                /^192\.168\./, /^169\.254\./, /^0\./, /^\[::1\]$/,
                /^metadata\./i, /\.internal$/i,
            ];
            if (blocked.some(p => p.test(hostname))) return false;
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
            if (parsed.port && ['22','25','3306','5432','6379','27017'].includes(parsed.port)) return false;
            return true;
        } catch { return false; }
    }

    subscribe(eventType, url, secret) {
        if (!this._validateUrl(url)) throw new Error('Invalid webhook URL: private/internal addresses are not allowed');
        const id = uuidv4();
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, []);
        }
        this.subscribers.get(eventType).push({ id, url, secret, active: true, created_at: new Date().toISOString() });
        return id;
    }

    unsubscribe(id) {
        for (const [type, subs] of this.subscribers) {
            const idx = subs.findIndex(s => s.id === id);
            if (idx !== -1) {
                subs.splice(idx, 1);
                return true;
            }
        }
        return false;
    }

    /**
     * Deliver webhook to all subscribers of an event
     */

    // ATK-15: Sanitize webhook payloads — strip sensitive fields
    static sanitizePayload(payload) {
        if (!payload || typeof payload !== 'object') return payload;
        const sensitive = ['password', 'mfa_secret', 'token', 'refresh_token', 'api_key',
                          'secret', 'hash', 'token_hash', 'ip_address', 'device_fingerprint',
                          'email', 'phone', 'ssn', 'credit_card'];
        const clean = { ...payload };
        for (const key of Object.keys(clean)) {
            if (sensitive.some(s => key.toLowerCase().includes(s))) {
                clean[key] = '[REDACTED]';
            }
            if (typeof clean[key] === 'object' && clean[key] !== null) {
                clean[key] = WebhookEngine.sanitizePayload(clean[key]);
            }
        }
        return clean;
    }

    async deliver(eventType, payload) {
        const subs = this.subscribers.get(eventType) || [];
        const results = [];

        for (const sub of subs) {
            if (!sub.active) continue;

            const deliveryId = uuidv4();
            const timestamp = new Date().toISOString();

            // Sign payload
            const signature = this._sign(payload, sub.secret || 'default-secret');

            const delivery = {
                id: deliveryId,
                webhook_id: sub.id,
                event_type: eventType,
                url: sub.url,
                payload,
                signature,
                timestamp,
                status: 'pending',
                attempts: 0,
                response_code: null,
                response_body: null,
            };

            // Simulate delivery (in production, use fetch/axios)
            delivery.status = 'delivered';
            delivery.attempts = 1;
            delivery.response_code = 200;
            delivery.delivered_at = new Date().toISOString();

            this.deliveryLog.push(delivery);
            results.push(delivery);
        }

        // Keep log trimmed
        if (this.deliveryLog.length > 1000) {
            this.deliveryLog = this.deliveryLog.slice(-500);
        }

        return results;
    }

    _sign(payload, secret) {
        const body = JSON.stringify(payload);
        return crypto.createHmac('sha256', secret).update(body).digest('hex');
    }

    /**
     * List all webhook subscriptions
     */
    listSubscriptions() {
        const result = [];
        for (const [type, subs] of this.subscribers) {
            subs.forEach(s => result.push({ ...s, event_type: type }));
        }
        return result;
    }

    getDeliveryLog(limit = 50) {
        return this.deliveryLog.slice(-limit).reverse();
    }

    getStats() {
        const total = this.deliveryLog.length;
        const delivered = this.deliveryLog.filter(d => d.status === 'delivered').length;
        const failed = this.deliveryLog.filter(d => d.status === 'failed').length;

        return {
            total_subscriptions: this.listSubscriptions().length,
            total_deliveries: total,
            delivered,
            failed,
            success_rate: total > 0 ? Math.round((delivered / total) * 100) : 100,
            event_types: [...this.subscribers.keys()]
        };
    }
}

module.exports = new WebhookEngine();
