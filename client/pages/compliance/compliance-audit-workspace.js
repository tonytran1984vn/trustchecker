/**
 * Audit Trail Workspace — Compliance Domain
 * Tabs: User Activity · System Changes · Data Export · Privileged Access
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderUserActivity } from './user-activity.js';
import { renderPage as renderSystemChanges } from './system-changes.js';
import { renderPage as renderDataExport } from './data-export.js';
import { renderPage as renderPrivilegedAccess } from './privileged-access.js';

export function renderPage() {
    return renderWorkspace({
        domain: 'compliance-audit',
        title: 'Audit Trail',
        subtitle: 'User Activity · System Changes · Data Export · Privileged Access',
        icon: icon('scroll', 24),
        tabs: [
            { id: 'activity', label: 'User Activity', icon: icon('users', 14), render: renderUserActivity },
            { id: 'changes', label: 'System Changes', icon: icon('settings', 14), render: renderSystemChanges },
            { id: 'export', label: 'Data Export', icon: icon('scroll', 14), render: renderDataExport },
            { id: 'access', label: 'Privileged Access', icon: icon('shield', 14), render: renderPrivilegedAccess },
        ],
    });
}
