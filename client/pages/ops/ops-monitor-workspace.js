/**
 * Monitor & Incidents Workspace — Ops Domain
 * SCOR: Monitor + Respond
 * Tabs: Scan Monitor · Duplicate Alerts · Geo Alerts · Open Cases · History · Notifications
 *
 * PERF v2: Lazy-load tabs 2-6, phased API loading.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
// Tab 1: eager
import { renderPage as renderScanMonitor } from './scan-monitor.js';

// Tabs 2-6: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

// ── Phased API Loading ──────────────────────────────────────
if (!window._opsMonCache) window._opsMonCache = {};
const cache = window._opsMonCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;

    // Phase 1: Tab 1 (Scan Monitor) API (immediate)
    const phase1 = API.get('/qr/scan-history?limit=100').catch(() => ({ scans: [] })).then(data => {
        cache.scanHistory = data;
    });

    // Phase 2: Background APIs (delayed 500ms)
    const phase2 = new Promise(resolve => {
        setTimeout(() => {
            Promise.allSettled([
                API.get('/scm/classify/duplicates?limit=50').catch(() => ({ classifications: [] })),
                API.get('/ops/incidents?status=open&limit=50').catch(() => ({ incidents: [] })),
                API.get('/ops/incidents?status=resolved&limit=50').catch(() => ({ incidents: [] })),
                API.get('/ops/incidents?status=closed&limit=50').catch(() => ({ incidents: [] })),
            ]).then(results => {
                const v = results.map(r => r.value);
                cache.duplicates = v[0];
                cache.openCases = v[1];
                cache.closedCases = { incidents: [...(v[2]?.incidents || []), ...(v[3]?.incidents || [])] };
                resolve();
            });
        }, 500);
    });

    window._opsMonReady = Promise.all([phase1, phase2]).then(() => {
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[Ops Monitor] Phase 1 (1) + Phase 2 (4) APIs loaded ✓');
        if (typeof window.render === 'function') window.render();
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
            { id: 'duplicates', label: 'Duplicate Alerts', icon: icon('shield', 14), render: lazy(() => import('./duplicate-alerts.js')) },
            { id: 'geo', label: 'Geo Alerts', icon: icon('globe', 14), render: lazy(() => import('./geo-alerts.js')) },
            { id: 'open', label: 'Open Cases', icon: icon('alertTriangle', 14), render: lazy(() => import('./incidents-open.js')) },
            { id: 'history', label: 'Case History', icon: icon('scroll', 14), render: lazy(() => import('./incidents-history.js')) },
            { id: 'notifications', label: 'Notifications', icon: icon('bell', 14), render: lazy(() => import('./notifications.js')) },
        ],
    });
}
