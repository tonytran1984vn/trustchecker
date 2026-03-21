/**
 * Risk Workspace — SA Domain
 * Tabs: Monitoring | Cases | Analytics | Risk Model | Benchmark
 *
 * PERF v2: Lazy-load tabs 2-5, phased API loading.
 *   Tab 1 (Monitoring) loaded eagerly + its API immediate.
 *   Tabs 2-5 loaded via dynamic import() on click.
 *   Background API delayed 500ms.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
// Tab 1: eager
import { renderPage as renderRiskFeed } from './risk-feed.js';

// Tabs 2-5: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

// ── Phased API Loading ──────────────────────────────────────
if (!window._saRiskCache) window._saRiskCache = {};
const cache = window._saRiskCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;

    // Phase 1: Tab 1 (Monitoring) API (immediate)
    const phase1 = API.get('/risk-graph/fraud-feed').catch(() => ({ alerts: [], summary: {}, topTenants: [], topTypes: [], insights: [] })).then(data => {
        cache.fraudFeed = data;
    });

    // Phase 2: Background API (delayed 500ms)
    const phase2 = new Promise(resolve => {
        setTimeout(() => {
            API.get('/risk-graph/risk-analytics').catch(() => ({})).then(data => {
                cache.riskAnalytics = data;
                resolve();
            });
        }, 500);
    });

    window._saRiskReady = Promise.all([phase1, phase2]).then(() => {
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[SA Risk] Phase 1 (1) + Phase 2 (1) APIs loaded ✓');
        return cache;
    });
} else if (cache._loadedAt) {
    window._saRiskReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'risk',
        title: 'Risk',
        subtitle: 'Threat landscape · Monitoring · Investigation',
        icon: icon('alert', 24),
        tabs: [
            { id: 'monitoring', label: 'Monitoring', icon: icon('radio', 14), render: renderRiskFeed },
            { id: 'cases', label: 'Cases', icon: icon('alert', 14), render: lazy(() => import('./suspicious-tenants.js')) },
            { id: 'analytics', label: 'Analytics', icon: icon('barChart', 14), render: lazy(() => import('./risk-analytics.js')) },
            { id: 'risk-model', label: 'Risk Model', icon: icon('brain', 14), render: lazy(() => import('./ai-engine.js')) },
            { id: 'benchmark', label: 'Benchmark', icon: icon('globe', 14), render: lazy(() => import('./industry-benchmark.js')) },
        ],
    });
}
