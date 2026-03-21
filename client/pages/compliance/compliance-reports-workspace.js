/**
 * Reports & Investigation Workspace — Compliance Domain
 * Tabs: Audit Report · Investigation Summary · Regulatory Export
 *
 * PERF: Tab 1 eager, tabs 2-3 lazy-loaded on click.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
// Tab 1: eager
import { renderPage as renderAuditReport, initPage as initAuditReport } from './audit-report.js';
// Tabs 2-3: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

export function renderPage() {
    const regulatory = { _mod: null };
    const regRender = () => import('./regulatory-export.js').then(m => { regulatory._mod = m; return m.renderPage(); });
    const regInit = () => { if (regulatory._mod?.initPage) regulatory._mod.initPage(); };

    return renderWorkspace({
        domain: 'compliance-reports',
        title: 'Reports & Investigation',
        subtitle: 'Audit Report · Investigation Summary · Regulatory Export',
        icon: icon('clipboard', 24),
        tabs: [
            { id: 'audit', label: 'Audit Report', icon: icon('scroll', 14), render: renderAuditReport, init: initAuditReport },
            { id: 'investigation', label: 'Investigation', icon: icon('search', 14), render: lazy(() => import('./investigation-summary.js')) },
            { id: 'regulatory', label: 'Regulatory Export', icon: icon('globe', 14), render: regRender, init: regInit },
        ],
    });
}
