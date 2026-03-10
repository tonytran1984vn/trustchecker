/**
 * Legal & Integrity Workspace — Compliance Domain
 * Tabs: Legal Hold · Immutable Audit · GDPR Consent
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderLegalHold } from './legal-hold.js';
import { renderPage as renderImmutableAudit } from './immutable-audit.js';

// Simple GDPR consent tab
function renderGdprConsent() {
    return `<div class="sa-page">
        <div class="sa-page-title"><h1>⚖ GDPR Consent Management</h1></div>
        <div class="sa-card" style="text-align:center;padding:3rem">
            <p style="font-size:1.1rem;margin-bottom:1rem">GDPR consent tracking is managed through the Data Export page.</p>
            <button class="btn btn-primary" onclick="navigate('compliance-audit')">Go to Audit Trail → Data Export</button>
        </div>
    </div>`;
}

export function renderPage() {
    return renderWorkspace({
        domain: 'compliance-legal',
        title: 'Legal & Integrity',
        subtitle: 'Legal Hold · Immutable Audit · Evidence Integrity',
        icon: icon('lock', 24),
        tabs: [
            { id: 'hold', label: 'Legal Hold', icon: icon('lock', 14), render: renderLegalHold },
            { id: 'immutable', label: 'Immutable Audit', icon: icon('scroll', 14), render: renderImmutableAudit },
            { id: 'consent', label: 'GDPR Consent', icon: icon('users', 14), render: renderGdprConsent },
        ],
    });
}
