/**
 * Analytics Workspace — Risk Domain
 * Tabs: Pattern Clusters · Distributor Risk · SKU Risk Ranking · Risk Heatmap
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderPatternClusters } from './pattern-clusters.js';
import { renderPage as renderDistributorRisk } from './distributor-risk.js';
import { renderPage as renderSkuRisk } from './sku-risk.js';
import { renderPage as renderHeatmap } from './heatmap.js';

export function renderPage() {
    return renderWorkspace({
        domain: 'risk-analytics-ws',
        title: 'Analytics',
        subtitle: 'Pattern analysis · Distribution risk · SKU intelligence · Heatmap',
        icon: icon('barChart', 24),
        tabs: [
            { id: 'patterns', label: 'Pattern Clusters', icon: icon('workflow', 14), render: renderPatternClusters },
            { id: 'distributor', label: 'Distributor Risk', icon: icon('network', 14), render: renderDistributorRisk },
            { id: 'sku', label: 'SKU Risk Ranking', icon: icon('products', 14), render: renderSkuRisk },
            { id: 'heatmap', label: 'Risk Heatmap', icon: icon('globe', 14), render: renderHeatmap },
        ],
    });
}
