/**
 * TrustChecker – API Client Module
 * Handles all HTTP communication with the backend.
 *
 * PERF (P3): SessionStorage cache with TTL + Stale-While-Revalidate
 *   - GET requests cached by URL path → sessionStorage (survives SPA nav, cleared on tab close)
 *   - Write ops (POST/PUT/DELETE) auto-invalidate related caches
 *   - Configurable TTL: bundle=120s, default=30s, custom via options
 */
import { State, render } from './state.js';

/**
 * Basic JWT structure validation — checks 3 dot-separated base64 parts.
 * Does NOT verify signature (that's the server's job).
 */
function isValidTokenFormat(t) {
    if (!t || typeof t !== 'string') return false;
    const parts = t.split('.');
    return parts.length === 3 && parts.every(p => p.length > 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SessionStorage Cache Layer — TTL + Stale-While-Revalidate
// ═══════════════════════════════════════════════════════════════════════════════
const CACHE_PREFIX = '_c:';
const DEFAULT_TTL = 30;    // seconds
const BUNDLE_TTL  = 120;   // seconds for /bundle endpoints

const apiCache = {
    _key(path) { return CACHE_PREFIX + path; },

    get(path) {
        try {
            const raw = sessionStorage.getItem(this._key(path));
            if (!raw) return null;
            const { data, ts, ttl } = JSON.parse(raw);
            const age = (Date.now() - ts) / 1000;
            return { data, age, ttl, stale: age > ttl };
        } catch { return null; }
    },

    set(path, data, ttl) {
        try {
            sessionStorage.setItem(this._key(path), JSON.stringify({ data, ts: Date.now(), ttl }));
        } catch (e) {
            // sessionStorage full — purge oldest entries
            if (e.name === 'QuotaExceededError') {
                this.prune();
                try { sessionStorage.setItem(this._key(path), JSON.stringify({ data, ts: Date.now(), ttl })); } catch {}
            }
        }
    },

    invalidate(path) {
        // Invalidate exact path + any parent bundle
        sessionStorage.removeItem(this._key(path));
        // If this is a sub-path, invalidate the bundle too
        const parts = path.split('/').filter(Boolean);
        if (parts.length >= 2) {
            const bundlePath = '/' + parts.slice(0, -1).join('/') + '/bundle';
            sessionStorage.removeItem(this._key(bundlePath));
        }
    },

    /** Remove all cache entries */
    clear() {
        const toRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key?.startsWith(CACHE_PREFIX)) toRemove.push(key);
        }
        toRemove.forEach(k => sessionStorage.removeItem(k));
    },

    /** Evict oldest 30% when quota exceeded */
    prune() {
        const entries = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key?.startsWith(CACHE_PREFIX)) {
                try { const { ts } = JSON.parse(sessionStorage.getItem(key)); entries.push({ key, ts }); } catch {}
            }
        }
        entries.sort((a, b) => a.ts - b.ts);
        const count = Math.ceil(entries.length * 0.3);
        entries.slice(0, count).forEach(e => sessionStorage.removeItem(e.key));
    },

    /** Get default TTL for a path */
    ttlFor(path) {
        if (path.includes('/bundle')) return BUNDLE_TTL;
        return DEFAULT_TTL;
    }
};

export const API = {
    base: (() => {
        // Detect reverse-proxy prefix (e.g. /trustchecker/) from current path
        const path = window.location.pathname;
        const segments = path.split('/').filter(Boolean);
        // If the app is served from a sub-path (e.g. /trustchecker/), use it as prefix
        // Static assets like .js, .css, .html are leaf paths — strip them
        const prefix = segments.length > 0 && !segments[0].includes('.') ? '/' + segments[0] : '';
        return window.location.origin + prefix + '/api';
    })(),
    token: (() => {
        const t = sessionStorage.getItem('tc_token');
        return isValidTokenFormat(t) ? t : null;
    })(),
    refreshToken: sessionStorage.getItem('tc_refresh'),
    _refreshing: null,

    async request(method, path, body, _isRetry) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (this.token) opts.headers['Authorization'] = `Bearer ${this.token}`;
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(this.base + path, opts);
        const data = await res.json();

        // Auto-refresh on token expiry
        if (res.status === 401 && data.code === 'TOKEN_EXPIRED' && !_isRetry && this.refreshToken) {
            await this.doRefresh();
            return this.request(method, path, body, true);
        }

        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    },

    async doRefresh() {
        if (this._refreshing) return this._refreshing;
        this._refreshing = (async () => {
            try {
                const res = await fetch(this.base + '/auth/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: this.refreshToken })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                this.setToken(data.token, data.refresh_token);
            } catch (e) {
                console.error('Token refresh failed:', e);
                this.clearToken();
                State.user = null;
                render();
            }
        })();
        await this._refreshing;
        this._refreshing = null;
    },

    /**
     * GET with SessionStorage cache + Stale-While-Revalidate
     * @param {string} p - API path
     * @param {Object} [opts] - { ttl: seconds, noCache: true }
     */
    get(p, opts) {
        const ttl = opts?.ttl ?? apiCache.ttlFor(p);

        // Skip cache if explicitly requested
        if (opts?.noCache) return this.request('GET', p);

        const cached = apiCache.get(p);
        if (cached && !cached.stale) {
            // Fresh cache — return immediately
            return Promise.resolve(cached.data);
        }

        // Fetch from network
        const networkPromise = this.request('GET', p).then(data => {
            apiCache.set(p, data, ttl);
            return data;
        });

        if (cached && cached.stale) {
            // Stale-While-Revalidate: serve stale data now, refresh in background
            networkPromise.catch(() => {}); // suppress bg errors
            return Promise.resolve(cached.data);
        }

        // No cache at all — must wait for network
        return networkPromise;
    },

    post(p, b) {
        apiCache.invalidate(p);
        return this.request('POST', p, b);
    },
    put(p, b) {
        apiCache.invalidate(p);
        return this.request('PUT', p, b);
    },
    patch(p, b) {
        apiCache.invalidate(p);
        return this.request('PATCH', p, b);
    },
    delete(p) {
        apiCache.invalidate(p);
        return this.request('DELETE', p);
    },

    setToken(t, r) {
        this.token = t; sessionStorage.setItem('tc_token', t);
        if (r) { this.refreshToken = r; sessionStorage.setItem('tc_refresh', r); }
    },
    clearToken() {
        this.token = null; this.refreshToken = null;
        apiCache.clear(); // Clear all API cache on logout
        sessionStorage.removeItem('tc_token'); sessionStorage.removeItem('tc_refresh'); sessionStorage.removeItem('tc_user');
    }
};

window.API = API;

