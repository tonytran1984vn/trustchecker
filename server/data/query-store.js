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
        try {
            const [products, scans, fraudAlerts, partners] = await Promise.all([
                orgId ? this._queryParam('SELECT COUNT(*) as count FROM products WHERE org_id = ?', [orgId])
                    : this._queryParam('SELECT COUNT(*) as count FROM products', []),
                orgId ? this._queryParam('SELECT COUNT(*) as count FROM scan_events WHERE org_id = ?', [orgId])
                    : this._queryParam('SELECT COUNT(*) as count FROM scan_events', []),
                orgId ? this._queryParam(`SELECT COUNT(*) as count, 
                    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
                    SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count
                    FROM fraud_alerts WHERE org_id = ?`, [orgId])
                    : this._queryParam(`SELECT COUNT(*) as count, 
                    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
                    SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count
                    FROM fraud_alerts`, []),
                orgId ? this._queryParam('SELECT COUNT(*) as count FROM partners WHERE org_id = ?', [orgId])
                    : this._queryParam('SELECT COUNT(*) as count FROM partners', []),
            ]);

            // Trend: scans in last 7 days vs previous 7 days
            const recentScans = orgId
                ? await this._queryParam(`SELECT COUNT(*) as count FROM scan_events WHERE org_id = ? AND created_at > datetime('now', '-7 days')`, [orgId])
                : await this._queryParam(`SELECT COUNT(*) as count FROM scan_events WHERE created_at > datetime('now', '-7 days')`, []);
            const previousScans = orgId
                ? await this._queryParam(`SELECT COUNT(*) as count FROM scan_events WHERE org_id = ? AND created_at > datetime('now', '-14 days') AND created_at <= datetime('now', '-7 days')`, [orgId])
                : await this._queryParam(`SELECT COUNT(*) as count FROM scan_events WHERE created_at > datetime('now', '-14 days') AND created_at <= datetime('now', '-7 days')`, []);

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
            return { error: 'Query failed', totalProducts: 0, totalScans: 0, generatedAt: new Date().toISOString() };
        }
    }

    async _buildScanVerification(params) {
        const { productId } = params;
        try {
            const product = await this._queryParam(
                `SELECT p.*, ts.score as trust_score, ts.level as trust_level
                 FROM products p LEFT JOIN trust_scores ts ON p.id = ts.product_id
                 WHERE p.id = ? LIMIT 1`, [productId]
            );
            const recentScans = await this._queryAllParam(
                `SELECT * FROM scan_events WHERE product_id = ? 
                 ORDER BY created_at DESC LIMIT 10`, [productId]
            );
            return { product: product || null, recentScans, generatedAt: new Date().toISOString() };
        } catch (e) {
            return { product: null, recentScans: [], generatedAt: new Date().toISOString() };
        }
    }

    async _buildScmTimeline(params) {
        const { shipmentId } = params;
        try {
            const shipment = await this._queryParam(
                `SELECT s.*, p.name as partner_name, p.trust_rating as partner_trust
                 FROM shipments s LEFT JOIN partners p ON s.partner_id = p.id
                 WHERE s.id = ? LIMIT 1`, [shipmentId]
            );
            const checkpoints = await this._queryAllParam(
                `SELECT * FROM shipment_checkpoints WHERE shipment_id = ?
                 ORDER BY timestamp ASC`, [shipmentId]
            );
            return { shipment: shipment || null, checkpoints, generatedAt: new Date().toISOString() };
        } catch (e) {
            return { shipment: null, checkpoints: [], generatedAt: new Date().toISOString() };
        }
    }

    async _buildFraudOverview(params) {
        const { orgId } = params;
        try {
            const severityDist = orgId
                ? await this._queryAllParam('SELECT severity, COUNT(*) as count FROM fraud_alerts WHERE org_id = ? GROUP BY severity', [orgId])
                : await this._queryAllParam('SELECT severity, COUNT(*) as count FROM fraud_alerts GROUP BY severity', []);
            const resolutionRate = orgId
                ? await this._queryParam(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved FROM fraud_alerts WHERE org_id = ?`, [orgId])
                : await this._queryParam(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved FROM fraud_alerts`, []);
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

    // ─── DB Helpers (FIX C-1/C-2: parameterized queries only) ────

    async _queryParam(sql, params = []) {
        if (this.db.prepare) {
            try { return this.db.prepare(sql).get(...params); } catch (e) { return null; }
        }
        return null;
    }

    async _queryAllParam(sql, params = []) {
        if (this.db.prepare) {
            try { return this.db.prepare(sql).all(...params); } catch (e) { return []; }
        }
        return [];
    }

    /** @deprecated Use _queryParam instead */
    async _query(sql) {
        if (this.db.prepare) {
            try { return this.db.prepare(sql).get(); } catch (e) { return null; }
        }
        return null;
    }

    /** @deprecated Use _queryAllParam instead */
    async _queryAll(sql) {
        if (this.db.prepare) {
            try { return this.db.prepare(sql).all(); } catch (e) { return []; }
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
