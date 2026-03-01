/**
 * Governance Workspace — SA Domain (Authority Control)
 * Tabs: Users | Roles | Permissions | Access Matrix | Approvals | Escalation | Audit
 *
 * PERF: Prefetches all 4 API-backed tab data in parallel on workspace entry.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { renderPage as renderUsers } from './platform-users.js';
import { renderPage as renderRoles } from './platform-roles.js';
import { renderPage as renderPermissions } from './permission-matrix.js';
import { renderPage as renderAccessMatrix } from './data-access-matrix.js';
import { renderPage as renderApprovals } from './approval-workflows.js';
import { renderPage as renderEscalation } from './escalation-flow.js';
import { renderPage as renderAudit } from './access-logs.js';

// Prefetch all Governance APIs in parallel on workspace entry
if (!window._saGovCache) window._saGovCache = {};
const cache = window._saGovCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 60000)) {
    cache._loading = true;
    window._saGovReady = Promise.allSettled([
        API.get('/platform/users').catch(() => ({ users: [] })),
        API.get('/platform/sa-config/approval_workflows').catch(() => ({})),
        API.get('/platform/sa-config/escalation_flow').catch(() => ({})),
        API.get('/platform/audit?limit=50').catch(() => ({ logs: [] })),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.users = v[0];
        cache.approvalWorkflows = v[1];
        cache.escalationFlow = v[2];
        cache.auditLogs = v[3];
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[SA Gov] All 4 APIs prefetched ✓');
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
            { id: 'roles', label: 'Roles', icon: icon('shield', 14), render: renderRoles },
            { id: 'permissions', label: 'Permissions', icon: icon('scroll', 14), render: renderPermissions },
            { id: 'access-matrix', label: 'Access Matrix', icon: icon('shield', 14), render: renderAccessMatrix },
            { id: 'approvals', label: 'Approvals', icon: icon('check', 14), render: renderApprovals },
            { id: 'escalation', label: 'Escalation', icon: icon('workflow', 14), render: renderEscalation },
            { id: 'audit', label: 'Audit Trail', icon: icon('scroll', 14), render: renderAudit },
        ],
    });
}
