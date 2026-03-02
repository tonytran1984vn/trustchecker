/**
 * Monitor & Incidents Workspace — Ops Domain
 * SCOR: Monitor + Respond
 * Tabs: Scan Monitor · Duplicate Alerts · Geo Alerts · Open Cases · History · Notifications
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { renderPage as renderScanMonitor } from './scan-monitor.js';
import { renderPage as renderDuplicateAlerts } from './duplicate-alerts.js';
import { renderPage as renderGeoAlerts } from './geo-alerts.js';
import { renderPage as renderOpenCases } from './incidents-open.js';
import { renderPage as renderHistory } from './incidents-history.js';
import { renderPage as renderNotifications } from './notifications.js';

// Prefetch Monitor APIs in parallel
if (!window._opsMonCache) window._opsMonCache = {};
const cache = window._opsMonCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;
    window._opsMonReady = Promise.allSettled([
        API.get('/qr/scan-history?limit=100').catch(() => ({ scans: [] })),
        API.get('/scm/classify/duplicates?limit=50').catch(() => ({ classifications: [] })),
        API.get('/ops/incidents?status=open&limit=50').catch(() => ({ incidents: [] })),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.scanHistory = v[0];
        cache.duplicates = v[1];
        cache.openCases = v[2];
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[Ops Monitor] All 3 APIs prefetched ✓');
        return cache;
    });
} else if (cache._loadedAt) {
    window._opsMonReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'ops-monitor',
        title: 'Monitor & Incidents',
        subtitle: 'Scan feed · Alerts · Cases · Notifications',
        icon: icon('search', 24),
        tabs: [
            { id: 'scans', label: 'Scan Monitor', icon: icon('search', 14), render: renderScanMonitor },
            { id: 'duplicates', label: 'Duplicate Alerts', icon: icon('shield', 14), render: renderDuplicateAlerts },
            { id: 'geo', label: 'Geo Alerts', icon: icon('globe', 14), render: renderGeoAlerts },
            { id: 'open', label: 'Open Cases', icon: icon('alertTriangle', 14), render: renderOpenCases },
            { id: 'history', label: 'Case History', icon: icon('scroll', 14), render: renderHistory },
            { id: 'notifications', label: 'Notifications', icon: icon('bell', 14), render: renderNotifications },
        ],
    });
}
