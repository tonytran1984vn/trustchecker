/**
 * Governance Workspace — CA Domain (Corporate Governance)
 * Tabs: Dashboard | Users | Roles & Access | Approvals | Access Logs | Carbon Passport | Green Finance
 *
 * PERF v2: Lazy-load tabs 2-7, phased API loading.
 *   Tab 1 (Dashboard) loaded eagerly + its API immediate.
 *   Tabs 2-7 loaded via dynamic import() on click.
 *   Background APIs delayed 500ms.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { State } from '../../core/state.js';
// Tab 1: eager
import { renderPage as renderDashboard } from './governance-dashboard.js';

// Tabs 2-7: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

// ── Phased API Loading ──────────────────────────────────────
if (!window._caGovCache) window._caGovCache = {};
const cache = window._caGovCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;

    // Phase 1: Tab 1 (Dashboard) API (immediate)
    const phase1 = API.get('/org-admin/governance/dashboard').catch(() => ({})).then(data => {
        cache.dashboard = data;
    });

    // Phase 2: Background APIs for tabs 2-7 (delayed 500ms)
    const phase2 = new Promise(resolve => {
        setTimeout(() => {
            Promise.allSettled([
                State.user?.role === 'security_officer' ? Promise.resolve({ users: [] }) : API.get('/admin/users').catch(() => ({ users: [] })),
                API.get('/org-admin/roles').catch(() => []),
                API.get('/org-admin/users').catch(() => []),
                API.get('/org-admin/permissions').catch(() => []),
                API.get('/org-admin/approvals').catch(() => ({ approvals: [] })),
                API.get('/org-admin/audit?limit=100').catch(() => ({ logs: [] })),
            ]).then(results => {
                const v = results.map(r => r.value);
                cache.adminUsers = v[0];
                cache.roles = v[1];
                cache.orgUsers = v[2];
                cache.permissions = v[3];
                cache.approvals = v[4];
                cache.auditLogs = v[5];
                resolve();
            });
        }, 500);
    });

    window._caGovReady = Promise.all([phase1, phase2]).then(() => {
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[CA Gov] Phase 1 (1) + Phase 2 (6) APIs loaded ✓');
        return cache;
    });
} else if (cache._loadedAt) {
    window._caGovReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'ca-governance',
        title: 'Governance',
        subtitle: 'Dashboard · Users · Roles · Approvals · Access control · Compliance',
        icon: icon('shield', 24),
        tabs: [
            { id: 'dashboard', label: 'Dashboard', icon: icon('grid', 14), render: renderDashboard },
            State.user?.role !== 'security_officer' ? { id: 'users', label: 'Users', icon: icon('users', 14), render: lazy(() => import('../admin-users.js')) } : null,
            State.user?.role !== 'security_officer' ? { id: 'roles', label: 'Roles & Access', icon: icon('shield', 14), render: lazy(() => import('../role-manager.js')) } : null,
            { id: 'approvals', label: 'Approvals', icon: icon('check', 14), render: lazy(() => import('./approval-queue.js')) },
            { id: 'access-logs', label: 'Access Logs', icon: icon('scroll', 14), render: lazy(() => import('./access-logs.js')) },
            { id: 'carbon-passport', label: 'Carbon Passport', icon: icon('tag', 14), render: lazy(() => import('../scm/carbon-credit.js')) },
            { id: 'green-finance', label: 'Green Finance', icon: icon('globe', 14), render: lazy(() => import('../infra/green-finance.js')) },
        ].filter(Boolean),
    });
}
