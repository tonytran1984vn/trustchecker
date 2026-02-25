/**
 * Risk Workspace — CA Domain (Protection & Monitoring)
 * Tabs: Fraud | Incidents | Risk Rules | Scan Analytics | Supply Risk
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderFraud } from '../fraud.js';
import { renderPage as renderIncidents } from './incidents.js';
import { renderPage as renderRiskRules } from './risk-rules.js';
import { renderPage as renderScanAnalytics } from './scan-analytics.js';
import { renderPage as renderSupplyRisk } from './supply-route-engine.js';

export function renderPage() {
    return renderWorkspace({
        domain: 'ca-risk',
        title: 'Risk',
        subtitle: 'Fraud monitoring · Incidents · Risk intelligence',
        icon: icon('alert', 24),
        tabs: [
            { id: 'fraud', label: 'Fraud Monitoring', icon: icon('alert', 14), render: renderFraud },
            { id: 'incidents', label: 'Incidents', icon: icon('alertTriangle', 14), render: renderIncidents },
            { id: 'risk-rules', label: 'Risk Rules', icon: icon('target', 14), render: renderRiskRules },
            { id: 'scan-analytics', label: 'Scan Analytics', icon: icon('search', 14), render: renderScanAnalytics },
            { id: 'supply-risk', label: 'Supply Risk', icon: icon('network', 14), render: renderSupplyRisk },
        ],
    });
}
