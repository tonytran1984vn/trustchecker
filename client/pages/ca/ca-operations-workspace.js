/**
 * Operations Workspace — CA Domain (Supply Chain & Production)
 * Tabs: Products | Batches | Supply Network | Traceability | Verification | Carbon
 *
 * PERF: Prefetches key APIs in parallel on workspace entry.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { renderPage as renderProducts } from '../products.js';
import { renderPage as renderBatches } from './batches.js';
import { renderPage as renderNodes } from './nodes.js';
import { renderPage as renderTraceability } from './traceability.js';
import { renderPage as renderScans } from '../scans.js';
import { renderPage as renderCarbon } from '../scm/carbon.js';

// Prefetch all Operations APIs in parallel
if (!window._caOpsCache) window._caOpsCache = {};
const cache = window._caOpsCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;
    window._caOpsReady = Promise.allSettled([
        API.get('/products').catch(() => ({ products: [] })),
        API.get('/scm/batches').catch(() => ({ batches: [] })),
        API.get('/scm/supply/routes').catch(() => []),
        API.get('/scm/events?limit=500').catch(() => ({ events: [] })),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.products = v[0];
        cache.batches = v[1];
        cache.routes = v[2];
        cache.events = v[3];
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[CA Ops] All APIs prefetched ✓');
        return cache;
    });
} else if (cache._loadedAt) {
    window._caOpsReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'ca-operations',
        title: 'Operations',
        subtitle: 'Products · Supply chain · Traceability · Carbon',
        icon: icon('products', 24),
        tabs: [
            { id: 'products', label: 'Products', icon: icon('products', 14), render: renderProducts },
            { id: 'batches', label: 'Batches', icon: icon('clipboard', 14), render: renderBatches },
            { id: 'supply', label: 'Supply Network', icon: icon('factory', 14), render: renderNodes },
            { id: 'traceability', label: 'Traceability', icon: icon('search', 14), render: renderTraceability },
            { id: 'verification', label: 'Verification', icon: icon('check', 14), render: renderScans },
            { id: 'carbon', label: 'Carbon', icon: icon('globe', 14), render: renderCarbon },
        ],
    });
}
