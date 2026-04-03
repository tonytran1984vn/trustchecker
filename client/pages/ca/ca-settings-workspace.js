/**
 * Settings Workspace — CA Domain (Company Settings & Integration)
 * Tabs: Company Profile | Security | API & Integrations | Billing
 *
 * PERF v2: Lazy-load tabs 2-4, phased API loading.
 *   Tab 1 (Company Profile) loaded eagerly + its APIs immediate.
 *   Tabs 2-4 loaded via dynamic import() on click.
 *   Background APIs delayed 500ms.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
// Tab 1: eager
import { renderPage as renderProfile } from './company-profile.js';

// Tabs 2-4: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

// ── Phased API Loading ──────────────────────────────────────
if (!window._caSetCache) window._caSetCache = {};
const cache = window._caSetCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;

    // Phase 1: Tab 1 (Company Profile) APIs (immediate)
    const phase1 = Promise.allSettled([
        API.get('/org').catch(() => ({})),
        API.get('/org/members').catch(() => ({ members: [], total: 0 })),
        API.get('/products?limit=1&offset=0').catch(() => ({ total: 0 })),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.org = v[0];
        cache.members = v[1];
        cache.productCount = v[2];
    });

    // Phase 2: Background APIs for tabs 2-4 (delayed 500ms)
    const phase2 = new Promise(resolve => {
        setTimeout(() => {
            Promise.allSettled([
                API.get('/auth/me').catch(() => ({})),
                API.get('/auth/sessions').catch(() => ({ sessions: [] })),
                API.get('/org-integrations/schema').catch(() => ({})),
                API.get('/org-integrations').catch(() => ({})),
            ]).then(results => {
                const v = results.map(r => r.value);
                cache.authMe = v[0];
                cache.sessions = v[1];
                cache.integrationsSchema = v[2];
                cache.integrations = v[3];
                resolve();
            });
        }, 500);
    });

    window._caSetReady = Promise.all([phase1, phase2]).then(() => {
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[CA Settings] Phase 1 (3) + Phase 2 (4) APIs loaded ✓');
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
            { id: 'security', label: 'Security', icon: icon('lock', 14), render: lazy(() => import('../settings.js')) },
            { id: 'integrations', label: 'API & Integrations', icon: icon('plug', 14), render: lazy(() => import('./integrations.js')) },
            { id: 'billing', label: 'Billing & Quota', icon: icon('creditCard', 14), render: lazy(() => import('../billing.js?v=2')) },
        ],
    });
}
