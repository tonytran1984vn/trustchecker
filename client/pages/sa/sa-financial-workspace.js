/**
 * Financial Workspace — SA Domain
 * Tabs: Revenue | Plans | Tenants
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderRevenue } from './sa-revenue.js';
import { renderPage as renderPlans } from '../pricing-admin.js';
import { renderPage as renderTenants } from './tenants.js';

export function renderPage() {
    return renderWorkspace({
        domain: 'financial',
        title: 'Financial',
        subtitle: 'Revenue · Plans · Tenant billing',
        icon: icon('barChart', 24),
        tabs: [
            { id: 'revenue', label: 'Revenue', icon: icon('barChart', 14), render: renderRevenue },
            { id: 'plans', label: 'Plans', icon: icon('tag', 14), render: renderPlans },
            { id: 'tenants', label: 'Tenants', icon: icon('building', 14), render: renderTenants },
        ],
    });
}
