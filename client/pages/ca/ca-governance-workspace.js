/**
 * Governance Workspace — CA Domain (Corporate Governance)
 * Tabs: Dashboard | Users | Roles & Access | Approvals | Access Logs | Carbon Passport | Green Finance
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderDashboard } from './governance-dashboard.js';
import { renderPage as renderUsers } from '../admin-users.js';
import { renderPage as renderRoles } from '../role-manager.js';
import { renderPage as renderApprovals } from './approval-queue.js';
import { renderPage as renderAccessLogs } from './access-logs.js';
import { renderPage as renderCarbonCredit } from '../scm/carbon-credit.js';
import { renderPage as renderGreenFinance } from '../infra/green-finance.js';

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
