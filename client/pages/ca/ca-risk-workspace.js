/**
 * Risk Workspace — CA Domain (Protection & Monitoring)
 * Tabs: Fraud | Incidents | Risk Rules | Scan Analytics | Supply Risk
 *
 * PERF: Prefetches key APIs in parallel on workspace entry.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { renderPage as renderFraud } from '../fraud.js';
import { renderPage as renderIncidents } from './incidents.js';
import { renderPage as renderRiskRules } from './risk-rules.js';
import { renderPage as renderScanAnalytics } from './scan-analytics.js';
import { renderPage as renderSupplyRisk } from './supply-route-engine.js';

// Prefetch all Risk APIs in parallel
if (!window._caRiskCache) window._caRiskCache = {};
const cache = window._caRiskCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;
    window._caRiskReady = Promise.allSettled([
        API.get('/ops/incidents').catch(() => ({ incidents: [] })),
        API.get('/scm/model/models').catch(() => ({ models: [] })),
        API.get('/scm/risk/alerts?limit=50').catch(() => ({ alerts: [] })),
        API.get('/scm/model/rules-config').catch(() => ({ grouped: {} })),
        API.get('/products?limit=1&offset=0').catch(() => ({ total: 0 })),
        API.get('/scm/events?limit=100').catch(() => ({ events: [] })),
        API.get('/anomaly?limit=100').catch(() => ({ anomalies: [] })),
        API.get('/scm/supply/routes').catch(() => []),
        API.get('/scm/supply/channel-rules').catch(() => []),
        API.get('/scm/supply/route-breaches').catch(() => []),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.incidents = v[0];
        cache.riskModels = v[1];
        cache.riskAlerts = v[2];
        cache.rulesConfig = v[3];
        cache.productCount = v[4];
        cache.events = v[5];
        cache.anomalies = v[6];
        cache.supplyRoutes = v[7];
        cache.channelRules = v[8];
        cache.routeBreaches = v[9];
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[CA Risk] All 10 APIs prefetched ✓');
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
            { id: 'incidents', label: 'Incidents', icon: icon('alertTriangle', 14), render: renderIncidents },
            { id: 'risk-rules', label: 'Risk Rules', icon: icon('target', 14), render: renderRiskRules },
            { id: 'scan-analytics', label: 'Scan Analytics', icon: icon('search', 14), render: renderScanAnalytics },
            { id: 'supply-risk', label: 'Supply Risk', icon: icon('network', 14), render: renderSupplyRisk },
        ],
    });
}
