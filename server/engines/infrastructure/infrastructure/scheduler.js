/**
 * Scheduled Tasks Engine v9.4.2
 * Periodic maintenance: data retention, usage reset, anomaly scanning, health checks
 * ★ v9.4.2: All tasks now iterate per-org with RLS context set
 */

class ScheduledTasks {
    constructor() {
        this.tasks = [];
        this.running = false;
        this.lastRun = {};
    }

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
        // Run daily
        this.register('cert_expiry_check', 86400, () => this.certExpiryCheck());
        this.register('session_cleanup', 86400, () => this.sessionCleanup());

        console.log(`⏰ Scheduled ${this.tasks.length} maintenance tasks`);
    }

    register(name, intervalSeconds, handler) {
        this.tasks.push({ name, interval: intervalSeconds * 1000, handler, lastRun: 0 });
    }


    // v9.4.4: Redis distributed lock to prevent job duplication on restart
    async acquireLock(taskName, ttlSeconds = 300) {
        try {
            const redis = require('../../cache').getRedis?.();
            if (!redis) return true; // No Redis = allow (fallback)
            const key = `lock:scheduler:${taskName}`;
            // DEVSECOPS: system-level lock — intentionally not org-scoped (scheduler runs once globally)
        const result = await redis.set(key, Date.now().toString(), 'EX', ttlSeconds, 'NX');
            return result === 'OK';
        } catch (e) {
            console.warn(`[Scheduler] Lock acquire failed for ${taskName}:`, e.message);
            return true; // Fail-open to avoid deadlock
        }
    }

    async releaseLock(taskName) {
        try {
            const redis = require('../../cache').getRedis?.();
            if (!redis) return;
            await redis.del(`lock:scheduler:${taskName}`);
        } catch (e) { /* ignore */ }
    }

    start() {
        if (this.running) return;
        this.running = true;
        // v9.4.4: Staggered startup — wait 10s before first run to avoid restart storm
        const startDelay = 10000;
        setTimeout(() => {
            console.log('⏰ [Scheduler] Starting after stagger delay');
        }, startDelay);

        this._timer = setInterval(async () => {
            const now = Date.now();
            for (const task of this.tasks) {
                if (now - task.lastRun >= task.interval) {
                    task.lastRun = now;
                    const locked = await this.acquireLock(task.name, Math.max(task.interval / 1000, 60));
                    if (!locked) {
                        console.log(`⏭️ [Scheduler] ${task.name} skipped — already running`);
                        continue;
                    }
                    try {
                        await task.handler();
                        await this.releaseLock(task.name);
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

    // ─── v9.4.2: Helper — get all active org IDs for per-org iteration ──
    async _getOrgIds() {
        try {
            const orgs = await this.db.all("SELECT id FROM organizations WHERE status = 'active'");
            return orgs.map(o => o.id);
        } catch (e) {
            console.debug('[scheduler] _getOrgIds skip:', e.message);
            return [];
        }
    }

    // ─── v9.4.2: Helper — run a callback with RLS context per org ──
    async _perOrg(taskName, fn) {
        // v9.5.0: BATCH_PARALLEL — process 20 orgs in parallel instead of serial O(N)
        const BATCH_PARALLEL = 20;
        const orgs = await this.db.all("SELECT id FROM organizations WHERE status = 'active'");
        let processed = 0;
        
        for (let i = 0; i < orgs.length; i += BATCH_PARALLEL) {
            const batch = orgs.slice(i, i + BATCH_PARALLEL);
            await Promise.allSettled(batch.map(async (org) => {
                try {
                    await this.db.run("SET app.current_org = $1", [org.id]);
                    await fn(org.id);
                    processed++;
                } catch (e) {
                    console.debug(`[scheduler] ${taskName} skip org ${org.id}: ${e.message}`);
                }
            }));
            // Yield to event loop between batches
            await new Promise(r => setTimeout(r, 50));
        }
        console.log(`[scheduler] ${taskName}: ${processed}/${orgs.length} orgs processed`);
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
            // v9.4.2: Platform-level query (billing_plans has no org_id, scoped by user_id)
            this.db.clearOrgContext(); // run as platform
            const plans = await this.db.all("SELECT bp.*, u.email FROM billing_plans bp JOIN users u ON bp.user_id = u.id WHERE bp.status = 'active'");
            const period = new Date().toISOString().substring(0, 7);
            const PLAN_LIMITS = { Free: 100, Starter: 1000, Professional: 10000, Enterprise: Infinity };

            for (const plan of plans) {
                const scanResult = await this.db.get(
                    "SELECT COUNT(*) as c FROM scan_events WHERE product_id IN (SELECT id FROM products WHERE registered_by = $1) AND to_char(scanned_at, 'YYYY-MM') = $2",
                    [plan.user_id, period]
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
        const ALLOWED_TABLES = new Set([
            'scan_events', 'audit_log', 'fraud_alerts', 'support_tickets',
            'usage_metrics', 'webhook_events', 'supply_chain_events',
            'leak_alerts', 'anomaly_detections', 'ticket_messages'
        ]);
        const HAS_STATUS_COLUMN = new Set([
            'fraud_alerts', 'support_tickets',
            'leak_alerts', 'anomaly_detections'
        ]);
        const DATE_COLUMNS = {
            scan_events: 'scanned_at', audit_log: 'timestamp',
        };

        try {
            // v9.4.2: Iterate per-org for tenant-isolated retention
            await this._perOrg('retentionSweep', async (orgId) => {
                const policies = await this.db.all(
                    "SELECT * FROM data_retention_policies WHERE is_active = true AND org_id = $1",
                    [orgId]
                );
                for (const policy of policies) {
                    if (!ALLOWED_TABLES.has(policy.table_name)) continue;
                    const dateCol = DATE_COLUMNS[policy.table_name] || 'created_at';
                    const cutoff = new Date(Date.now() - policy.retention_days * 86400000).toISOString();
                    try {
                        // v9.5.0: Snapshot baselines BEFORE purging scan data
                        if (policy.action === 'delete' && policy.table_name === 'scan_events') {
                            try {
                                await this.db.run(`
                                    INSERT INTO score_baselines (product_id, org_id, scan_count, avg_fraud_score, avg_trust_score, valid_count, suspicious_count, counterfeit_count, baseline_date)
                                    SELECT product_id, org_id, COUNT(*), AVG(fraud_score), AVG(trust_score),
                                        COUNT(*) FILTER (WHERE result = 'valid'),
                                        COUNT(*) FILTER (WHERE result = 'suspicious'),
                                        COUNT(*) FILTER (WHERE result = 'counterfeit'),
                                        CURRENT_DATE
                                    FROM scan_events WHERE ${_safeId(dateCol)} < $1 AND org_id = $2
                                    GROUP BY product_id, org_id
                                    ON CONFLICT DO NOTHING`,
                                    [cutoff, orgId]
                                );
                            } catch (e) { console.debug('[scheduler] baseline snapshot skip:', e.message); }
                        }
                        if (policy.action === 'delete') {
                            await this.db.run(
                                `DELETE FROM ${_safeId(policy.table_name)} WHERE ${_safeId(dateCol)} < $1 AND org_id = $2`,
                                [cutoff, orgId]
                            );
                        } else if (policy.action === 'archive' && HAS_STATUS_COLUMN.has(policy.table_name)) {
                            await this.db.run(
                                `UPDATE ${_safeId(policy.table_name)} SET status = 'archived' WHERE ${_safeId(dateCol)} < $1 AND status != 'archived' AND org_id = $2`,
                                [cutoff, orgId]
                            );
                        }
                    } catch (e) { console.debug('[scheduler] retention skip:', e.message); }
                }
            });
        } catch (e) { console.debug('[scheduler] retentionSweep skip:', e.message); }
    }

    async anomalyAutoScan() {
        try {
            // v9.4.2: Per-org anomaly scanning
            await this._perOrg('anomalyAutoScan', async (orgId) => {
                const result = await this.db.get(
                    "SELECT COUNT(*) as c FROM fraud_alerts WHERE created_at > NOW() - INTERVAL '6 hours' AND org_id = $1",
                    [orgId]
                );
                const recentAlerts = result?.c || 0;
                if (recentAlerts > 10) {
                    console.log(`🔍 Org ${orgId}: ${recentAlerts} fraud alerts in 6h — scan recommended`);
                }
            });
        } catch (e) { console.debug('[scheduler] anomalyAutoScan skip:', e.message); }
    }

    async certExpiryCheck() {
        try {
            // v9.4.2: Per-org cert expiry
            // v9.5.0: Refresh materialized views every 15 min
            try {
                await this.db.run("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_scan_daily");
                await this.db.run("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_counts");
                await this.db.run("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_anomaly_stats");
                console.log("[Scheduler] Materialized views refreshed");
            } catch (e) { console.error("[Scheduler] MV refresh error:", e.message); }

            await this._perOrg('certExpiryCheck', async (orgId) => {
                const expiring = await this.db.all(
                    "SELECT id FROM certifications WHERE expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' AND status = 'active' AND org_id = $1",
                    [orgId]
                );
                if (expiring.length > 0) {
                    console.log(`📜 Org ${orgId}: ${expiring.length} certs expiring within 30 days`);
                }
                await this.db.run(
                    "UPDATE certifications SET status = 'expired' WHERE expiry_date < NOW() AND status = 'active' AND org_id = $1",
                    [orgId]
                );
            });
        } catch (e) { console.debug('[scheduler] certExpiryCheck skip:', e.message); }
    }

    async partnerScoreRefresh() {
        try {
            // v9.5.0: Refresh partner trust scores for all orgs
            await this._perOrg('partnerScoreRefresh', async (orgId) => {
                const partners = await this.db.all(
                    "SELECT id FROM partners WHERE org_id = $1 AND status = 'active'",
                    [orgId]
                );
                for (const p of partners) {
                    try {
                        // Recalculate trust score based on shipments, violations, incidents
                        const shipments = await this.db.get(
                            "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'delivered LIMIT 1000') as delivered FROM partner_shipments WHERE partner_id = $1",
                            [p.id]
                        );
                        const violations = await this.db.get(
                            "SELECT COUNT(*) as c FROM partner_violations WHERE partner_id = $1 AND created_at > NOW() - INTERVAL '90 days'",
                            [p.id]
                        );
                        const deliveryRate = shipments?.total > 0 ? (shipments.delivered / shipments.total) : 0.5;
                        const violationPenalty = Math.min(0.5, (violations?.c || 0) * 0.1);
                        const score = Math.round((deliveryRate - violationPenalty) * 100);
                        const riskLevel = score >= 70 ? 'low' : score >= 40 ? 'medium' : 'high';
                        await this.db.run(
                            "UPDATE partners SET trust_score = $1, risk_level = $2, updated_at = NOW() WHERE id = $3",
                            [Math.max(0, Math.min(100, score)), riskLevel, p.id]
                        );
                    } catch (e) { /* skip individual partner errors */ }
                }
            });
        } catch (e) { console.debug('[scheduler] partnerScoreRefresh skip:', e.message); }
    }

    async sessionCleanup() {
        try {
            // v9.4.2: Sessions/tokens are platform-level (no org_id) — run as platform
            this.db.clearOrgContext();
            await this.db.run("DELETE FROM sessions WHERE last_active < NOW() - INTERVAL '7 days'");
            await this.db.run("DELETE FROM sessions WHERE revoked = true AND last_active < NOW() - INTERVAL '30 days'");
            await this.db.run("DELETE FROM refresh_tokens WHERE expires_at < NOW()");
        } catch (e) { console.debug('[scheduler] sessionCleanup skip:', e.message); }
    }
}

module.exports = new ScheduledTasks();
