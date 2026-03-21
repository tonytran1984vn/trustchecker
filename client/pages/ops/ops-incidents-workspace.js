/**
 * Incidents Workspace — Ops Domain
 * Tabs: Open Cases · History · Notifications · Activity Log
 *
 * PERF v2: Lazy-load tabs 2-4, phased API loading.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
// Tab 1: eager
import { renderPage as renderOpenCases } from './incidents-open.js';

// Tabs 2-4: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

// ── Phased API Loading ──────────────────────────────────────
if (!window._opsIncCache) window._opsIncCache = {};
const cache = window._opsIncCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;

    // Phase 1: Tab 1 (Open Cases) API (immediate)
    const phase1 = API.get('/ops/incidents?status=open&limit=50').catch(() => ({ incidents: [] })).then(data => {
        cache.openCases = data;
    });

    // Phase 2: Background API (delayed 500ms)
    const phase2 = new Promise(resolve => {
        setTimeout(() => {
            API.get('/ops/incidents?status=closed&limit=50').catch(() => ({ incidents: [] })).then(data => {
                cache.closedCases = data;
                resolve();
            });
        }, 500);
    });

    window._opsIncReady = Promise.all([phase1, phase2]).then(() => {
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[Ops Incidents] Phase 1 (1) + Phase 2 (1) APIs loaded ✓');
        return cache;
    });
} else if (cache._loadedAt) {
    window._opsIncReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'ops-incidents',
        title: 'Incidents',
        subtitle: 'Open cases · History',
        icon: icon('alertTriangle', 24),
        tabs: [
            { id: 'open', label: 'Open Cases', icon: icon('alertTriangle', 14), render: renderOpenCases },
            { id: 'history', label: 'History', icon: icon('scroll', 14), render: lazy(() => import('./incidents-history.js')) },
            { id: 'notifications', label: 'Notifications', icon: icon('bell', 14), render: lazy(() => import('./notifications.js')) },
            { id: 'activity', label: 'Activity Log', icon: icon('clock', 14), render: lazy(() => import('./activity-log.js')) },
        ],
    });
}
