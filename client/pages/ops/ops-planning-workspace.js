/**
 * Planning & Procurement Workspace — Ops Domain
 * SCOR: Plan + Source
 * Tabs: Demand Planning · Purchase Orders · Supplier Scoring
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { renderPage as renderDemandPlanning } from '../scm/demand-planning.js';
import { renderPage as renderProcurement } from '../scm/procurement.js';
import { renderPage as renderSupplierScoring } from '../scm/supplier-scoring.js';

// Prefetch Planning APIs
if (!window._opsPlanCache) window._opsPlanCache = {};
const cache = window._opsPlanCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;
    window._opsPlanReady = Promise.allSettled([
        API.get('/ops/data/demand-forecast').catch(() => ({ forecasts: [] })),
        API.get('/ops/data/purchase-orders').catch(() => ({ orders: [] })),
        API.get('/ops/data/supplier-scoring').catch(() => ({ suppliers: [] })),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.forecasts = v[0];
        cache.orders = v[1];
        cache.suppliers = v[2];
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[Ops Planning] All 3 APIs prefetched ✓');
        // Trigger re-render so tabs display the fetched data
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
            { id: 'procurement', label: 'Purchase Orders', icon: icon('clipboard', 14), render: renderProcurement },
            { id: 'suppliers', label: 'Supplier Scoring', icon: icon('users', 14), render: renderSupplierScoring },
        ],
    });
}
