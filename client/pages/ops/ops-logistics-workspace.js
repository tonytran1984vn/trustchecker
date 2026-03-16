/**
 * Logistics & Tracking Workspace — Ops Domain
 * SCOR: Deliver
 * Tabs: Shipment Tracking · Reports · Activity Log
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { renderPage as renderShipmentTracking } from '../scm/shipment-tracking.js';
import { renderPage as renderReports } from './reports.js';
import { renderPage as renderActivityLog } from './activity-log.js';

// Prefetch Logistics APIs
if (!window._opsLogCache) window._opsLogCache = {};
const cache = window._opsLogCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;
    window._opsLogReady = Promise.allSettled([
        API.get('/scm/shipments?limit=50').catch(() => ({ shipments: [] })),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.shipments = v[0];
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[Ops Logistics] API prefetched ✓');
        if (typeof window.render === 'function') window.render();
        return cache;
    });
} else if (cache._loadedAt) {
    window._opsLogReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'ops-logistics',
        title: 'Logistics & Tracking',
        subtitle: 'Shipments · Reports · Activity Log',
        icon: icon('truck', 24),
        tabs: [
            { id: 'tracking', label: 'Shipment Tracking', icon: icon('globe', 14), render: renderShipmentTracking },
            { id: 'reports', label: 'Reports', icon: icon('scroll', 14), render: renderReports },
            { id: 'activity', label: 'Activity Log', icon: icon('clock', 14), render: renderActivityLog },
        ],
    });
}
