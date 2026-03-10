/**
 * Policies & Controls Workspace — Compliance Domain
 * Tabs: Access Policy · Risk Policy · Workflow Control · Violation Log · SoD Matrix
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderAccessPolicy } from './access-policy.js';
import { renderPage as renderRiskPolicy } from './risk-policy.js';
import { renderPage as renderWorkflowControl } from './workflow-control.js';
import { renderPage as renderViolationLog } from './violation-log.js';
import { renderPage as renderSodMatrix } from './sod-matrix.js';

export function renderPage() {
    return renderWorkspace({
        domain: 'compliance-policies',
        title: 'Policies & Controls',
        subtitle: 'Access Policy · Risk Policy · Workflow Control · Violations · SoD',
        icon: icon('shield', 24),
        tabs: [
            { id: 'access', label: 'Access Policy', icon: icon('lock', 14), render: renderAccessPolicy },
            { id: 'risk', label: 'Risk Policy', icon: icon('alertTriangle', 14), render: renderRiskPolicy },
            { id: 'workflow', label: 'Workflow Control', icon: icon('workflow', 14), render: renderWorkflowControl },
            { id: 'violations', label: 'Violation Log', icon: icon('alert', 14), render: renderViolationLog },
            { id: 'sod', label: 'SoD Matrix', icon: icon('shield', 14), render: renderSodMatrix },
        ],
    });
}
