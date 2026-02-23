/**
 * Governance Workspace — SA Domain (Authority Control)
 * Tabs: Users | Roles | Permissions | Access Matrix | Approvals | Escalation | Audit
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderUsers } from './platform-users.js';
import { renderPage as renderRoles } from './platform-roles.js';
import { renderPage as renderPermissions } from './permission-matrix.js';
import { renderPage as renderAccessMatrix } from './data-access-matrix.js';
import { renderPage as renderApprovals } from './approval-workflows.js';
import { renderPage as renderEscalation } from './escalation-flow.js';
import { renderPage as renderAudit } from './access-logs.js';

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
