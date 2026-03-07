/**
 * Risk Engine Workspace — Risk Domain
 * Tabs: Scoring Engine · Decision Engine · Case Workflow · Model Governance · Forensic Investigation
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderScoringEngine } from './scoring-engine.js';
import { renderPage as renderDecisionEngine } from './decision-engine.js';
import { renderPage as renderCaseWorkflow } from './case-workflow.js';
import { renderPage as renderModelGovernance } from './model-governance.js';
import { renderPage as renderForensic } from './forensic-investigation.js';

export function renderPage() {
    return renderWorkspace({
        domain: 'risk-engine-ws',
        title: 'Risk Engine',
        subtitle: 'Scoring · Decision logic · Workflow · Model governance · Forensic investigation',
        icon: icon('brain', 24),
        tabs: [
            { id: 'scoring', label: 'Scoring Engine', icon: icon('target', 14), render: renderScoringEngine },
            { id: 'decision', label: 'Decision Engine', icon: icon('zap', 14), render: renderDecisionEngine },
            { id: 'workflow', label: 'Case Workflow', icon: icon('workflow', 14), render: renderCaseWorkflow },
            { id: 'governance', label: 'Model Governance', icon: icon('settings', 14), render: renderModelGovernance },
            { id: 'forensic', label: 'Forensic Investigation', icon: icon('search', 14), render: renderForensic },
        ],
    });
}
