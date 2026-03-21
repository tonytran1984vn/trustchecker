/**
 * Logistics & Tracking Workspace — Ops Domain
 * SCOR: Deliver
 * Tabs: Shipment Tracking · Reports · Activity Log
 *
 * PERF v2: Lazy-load tabs 2-3, API loaded immediately (only 1 API).
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
// Tab 1: eager
import { renderPage as renderShipmentTracking } from '../scm/shipment-tracking.js';

// Tabs 2-3: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

// ── API Loading (single API, no phasing needed) ─────────────
if (!window._opsLogCache) window._opsLogCache = {};
const cache = window._opsLogCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;
    window._opsLogReady = API.get('/scm/shipments?limit=50').catch(() => ({ shipments: [] })).then(data => {
        cache.shipments = data;
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[Ops Logistics] API loaded ✓');
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
            { id: 'reports', label: 'Reports', icon: icon('scroll', 14), render: lazy(() => import('./reports.js')) },
            { id: 'activity', label: 'Activity Log', icon: icon('clock', 14), render: lazy(() => import('./activity-log.js')) },
        ],
    });
}
