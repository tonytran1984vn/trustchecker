const { safeError } = require('../utils/safe-error');
/**
 * Outbound Webhook Management Routes
 * Subscribe, manage, test, and monitor outbound webhook deliveries
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const webhookEngine = require('../engines/webhookEngine');

router.use(authMiddleware);
router.use(requirePermission('webhook:manage'));

// ─── GET / — List all webhook subscriptions ─────────────────
router.get('/', async (req, res) => {
    try {
        const subscriptions = webhookEngine.listSubscriptions();
        const stats = webhookEngine.getStats();
        res.json({ subscriptions, stats });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST / — Register new webhook subscription ────────────
router.post('/', async (req, res) => {
    try {
        const { event_type, url, secret } = req.body;
        if (!event_type || !url) return res.status(400).json({ error: 'event_type and url required' });

        const validEvents = [
            'scan.completed', 'scan.suspicious', 'scan.counterfeit',
            'fraud.alert', 'fraud.resolved',
            'product.created', 'product.updated',
            'evidence.uploaded', 'evidence.verified',
            'kyc.submitted', 'kyc.approved', 'kyc.rejected',
            'ticket.created', 'ticket.resolved',
            'anomaly.detected',
            'cert.expired', 'cert.created',
            'payment.completed', 'payment.refunded',
            'user.registered', 'user.login'
        ];

        if (!validEvents.includes(event_type) && event_type !== '*') {
            return res.status(400).json({ error: `Invalid event. Choose from: ${validEvents.join(', ')} or '*' for all` });
        }

        const id = webhookEngine.subscribe(event_type, url, secret);
        res.status(201).json({ id, event_type, url, message: 'Webhook subscription created' });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── DELETE /:id — Remove webhook subscription ──────────────
router.delete('/:id', async (req, res) => {
    try {
        const removed = webhookEngine.unsubscribe(req.params.id);
        if (!removed) return res.status(404).json({ error: 'Subscription not found' });
        res.json({ message: 'Webhook subscription removed' });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /test — Send a test webhook ───────────────────────
router.post('/test', async (req, res) => {
    try {
        const { event_type, url } = req.body;
        if (!url) return res.status(400).json({ error: 'url required' });

        const testPayload = {
            event: event_type || 'test.ping',
            data: { message: 'This is a test webhook from TrustChecker', timestamp: new Date().toISOString() },
            test: true
        };

        // Temporarily subscribe, deliver, and unsubscribe
        const id = webhookEngine.subscribe(event_type || 'test.ping', url, 'test-secret');
        const results = await webhookEngine.deliver(event_type || 'test.ping', testPayload);
        webhookEngine.unsubscribe(id);

        res.json({ test: true, delivery: results[0] || { status: 'no_delivery' } });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /deliveries — View delivery log ────────────────────
router.get('/deliveries', async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const deliveries = webhookEngine.getDeliveryLog(Math.min(Number(limit) || 50, 200));
        const stats = webhookEngine.getStats();
        res.json({ deliveries, stats });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /events — List available event types ───────────────
router.get('/events', async (req, res) => {
    try {
        const events = {
            scan: ['scan.completed', 'scan.suspicious', 'scan.counterfeit'],
            fraud: ['fraud.alert', 'fraud.resolved'],
            product: ['product.created', 'product.updated'],
            evidence: ['evidence.uploaded', 'evidence.verified'],
            kyc: ['kyc.submitted', 'kyc.approved', 'kyc.rejected'],
            support: ['ticket.created', 'ticket.resolved'],
            anomaly: ['anomaly.detected'],
            certification: ['cert.expired', 'cert.created'],
            payment: ['payment.completed', 'payment.refunded'],
            auth: ['user.registered', 'user.login'],
        };
        res.json({ event_types: events, total: Object.values(events).flat().length, wildcard: '*' });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

module.exports = router;
