/**
 * Warehouse & Inventory Workspace — Ops Domain
 * SCOR: Store
 * Tabs: Warehouse · Inventory · Transfer Orders · Receiving · Mismatch
 *
 * PERF v2: Lazy-load tabs 2-5, phased API loading.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
// Tab 1: eager
import { renderPage as renderWarehouse } from '../scm/warehouse.js';

// Tabs 2-5: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

// ── Phased API Loading ──────────────────────────────────────
if (!window._opsWhCache) window._opsWhCache = {};
const cache = window._opsWhCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;

    // Phase 1: Tab 1 (Warehouse) API (immediate)
    const phase1 = API.get('/ops/data/warehouses').catch(() => ({ warehouses: [] })).then(data => {
        cache.warehouses = data;
    });

    // Phase 2: Background APIs (delayed 500ms)
    const phase2 = new Promise(resolve => {
        setTimeout(() => {
            Promise.allSettled([
                API.get('/scm/inventory').catch(() => ({})),
                API.get('/scm/shipments?limit=50').catch(() => ({ shipments: [] })),
            ]).then(results => {
                const v = results.map(r => r.value);
                cache.inventory = v[0];
                cache.shipments = v[1];
                resolve();
            });
        }, 500);
    });

    window._opsWhReady = Promise.all([phase1, phase2]).then(() => {
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[Ops Warehouse] Phase 1 (1) + Phase 2 (2) APIs loaded ✓');
        if (typeof window.render === 'function') window.render();
        return cache;
    });
} else if (cache._loadedAt) {
    window._opsWhReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'ops-warehouse',
        title: 'Warehouse & Inventory',
        subtitle: 'Storage · Stock levels · Transfers · Receiving',
        icon: icon('building', 24),
        tabs: [
            { id: 'warehouse', label: 'Warehouse', icon: icon('building', 14), render: renderWarehouse },
            { id: 'inventory', label: 'Inventory', icon: icon('products', 14), render: lazy(() => import('../scm/inventory.js')) },
            { id: 'transfers', label: 'Transfer Orders', icon: icon('network', 14), render: lazy(() => import('./transfer-orders.js')) },
            { id: 'receiving', label: 'Receiving', icon: icon('check', 14), render: lazy(() => import('./receiving.js')) },
            { id: 'mismatch', label: 'Mismatch', icon: icon('alert', 14), render: lazy(() => import('./mismatch.js')) },
        ],
    });
}
