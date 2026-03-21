/**
 * Risk Rules Workspace — Risk Domain
 * Tabs: Duplicate Rules · Geo Rules · Velocity Rules · Auto Response
 *
 * PERF: Tab 1 eager, tabs 2-4 lazy-loaded on click.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
// Tab 1: eager
import { renderPage as renderDuplicateRules } from './duplicate-rules.js';
// Tabs 2-4: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

export function renderPage() {
    return renderWorkspace({
        domain: 'risk-rules-ws',
        title: 'Risk Rules',
        subtitle: 'Detection rules · Geo-fencing · Velocity controls · Automated response',
        icon: icon('shield', 24),
        tabs: [
            { id: 'duplicate', label: 'Duplicate Rules', icon: icon('shield', 14), render: renderDuplicateRules },
            { id: 'geo', label: 'Geo Rules', icon: icon('globe', 14), render: lazy(() => import('./geo-rules.js')) },
            { id: 'velocity', label: 'Velocity Rules', icon: icon('zap', 14), render: lazy(() => import('./velocity-rules.js')) },
            { id: 'auto-response', label: 'Auto Response', icon: icon('settings', 14), render: lazy(() => import('./auto-response.js')) },
        ],
    });
}
