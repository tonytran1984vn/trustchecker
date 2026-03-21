/**
 * Risk Workspace — CA Domain (Protection & Monitoring)
 * Tabs: Fraud | Incidents | Risk Rules | Scan Analytics | Supply Risk
 *
 * PERF v2: Lazy-load tabs 2-5, phased API loading.
 *   Tab 1 (Fraud) loaded eagerly + its APIs immediate.
 *   Tabs 2-5 loaded via dynamic import() on click.
 *   Background APIs delayed 500ms.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
// Tab 1: eager
import { renderPage as renderFraud } from '../fraud.js';

// Tabs 2-5: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

// ── Phased API Loading ──────────────────────────────────────
if (!window._caRiskCache) window._caRiskCache = {};
const cache = window._caRiskCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;

    // Phase 1: Tab 1 (Fraud) critical APIs (immediate)
    const phase1 = Promise.allSettled([
        API.get('/scm/risk/alerts?limit=50').catch(() => ({ alerts: [] })),
        API.get('/scm/risk-model/models').catch(() => ({ models: [] })),
        API.get('/anomaly?limit=100').catch(() => ({ anomalies: [] })),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.riskAlerts = v[0];
        cache.riskModels = v[1];
        cache.anomalies = v[2];
    });

    // Phase 2: Background APIs for tabs 2-5 (delayed 500ms)
    const phase2 = new Promise(resolve => {
        setTimeout(() => {
            Promise.allSettled([
                API.get('/ops/incidents').catch(() => ({ incidents: [] })),
                API.get('/scm/risk-model/rules-config').catch(() => ({ grouped: {} })),
                API.get('/products?limit=1&offset=0').catch(() => ({ total: 0 })),
                API.get('/scm/events?limit=100').catch(() => ({ events: [] })),
                API.get('/scm/supply/routes').catch(() => []),
                API.get('/scm/supply/channel-rules').catch(() => []),
                API.get('/scm/supply/route-breaches').catch(() => []),
            ]).then(results => {
                const v = results.map(r => r.value);
                cache.incidents = v[0];
                cache.rulesConfig = v[1];
                cache.productCount = v[2];
                cache.events = v[3];
                cache.supplyRoutes = v[4];
                cache.channelRules = v[5];
                cache.routeBreaches = v[6];
                resolve();
            });
        }, 500);
    });

    window._caRiskReady = Promise.all([phase1, phase2]).then(() => {
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[CA Risk] Phase 1 (3) + Phase 2 (7) APIs loaded ✓');
        return cache;
    });
} else if (cache._loadedAt) {
    window._caRiskReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'ca-risk',
        title: 'Risk',
        subtitle: 'Fraud monitoring · Incidents · Risk intelligence',
        icon: icon('alert', 24),
        tabs: [
            { id: 'fraud', label: 'Fraud Monitoring', icon: icon('alert', 14), render: renderFraud },
            { id: 'incidents', label: 'Incidents', icon: icon('alertTriangle', 14), render: lazy(() => import('./incidents.js')) },
            { id: 'risk-rules', label: 'Risk Rules', icon: icon('target', 14), render: lazy(() => import('./risk-rules.js')) },
            { id: 'scan-analytics', label: 'Scan Analytics', icon: icon('search', 14), render: lazy(() => import('./scan-analytics.js')) },
            { id: 'supply-risk', label: 'Supply Risk', icon: icon('network', 14), render: lazy(() => import('./supply-route-engine.js')) },
        ],
    });
}
