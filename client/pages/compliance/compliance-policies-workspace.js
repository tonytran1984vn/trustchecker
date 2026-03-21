/**
 * Policies & Controls Workspace — Compliance Domain
 * Tabs: Access Policy · Risk Policy · Workflow Control · Violation Log · SoD Matrix
 *
 * PERF: Tab 1 eager, tabs 2-5 lazy-loaded on click.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
// Tab 1: eager
import { renderPage as renderAccessPolicy } from './access-policy.js';
// Tabs 2-5: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

export function renderPage() {
    return renderWorkspace({
        domain: 'compliance-policies',
        title: 'Policies & Controls',
        subtitle: 'Access Policy · Risk Policy · Workflow Control · Violations · SoD',
        icon: icon('shield', 24),
        tabs: [
            { id: 'access', label: 'Access Policy', icon: icon('lock', 14), render: renderAccessPolicy },
            { id: 'risk', label: 'Risk Policy', icon: icon('alertTriangle', 14), render: lazy(() => import('./risk-policy.js')) },
            { id: 'workflow', label: 'Workflow Control', icon: icon('workflow', 14), render: lazy(() => import('./workflow-control.js')) },
            { id: 'violations', label: 'Violation Log', icon: icon('alert', 14), render: lazy(() => import('./violation-log.js')) },
            { id: 'sod', label: 'SoD Matrix', icon: icon('shield', 14), render: lazy(() => import('./sod-matrix.js')) },
        ],
    });
}
