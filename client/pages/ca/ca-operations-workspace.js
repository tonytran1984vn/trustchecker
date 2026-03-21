/**
 * Operations Workspace — CA Domain (Supply Chain & Production)
 * Tabs: Products | Batches | Supply Network | Traceability | Verification | Carbon
 *
 * PERF v2: Lazy-load tabs 2-6, phased API loading.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
// Tab 1: eager
import { renderPage as renderProducts } from '../products.js';

// Tabs 2-6: lazy
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

    // Phase 2: Background APIs (delayed 500ms)
    const phase2 = new Promise(resolve => {
        setTimeout(() => {
            Promise.allSettled([
                API.get('/scm/batches').catch(() => ({ batches: [] })),
                API.get('/scm/supply/routes').catch(() => []),
                API.get('/scm/events?limit=500').catch(() => ({ events: [] })),
            ]).then(results => {
                const v = results.map(r => r.value);
                cache.batches = v[0];
                cache.routes = v[1];
                cache.events = v[2];
                resolve();
            });
        }, 500);
    });

    window._caOpsReady = Promise.all([phase1, phase2]).then(() => {
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[CA Ops] Phase 1 (1) + Phase 2 (3) APIs loaded ✓');
        return cache;
    });
} else if (cache._loadedAt) {
    window._caOpsReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'ca-operations',
        title: 'Operations',
        subtitle: 'Products · Supply chain · Traceability · Carbon',
        icon: icon('products', 24),
        tabs: [
            { id: 'products', label: 'Products', icon: icon('products', 14), render: renderProducts },
            { id: 'batches', label: 'Batches', icon: icon('clipboard', 14), render: lazy(() => import('./batches.js')) },
            { id: 'supply', label: 'Supply Network', icon: icon('factory', 14), render: lazy(() => import('./nodes.js')) },
            { id: 'traceability', label: 'Traceability', icon: icon('search', 14), render: lazy(() => import('./traceability.js')) },
            { id: 'verification', label: 'Verification', icon: icon('check', 14), render: lazy(() => import('../scans.js')) },
            { id: 'carbon', label: 'Carbon', icon: icon('globe', 14), render: lazy(() => import('../scm/carbon.js')) },
        ],
    });
}
