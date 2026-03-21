/**
 * Fraud Intelligence Workspace — Risk Domain
 * Tabs: Event Feed · Advanced Filter · High Risk Events
 *
 * PERF: Tab 1 eager, tabs 2-3 lazy-loaded on click.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
// Tab 1: eager
import { renderPage as renderEventFeed } from './event-feed.js';
// Tabs 2-3: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

export function renderPage() {
    return renderWorkspace({
        domain: 'risk-fraud',
        title: 'Fraud Intelligence',
        subtitle: 'Event monitoring · Pattern detection · High-risk investigation',
        icon: icon('alert', 24),
        tabs: [
            { id: 'event-feed', label: 'Event Feed', icon: icon('scroll', 14), render: renderEventFeed },
            { id: 'advanced-filter', label: 'Advanced Filter', icon: icon('search', 14), render: lazy(() => import('./advanced-filter.js')) },
            { id: 'high-risk', label: 'High Risk Events', icon: icon('alertTriangle', 14), render: lazy(() => import('./high-risk.js')) },
        ],
    });
}
