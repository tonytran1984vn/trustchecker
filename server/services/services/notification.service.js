/**
 * Notification Service v1.0
 * Business logic for notifications and webhook management.
 */
const BaseService = require('./base.service');
const { v4: uuidv4 } = require('uuid');

class NotificationService extends BaseService {
    constructor() {
        super('notification');
    }

    async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
        let sql = 'SELECT * FROM notifications WHERE user_id = $1';
        const params = [userId];
        if (unreadOnly) sql += ' AND read = false';
        sql += ' ORDER BY created_at DESC';
        return this.paginate(sql, params, { page, limit });
    }

    async markAsRead(notificationId, userId) {
        await this.db.run('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [notificationId, userId]);
    }

    async markAllAsRead(userId) {
        await this.db.run('UPDATE notifications SET read = true WHERE user_id = $1 AND read = false', [userId]);
    }

    async createNotification(userId, type, title, body, data = {}) {
        const id = uuidv4();
        await this.db.run(
            'INSERT INTO notifications (id, user_id, type, title, body, data, read, created_at) VALUES ($1, $2, $3, $4, $5, $6, false, NOW())',
            [id, userId, type, title, body, JSON.stringify(data)]
        );
        return { id, type, title, body };
    }

    // ── Webhooks ─────────────────────────────────────────────────────────────
    async getWebhookSubscriptions(orgId) {
        return this.db.all('SELECT * FROM webhook_subscriptions WHERE org_id = $1 ORDER BY created_at', [orgId]);
    }

    async createWebhookSubscription(orgId, data) {
        const count = await this.db.get('SELECT COUNT(*) as cnt FROM webhook_subscriptions WHERE org_id = $1', [orgId]);
        if ((count?.cnt || 0) >= 50) throw this.error('WEBHOOK_LIMIT', 'Max 50 webhook subscriptions per org', 403);

        const id = uuidv4();
        await this.db.run(
            'INSERT INTO webhook_subscriptions (id, org_id, url, events, secret, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
            [id, orgId, data.url, JSON.stringify(data.events), data.secret, 'active']
        );
        return { id, url: data.url, events: data.events, status: 'active' };
    }
}

module.exports = new NotificationService();
