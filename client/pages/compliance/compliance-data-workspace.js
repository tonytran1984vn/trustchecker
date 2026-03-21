/**
 * Data Governance Workspace — Compliance Domain
 * Tabs: Retention · Data Access Review · Privacy Requests · Data Governance Overview
 *
 * PERF: Tab 1 eager, tabs 2-4 lazy-loaded on click.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
// Tab 1: eager
import { renderPage as renderRetention, initPage as initRetention } from './retention.js';
// Tabs 2-4: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

export function renderPage() {
    const privacy = { _mod: null };
    const privRender = () => import('./privacy-requests.js').then(m => { privacy._mod = m; return m.renderPage(); });
    const privInit = () => { if (privacy._mod?.initPage) privacy._mod.initPage(); };

    return renderWorkspace({
        domain: 'compliance-data',
        title: 'Data Governance',
        subtitle: 'Retention · Data Access Review · Privacy Requests · Governance',
        icon: icon('globe', 24),
        tabs: [
            { id: 'retention', label: 'Retention', icon: icon('clock', 14), render: renderRetention, init: initRetention },
            { id: 'access-review', label: 'Data Access Review', icon: icon('search', 14), render: lazy(() => import('./data-access-review.js')) },
            { id: 'privacy', label: 'Privacy Requests', icon: icon('users', 14), render: privRender, init: privInit },
            { id: 'governance', label: 'Data Governance', icon: icon('globe', 14), render: lazy(() => import('./data-governance.js')) },
        ],
    });
}
