/**
 * TrustChecker v9.4 — Read Replica Manager
 * 
 * Routes read queries to a dedicated read replica for horizontal scaling.
 * Falls back to primary if replica is unavailable.
 * Config: DATABASE_READ_URL env var.
 */

// ═══════════════════════════════════════════════════════════════════
// READ REPLICA MANAGER
// ═══════════════════════════════════════════════════════════════════

class ReadReplicaManager {
    constructor(options = {}) {
        this.primaryUrl = options.primaryUrl || process.env.DATABASE_URL;
        this.replicaUrl = options.replicaUrl || process.env.DATABASE_READ_URL;
        this.enabled = !!this.replicaUrl && this.replicaUrl !== this.primaryUrl;

        this._primary = null;
        this._replica = null;
        this._replicaHealthy = true;
        this._healthCheckInterval = null;
        this._lastHealthCheck = null;

        this.stats = {
            primaryQueries: 0,
            replicaQueries: 0,
            replicaFallbacks: 0,
            healthCheckFailures: 0,
        };

        // Start health checks
        if (this.enabled) {
            this._healthCheckInterval = setInterval(() => this._checkReplicaHealth(), 30000);
            if (this._healthCheckInterval.unref) this._healthCheckInterval.unref();
        }
    }

    /**
     * Set the primary and replica database instances.
     */
    configure(primary, replica = null) {
        this._primary = primary;
        this._replica = replica;
        if (replica) {
            this.enabled = true;
            console.log('📖 Read replica configured and enabled');
        }
    }

    /**
     * Get the appropriate database connection for a query.
     * @param {'read' | 'write'} mode - Query mode
     * @returns {Object} Database connection
     */
    getConnection(mode = 'read') {
        if (mode === 'write' || !this.enabled) {
            this.stats.primaryQueries++;
            return this._primary;
        }

        // Read mode — try replica first
        if (this._replica && this._replicaHealthy) {
            this.stats.replicaQueries++;
            return this._replica;
        }

        // Fallback to primary
        this.stats.primaryQueries++;
        this.stats.replicaFallbacks++;
        return this._primary;
    }

    /**
     * Route by HTTP method — middleware helper.
     * GET → read replica, POST/PUT/DELETE → primary.
     */
    routeByMethod(method) {
        const readMethods = ['GET', 'HEAD', 'OPTIONS'];
        return readMethods.includes(method.toUpperCase()) ? 'read' : 'write';
    }

    // ─── Health Check ───────────────────────────────────────────────

    async _checkReplicaHealth() {
        if (!this._replica) return;

        try {
            // Simple connectivity check
            if (this._replica.prepare) {
                this._replica.prepare('SELECT 1').get();
            } else if (this._replica.$queryRaw) {
                await this._replica.$queryRaw`SELECT 1`;
            }
            this._replicaHealthy = true;
            this._lastHealthCheck = { status: 'healthy', at: new Date().toISOString() };
        } catch (err) {
            this._replicaHealthy = false;
            this.stats.healthCheckFailures++;
            this._lastHealthCheck = {
                status: 'unhealthy',
                error: err.message,
                at: new Date().toISOString(),
            };
            console.warn(`[ReadReplica] Health check failed: ${err.message}`);
        }
    }

    // ─── Express Middleware ──────────────────────────────────────────

    /**
     * Express middleware — attaches db connection based on HTTP method.
     * Usage: app.use(replicaManager.middleware())
     * Then: req.db (routed connection)
     */
    middleware() {
        return (req, res, next) => {
            const mode = this.routeByMethod(req.method);
            req.dbConnection = this.getConnection(mode);
            req.dbMode = mode;
            next();
        };
    }

    // ─── Lifecycle ──────────────────────────────────────────────────

    stop() {
        if (this._healthCheckInterval) {
            clearInterval(this._healthCheckInterval);
            this._healthCheckInterval = null;
        }
    }

    // ─── Diagnostics ────────────────────────────────────────────────

    getStats() {
        const total = this.stats.primaryQueries + this.stats.replicaQueries;
        return {
            enabled: this.enabled,
            replicaHealthy: this._replicaHealthy,
            lastHealthCheck: this._lastHealthCheck,
            ...this.stats,
            replicaUsagePercent: total > 0
                ? Math.round((this.stats.replicaQueries / total) * 100) : 0,
        };
    }
}

// Singleton
const replicaManager = new ReadReplicaManager();

module.exports = { ReadReplicaManager, replicaManager };
