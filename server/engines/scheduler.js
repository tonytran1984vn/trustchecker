/**
 * Scheduled Tasks Engine
 * Periodic maintenance: data retention, usage reset, anomaly scanning, health checks
 * All methods are async-safe for dual-mode DB (Prisma/SQLite)
 */

class ScheduledTasks {
    constructor() {
        this.tasks = [];
        this.running = false;
        this.lastRun = {};
    }

    /**
     * Register all scheduled tasks
     */
    init(db) {
        this.db = db;

        // Run every 60 seconds
        this.register('health_check', 60, () => this.healthCheck());

        // Run every 10 minutes
        this.register('usage_check', 600, () => this.usageCheck());

        // Run every hour
        this.register('retention_sweep', 3600, () => this.retentionSweep());

        // Run every 6 hours
        this.register('anomaly_autoscan', 21600, () => this.anomalyAutoScan());

        // Run daily (every 24 hours)
        this.register('cert_expiry_check', 86400, () => this.certExpiryCheck());
        this.register('session_cleanup', 86400, () => this.sessionCleanup());

        console.log(`⏰ Scheduled ${this.tasks.length} maintenance tasks`);
    }

    register(name, intervalSeconds, handler) {
        this.tasks.push({ name, interval: intervalSeconds * 1000, handler, lastRun: 0 });
    }

    /**
     * Start the scheduler (call once on server start)
     */
    start() {
        if (this.running) return;
        this.running = true;

        // Check every 30 seconds
        this._timer = setInterval(async () => {
            const now = Date.now();
            for (const task of this.tasks) {
                if (now - task.lastRun >= task.interval) {
                    task.lastRun = now;
                    try {
                        await task.handler();
                        this.lastRun[task.name] = new Date().toISOString();
                    } catch (err) {
                        console.error(`⚠️ Scheduled task ${task.name} failed:`, err.message);
                    }
                }
            }
        }, 30000);
        if (this._timer.unref) this._timer.unref();

        console.log('⏰ Scheduler started');
    }

    stop() {
        if (this._timer) clearInterval(this._timer);
        this.running = false;
    }

    getStatus() {
        return {
            running: this.running,
            tasks: this.tasks.map(t => ({
                name: t.name,
                interval_seconds: t.interval / 1000,
                last_run: this.lastRun[t.name] || 'never'
            }))
        };
    }

    // ─── Task implementations ──────────────────────────────

    async healthCheck() {
        try {
            await this.db.get('SELECT 1 as ok');
        } catch (err) {
            console.error('❌ Health check failed:', err.message);
        }
    }

    async usageCheck() {
        try {
            const plans = await this.db.all("SELECT bp.*, u.email FROM billing_plans bp JOIN users u ON bp.user_id = u.id WHERE bp.status = 'active'");
            const period = new Date().toISOString().substring(0, 7);
            const PLAN_LIMITS = { Free: 100, Starter: 1000, Professional: 10000, Enterprise: Infinity };

            for (const plan of plans) {
                const isPG = !!process.env.DATABASE_URL;
                const scanResult = isPG
                    ? await this.db.get(
                        "SELECT COUNT(*) as c FROM scan_events WHERE product_id IN (SELECT id FROM products WHERE registered_by = $1) AND to_char(scanned_at, 'YYYY-MM') = $2",
                        [plan.user_id, period]
                    )
                    : await this.db.get(
                        "SELECT COUNT(*) as c FROM scan_events WHERE product_id IN (SELECT id FROM products WHERE registered_by = ?) AND scanned_at LIKE ?",
                        [plan.user_id, period + '%']
                    );
                const scans = scanResult?.c || 0;
                const limit = PLAN_LIMITS[plan.plan_name] || 100;

                if (scans >= limit * 0.9 && limit !== Infinity) {
                    console.log(`⚠️ User ${plan.user_id} at ${Math.round(scans / limit * 100)}% of scan limit`);
                }
            }
        } catch (e) { console.warn('[scheduler] usageCheck skip:', e.message); }
    }

    async retentionSweep() {
        // Whitelist of tables allowed in retention operations (prevents SQL injection)
        const ALLOWED_TABLES = new Set([
            'scan_events', 'audit_log', 'fraud_alerts', 'support_tickets',
            'usage_metrics', 'webhook_events', 'supply_chain_events',
            'leak_alerts', 'anomaly_detections', 'ticket_messages'
        ]);
        const DATE_COLUMNS = {
            scan_events: 'scanned_at', audit_log: 'timestamp',
        };

        try {
            const policies = await this.db.all("SELECT * FROM data_retention_policies WHERE status = 'active'");
            for (const policy of policies) {
                if (!ALLOWED_TABLES.has(policy.table_name)) continue; // reject unknown tables

                const dateCol = DATE_COLUMNS[policy.table_name] || 'created_at';
                const cutoff = new Date(Date.now() - policy.retention_days * 86400000).toISOString();
                try {
                    if (policy.action === 'delete') {
                        await this.db.run(`DELETE FROM ${policy.table_name} WHERE ${dateCol} < ?`, [cutoff]);
                    } else if (policy.action === 'archive') {
                        try {
                            await this.db.run(`UPDATE ${policy.table_name} SET status = 'archived' WHERE ${dateCol} < ? AND status != 'archived'`, [cutoff]);
                        } catch (e) { /* table may not have status column */ console.debug('[scheduler] archive skip:', e.message); }
                    }
                } catch (e) { console.debug('[scheduler] retention skip:', e.message); }
            }
        } catch (e) { console.debug('[scheduler] retentionSweep skip:', e.message); }
    }

    async anomalyAutoScan() {
        try {
            const result = await this.db.get("SELECT COUNT(*) as c FROM fraud_alerts WHERE created_at > datetime('now', '-6 hours')");
            const recentAlerts = result?.c || 0;
            if (recentAlerts > 10) {
                console.log(`🔍 Auto-anomaly: ${recentAlerts} fraud alerts in last 6h — scan recommended`);
            }
        } catch (e) { console.debug('[scheduler] anomalyAutoScan skip:', e.message); }
    }

    async certExpiryCheck() {
        try {
            const expiring = await this.db.all("SELECT * FROM certifications WHERE expiry_date BETWEEN datetime('now') AND datetime('now', '+30 days') AND status = 'active'");
            if (expiring.length > 0) {
                console.log(`📜 ${expiring.length} certifications expiring within 30 days`);
            }

            await this.db.run("UPDATE certifications SET status = 'expired' WHERE expiry_date < datetime('now') AND status = 'active'");
        } catch (e) { console.debug('[scheduler] certExpiryCheck skip:', e.message); }
    }

    async sessionCleanup() {
        try {
            // Sessions table has: id, user_id, ip_address, user_agent, created_at, last_active, revoked
            // Clean sessions inactive for >7 days OR revoked >30 days ago
            await this.db.run("DELETE FROM sessions WHERE last_active < datetime('now', '-7 days')");
            await this.db.run("DELETE FROM sessions WHERE revoked = 1 AND last_active < datetime('now', '-30 days')");
            // Clean expired refresh tokens
            await this.db.run("DELETE FROM refresh_tokens WHERE expires_at < datetime('now')");
        } catch (e) { console.debug('[scheduler] sessionCleanup skip:', e.message); }
    }
}

module.exports = new ScheduledTasks();
