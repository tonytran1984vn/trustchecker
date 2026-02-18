/**
 * TrustChecker v9.2 — Circuit Breaker
 * ═══════════════════════════════════════════════════════════
 * Production-grade circuit breaker for external service calls
 * with CLOSED / OPEN / HALF-OPEN state machine.
 *
 * Usage:
 *   const { CircuitBreaker } = require('./middleware/circuit-breaker');
 *   const cb = new CircuitBreaker('ai-analytics', { failureThreshold: 5 });
 *   const result = await cb.exec(() => httpPost(...), () => jsFallback());
 */

const EventEmitter = require('events');

// ─── Circuit States ──────────────────────────────────────────
const STATE = {
    CLOSED: 'CLOSED',     // Normal operation, requests flow through
    OPEN: 'OPEN',       // Service down, block requests, use fallback
    HALF_OPEN: 'HALF_OPEN',  // Probing — allow 1 request to test recovery
};

/**
 * @typedef {Object} CircuitBreakerOptions
 * @property {number} failureThreshold  - Failures before tripping OPEN (default: 5)
 * @property {number} successThreshold  - Successes in HALF_OPEN before closing (default: 2)
 * @property {number} openDurationMs    - How long to stay OPEN before probing (default: 30s)
 * @property {number} halfOpenMaxConcurrent - Max concurrent requests in HALF_OPEN (default: 1)
 * @property {number} monitorWindowMs   - Rolling window for failure counting (default: 60s)
 * @property {number} timeoutMs         - Per-request timeout (default: 30s)
 */

class CircuitBreaker extends EventEmitter {
    /**
     * @param {string} name - Logical name (e.g. 'ai-analytics')
     * @param {CircuitBreakerOptions} opts
     */
    constructor(name, opts = {}) {
        super();
        this.name = name;
        this.state = STATE.CLOSED;

        // ─── Tunables ────────────────────────────────────
        this.failureThreshold = opts.failureThreshold ?? 5;
        this.successThreshold = opts.successThreshold ?? 2;
        this.openDurationMs = opts.openDurationMs ?? 30_000;
        this.halfOpenMax = opts.halfOpenMaxConcurrent ?? 1;
        this.monitorWindowMs = opts.monitorWindowMs ?? 60_000;
        this.timeoutMs = opts.timeoutMs ?? 30_000;

        // ─── Internal counters ───────────────────────────
        this._failures = [];  // timestamps of failures within window
        this._halfOpenOk = 0;   // consecutive successes in HALF_OPEN
        this._halfOpenActive = 0; // in-flight probes in HALF_OPEN
        this._openSince = null;
        this._stats = { total: 0, success: 0, failure: 0, fallback: 0, rejected: 0 };
    }

    // ─── Public API ──────────────────────────────────────────
    /**
     * Execute a function through the circuit breaker.
     * @param {Function} fn        - The primary async function to call
     * @param {Function} fallbackFn - The fallback async function if circuit is open/failed
     * @returns {Promise<any>}
     */
    async exec(fn, fallbackFn) {
        this._stats.total++;

        // ─── OPEN: reject immediately, use fallback ──────
        if (this.state === STATE.OPEN) {
            if (this._shouldProbe()) {
                return this._probe(fn, fallbackFn);
            }
            this._stats.rejected++;
            this._stats.fallback++;
            this.emit('rejected', { name: this.name, state: this.state });
            return fallbackFn();
        }

        // ─── HALF_OPEN: allow limited probes ─────────────
        if (this.state === STATE.HALF_OPEN) {
            if (this._halfOpenActive >= this.halfOpenMax) {
                this._stats.rejected++;
                this._stats.fallback++;
                return fallbackFn();
            }
            return this._probe(fn, fallbackFn);
        }

        // ─── CLOSED: normal request flow ─────────────────
        try {
            const result = await this._withTimeout(fn());
            this._onSuccess();
            return result;
        } catch (err) {
            this._onFailure(err);
            this._stats.fallback++;
            this.emit('fallback', { name: this.name, error: err.message });
            return fallbackFn();
        }
    }

    // ─── State Machine ───────────────────────────────────────
    _onSuccess() {
        this._stats.success++;

        if (this.state === STATE.HALF_OPEN) {
            this._halfOpenOk++;
            this._halfOpenActive = Math.max(0, this._halfOpenActive - 1);
            if (this._halfOpenOk >= this.successThreshold) {
                this._close();
            }
        }

        // In CLOSED state, clear old failures from window
        this._pruneFailures();
    }

    _onFailure(err) {
        this._stats.failure++;
        const now = Date.now();

        if (this.state === STATE.HALF_OPEN) {
            this._halfOpenActive = Math.max(0, this._halfOpenActive - 1);
            this._trip();
            return;
        }

        // CLOSED — track failure within rolling window
        this._failures.push(now);
        this._pruneFailures();

        if (this._failures.length >= this.failureThreshold) {
            this._trip();
        }
    }

    _trip() {
        if (this.state === STATE.OPEN) return;
        this.state = STATE.OPEN;
        this._openSince = Date.now();
        this._halfOpenOk = 0;
        this._halfOpenActive = 0;
        console.warn(`🔴 [circuit-breaker] ${this.name}: OPEN (tripped after ${this._failures.length} failures)`);
        this.emit('open', { name: this.name, failures: this._failures.length });
    }

    _close() {
        this.state = STATE.CLOSED;
        this._failures = [];
        this._halfOpenOk = 0;
        this._halfOpenActive = 0;
        this._openSince = null;
        console.info(`🟢 [circuit-breaker] ${this.name}: CLOSED (service recovered)`);
        this.emit('close', { name: this.name });
    }

    _shouldProbe() {
        return this.state === STATE.OPEN &&
            (Date.now() - this._openSince) >= this.openDurationMs;
    }

    async _probe(fn, fallbackFn) {
        this.state = STATE.HALF_OPEN;
        this._halfOpenActive++;
        console.info(`🟡 [circuit-breaker] ${this.name}: HALF_OPEN (probing service)`);
        this.emit('halfOpen', { name: this.name });

        try {
            const result = await this._withTimeout(fn());
            this._onSuccess();
            return result;
        } catch (err) {
            this._onFailure(err);
            this._stats.fallback++;
            return fallbackFn();
        }
    }

    // ─── Helpers ─────────────────────────────────────────────
    _pruneFailures() {
        const cutoff = Date.now() - this.monitorWindowMs;
        this._failures = this._failures.filter(ts => ts > cutoff);
    }

    _withTimeout(promise) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Circuit breaker timeout')), this.timeoutMs);
            promise.then(
                val => { clearTimeout(timer); resolve(val); },
                err => { clearTimeout(timer); reject(err); }
            );
        });
    }

    // ─── Diagnostics ─────────────────────────────────────────
    getStatus() {
        return {
            name: this.name,
            state: this.state,
            stats: { ...this._stats },
            failuresInWindow: this._failures.length,
            config: {
                failureThreshold: this.failureThreshold,
                successThreshold: this.successThreshold,
                openDurationMs: this.openDurationMs,
                monitorWindowMs: this.monitorWindowMs,
            }
        };
    }
}

// ─── Registry — shared instances per service ─────────────────
const registry = {};

/**
 * Get or create a circuit breaker for a named service.
 * @param {string} name
 * @param {CircuitBreakerOptions} [opts]
 * @returns {CircuitBreaker}
 */
function getBreaker(name, opts) {
    if (!registry[name]) {
        registry[name] = new CircuitBreaker(name, opts);
    }
    return registry[name];
}

/**
 * Get status of all circuit breakers (for /health endpoint).
 */
function getAllBreakerStatus() {
    return Object.values(registry).map(cb => cb.getStatus());
}

module.exports = { CircuitBreaker, getBreaker, getAllBreakerStatus, STATE };
