/**
 * Risk Workspace — SA Domain
 * Tabs: Monitoring | Cases | Analytics | Risk Model | Benchmark
 * 
 * PERF: Prefetches BOTH risk APIs in parallel on workspace entry.
 * All tabs use window._saRiskCache for instant rendering.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { renderPage as renderRiskFeed } from './risk-feed.js';
import { renderPage as renderRiskAnalytics } from './risk-analytics.js';
import { renderPage as renderSuspicious } from './suspicious-tenants.js';
import { renderPage as renderBenchmark } from './industry-benchmark.js';
import { renderPage as renderRiskModel } from './ai-engine.js';

// Prefetch both APIs in parallel on workspace entry
if (!window._saRiskCache) window._saRiskCache = {};
const cache = window._saRiskCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;
    Promise.allSettled([
        API.get('/risk-graph/risk-analytics'),
        API.get('/risk-graph/fraud-feed'),
    ]).then(([analyticsR, feedR]) => {
        cache.riskAnalytics = analyticsR.value || {};
        cache.fraudFeed = feedR.value || { alerts: [], summary: {}, topTenants: [], topTypes: [], insights: [] };
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[SA Risk] Both APIs prefetched ✓');
    });
}

export function renderPage() {
    return renderWorkspace({
        domain: 'risk',
        title: 'Risk',
        subtitle: 'Threat landscape · Monitoring · Investigation',
        icon: icon('alert', 24),
        tabs: [
            { id: 'monitoring', label: 'Monitoring', icon: icon('radio', 14), render: renderRiskFeed },
            { id: 'cases', label: 'Cases', icon: icon('alert', 14), render: renderSuspicious },
            { id: 'analytics', label: 'Analytics', icon: icon('barChart', 14), render: renderRiskAnalytics },
            { id: 'risk-model', label: 'Risk Model', icon: icon('brain', 14), render: renderRiskModel },
            { id: 'benchmark', label: 'Benchmark', icon: icon('globe', 14), render: renderBenchmark },
        ],
    });
}

