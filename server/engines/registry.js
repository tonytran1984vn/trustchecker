/**
 * Engine Registry v1.0 (Phase 7)
 *
 * Centralized engine management with:
 *   - Lazy loading (engines loaded on first access)
 *   - Health checks (all engines report status)
 *   - Statistics (load time, memory delta, errors)
 *   - Graceful degradation (failed engine doesn't crash app)
 *
 * Usage:
 *   const registry = require('./engines/registry');
 *   const trust = registry.get('core.TrustEngine');
 *   const health = registry.healthCheck();
 */

const ENGINE_GROUPS = {
    core: './core',
    infrastructure: './infrastructure',
    intelligence: './intelligence',
    economics: './economics-engine',
    governance: './governance-module',
    regulatory: './regulatory-engine',
    riskModel: './risk-model-engine',
    platformOps: './platform-ops-engine',
    legalEntity: './legal-entity-module',
    crisis: './crisis-module',
    carbon: './carbon-support',
};

class EngineRegistry {
    constructor() {
        this._loaded = {};      // group -> module
        this._stats = {};       // group -> { loadTime, error }
        this._startTime = Date.now();
    }

    /**
     * Get an engine group (lazy loaded on first access)
     * @param {string} group - Engine group name (e.g., 'core', 'infrastructure')
     * @returns {object} Engine module exports
     */
    getGroup(group) {
        if (this._loaded[group]) return this._loaded[group];

        const path = ENGINE_GROUPS[group];
        if (!path) throw new Error('Unknown engine group: ' + group);

        const start = Date.now();
        try {
            this._loaded[group] = require(path);
            this._stats[group] = { loadTime: Date.now() - start, error: null, loadedAt: new Date().toISOString() };
            return this._loaded[group];
        } catch (e) {
            this._stats[group] = { loadTime: Date.now() - start, error: e.message, loadedAt: new Date().toISOString() };
            console.error('[EngineRegistry] Failed to load group "' + group + '":', e.message);
            return {};
        }
    }

    /**
     * Get a specific engine by dotpath (e.g., 'core.TrustEngine')
     */
    get(dotPath) {
        const [group, ...rest] = dotPath.split('.');
        const mod = this.getGroup(group);
        if (rest.length === 0) return mod;
        return rest.reduce((obj, key) => obj?.[key], mod);
    }

    /**
     * Preload critical engine groups (call at startup)
     */
    preload(groups = ['core', 'infrastructure']) {
        for (const g of groups) {
            try { this.getGroup(g); } catch(e) { /* logged above */ }
        }
    }

    /**
     * Health check — report status of all loaded engines
     */
    healthCheck() {
        const result = {
            uptime_ms: Date.now() - this._startTime,
            groups_total: Object.keys(ENGINE_GROUPS).length,
            groups_loaded: Object.keys(this._loaded).length,
            groups: {},
        };

        for (const [name, path] of Object.entries(ENGINE_GROUPS)) {
            const loaded = !!this._loaded[name];
            const stats = this._stats[name] || {};
            const mod = this._loaded[name] || {};
            const exports = loaded ? Object.keys(mod) : [];

            result.groups[name] = {
                loaded,
                exports_count: exports.length,
                exports,
                load_time_ms: stats.loadTime || null,
                error: stats.error || null,
            };
        }

        return result;
    }

    /**
     * List all available engine groups
     */
    listGroups() {
        return Object.keys(ENGINE_GROUPS);
    }

    /**
     * Unload an engine group (for testing / hot reload)
     */
    unload(group) {
        const path = ENGINE_GROUPS[group];
        if (!path) return;
        delete this._loaded[group];
        // Clear from require cache
        try {
            const resolved = require.resolve(path);
            delete require.cache[resolved];
        } catch(e) { /* ignore */ }
    }
}

module.exports = new EngineRegistry();
