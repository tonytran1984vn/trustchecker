/**
 * Fraud Intelligence Workspace — Risk Domain
 * Tabs: Event Feed · Advanced Filter · High Risk Events
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderEventFeed } from './event-feed.js';
import { renderPage as renderAdvancedFilter } from './advanced-filter.js';
import { renderPage as renderHighRisk } from './high-risk.js';

export function renderPage() {
    return renderWorkspace({
        domain: 'risk-fraud',
        title: 'Fraud Intelligence',
        subtitle: 'Event monitoring · Pattern detection · High-risk investigation',
        icon: icon('alert', 24),
        tabs: [
            { id: 'event-feed', label: 'Event Feed', icon: icon('scroll', 14), render: renderEventFeed },
            { id: 'advanced-filter', label: 'Advanced Filter', icon: icon('search', 14), render: renderAdvancedFilter },
            { id: 'high-risk', label: 'High Risk Events', icon: icon('alertTriangle', 14), render: renderHighRisk },
        ],
    });
}
