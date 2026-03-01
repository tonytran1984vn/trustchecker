/**
 * Identity Workspace — CA Domain (Code Governance)
 * Tabs: Code Lifecycle | Code Allocation | Audit Trail | Duplicate Intelligence | Format Rules
 *
 * PERF: Prefetches key APIs in parallel on workspace entry.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { renderPage as renderLifecycle } from './code-lifecycle.js';
import { renderPage as renderGenerate } from './code-generate.js';
import { renderPage as renderAuditLog } from './code-audit-log.js';
import { renderPage as renderDuplicate } from './duplicate-classification.js';
import { renderPage as renderFormatRules } from './code-format-rules.js';

// Prefetch all Identity APIs in parallel
if (!window._caIdCache) window._caIdCache = {};
const cache = window._caIdCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;
    window._caIdReady = Promise.allSettled([
        API.get('/qr/scan-history?limit=100').catch(() => ({ scans: [] })),
        API.get('/scm/batches?limit=50').catch(() => []),
        API.get('/products?limit=50').catch(() => ({ products: [] })),
        API.get('/qr/dashboard-stats').catch(() => ({})),
        API.get('/audit-log?limit=100').catch(() => ({ logs: [] })),
        API.get('/scm/classify/duplicates?limit=100').catch(() => ({ classifications: [] })),
        API.get('/scm/classify/duplicates/stats').catch(() => ({ breakdown: {} })),
        API.get('/scm/code-gov/format-rules').catch(() => ({ rules: [] })),
        API.get('/scm/code-gov/format-rules/stats').catch(() => ({})),
        API.get('/scm/code-gov/format-rules/audit?limit=30').catch(() => ({ logs: [] })),
        API.get('/scm/code-gov/format-rules/templates').catch(() => ({ templates: [] })),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.scanHistory = v[0];
        cache.batches = v[1];
        cache.products = v[2];
        cache.dashboardStats = v[3];
        cache.auditLog = v[4];
        cache.duplicates = v[5];
        cache.duplicateStats = v[6];
        cache.formatRules = v[7];
        cache.formatRulesStats = v[8];
        cache.formatRulesAudit = v[9];
        cache.formatRulesTemplates = v[10];
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[CA Identity] All 11 APIs prefetched ✓');
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
            { id: 'allocation', label: 'Code Allocation', icon: icon('zap', 14), render: renderGenerate },
            { id: 'audit', label: 'Audit Trail', icon: icon('scroll', 14), render: renderAuditLog },
            { id: 'duplicate', label: 'Duplicate Intelligence', icon: icon('target', 14), render: renderDuplicate },
            { id: 'format', label: 'Format Rules', icon: icon('settings', 14), render: renderFormatRules },
        ],
    });
}
