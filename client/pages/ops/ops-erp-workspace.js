/**
 * ERP & Supply Workspace — Ops Domain
 * Tabs: Purchase Orders · Supplier Scoring · Demand Planning · Warehouse · Inventory · Quality Control
 *
 * PERF v2: Lazy-load tabs 2-6, phased API loading.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
// Tab 1: eager
import { renderPage as renderProcurement } from '../scm/procurement.js';

// Tabs 2-6: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

// ── Phased API Loading ──────────────────────────────────────
if (!window._opsErpCache) window._opsErpCache = {};
const cache = window._opsErpCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;

    // Phase 1: Tab 1 API (immediate)
    const phase1 = API.get('/scm/inventory').catch(() => ({})).then(data => {
        cache.inventory = data;
    });

    // Phase 2: Background APIs (delayed 500ms)
    const phase2 = new Promise(resolve => {
        setTimeout(() => {
            Promise.allSettled([
                API.get('/scm/inventory/forecast').catch(() => ({})),
                API.get('/scm/partners').catch(() => ({ partners: [] })),
            ]).then(results => {
                const v = results.map(r => r.value);
                cache.forecast = v[0];
                cache.partners = v[1];
                resolve();
            });
        }, 500);
    });

    window._opsErpReady = Promise.all([phase1, phase2]).then(() => {
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[Ops ERP] Phase 1 (1) + Phase 2 (2) APIs loaded ✓');
        return cache;
    });
} else if (cache._loadedAt) {
    window._opsErpReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'ops-erp',
        title: 'ERP & Supply',
        subtitle: 'Procurement · Suppliers · Demand · Warehouse · Inventory · QC',
        icon: icon('network', 24),
        tabs: [
            { id: 'procurement', label: 'Purchase Orders', icon: icon('clipboard', 14), render: renderProcurement },
            { id: 'suppliers', label: 'Supplier Scoring', icon: icon('users', 14), render: lazy(() => import('../scm/supplier-scoring.js')) },
            { id: 'demand', label: 'Demand Planning', icon: icon('workflow', 14), render: lazy(() => import('../scm/demand-planning.js')) },
            { id: 'warehouse', label: 'Warehouse', icon: icon('building', 14), render: lazy(() => import('../scm/warehouse.js')) },
            { id: 'inventory', label: 'Inventory', icon: icon('products', 14), render: lazy(() => import('../scm/inventory.js')) },
            { id: 'quality', label: 'Quality Control', icon: icon('check', 14), render: lazy(() => import('../scm/quality-control.js')) },
        ],
    });
}
