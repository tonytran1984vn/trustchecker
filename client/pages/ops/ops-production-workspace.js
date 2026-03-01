/**
 * Production Workspace — Ops Domain
 * Tabs: Dashboard · Create Batch · Batch List · Split/Merge · Recall
 *
 * PERF: Prefetches key APIs in parallel on workspace entry.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { renderPage as renderDashboard } from './dashboard.js';
import { renderPage as renderBatchCreate } from './batch-create.js';
import { renderPage as renderBatchList } from './batch-list.js';
import { renderPage as renderBatchSplit } from './batch-split.js';
import { renderPage as renderBatchRecall } from './batch-recall.js';

// Prefetch Production APIs in parallel
if (!window._opsProdCache) window._opsProdCache = {};
const cache = window._opsProdCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;
    window._opsProdReady = Promise.allSettled([
        API.get('/scm/batches?limit=100').catch(() => ({ batches: [] })),
        API.get('/products?limit=50').catch(() => ({ products: [] })),
        API.get('/scm/events?limit=100').catch(() => ({ events: [] })),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.batches = v[0];
        cache.products = v[1];
        cache.events = v[2];
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[Ops Production] All 3 APIs prefetched ✓');
        return cache;
    });
} else if (cache._loadedAt) {
    window._opsProdReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'ops-production',
        title: 'Production',
        subtitle: 'Dashboard · Batch lifecycle · QR generation',
        icon: icon('factory', 24),
        tabs: [
            { id: 'dashboard', label: 'Dashboard', icon: icon('dashboard', 14), render: renderDashboard },
            { id: 'create', label: 'Create Batch', icon: icon('plus', 14), render: renderBatchCreate },
            { id: 'batches', label: 'Batch List', icon: icon('products', 14), render: renderBatchList },
            { id: 'split', label: 'Split / Merge', icon: icon('workflow', 14), render: renderBatchSplit },
            { id: 'recall', label: 'Recall', icon: icon('alertTriangle', 14), render: renderBatchRecall },
        ],
    });
}
