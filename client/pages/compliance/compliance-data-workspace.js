/**
 * Data Governance Workspace — Compliance Domain
 * Tabs: Retention · Data Access Review · Privacy Requests · Data Governance Overview
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderRetention } from './retention.js';
import { renderPage as renderDataAccessReview } from './data-access-review.js';
import { renderPage as renderPrivacyRequests } from './privacy-requests.js';
import { renderPage as renderDataGovernance } from './data-governance.js';

export function renderPage() {
    return renderWorkspace({
        domain: 'compliance-data',
        title: 'Data Governance',
        subtitle: 'Retention · Data Access Review · Privacy Requests · Governance',
        icon: icon('globe', 24),
        tabs: [
            { id: 'retention', label: 'Retention', icon: icon('clock', 14), render: renderRetention },
            { id: 'access-review', label: 'Data Access Review', icon: icon('search', 14), render: renderDataAccessReview },
            { id: 'privacy', label: 'Privacy Requests', icon: icon('users', 14), render: renderPrivacyRequests },
            { id: 'governance', label: 'Data Governance', icon: icon('globe', 14), render: renderDataGovernance },
        ],
    });
}
