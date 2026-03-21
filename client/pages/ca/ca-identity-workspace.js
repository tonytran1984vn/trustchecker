/**
 * Identity Workspace — CA Domain (Code Governance)
 * Tabs: Code Lifecycle | Code Allocation | Audit Trail | Duplicate Intelligence | Format Rules
 *
 * PERF v2: Lazy-load tabs 2-5, phased API loading.
 *   Tab 1 (Code Lifecycle) loaded eagerly + its API immediate.
 *   Tabs 2-5 loaded via dynamic import() on click.
 *   Background APIs delayed 500ms to yield main thread.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
// Tab 1: eager
import { renderPage as renderLifecycle } from './code-lifecycle.js';

// Tabs 2-5: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

// ── Phased API Loading ──────────────────────────────────────
if (!window._caIdCache) window._caIdCache = {};
const cache = window._caIdCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;

    // Phase 1: Tab 1 critical APIs (immediate)
    const phase1 = Promise.allSettled([
        API.get('/qr/scan-history?limit=100').catch(() => ({ scans: [] })),
        API.get('/scm/batches?limit=50').catch(() => []),
        API.get('/products?limit=50').catch(() => ({ products: [] })),
        API.get('/qr/dashboard-stats').catch(() => ({})),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.scanHistory = v[0];
        cache.batches = v[1];
        cache.products = v[2];
        cache.dashboardStats = v[3];
    });

    // Phase 2: Background APIs (delayed 500ms)
    const phase2 = new Promise(resolve => {
        setTimeout(() => {
            Promise.allSettled([
                API.get('/audit-log?limit=100').catch(() => ({ logs: [] })),
                API.get('/scm/classify/duplicates?limit=100').catch(() => ({ classifications: [] })),
                API.get('/scm/classify/duplicates/stats').catch(() => ({ breakdown: {} })),
                API.get('/scm/code-gov/format-rules').catch(() => ({ rules: [] })),
                API.get('/scm/code-gov/format-rules/stats').catch(() => ({})),
                API.get('/scm/code-gov/format-rules/audit?limit=30').catch(() => ({ logs: [] })),
                API.get('/scm/code-gov/format-rules/templates').catch(() => ({ templates: [] })),
            ]).then(results => {
                const v = results.map(r => r.value);
                cache.auditLog = v[0];
                cache.duplicates = v[1];
                cache.duplicateStats = v[2];
                cache.formatRules = v[3];
                cache.formatRulesStats = v[4];
                cache.formatRulesAudit = v[5];
                cache.formatRulesTemplates = v[6];
                resolve();
            });
        }, 500);
    });

    window._caIdReady = Promise.all([phase1, phase2]).then(() => {
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[CA Identity] Phase 1 (4) + Phase 2 (7) APIs loaded ✓');
        return cache;
    });
} else if (cache._loadedAt) {
    window._caIdReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'ca-identity',
        title: 'Identity',
        subtitle: 'Code lifecycle · Allocation · Governance',
        icon: icon('key', 24),
        tabs: [
            { id: 'lifecycle', label: 'Code Lifecycle', icon: icon('workflow', 14), render: renderLifecycle },
            { id: 'allocation', label: 'Code Allocation', icon: icon('zap', 14), render: lazy(() => import('./code-generate.js')) },
            { id: 'audit', label: 'Audit Trail', icon: icon('scroll', 14), render: lazy(() => import('./code-audit-log.js')) },
            { id: 'duplicate', label: 'Duplicate Intelligence', icon: icon('target', 14), render: lazy(() => import('./duplicate-classification.js')) },
            { id: 'format', label: 'Format Rules', icon: icon('settings', 14), render: lazy(() => import('./code-format-rules.js')) },
        ],
    });
}
