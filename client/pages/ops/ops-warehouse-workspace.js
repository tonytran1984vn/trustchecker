/**
 * Warehouse & Inventory Workspace — Ops Domain
 * SCOR: Store
 * Tabs: Warehouse · Inventory · Transfer Orders · Receiving · Mismatch
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { renderPage as renderWarehouse } from '../scm/warehouse.js';
import { renderPage as renderInventory } from '../scm/inventory.js';
import { renderPage as renderTransfers } from './transfer-orders.js';
import { renderPage as renderReceiving } from './receiving.js';
import { renderPage as renderMismatch } from './mismatch.js';

// Prefetch Warehouse APIs
if (!window._opsWhCache) window._opsWhCache = {};
const cache = window._opsWhCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;
    window._opsWhReady = Promise.allSettled([
        API.get('/ops/data/warehouses').catch(() => ({ warehouses: [] })),
        API.get('/scm/inventory').catch(() => ({})),
        API.get('/scm/shipments?limit=50').catch(() => ({ shipments: [] })),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.warehouses = v[0];
        cache.inventory = v[1];
        cache.shipments = v[2];
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[Ops Warehouse] All 3 APIs prefetched ✓');
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
            { id: 'inventory', label: 'Inventory', icon: icon('products', 14), render: renderInventory },
            { id: 'transfers', label: 'Transfer Orders', icon: icon('network', 14), render: renderTransfers },
            { id: 'receiving', label: 'Receiving', icon: icon('check', 14), render: renderReceiving },
            { id: 'mismatch', label: 'Mismatch', icon: icon('alert', 14), render: renderMismatch },
        ],
    });
}
