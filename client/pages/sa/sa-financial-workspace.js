/**
 * Financial Workspace — SA Domain
 * Tabs: Revenue | Plans | Orgs
 *
 * PERF: Tab 1 (Revenue) loaded eagerly, tabs 2-3 lazy-loaded on click.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
// Tab 1: eager
import { renderPage as renderRevenue } from './sa-revenue.js';
// Tabs 2-3: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

export function renderPage() {
    return renderWorkspace({
        domain: 'financial',
        title: 'Financial',
        subtitle: 'Revenue · Plans · Organization billing',
        icon: icon('barChart', 24),
        tabs: [
            { id: 'revenue', label: 'Revenue', icon: icon('barChart', 14), render: renderRevenue },
            { id: 'plans', label: 'Plans', icon: icon('tag', 14), render: lazy(() => import('../pricing-admin.js')) },
            { id: 'orgs', label: 'Organizations', icon: icon('building', 14), render: lazy(() => import('./orgs.js')) },
        ],
    });
}
