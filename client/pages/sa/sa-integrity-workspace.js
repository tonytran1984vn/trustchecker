/**
 * Integrity Workspace — SA Domain (Data Immutability)
 * Tabs: Sealing Policy | Key Management | Crypto Governance
 *
 * PERF: Tab 1 (Sealing Policy) loaded eagerly, tabs 2-3 lazy-loaded on click.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
// Tab 1: eager
import { renderPage as renderDataGov } from './data-governance.js';
// Tabs 2-3: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());

export function renderPage() {
    return renderWorkspace({
        domain: 'integrity',
        title: 'Integrity',
        subtitle: 'Data immutability · Chain health · Cryptographic governance',
        icon: icon('key', 24),
        tabs: [
            { id: 'data-gov', label: 'Sealing Policy', icon: icon('lock', 14), render: renderDataGov },
            { id: 'keys', label: 'Key Management', icon: icon('key', 14), render: lazy(() => import('./key-management.js')) },
            { id: 'crypto-gov', label: 'Crypto Governance', icon: icon('key', 14), render: lazy(() => import('../infra/cryptographic-governance.js')) },
        ],
    });
}
