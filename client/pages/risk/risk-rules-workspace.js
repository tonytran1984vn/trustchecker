/**
 * Risk Rules Workspace — Risk Domain
 * Tabs: Duplicate Rules · Geo Rules · Velocity Rules · Auto Response
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderDuplicateRules } from './duplicate-rules.js';
import { renderPage as renderGeoRules } from './geo-rules.js';
import { renderPage as renderVelocityRules } from './velocity-rules.js';
import { renderPage as renderAutoResponse } from './auto-response.js';

export function renderPage() {
    return renderWorkspace({
        domain: 'risk-rules-ws',
        title: 'Risk Rules',
        subtitle: 'Detection rules · Geo-fencing · Velocity controls · Automated response',
        icon: icon('shield', 24),
        tabs: [
            { id: 'duplicate', label: 'Duplicate Rules', icon: icon('shield', 14), render: renderDuplicateRules },
            { id: 'geo', label: 'Geo Rules', icon: icon('globe', 14), render: renderGeoRules },
            { id: 'velocity', label: 'Velocity Rules', icon: icon('zap', 14), render: renderVelocityRules },
            { id: 'auto-response', label: 'Auto Response', icon: icon('settings', 14), render: renderAutoResponse },
        ],
    });
}
