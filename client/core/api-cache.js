/**
 * TrustChecker v9.5 — API Cache Layer
 * 
 * Stale-while-revalidate (SWR) caching for the API client.
 * Returns cached data instantly, fetches fresh data in background.
 * LRU eviction, TTL-based invalidation, manual invalidation after mutations.
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_TTL = 60_000; // 60 seconds

/** Per-endpoint TTL overrides (ms) */
const ENDPOINT_TTL = {
    '/qr/dashboard-stats': 30_000,   // dashboard refreshes often
    '/products': 60_000,
    '/qr/scan-history': 30_000,
    '/qr/fraud-alerts': 30_000,
    '/scm/dashboard': 45_000,
    '/billing/plan': 120_000,
    '/billing/usage': 120_000,
    '/billing/invoices': 300_000,  // rarely changes
    '/reports/templates': 300_000,
    '/trust/dashboard': 60_000,
    '/sustainability/stats': 120_000,
    '/integrations': 120_000,
    '/integrations/schema': 600_000,  // schema almost never changes
};

const MAX_ENTRIES = 100;

// ═══════════════════════════════════════════════════════════════════
// CACHE STORE (LRU with TTL)
// ═══════════════════════════════════════════════════════════════════

class CacheEntry {
    constructor(data, ttl) {
        this.data = data;
        this.ttl = ttl;
        this.createdAt = Date.now();
        this.lastAccess = Date.now();
    }

    isStale() {
        return Date.now() - this.createdAt > this.ttl;
    }

    isExpired() {
        // Hard expire at 3x TTL — don't serve data older than this
        return Date.now() - this.createdAt > this.ttl * 3;
    }

    touch() {
        this.lastAccess = Date.now();
    }
}

const _cache = new Map();  // key → CacheEntry
let _stats = { hits: 0, misses: 0, staleHits: 0, evictions: 0 };

// ═══════════════════════════════════════════════════════════════════
// CACHE KEY GENERATION
// ═══════════════════════════════════════════════════════════════════

function generateKey(method, path, params) {
    let key = `${method}:${path}`;
    if (params && Object.keys(params).length > 0) {
        const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
        key += `?${sorted}`;
    }
    return key;
}

// ═══════════════════════════════════════════════════════════════════
// LRU EVICTION
// ═══════════════════════════════════════════════════════════════════

function evictIfNeeded() {
    if (_cache.size <= MAX_ENTRIES) return;

    // Find oldest by lastAccess
    let oldestKey = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of _cache) {
        if (entry.lastAccess < oldestAccess) {
            oldestAccess = entry.lastAccess;
            oldestKey = key;
        }
    }

    if (oldestKey) {
        _cache.delete(oldestKey);
        _stats.evictions++;
    }
}

// ═══════════════════════════════════════════════════════════════════
// CACHE API
// ═══════════════════════════════════════════════════════════════════

/**
 * Get cached data for a GET request.
 * Returns { data, isStale } or null if not cached.
 */
export function getCached(path) {
    const key = generateKey('GET', path);
    const entry = _cache.get(key);

    if (!entry) {
        _stats.misses++;
        return null;
    }

    // Hard expired — remove
    if (entry.isExpired()) {
        _cache.delete(key);
        _stats.misses++;
        return null;
    }

    entry.touch();

    if (entry.isStale()) {
        _stats.staleHits++;
        return { data: entry.data, isStale: true };
    }

    _stats.hits++;
    return { data: entry.data, isStale: false };
}

/**
 * Store data in cache.
 */
export function setCache(path, data, customTtl) {
    const key = generateKey('GET', path);
    const ttl = customTtl || ENDPOINT_TTL[path] || DEFAULT_TTL;

    _cache.set(key, new CacheEntry(data, ttl));
    evictIfNeeded();
}

/**
 * Invalidate cache entries matching a path prefix.
 * Call after mutations (POST/PUT/DELETE).
 * 
 * @param {string} pathPrefix — e.g. '/products' invalidates '/products', '/products?page=2', etc.
 */
export function invalidate(pathPrefix) {
    const prefix = `GET:${pathPrefix}`;
    for (const key of _cache.keys()) {
        if (key.startsWith(prefix)) {
            _cache.delete(key);
        }
    }
}

/**
 * Invalidate ALL cache entries.
 */
export function invalidateAll() {
    _cache.clear();
}

// ═══════════════════════════════════════════════════════════════════
// SWR FETCH WRAPPER
// ═══════════════════════════════════════════════════════════════════

/**
 * Fetch with stale-while-revalidate.
 * 
 * 1. If cached and fresh → return immediately (no network call)
 * 2. If cached and stale → return stale data, revalidate in background
 * 3. If not cached → fetch, cache, return
 * 
 * @param {Function} fetchFn — async function that performs the actual fetch
 * @param {string} path — API path (used as cache key)
 * @param {Object} options — { ttl, forceRefresh }
 * @returns {Promise<*>} response data
 */
export async function swrFetch(fetchFn, path, options = {}) {
    // Force refresh bypasses cache entirely
    if (options.forceRefresh) {
        const data = await fetchFn();
        setCache(path, data, options.ttl);
        return data;
    }

    const cached = getCached(path);

    // Cache hit — fresh
    if (cached && !cached.isStale) {
        return cached.data;
    }

    // Cache hit — stale: return immediately, revalidate async
    if (cached && cached.isStale) {
        // Background revalidation (fire-and-forget)
        fetchFn()
            .then(freshData => setCache(path, freshData, options.ttl))
            .catch(err => console.warn(`[api-cache] Background revalidation failed for ${path}:`, err));

        return cached.data;
    }

    // Cache miss — fetch synchronously
    const data = await fetchFn();
    setCache(path, data, options.ttl);
    return data;
}

// ═══════════════════════════════════════════════════════════════════
// MUTATION HELPERS
// ═══════════════════════════════════════════════════════════════════

/** Invalidation map: mutation path → cache paths to invalidate */
const INVALIDATION_MAP = {
    '/products': ['/products', '/qr/dashboard-stats'],
    '/qr': ['/qr/scan-history', '/qr/fraud-alerts', '/qr/dashboard-stats'],
    '/scm': ['/scm/dashboard', '/scm/inventory', '/scm/shipments'],
    '/billing': ['/billing/plan', '/billing/usage', '/billing/invoices'],
    '/evidence': ['/evidence'],
    '/kyc': ['/kyc/stats', '/kyc/businesses'],
    '/nft': ['/nft'],
    '/branding': ['/branding'],
};

/**
 * Invalidate relevant caches after a mutation.
 * Detects which caches to clear based on the mutation path.
 */
export function invalidateAfterMutation(mutationPath) {
    for (const [prefix, cachePaths] of Object.entries(INVALIDATION_MAP)) {
        if (mutationPath.startsWith(prefix)) {
            cachePaths.forEach(p => invalidate(p));
            return;
        }
    }
    // Fallback: invalidate any cache that starts with the same root
    const root = '/' + mutationPath.split('/').filter(Boolean)[0];
    invalidate(root);
}

// ═══════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════

export function getCacheStats() {
    const total = _stats.hits + _stats.misses + _stats.staleHits;
    return {
        entries: _cache.size,
        maxEntries: MAX_ENTRIES,
        hits: _stats.hits,
        misses: _stats.misses,
        staleHits: _stats.staleHits,
        evictions: _stats.evictions,
        hitRate: total > 0 ? Math.round((_stats.hits / total) * 100) : 0,
        swrRate: total > 0 ? Math.round(((_stats.hits + _stats.staleHits) / total) * 100) : 0,
    };
}

export function resetCacheStats() {
    _stats = { hits: 0, misses: 0, staleHits: 0, evictions: 0 };
}

// ═══════════════════════════════════════════════════════════════════
// DEVTOOLS
// ═══════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
    window.__TC_CACHE__ = {
        getCacheStats,
        resetCacheStats,
        invalidate,
        invalidateAll,
        getEntries: () => {
            const entries = {};
            for (const [key, entry] of _cache) {
                entries[key] = {
                    age: Math.round((Date.now() - entry.createdAt) / 1000) + 's',
                    stale: entry.isStale(),
                    ttl: entry.ttl / 1000 + 's',
                };
            }
            return entries;
        },
    };
}
