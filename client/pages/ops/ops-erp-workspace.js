/**
 * ERP & Supply Workspace — Ops Domain
 * Tabs: Purchase Orders · Supplier Scoring · Demand Planning · Warehouse · Inventory · Quality Control
 *
 * PERF: Prefetches key APIs in parallel on workspace entry.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { renderPage as renderProcurement } from '../scm/procurement.js';
import { renderPage as renderSupplierScoring } from '../scm/supplier-scoring.js';
import { renderPage as renderDemandPlanning } from '../scm/demand-planning.js';
import { renderPage as renderWarehouse } from '../scm/warehouse.js';
import { renderPage as renderInventory } from '../scm/inventory.js';
import { renderPage as renderQualityControl } from '../scm/quality-control.js';

// Prefetch ERP/Supply APIs in parallel
if (!window._opsErpCache) window._opsErpCache = {};
const cache = window._opsErpCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;
    window._opsErpReady = Promise.allSettled([
        API.get('/scm/inventory').catch(() => ({})),
        API.get('/scm/inventory/forecast').catch(() => ({})),
        API.get('/scm/partners').catch(() => ({ partners: [] })),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.inventory = v[0];
        cache.forecast = v[1];
        cache.partners = v[2];
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[Ops ERP] All 3 APIs prefetched ✓');
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
            { id: 'suppliers', label: 'Supplier Scoring', icon: icon('users', 14), render: renderSupplierScoring },
            { id: 'demand', label: 'Demand Planning', icon: icon('workflow', 14), render: renderDemandPlanning },
            { id: 'warehouse', label: 'Warehouse', icon: icon('building', 14), render: renderWarehouse },
            { id: 'inventory', label: 'Inventory', icon: icon('products', 14), render: renderInventory },
            { id: 'quality', label: 'Quality Control', icon: icon('check', 14), render: renderQualityControl },
        ],
    });
}
