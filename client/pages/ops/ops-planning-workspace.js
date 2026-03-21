/**
 * Planning & Procurement Workspace — Ops Domain
 * SCOR: Plan + Source
 * Tabs: Demand Planning · Purchase Orders · Supplier Scoring
 *
 * PERF v2: Lazy-load tabs 2-3, phased API loading.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
// Tab 1: eager
import { renderPage as renderDemandPlanning } from '../scm/demand-planning.js';

// Tabs 2-3: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

// ── Phased API Loading ──────────────────────────────────────
if (!window._opsPlanCache) window._opsPlanCache = {};
const cache = window._opsPlanCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;

    // Phase 1: Tab 1 (Demand Planning) API (immediate)
    const phase1 = API.get('/ops/data/demand-forecast').catch(() => ({ forecasts: [] })).then(data => {
        cache.forecasts = data;
    });

    // Phase 2: Background APIs (delayed 500ms)
    const phase2 = new Promise(resolve => {
        setTimeout(() => {
            Promise.allSettled([
                API.get('/ops/data/purchase-orders').catch(() => ({ orders: [] })),
                API.get('/ops/data/supplier-scoring').catch(() => ({ suppliers: [] })),
            ]).then(results => {
                const v = results.map(r => r.value);
                cache.orders = v[0];
                cache.suppliers = v[1];
                resolve();
            });
        }, 500);
    });

    window._opsPlanReady = Promise.all([phase1, phase2]).then(() => {
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[Ops Planning] Phase 1 (1) + Phase 2 (2) APIs loaded ✓');
        if (typeof window.render === 'function') window.render();
        return cache;
    });
} else if (cache._loadedAt) {
    window._opsPlanReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'ops-planning',
        title: 'Planning & Procurement',
        subtitle: 'Demand · Purchase Orders · Supplier Scoring',
        icon: icon('clipboard', 24),
        tabs: [
            { id: 'demand', label: 'Demand Planning', icon: icon('workflow', 14), render: renderDemandPlanning },
            { id: 'procurement', label: 'Purchase Orders', icon: icon('clipboard', 14), render: lazy(() => import('../scm/procurement.js')) },
            { id: 'suppliers', label: 'Supplier Scoring', icon: icon('users', 14), render: lazy(() => import('../scm/supplier-scoring.js')) },
        ],
    });
}
