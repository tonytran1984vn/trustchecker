/**
 * Governance Workspace — CA Domain (Corporate Governance)
 * Tabs: Dashboard | Users | Roles & Access | Approvals | Access Logs | Carbon Passport | Green Finance
 *
 * PERF: Prefetches key APIs in parallel on workspace entry.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { renderPage as renderDashboard } from './governance-dashboard.js';
import { renderPage as renderUsers } from '../admin-users.js';
import { renderPage as renderRoles } from '../role-manager.js';
import { renderPage as renderApprovals } from './approval-queue.js';
import { renderPage as renderAccessLogs } from './access-logs.js';
import { renderPage as renderCarbonCredit } from '../scm/carbon-credit.js';
import { renderPage as renderGreenFinance } from '../infra/green-finance.js';

// Prefetch all Governance APIs in parallel
if (!window._caGovCache) window._caGovCache = {};
const cache = window._caGovCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 30000)) {
    cache._loading = true;
    window._caGovReady = Promise.allSettled([
        API.get('/tenant/governance/dashboard').catch(() => ({})),
        API.get('/admin/users').catch(() => ({ users: [] })),
        API.get('/tenant/roles').catch(() => []),
        API.get('/tenant/users').catch(() => []),
        API.get('/tenant/permissions').catch(() => []),
        API.get('/tenant/approvals').catch(() => ({ approvals: [] })),
        API.get('/tenant/audit?limit=100').catch(() => ({ logs: [] })),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.dashboard = v[0];
        cache.adminUsers = v[1];
        cache.roles = v[2];
        cache.tenantUsers = v[3];
        cache.permissions = v[4];
        cache.approvals = v[5];
        cache.auditLogs = v[6];
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[CA Gov] All 7 APIs prefetched ✓');
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
            { id: 'users', label: 'Users', icon: icon('users', 14), render: renderUsers },
            { id: 'roles', label: 'Roles & Access', icon: icon('shield', 14), render: renderRoles },
            { id: 'approvals', label: 'Approvals', icon: icon('check', 14), render: renderApprovals },
            { id: 'access-logs', label: 'Access Logs', icon: icon('scroll', 14), render: renderAccessLogs },
            { id: 'carbon-passport', label: 'Carbon Passport', icon: icon('tag', 14), render: renderCarbonCredit },
            { id: 'green-finance', label: 'Green Finance', icon: icon('globe', 14), render: renderGreenFinance },
        ],
    });
}
