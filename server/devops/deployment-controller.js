/**
 * TrustChecker v9.5 — Deployment Controller
 * ═══════════════════════════════════════════════════════════════════
 * Canary and Blue/Green deployment orchestration.
 * Health-check based routing, auto-rollback on error threshold,
 * deployment history, and version tagging.
 *
 * Admin-only endpoints:
 *   POST /api/deploy/canary     — set canary weight
 *   POST /api/deploy/switch     — blue/green switch
 *   POST /api/deploy/rollback   — rollback to previous
 *   GET  /api/deploy/history    — deployment audit log
 *   GET  /api/deploy/status     — current deployment state
 */

// ═══════════════════════════════════════════════════════════════════
// DEPLOYMENT STATE
// ═══════════════════════════════════════════════════════════════════

const DEPLOYMENT_VERSION = process.env.APP_VERSION || '9.5.0';
const MAX_HISTORY = 20;

const state = {
    // Current active deployment
    active: {
        version: DEPLOYMENT_VERSION,
        slot: 'blue', // 'blue' or 'green'
        startedAt: new Date().toISOString(),
        status: 'healthy',
    },

    // Canary configuration
    canary: {
        enabled: false,
        weight: 0, // 0-100 (% of traffic to canary)
        version: null,
        startedAt: null,
        errorCount: 0,
        requestCount: 0,
        errorThreshold: 5, // auto-rollback if error rate exceeds 5%
        maxErrorCount: 50, // absolute error count trigger
    },

    // Deployment history
    history: [],

    // SLO tracking for auto-rollback decisions
    slo: {
        errorBudget: 0.01, // 1% error budget
        latencyP99: 2000, // 2s p99 latency budget
    },
};

// ═══════════════════════════════════════════════════════════════════
// VERSION TAG MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════

/**
 * Express middleware: adds deployment version to response headers.
 * Also performs canary traffic splitting.
 */
function deploymentMiddleware(req, res, next) {
    // Tag every response with deployment version
    res.setHeader('X-Deploy-Version', state.active.version);
    res.setHeader('X-Deploy-Slot', state.active.slot);

    // Canary routing
    if (state.canary.enabled && state.canary.version) {
        const crypto = require('crypto');
        const hashTarget = req.headers['x-forwarded-for'] || req.ip || Math.random().toString();
        const roll = parseInt(crypto.createHash('md5').update(hashTarget).digest('hex').substring(0, 8), 16) % 100;

        if (roll < state.canary.weight) {
            // This request is routed to canary
            res.setHeader('X-Deploy-Version', state.canary.version);
            res.setHeader('X-Deploy-Canary', 'true');
            req._isCanary = true;
            state.canary.requestCount++;
        }
    }

    // Track errors for auto-rollback (use 'finish' event to avoid res.end conflicts with tracer)
    res.on('finish', () => {
        if (req._isCanary && res.statusCode >= 500) {
            state.canary.errorCount++;
            checkAutoRollback();
        }
    });

    next();
}

// ═══════════════════════════════════════════════════════════════════
// AUTO-ROLLBACK
// ═══════════════════════════════════════════════════════════════════

function checkAutoRollback() {
    const { canary } = state;
    if (!canary.enabled) return;

    const errorRate = canary.requestCount > 0 ? (canary.errorCount / canary.requestCount) * 100 : 0;

    // Trigger rollback if error rate exceeds threshold
    if ((canary.requestCount >= 10 && errorRate > canary.errorThreshold) || canary.errorCount >= canary.maxErrorCount) {
        console.error(
            `[Deploy] 🚨 Auto-rollback triggered! Error rate: ${errorRate.toFixed(1)}% (${canary.errorCount}/${canary.requestCount})`
        );
        rollbackCanary('auto-rollback: error threshold exceeded');
    }
}

function rollbackCanary(reason = 'manual') {
    if (!state.canary.enabled) return false;

    addHistory({
        action: 'canary-rollback',
        fromVersion: state.canary.version,
        toVersion: state.active.version,
        reason,
        canaryStats: {
            errorCount: state.canary.errorCount,
            requestCount: state.canary.requestCount,
            errorRate:
                state.canary.requestCount > 0
                    ? ((state.canary.errorCount / state.canary.requestCount) * 100).toFixed(2) + '%'
                    : '0%',
        },
    });

    state.canary.enabled = false;
    state.canary.weight = 0;
    state.canary.version = null;
    state.canary.startedAt = null;
    state.canary.errorCount = 0;
    state.canary.requestCount = 0;

    return true;
}

// ═══════════════════════════════════════════════════════════════════
// DEPLOYMENT HISTORY
// ═══════════════════════════════════════════════════════════════════

function addHistory(entry) {
    state.history.unshift({
        ...entry,
        timestamp: new Date().toISOString(),
        performedBy: entry.performedBy || 'system',
    });

    while (state.history.length > MAX_HISTORY) {
        state.history.pop();
    }
}

// ═══════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Register deployment API routes.
 * @param {import('express').Router} router
 * @param {Function} requireRole — auth middleware
 */
function registerDeployRoutes(router, requireRole) {
    // GET /api/deploy/status
    router.get('/deploy/status', requireRole('admin'), (req, res) => {
        const canaryErrorRate =
            state.canary.requestCount > 0
                ? ((state.canary.errorCount / state.canary.requestCount) * 100).toFixed(2)
                : '0.00';

        res.json({
            active: state.active,
            canary: {
                ...state.canary,
                errorRate: canaryErrorRate + '%',
            },
            slo: state.slo,
        });
    });

    // GET /api/deploy/history
    router.get('/deploy/history', requireRole('admin'), (req, res) => {
        res.json({
            deployments: state.history,
            total: state.history.length,
        });
    });

    // POST /api/deploy/canary — { version, weight, errorThreshold }
    router.post('/deploy/canary', requireRole('admin'), (req, res) => {
        const { version, weight = 10, errorThreshold = 5 } = req.body;

        if (!version || typeof version !== 'string') {
            return res.status(400).json({ error: 'version is required and must be a string' });
        }
        const parsedWeight = Number(weight);
        if (!Number.isFinite(parsedWeight) || parsedWeight < 0 || parsedWeight > 100) {
            return res.status(400).json({ error: 'weight must be a number between 0 and 100' });
        }
        const parsedThreshold = Number(errorThreshold);
        if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 100) {
            return res.status(400).json({ error: 'errorThreshold must be a number between 0 and 100' });
        }

        state.canary.enabled = parsedWeight > 0;
        state.canary.weight = Math.round(parsedWeight);
        state.canary.version = version;
        state.canary.startedAt = new Date().toISOString();
        state.canary.errorCount = 0;
        state.canary.requestCount = 0;
        state.canary.errorThreshold = parsedThreshold;

        addHistory({
            action: 'canary-start',
            version,
            weight,
            errorThreshold,
            performedBy: req.user?.email || 'admin',
        });

        console.log(`[Deploy] 🐤 Canary deployed: v${version} at ${weight}% traffic`);

        res.json({
            message: `Canary deployment started: v${version} receiving ${weight}% of traffic`,
            canary: state.canary,
        });
    });

    // POST /api/deploy/switch — Blue/Green switch
    router.post('/deploy/switch', requireRole('admin'), (req, res) => {
        const { version } = req.body;
        const oldSlot = state.active.slot;
        const newSlot = oldSlot === 'blue' ? 'green' : 'blue';

        const previousVersion = state.active.version;

        state.active = {
            version: version || state.canary.version || DEPLOYMENT_VERSION,
            slot: newSlot,
            startedAt: new Date().toISOString(),
            status: 'healthy',
        };

        // Disable canary after promotion
        if (state.canary.enabled) {
            state.canary.enabled = false;
            state.canary.weight = 0;
        }

        addHistory({
            action: 'blue-green-switch',
            fromSlot: oldSlot,
            toSlot: newSlot,
            fromVersion: previousVersion,
            toVersion: state.active.version,
            performedBy: req.user?.email || 'admin',
        });

        console.log(
            `[Deploy] 🔄 Blue/Green switch: ${oldSlot}(v${previousVersion}) → ${newSlot}(v${state.active.version})`
        );

        res.json({
            message: `Switched from ${oldSlot} to ${newSlot}`,
            active: state.active,
        });
    });

    // POST /api/deploy/rollback
    router.post('/deploy/rollback', requireRole('admin'), (req, res) => {
        const { reason = 'manual rollback' } = req.body;

        // Rollback canary if active
        if (state.canary.enabled) {
            rollbackCanary(reason);
            return res.json({
                message: 'Canary rolled back',
                active: state.active,
            });
        }

        // Otherwise rollback blue/green to previous
        const lastSwitch = state.history.find(h => h.action === 'blue-green-switch');
        if (!lastSwitch) {
            return res.status(400).json({ error: 'No previous deployment to rollback to' });
        }

        const previousVersion = lastSwitch.fromVersion;
        const previousSlot = lastSwitch.fromSlot;

        state.active = {
            version: previousVersion,
            slot: previousSlot,
            startedAt: new Date().toISOString(),
            status: 'rolled-back',
        };

        addHistory({
            action: 'rollback',
            toVersion: previousVersion,
            toSlot: previousSlot,
            reason,
            performedBy: req.user?.email || 'admin',
        });

        console.log(`[Deploy] ⏪ Rollback to v${previousVersion} (${previousSlot})`);

        res.json({
            message: `Rolled back to v${previousVersion} (${previousSlot})`,
            active: state.active,
        });
    });

    // POST /api/deploy/promote — promote canary to active
    router.post('/deploy/promote', requireRole('admin'), (req, res) => {
        if (!state.canary.enabled || !state.canary.version) {
            return res.status(400).json({ error: 'No active canary to promote' });
        }

        const canaryVersion = state.canary.version;
        const canaryStats = {
            requestCount: state.canary.requestCount,
            errorCount: state.canary.errorCount,
            errorRate:
                state.canary.requestCount > 0
                    ? ((state.canary.errorCount / state.canary.requestCount) * 100).toFixed(2) + '%'
                    : '0%',
        };

        // Switch to canary version
        const oldSlot = state.active.slot;
        const newSlot = oldSlot === 'blue' ? 'green' : 'blue';

        state.active = {
            version: canaryVersion,
            slot: newSlot,
            startedAt: new Date().toISOString(),
            status: 'healthy',
        };

        // Fully reset canary state
        state.canary.enabled = false;
        state.canary.weight = 0;
        state.canary.version = null;
        state.canary.startedAt = null;
        state.canary.errorCount = 0;
        state.canary.requestCount = 0;

        addHistory({
            action: 'canary-promote',
            version: canaryVersion,
            slot: newSlot,
            canaryStats,
            performedBy: req.user?.email || 'admin',
        });

        console.log(`[Deploy] ✅ Canary v${canaryVersion} promoted to production (${newSlot})`);

        res.json({
            message: `Canary v${canaryVersion} promoted to production`,
            active: state.active,
            canaryStats,
        });
    });
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

module.exports = {
    deploymentMiddleware,
    registerDeployRoutes,
    getDeploymentState: () => ({
        ...state,
        active: { ...state.active },
        canary: { ...state.canary },
        slo: { ...state.slo },
    }),
    getActiveVersion: () => state.active.version,
};
