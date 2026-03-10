/**
 * Reports & Investigation Workspace — Compliance Domain
 * Tabs: Audit Report · Investigation Summary · Regulatory Export
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderAuditReport } from './audit-report.js';
import { renderPage as renderInvestigationSummary } from './investigation-summary.js';
import { renderPage as renderRegulatoryExport } from './regulatory-export.js';

export function renderPage() {
    return renderWorkspace({
        domain: 'compliance-reports',
        title: 'Reports & Investigation',
        subtitle: 'Audit Report · Investigation Summary · Regulatory Export',
        icon: icon('clipboard', 24),
        tabs: [
            { id: 'audit', label: 'Audit Report', icon: icon('scroll', 14), render: renderAuditReport },
            { id: 'investigation', label: 'Investigation', icon: icon('search', 14), render: renderInvestigationSummary },
            { id: 'regulatory', label: 'Regulatory Export', icon: icon('globe', 14), render: renderRegulatoryExport },
        ],
    });
}
