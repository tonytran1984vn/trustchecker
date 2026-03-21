/**
 * Production & QC Workspace — Ops Domain
 * SCOR: Make + Quality
 * Tabs: Dashboard · Create Batch · Batch List · Split/Merge · Quality Control · Recall
 *
 * PERF v2: Lazy-load tabs 2-6, phased API loading.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
// Tab 1: eager
import { renderPage as renderDashboard } from './dashboard.js';

// Tabs 2-6: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

// ── Phased API Loading ──────────────────────────────────────
if (!window._opsProdCache) window._opsProdCache = {};
const cache = window._opsProdCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;

    // Phase 1: Tab 1 (Dashboard) API (immediate)
    const phase1 = API.get('/scm/batches?limit=100').catch(() => ({ batches: [] })).then(data => {
        cache.batches = data;
    });

    // Phase 2: Background APIs (delayed 500ms)
    const phase2 = new Promise(resolve => {
        setTimeout(() => {
            Promise.allSettled([
                API.get('/products?limit=50').catch(() => ({ products: [] })),
                API.get('/scm/events?limit=100').catch(() => ({ events: [] })),
            ]).then(results => {
                const v = results.map(r => r.value);
                cache.products = v[0];
                cache.events = v[1];
                resolve();
            });
        }, 500);
    });

    window._opsProdReady = Promise.all([phase1, phase2]).then(() => {
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[Ops Production] Phase 1 (1) + Phase 2 (2) APIs loaded ✓');
        if (typeof window.render === 'function') window.render();
        return cache;
    });
} else if (cache._loadedAt) {
    window._opsProdReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'ops-production',
        title: 'Production & QC',
        subtitle: 'Dashboard · Batch lifecycle · Quality Control · Recall',
        icon: icon('factory', 24),
        tabs: [
            { id: 'dashboard', label: 'Dashboard', icon: icon('dashboard', 14), render: renderDashboard },
            { id: 'create', label: 'Create Batch', icon: icon('plus', 14), render: lazy(() => import('./batch-create.js')) },
            { id: 'batches', label: 'Batch List', icon: icon('products', 14), render: lazy(() => import('./batch-list.js')) },
            { id: 'split', label: 'Split / Merge', icon: icon('workflow', 14), render: lazy(() => import('./batch-split.js')) },
            { id: 'quality', label: 'Quality Control', icon: icon('check', 14), render: lazy(() => import('../scm/quality-control.js')) },
            { id: 'recall', label: 'Recall', icon: icon('alertTriangle', 14), render: lazy(() => import('./batch-recall.js')) },
        ],
    });
}
