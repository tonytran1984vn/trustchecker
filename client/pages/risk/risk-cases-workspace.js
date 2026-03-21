/**
 * Cases & Reports Workspace — Risk Domain
 * Tabs: Open Cases · Escalated · Closed · Reports
 *
 * PERF: Tab 1 eager, tabs 2-4 lazy-loaded on click.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
// Tab 1: eager
import { renderPage as renderCasesOpen } from './cases-open.js';
// Tabs 2-4: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

export function renderPage() {
    return renderWorkspace({
        domain: 'risk-cases-ws',
        title: 'Cases & Reports',
        subtitle: 'Case management · Escalation · Resolution · Reporting',
        icon: icon('scroll', 24),
        tabs: [
            { id: 'open', label: 'Open Cases', icon: icon('alertTriangle', 14), render: renderCasesOpen },
            { id: 'escalated', label: 'Escalated', icon: icon('alert', 14), render: lazy(() => import('./cases-escalated.js')) },
            { id: 'closed', label: 'Closed', icon: icon('check', 14), render: lazy(() => import('./cases-closed.js')) },
            { id: 'reports', label: 'Reports', icon: icon('scroll', 14), render: lazy(() => import('./reports.js')) },
        ],
    });
}
