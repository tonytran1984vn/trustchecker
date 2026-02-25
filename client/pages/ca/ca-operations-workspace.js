/**
 * Operations Workspace — CA Domain (Supply Chain & Production)
 * Tabs: Products | Batches | Supply Network | Traceability | Verification | Carbon
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderProducts } from '../products.js';
import { renderPage as renderBatches } from './batches.js';
import { renderPage as renderNodes } from './nodes.js';
import { renderPage as renderTraceability } from './traceability.js';
import { renderPage as renderScans } from '../scans.js';
import { renderPage as renderCarbon } from '../scm/carbon.js';

export function renderPage() {
    return renderWorkspace({
        domain: 'ca-operations',
        title: 'Operations',
        subtitle: 'Products · Supply chain · Traceability · Carbon',
        icon: icon('products', 24),
        tabs: [
            { id: 'products', label: 'Products', icon: icon('products', 14), render: renderProducts },
            { id: 'batches', label: 'Batches', icon: icon('clipboard', 14), render: renderBatches },
            { id: 'supply', label: 'Supply Network', icon: icon('factory', 14), render: renderNodes },
            { id: 'traceability', label: 'Traceability', icon: icon('search', 14), render: renderTraceability },
            { id: 'verification', label: 'Verification', icon: icon('check', 14), render: renderScans },
            { id: 'carbon', label: 'Carbon', icon: icon('globe', 14), render: renderCarbon },
        ],
    });
}
