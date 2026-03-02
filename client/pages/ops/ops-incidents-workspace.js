/**
 * Incidents Workspace — Ops Domain
 * Tabs: Open Cases · History
 *
 * PERF: Prefetches key APIs in parallel on workspace entry.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { renderPage as renderOpenCases } from './incidents-open.js';
import { renderPage as renderHistory } from './incidents-history.js';
import { renderPage as renderNotifications } from './notifications.js';
import { renderPage as renderActivityLog } from './activity-log.js';

// Prefetch Incidents APIs in parallel
if (!window._opsIncCache) window._opsIncCache = {};
const cache = window._opsIncCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;
    window._opsIncReady = Promise.allSettled([
        API.get('/ops/incidents?status=open&limit=50').catch(() => ({ incidents: [] })),
        API.get('/ops/incidents?status=closed&limit=50').catch(() => ({ incidents: [] })),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.openCases = v[0];
        cache.closedCases = v[1];
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[Ops Incidents] All 2 APIs prefetched ✓');
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
            { id: 'history', label: 'History', icon: icon('scroll', 14), render: renderHistory },
            { id: 'notifications', label: 'Notifications', icon: icon('bell', 14), render: renderNotifications },
            { id: 'activity', label: 'Activity Log', icon: icon('clock', 14), render: renderActivityLog },
        ],
    });
}
