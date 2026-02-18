/**
 * TrustChecker v9.4 — Reactive Store
 * 
 * Centralized state management replacing raw State object.
 * Proxy-based reactivity with granular subscriptions, memoized selectors,
 * action dispatching, and frontend event bus.
 */

// ═══════════════════════════════════════════════════════════════════
// REACTIVE STORE
// ═══════════════════════════════════════════════════════════════════

const _listeners = new Map();     // selector → Set<callback>
const _eventHandlers = new Map(); // event → Set<handler>
let _actionLog = [];              // last 50 actions for devtools
const MAX_ACTION_LOG = 50;
let _batchDepth = 0;
let _pendingNotifications = new Set();

/**
 * Create a reactive store with Proxy-based change detection.
 */
export function createStore(initialState = {}) {
    const state = { ...initialState };

    // ─── Proxy for automatic change detection ────────────────────
    const proxy = new Proxy(state, {
        set(target, prop, value) {
            const oldValue = target[prop];
            target[prop] = value;

            // Skip notification if value unchanged
            if (oldValue === value) return true;

            if (_batchDepth > 0) {
                _pendingNotifications.add(prop);
            } else {
                _notifySubscribers(prop, value, oldValue);
            }
            return true;
        },
        get(target, prop) {
            return target[prop];
        },
    });

    return proxy;
}

// ═══════════════════════════════════════════════════════════════════
// SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Subscribe to changes on a specific state property.
 * @param {string} selector - Property name or dot-path
 * @param {Function} callback - (newValue, oldValue) => void
 * @returns {Function} unsubscribe function
 */
export function subscribe(selector, callback) {
    if (!_listeners.has(selector)) _listeners.set(selector, new Set());
    _listeners.get(selector).add(callback);

    return () => {
        const set = _listeners.get(selector);
        if (set) {
            set.delete(callback);
            if (set.size === 0) _listeners.delete(selector);
        }
    };
}

/**
 * Subscribe to ANY state change.
 * @param {Function} callback - (prop, newValue, oldValue) => void
 * @returns {Function} unsubscribe
 */
export function subscribeAll(callback) {
    return subscribe('*', callback);
}

function _notifySubscribers(prop, newValue, oldValue) {
    // Notify specific subscribers
    const propListeners = _listeners.get(prop);
    if (propListeners) {
        for (const cb of propListeners) {
            try { cb(newValue, oldValue); } catch (e) { console.error(`[Store] Subscriber error for ${prop}:`, e); }
        }
    }

    // Notify wildcard subscribers
    const allListeners = _listeners.get('*');
    if (allListeners) {
        for (const cb of allListeners) {
            try { cb(prop, newValue, oldValue); } catch (e) { console.error('[Store] Subscriber error:', e); }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// BATCHING (prevent multiple re-renders)
// ═══════════════════════════════════════════════════════════════════

/**
 * Batch multiple state changes — subscribers notified once at end.
 * @param {Function} fn - Function that makes state changes
 */
export function batch(fn) {
    _batchDepth++;
    try {
        fn();
    } finally {
        _batchDepth--;
        if (_batchDepth === 0) {
            // Flush pending notifications
            for (const prop of _pendingNotifications) {
                _notifySubscribers(prop, undefined, undefined);
            }
            _pendingNotifications.clear();
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════

const _actions = new Map();

/**
 * Register a named action.
 * @param {string} name - Action name
 * @param {Function} handler - (store, payload) => void
 */
export function registerAction(name, handler) {
    _actions.set(name, handler);
}

/**
 * Dispatch a named action.
 * @param {string} name - Action name
 * @param {*} payload - Action payload
 * @returns {*} Action result
 */
export function dispatch(store, name, payload) {
    const handler = _actions.get(name);
    if (!handler) {
        console.warn(`[Store] Unknown action: ${name}`);
        return undefined;
    }

    const entry = {
        action: name,
        payload: typeof payload === 'object' ? JSON.stringify(payload).slice(0, 100) : payload,
        timestamp: new Date().toISOString(),
    };

    try {
        const result = handler(store, payload);
        entry.status = 'ok';
        return result;
    } catch (err) {
        entry.status = 'error';
        entry.error = err.message;
        throw err;
    } finally {
        _actionLog.push(entry);
        if (_actionLog.length > MAX_ACTION_LOG) _actionLog.shift();
    }
}

// ═══════════════════════════════════════════════════════════════════
// MEMOIZED SELECTORS
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a memoized selector — only recomputes when dependencies change.
 * @param {Function} selector - (state) => derivedValue
 * @returns {Function} (state) => cachedValue
 */
export function createSelector(selector) {
    let lastArgs = null;
    let lastResult = null;

    return (state) => {
        const args = JSON.stringify(state);
        if (args === lastArgs) return lastResult;
        lastArgs = args;
        lastResult = selector(state);
        return lastResult;
    };
}

// ═══════════════════════════════════════════════════════════════════
// FRONTEND EVENT BUS
// ═══════════════════════════════════════════════════════════════════

/**
 * Emit a frontend event.
 * @param {string} event - Event name
 * @param {*} data - Event data
 */
export function emit(event, data) {
    const handlers = _eventHandlers.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
        try { handler(data); } catch (e) { console.error(`[Store] Event handler error for ${event}:`, e); }
    }
}

/**
 * Listen to a frontend event.
 * @param {string} event - Event name
 * @param {Function} handler - (data) => void
 * @returns {Function} unsubscribe
 */
export function on(event, handler) {
    if (!_eventHandlers.has(event)) _eventHandlers.set(event, new Set());
    _eventHandlers.get(event).add(handler);
    return () => {
        const set = _eventHandlers.get(event);
        if (set) {
            set.delete(handler);
            if (set.size === 0) _eventHandlers.delete(event);
        }
    };
}

// ═══════════════════════════════════════════════════════════════════
// DEVTOOLS
// ═══════════════════════════════════════════════════════════════════

export function getActionLog() {
    return [..._actionLog];
}

export function getSubscriberCount() {
    let total = 0;
    for (const set of _listeners.values()) total += set.size;
    return { total, selectors: _listeners.size };
}

// Expose to DevTools
if (typeof window !== 'undefined') {
    window.__TC_STORE__ = {
        getActionLog,
        getSubscriberCount,
        getListeners: () => [..._listeners.keys()],
        getEventHandlers: () => [..._eventHandlers.keys()],
    };
}
