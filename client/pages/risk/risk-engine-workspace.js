/**
 * Risk Engine Workspace — Risk Domain
 * Tabs: Scoring Engine · Decision Engine · Case Workflow · Model Governance · Forensic Investigation
 *
 * PERF: Tab 1 eager, tabs 2-5 lazy-loaded on click.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
// Tab 1: eager
import { renderPage as renderScoringEngine } from './scoring-engine.js';
// Tabs 2-5: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

export function renderPage() {
    return renderWorkspace({
        domain: 'risk-engine-ws',
        title: 'Risk Engine',
        subtitle: 'Scoring · Decision logic · Workflow · Model governance · Forensic investigation',
        icon: icon('brain', 24),
        tabs: [
            { id: 'scoring', label: 'Scoring Engine', icon: icon('target', 14), render: renderScoringEngine },
            { id: 'decision', label: 'Decision Engine', icon: icon('zap', 14), render: lazy(() => import('./decision-engine.js')) },
            { id: 'workflow', label: 'Case Workflow', icon: icon('workflow', 14), render: lazy(() => import('./case-workflow.js')) },
            { id: 'governance', label: 'Model Governance', icon: icon('settings', 14), render: lazy(() => import('./model-governance.js')) },
            { id: 'forensic', label: 'Forensic Investigation', icon: icon('search', 14), render: lazy(() => import('./forensic-investigation.js')) },
        ],
    });
}
