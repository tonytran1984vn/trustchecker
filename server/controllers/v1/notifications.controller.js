/**
 * V1 Notifications Controller
 * User notifications + webhook management.
 */
const express = require('express');
const router = express.Router();
const notificationService = require('../../services/notification.service');
const { success, paginated, serviceError } = require('../../lib/response');

// GET /api/v1/notifications
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, unread } = req.query;
        const result = await notificationService.getUserNotifications(req.user.id, {
            page: Number(page), limit: Number(limit), unreadOnly: unread === 'true',
        });
        paginated(res, result);
    } catch (e) { serviceError(res, e); }
});

// PUT /api/v1/notifications/:id/read
router.put('/:id/read', async (req, res) => {
    try {
        await notificationService.markAsRead(req.params.id, req.user.id);
        success(res, null, { message: 'Marked as read' });
    } catch (e) { serviceError(res, e); }
});

// PUT /api/v1/notifications/read-all
router.put('/read-all', async (req, res) => {
    try {
        await notificationService.markAllAsRead(req.user.id);
        success(res, null, { message: 'All marked as read' });
    } catch (e) { serviceError(res, e); }
});

// ── Webhooks ─────────────────────────────────────────────────────────────────
// GET /api/v1/notifications/webhooks
router.get('/webhooks', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const subs = await notificationService.getWebhookSubscriptions(orgId);
        success(res, subs);
    } catch (e) { serviceError(res, e); }
});

// POST /api/v1/notifications/webhooks
router.post('/webhooks', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const sub = await notificationService.createWebhookSubscription(orgId, req.body);
        success(res, sub, {}, 201);
    } catch (e) { serviceError(res, e); }
});

module.exports = router;
