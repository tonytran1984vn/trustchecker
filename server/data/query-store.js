/**
 * TrustChecker v9.4 — CQRS Query Store
 * 
 * Read-side materialized views backed by Redis cache.
 * Listens to domain events to auto-invalidate and rebuild views.
 * Provides pre-aggregated data for 4 hot query patterns.
 */

// ═══════════════════════════════════════════════════════════════════
// VIEW DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

const VIEW_DEFINITIONS = {
    DASHBOARD_STATS: {
        name: 'dashboard_stats',
        description: 'Pre-aggregated counts, trends, and KPIs for dashboard',
        cacheKeyPattern: 'qstore:dashboard:{orgId}',
        ttlSeconds: 60,
        invalidateOn: ['scan.created', 'scan.verified', 'scan.fraud_detected',
            'fraud.alert.created', 'fraud.alert.resolved'],
        builder: 'buildDashboardStats',
    },
    SCAN_VERIFICATION: {
        name: 'scan_verification',
        description: 'Product + QR + trust score joined for instant verification',
        cacheKeyPattern: 'qstore:scan:{productId}',
        ttlSeconds: 30,
        invalidateOn: ['scan.created', 'scan.verified'],
        builder: 'buildScanVerification',
    },
    SCM_TIMELINE: {
        name: 'scm_timeline',
        description: 'Shipment + checkpoints + partner denormalized timeline',
        cacheKeyPattern: 'qstore:scm_timeline:{shipmentId}',
        ttlSeconds: 120,
        invalidateOn: ['shipment.created', 'shipment.checkpoint', 'shipment.delivered'],
        builder: 'buildScmTimeline',
    },
    FRAUD_OVERVIEW: {
        name: 'fraud_overview',
        description: 'Alerts + severity distribution + resolution rate',
        cacheKeyPattern: 'qstore:fraud_overview:{orgId}',
        ttlSeconds: 90,
        invalidateOn: ['fraud.alert.created', 'fraud.alert.resolved'],
        builder: 'buildFraudOverview',
    },
};

// ═══════════════════════════════════════════════════════════════════
// QUERY STORE
// ═══════════════════════════════════════════════════════════════════

class QueryStore {
    constructor(db, redis = null) {
        this.db = db;
        this.redis = redis;
        this.views = new Map();
        this._memoryCache = new Map();
        this._eventBindings = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            rebuilds: 0,
            invalidations: 0,
        };

        // Register view definitions
        for (const [key, def] of Object.entries(VIEW_DEFINITIONS)) {
            this.views.set(key, def);
            // Build event → view mappings
            for (const event of def.invalidateOn) {
                if (!this._eventBindings.has(event)) this._eventBindings.set(event, []);
                this._eventBindings.get(event).push(key);
            }
        }
    }

    // ─── Read Methods ───────────────────────────────────────────────

    /**
     * Get materialized view data. Cache-first, then rebuild if miss.
     */
    async get(viewKey, params = {}) {
        const def = this.views.get(viewKey);
        if (!def) throw new Error(`Unknown view: ${viewKey}`);

        const cacheKey = this._buildCacheKey(def.cacheKeyPattern, params);

        // Try cache first
        const cached = await this._getFromCache(cacheKey);
        if (cached) {
            this.stats.hits++;
            return { data: cached, fromCache: true, view: def.name };
        }

        // Cache miss — rebuild
        this.stats.misses++;
        const data = await this._buildView(def, params);

        // Store in cache
        await this._setCache(cacheKey, data, def.ttlSeconds);
        this.stats.rebuilds++;

        return { data, fromCache: false, view: def.name };
    }

    /**
     * Get dashboard stats for an org.
     */
    async getDashboardStats(orgId) {
        return this.get('DASHBOARD_STATS', { orgId });
    }

    /**
     * Get scan verification data for a product.
     */
    async getScanVerification(productId) {
        return this.get('SCAN_VERIFICATION', { productId });
    }

    /**
     * Get SCM timeline for a shipment.
     */
    async getScmTimeline(shipmentId) {
        return this.get('SCM_TIMELINE', { shipmentId });
    }

    /**
     * Get fraud overview for an org.
     */
    async getFraudOverview(orgId) {
        return this.get('FRAUD_OVERVIEW', { orgId });
    }

    // ─── Event Handler ──────────────────────────────────────────────

    /**
     * Handle domain event — invalidate affected views.
     * Called by event bus subscriber.
     */
    async onEvent(eventType, eventData = {}) {
        const affectedViews = this._eventBindings.get(eventType) || [];
        if (affectedViews.length === 0) return;

        this.stats.invalidations++;

        for (const viewKey of affectedViews) {
            const def = this.views.get(viewKey);
            // Invalidate all cached instances for this view
            // For org-scoped views, invalidate by orgId if available
            const orgId = eventData.orgId || eventData.org_id || eventData.context?.tenantId;
            if (orgId) {
                const key = this._buildCacheKey(def.cacheKeyPattern, { orgId, ...eventData });
                await this._deleteCache(key);
            } else {
                // No scope — invalidate by pattern
                await this._deleteCacheByPattern(def.cacheKeyPattern);
            }
        }
    }

    // ─── View Builders ──────────────────────────────────────────────

    async _buildView(def, params) {
        switch (def.builder) {
            case 'buildDashboardStats': return this._buildDashboardStats(params);
            case 'buildScanVerification': return this._buildScanVerification(params);
            case 'buildScmTimeline': return this._buildScmTimeline(params);
            case 'buildFraudOverview': return this._buildFraudOverview(params);
            default: return null;
        }
    }

    async _buildDashboardStats(params) {
        const { orgId } = params;
        const where = orgId ? `WHERE org_id = '${orgId}'` : '';
        try {
            const [products, scans, fraudAlerts, partners] = await Promise.all([
                this._query(`SELECT COUNT(*) as count FROM products ${where}`),
                this._query(`SELECT COUNT(*) as count FROM scan_events ${where}`),
                this._query(`SELECT COUNT(*) as count, 
                    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
                    SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count
                    FROM fraud_alerts ${where}`),
                this._query(`SELECT COUNT(*) as count FROM partners ${where}`),
            ]);

            // Trend: scans in last 7 days vs previous 7 days
            const recentScans = await this._query(
                `SELECT COUNT(*) as count FROM scan_events ${where ? where + ' AND' : 'WHERE'}
                 created_at > datetime('now', '-7 days')`
            );
            const previousScans = await this._query(
                `SELECT COUNT(*) as count FROM scan_events ${where ? where + ' AND' : 'WHERE'}
                 created_at > datetime('now', '-14 days') AND created_at <= datetime('now', '-7 days')`
            );

            const recent = recentScans?.count || 0;
            const previous = previousScans?.count || 0;
            const scanTrend = previous > 0 ? Math.round(((recent - previous) / previous) * 100) : 0;

            return {
                totalProducts: products?.count || 0,
                totalScans: scans?.count || 0,
                totalFraudAlerts: fraudAlerts?.count || 0,
                openFraudAlerts: fraudAlerts?.open_count || 0,
                criticalAlerts: fraudAlerts?.critical_count || 0,
                totalPartners: partners?.count || 0,
                scanTrend,
                scanTrendLabel: scanTrend >= 0 ? `+${scanTrend}%` : `${scanTrend}%`,
                generatedAt: new Date().toISOString(),
            };
        } catch (e) {
            return { error: e.message, totalProducts: 0, totalScans: 0, generatedAt: new Date().toISOString() };
        }
    }

    async _buildScanVerification(params) {
        const { productId } = params;
        try {
            const product = await this._query(
                `SELECT p.*, ts.score as trust_score, ts.level as trust_level
                 FROM products p LEFT JOIN trust_scores ts ON p.id = ts.product_id
                 WHERE p.id = '${productId}' LIMIT 1`
            );
            const recentScans = await this._queryAll(
                `SELECT * FROM scan_events WHERE product_id = '${productId}' 
                 ORDER BY created_at DESC LIMIT 10`
            );
            return { product: product || null, recentScans, generatedAt: new Date().toISOString() };
        } catch (e) {
            return { product: null, recentScans: [], generatedAt: new Date().toISOString() };
        }
    }

    async _buildScmTimeline(params) {
        const { shipmentId } = params;
        try {
            const shipment = await this._query(
                `SELECT s.*, p.name as partner_name, p.trust_rating as partner_trust
                 FROM shipments s LEFT JOIN partners p ON s.partner_id = p.id
                 WHERE s.id = '${shipmentId}' LIMIT 1`
            );
            const checkpoints = await this._queryAll(
                `SELECT * FROM shipment_checkpoints WHERE shipment_id = '${shipmentId}'
                 ORDER BY timestamp ASC`
            );
            return { shipment: shipment || null, checkpoints, generatedAt: new Date().toISOString() };
        } catch (e) {
            return { shipment: null, checkpoints: [], generatedAt: new Date().toISOString() };
        }
    }

    async _buildFraudOverview(params) {
        const { orgId } = params;
        const where = orgId ? `WHERE org_id = '${orgId}'` : '';
        try {
            const severityDist = await this._queryAll(
                `SELECT severity, COUNT(*) as count FROM fraud_alerts ${where} GROUP BY severity`
            );
            const resolutionRate = await this._query(
                `SELECT COUNT(*) as total,
                 SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
                 FROM fraud_alerts ${where}`
            );
            const rate = resolutionRate?.total > 0
                ? Math.round((resolutionRate.resolved / resolutionRate.total) * 100) : 0;

            return {
                severityDistribution: severityDist || [],
                totalAlerts: resolutionRate?.total || 0,
                resolvedAlerts: resolutionRate?.resolved || 0,
                resolutionRate: rate,
                generatedAt: new Date().toISOString(),
            };
        } catch (e) {
            return { severityDistribution: [], totalAlerts: 0, resolvedAlerts: 0, resolutionRate: 0, generatedAt: new Date().toISOString() };
        }
    }

    // ─── DB Helpers ─────────────────────────────────────────────────

    async _query(sql) {
        if (this.db.prepare) {
            try { return this.db.prepare(sql).get(); } catch (e) { return null; }
        }
        if (this.db.$queryRawUnsafe) {
            const rows = await this.db.$queryRawUnsafe(sql);
            return rows[0] || null;
        }
        return null;
    }

    async _queryAll(sql) {
        if (this.db.prepare) {
            try { return this.db.prepare(sql).all(); } catch (e) { return []; }
        }
        if (this.db.$queryRawUnsafe) {
            return this.db.$queryRawUnsafe(sql);
        }
        return [];
    }

    // ─── Cache Backend ──────────────────────────────────────────────

    async _getFromCache(key) {
        if (this.redis) {
            try {
                const val = await this.redis.get(key);
                return val ? JSON.parse(val) : null;
            } catch (e) { /* fallthrough to memory */ }
        }
        const entry = this._memoryCache.get(key);
        if (entry && entry.expiresAt > Date.now()) return entry.data;
        if (entry) this._memoryCache.delete(key);
        return null;
    }

    async _setCache(key, data, ttlSeconds) {
        if (this.redis) {
            try {
                await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
                return;
            } catch (e) { /* fallthrough to memory */ }
        }
        this._memoryCache.set(key, {
            data,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }

    async _deleteCache(key) {
        if (this.redis) {
            try { await this.redis.del(key); } catch (e) { /* ignore */ }
        }
        this._memoryCache.delete(key);
    }

    async _deleteCacheByPattern(pattern) {
        // Extract base pattern (before first {param})
        const base = pattern.split('{')[0];
        if (this.redis) {
            try {
                const keys = await this.redis.keys(`${base}*`);
                if (keys.length > 0) await this.redis.del(...keys);
            } catch (e) { /* ignore */ }
        }
        for (const [key] of this._memoryCache) {
            if (key.startsWith(base)) this._memoryCache.delete(key);
        }
    }

    _buildCacheKey(pattern, params) {
        let key = pattern;
        for (const [k, v] of Object.entries(params)) {
            key = key.replace(`{${k}}`, v || 'global');
        }
        // Replace any remaining unresolved params
        key = key.replace(/\{[^}]+\}/g, 'all');
        return key;
    }

    // ─── Diagnostics ────────────────────────────────────────────────

    getStats() {
        return {
            ...this.stats,
            hitRate: this.stats.hits + this.stats.misses > 0
                ? Math.round((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100) : 0,
            views: [...this.views.keys()],
            memoryCacheSize: this._memoryCache.size,
        };
    }
}

module.exports = { QueryStore, VIEW_DEFINITIONS };
