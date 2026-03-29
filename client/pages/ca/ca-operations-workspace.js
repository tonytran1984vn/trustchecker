/**
 * Operations Workspace — CA Domain (Internal Manufacturing & QA)
 * Tabs: Products | Batches | Traceability | Verification Logs
 *
 * PERF v2: Lazy-load tabs 2-4, phased API loading, pruned external Supply Chain/Carbon.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

// Tab 1: eager
import { renderPage as renderProducts } from '../products.js';

// Tabs 2-4: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

// ── Phased API Loading ──────────────────────────────────────
if (!window._caOpsCache) window._caOpsCache = {};
const cache = window._caOpsCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;

    // Phase 1: Tab 1 (Products) API (immediate)
    const phase1 = API.get('/products').catch(() => ({ products: [] })).then(data => {
        cache.products = data;
    });

    // Phase 2: Background APIs (delayed 500ms) - Trimmed payload for Internal Ops
    const phase2 = new Promise(resolve => {
        setTimeout(() => {
            Promise.allSettled([
                API.get('/scm/batches').catch(() => ({ batches: [] })),
                API.get('/scm/events?limit=200').catch(() => ({ events: [] })), // Lowered limit for internal QA logs
            ]).then(results => {
                const v = results.map(r => r.value);
                cache.batches = v[0];
                cache.events = v[1];
                resolve();
            });
        }, 500);
    });

    window._caOpsReady = Promise.all([phase1, phase2]).then(() => {
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[CA Ops] Phase 1 (1) + Phase 2 (2) APIs loaded ✓');
        return cache;
    });
} else if (cache._loadedAt) {
    window._caOpsReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'ca-operations',
        title: 'Internal Operations',
        subtitle: 'Products · Manufacturing Batches · Lineage · Verification QA',
        icon: icon('products', 24),
        tabs: [
            { id: 'products', label: 'Company Products', icon: icon('box', 14), render: renderProducts },
            { id: 'batches', label: 'Production Batches', icon: icon('clipboard', 14), render: lazy(() => import('./batches.js')) },
            { id: 'traceability', label: 'Internal Traceability', icon: icon('search', 14), render: lazy(() => import('./traceability.js')) },
            { id: 'verification', label: 'Verification Logs', icon: icon('check', 14), render: lazy(() => import('../scans.js')) },
        ],
    });
}

