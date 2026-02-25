/**
 * TrustChecker – API Client Module
 * Handles all HTTP communication with the backend.
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

    get(p) { return this.request('GET', p); },
    post(p, b) { return this.request('POST', p, b); },
    put(p, b) { return this.request('PUT', p, b); },
    patch(p, b) { return this.request('PATCH', p, b); },
    delete(p) { return this.request('DELETE', p); },

    setToken(t, r) {
        this.token = t; sessionStorage.setItem('tc_token', t);
        if (r) { this.refreshToken = r; sessionStorage.setItem('tc_refresh', r); }
    },
    clearToken() {
        this.token = null; this.refreshToken = null;
        sessionStorage.removeItem('tc_token'); sessionStorage.removeItem('tc_refresh'); sessionStorage.removeItem('tc_user');
    }
};

window.API = API;

