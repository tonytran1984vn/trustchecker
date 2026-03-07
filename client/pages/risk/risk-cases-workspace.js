/**
 * Cases & Reports Workspace — Risk Domain
 * Tabs: Open Cases · Escalated · Closed · Reports
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderCasesOpen } from './cases-open.js';
import { renderPage as renderCasesEscalated } from './cases-escalated.js';
import { renderPage as renderCasesClosed } from './cases-closed.js';
import { renderPage as renderReports } from './reports.js';

export function renderPage() {
    return renderWorkspace({
        domain: 'risk-cases-ws',
        title: 'Cases & Reports',
        subtitle: 'Case management · Escalation · Resolution · Reporting',
        icon: icon('scroll', 24),
        tabs: [
            { id: 'open', label: 'Open Cases', icon: icon('alertTriangle', 14), render: renderCasesOpen },
            { id: 'escalated', label: 'Escalated', icon: icon('alert', 14), render: renderCasesEscalated },
            { id: 'closed', label: 'Closed', icon: icon('check', 14), render: renderCasesClosed },
            { id: 'reports', label: 'Reports', icon: icon('scroll', 14), render: renderReports },
        ],
    });
}
