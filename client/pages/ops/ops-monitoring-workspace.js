/**
 * Monitoring Workspace — Ops Domain
 * Tabs: Scan Monitor · Duplicate Alerts · Geo Alerts · Reports
 *
 * PERF v2: Lazy-load tabs 2-4, phased API loading.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
// Tab 1: eager
import { renderPage as renderScanMonitor } from './scan-monitor.js';

// Tabs 2-4: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

// ── Phased API Loading ──────────────────────────────────────
if (!window._opsMonCache2) window._opsMonCache2 = {};
const cache = window._opsMonCache2;
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
                API.get('/scm/risk/alerts?limit=50').catch(() => ({ alerts: [] })),
            ]).then(results => {
                const v = results.map(r => r.value);
                cache.duplicates = v[0];
                cache.geoAlerts = v[1];
                resolve();
            });
        }, 500);
    });

    window._opsMonReady2 = Promise.all([phase1, phase2]).then(() => {
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[Ops Monitoring] Phase 1 (1) + Phase 2 (2) APIs loaded ✓');
        return cache;
    });
} else if (cache._loadedAt) {
    window._opsMonReady2 = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'ops-monitoring',
        title: 'Monitoring',
        subtitle: 'Scan feed · Duplicate alerts · Geo anomalies',
        icon: icon('search', 24),
        tabs: [
            { id: 'scans', label: 'Scan Monitor', icon: icon('search', 14), render: renderScanMonitor },
            { id: 'duplicates', label: 'Duplicate Alerts', icon: icon('shield', 14), render: lazy(() => import('./duplicate-alerts.js')) },
            { id: 'geo', label: 'Geo Alerts', icon: icon('globe', 14), render: lazy(() => import('./geo-alerts.js')) },
            { id: 'reports', label: 'Reports', icon: icon('scroll', 14), render: lazy(() => import('./reports.js')) },
        ],
    });
}
