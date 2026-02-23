/**
 * Integrity Workspace — SA Domain (Data Immutability)
 * Tabs: Chain Health | Sealing Policy | Key Management | Crypto Governance
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderKeys } from './key-management.js';
import { renderPage as renderDataGov } from './data-governance.js';
import { renderPage as renderCryptoGov } from '../infra/cryptographic-governance.js';

export function renderPage() {
    return renderWorkspace({
        domain: 'integrity',
        title: 'Integrity',
        subtitle: 'Data immutability · Chain health · Cryptographic governance',
        icon: icon('key', 24),
        tabs: [
            { id: 'data-gov', label: 'Sealing Policy', icon: icon('lock', 14), render: renderDataGov },
            { id: 'keys', label: 'Key Management', icon: icon('key', 14), render: renderKeys },
            { id: 'crypto-gov', label: 'Crypto Governance', icon: icon('key', 14), render: renderCryptoGov },
        ],
    });
}
