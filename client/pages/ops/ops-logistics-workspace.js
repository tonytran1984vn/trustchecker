/**
 * Logistics Workspace — Ops Domain
 * Tabs: Transfer Orders · Receiving · Mismatch · Shipment Tracking
 *
 * PERF: Prefetches key APIs in parallel on workspace entry.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { renderPage as renderTransfers } from './transfer-orders.js';
import { renderPage as renderReceiving } from './receiving.js';
import { renderPage as renderMismatch } from './mismatch.js';
import { renderPage as renderShipmentTracking } from '../scm/shipment-tracking.js';

// Prefetch Logistics APIs in parallel
if (!window._opsLogCache) window._opsLogCache = {};
const cache = window._opsLogCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;
    window._opsLogReady = Promise.allSettled([
        API.get('/scm/shipments?limit=50').catch(() => ({ shipments: [] })),
        API.get('/scm/batches?limit=50').catch(() => ({ batches: [] })),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.shipments = v[0];
        cache.batches = v[1];
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[Ops Logistics] All 2 APIs prefetched ✓');
        return cache;
    });
} else if (cache._loadedAt) {
    window._opsLogReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'ops-logistics',
        title: 'Logistics',
        subtitle: 'Transfers · Receiving · Mismatch · Shipment tracking',
        icon: icon('truck', 24),
        tabs: [
            { id: 'transfers', label: 'Transfer Orders', icon: icon('network', 14), render: renderTransfers },
            { id: 'receiving', label: 'Receiving', icon: icon('check', 14), render: renderReceiving },
            { id: 'mismatch', label: 'Mismatch', icon: icon('alert', 14), render: renderMismatch },
            { id: 'tracking', label: 'Shipment Tracking', icon: icon('globe', 14), render: renderShipmentTracking },
        ],
    });
}
