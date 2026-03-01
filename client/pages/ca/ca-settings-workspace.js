/**
 * Settings Workspace — CA Domain (Company Settings & Integration)
 * Tabs: Company Profile | Security | API & Integrations | Billing
 *
 * PERF: Prefetches key APIs in parallel on workspace entry.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { renderPage as renderProfile } from './company-profile.js';
import { renderPage as renderSecurity } from '../settings.js';
import { renderPage as renderIntegrations } from './integrations.js';
import { renderPage as renderBilling } from '../billing.js';

// Prefetch all Settings APIs in parallel
if (!window._caSetCache) window._caSetCache = {};
const cache = window._caSetCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;
    window._caSetReady = Promise.allSettled([
        API.get('/org').catch(() => ({})),
        API.get('/org/members').catch(() => ({ members: [], total: 0 })),
        API.get('/products?limit=1&offset=0').catch(() => ({ total: 0 })),
        API.get('/auth/me').catch(() => ({})),
        API.get('/auth/sessions').catch(() => ({ sessions: [] })),
        API.get('/tenant-integrations/schema').catch(() => ({})),
        API.get('/tenant-integrations').catch(() => ({})),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.org = v[0];
        cache.members = v[1];
        cache.productCount = v[2];
        cache.authMe = v[3];
        cache.sessions = v[4];
        cache.integrationsSchema = v[5];
        cache.integrations = v[6];
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[CA Settings] All 7 APIs prefetched ✓');
        return cache;
    });
} else if (cache._loadedAt) {
    window._caSetReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'ca-settings',
        title: 'Settings',
        subtitle: 'Company profile · Security · Integrations · Billing',
        icon: icon('settings', 24),
        tabs: [
            { id: 'profile', label: 'Company Profile', icon: icon('building', 14), render: renderProfile },
            { id: 'security', label: 'Security', icon: icon('lock', 14), render: renderSecurity },
            { id: 'integrations', label: 'API & Integrations', icon: icon('plug', 14), render: renderIntegrations },
            { id: 'billing', label: 'Billing & Quota', icon: icon('creditCard', 14), render: renderBilling },
        ],
    });
}
