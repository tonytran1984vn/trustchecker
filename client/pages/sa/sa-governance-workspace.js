/**
 * Governance Workspace — SA Domain (Authority Control)
 * Tabs: Users | Roles | Permissions | Access Matrix | Approvals | Escalation | Audit
 *
 * PERF v2: Lazy-load tabs 2-7, phased API loading.
 *   Tab 1 (Users) loaded eagerly + its API immediate.
 *   Tabs 2-7 loaded via dynamic import() on click.
 *   Background APIs delayed 500ms.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
// Tab 1: eager
import { renderPage as renderUsers } from './platform-users.js';

// Tabs 2-7: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

// ── Phased API Loading ──────────────────────────────────────
if (!window._saGovCache) window._saGovCache = {};
const cache = window._saGovCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 60000)) {
    cache._loading = true;

    // Phase 1: Tab 1 (Users) API (immediate)
    const phase1 = API.get('/platform/users').catch(() => ({ users: [] })).then(data => {
        cache.users = data;
    });

    // Phase 2: Background APIs for tabs 2-7 (delayed 500ms)
    const phase2 = new Promise(resolve => {
        setTimeout(() => {
            Promise.allSettled([
                API.get('/platform/sa-config/approval_workflows').catch(() => ({})),
                API.get('/platform/sa-config/escalation_flow').catch(() => ({})),
                API.get('/platform/audit?limit=50').catch(() => ({ logs: [] })),
            ]).then(results => {
                const v = results.map(r => r.value);
                cache.approvalWorkflows = v[0];
                cache.escalationFlow = v[1];
                cache.auditLogs = v[2];
                resolve();
            });
        }, 500);
    });

    window._saGovReady = Promise.all([phase1, phase2]).then(() => {
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[SA Gov] Phase 1 (1) + Phase 2 (3) APIs loaded ✓');
        return cache;
    });
} else if (cache._loadedAt) {
    window._saGovReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'governance',
        title: 'Governance',
        subtitle: 'Identity · Access · Policy · Audit trail',
        icon: icon('shield', 24),
        tabs: [
            { id: 'users', label: 'Users', icon: icon('users', 14), render: renderUsers },
            { id: 'roles', label: 'Roles', icon: icon('shield', 14), render: lazy(() => import('./platform-roles.js')) },
            { id: 'permissions', label: 'Permissions', icon: icon('scroll', 14), render: lazy(() => import('./permission-matrix.js')) },
            { id: 'access-matrix', label: 'Access Matrix', icon: icon('shield', 14), render: lazy(() => import('./data-access-matrix.js')) },
            { id: 'approvals', label: 'Approvals', icon: icon('check', 14), render: lazy(() => import('./approval-workflows.js')) },
            { id: 'escalation', label: 'Escalation', icon: icon('workflow', 14), render: lazy(() => import('./escalation-flow.js')) },
            { id: 'audit', label: 'Audit Trail', icon: icon('scroll', 14), render: lazy(() => import('./access-logs.js')) },
            { id: 'policies', label: 'System Policies', icon: icon('settings', 14), render: lazy(() => import('../compliance/dynamic-policies.js')) },
        ],
    });
}
