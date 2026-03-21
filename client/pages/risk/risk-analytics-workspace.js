/**
 * Analytics Workspace — Risk Domain
 * Tabs: Pattern Clusters · Distributor Risk · SKU Risk Ranking · Risk Heatmap
 *
 * PERF: Tab 1 eager, tabs 2-4 lazy-loaded on click.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
// Tab 1: eager
import { renderPage as renderPatternClusters } from './pattern-clusters.js';
// Tabs 2-4: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

export function renderPage() {
    return renderWorkspace({
        domain: 'risk-analytics-ws',
        title: 'Analytics',
        subtitle: 'Pattern analysis · Distribution risk · SKU intelligence · Heatmap',
        icon: icon('barChart', 24),
        tabs: [
            { id: 'patterns', label: 'Pattern Clusters', icon: icon('workflow', 14), render: renderPatternClusters },
            { id: 'distributor', label: 'Distributor Risk', icon: icon('network', 14), render: lazy(() => import('./distributor-risk.js')) },
            { id: 'sku', label: 'SKU Risk Ranking', icon: icon('products', 14), render: lazy(() => import('./sku-risk.js')) },
            { id: 'heatmap', label: 'Risk Heatmap', icon: icon('globe', 14), render: lazy(() => import('./heatmap.js')) },
        ],
    });
}
