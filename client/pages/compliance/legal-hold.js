/** Compliance – Legal Hold — Evidence preservation & blockchain integrity */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

export function renderPage() {
  const chain = State._auditChain?.chain || {};
  const stats = State._auditChain?.stats || {};
  const totalSeals = stats.total_seals || chain.total || 0;
  const hasChain = totalSeals > 0;
  const isValid = hasChain && chain.valid !== false && chain.integrity !== 'broken';

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('lock', 28)} Legal Hold & Preservation</h1></div>

    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${_m('Preservation Status', !hasChain ? 'Pending' : isValid ? 'Active' : 'Review Needed', '', !hasChain ? 'orange' : isValid ? 'green' : 'red', 'lock')}
      ${_m('Blockchain Seals', stats.total_seals || chain.total || 0, '', 'blue', 'link')}
      ${_m('Chain Integrity', !hasChain ? 'No Chain' : isValid ? 'Valid' : 'Broken', '', !hasChain ? 'orange' : isValid ? 'green' : 'red', 'shield')}
      ${_m('Audit Records', stats.total || 0, 'preserved', 'purple', 'scroll')}
    </div>

    <div class="sa-card" style="margin-bottom:1.5rem">
      <h3 style="margin-bottom:1rem">${icon('shield', 18)} Legal Preservation Framework</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem">
        ${_hold('Evidence Items', 'All uploaded evidence is hashed (SHA-256) and sealed on the blockchain chain', true)}
        ${_hold('Audit Trail', 'Complete action log with tamper-evident hash chain for non-repudiation', true)}
        ${_hold('Scan Events', 'QR scan validations preserved with device fingerprint, GPS, and timestamp', true)}
        ${_hold('Supply Chain', 'End-to-end supply chain events with partner attestations', true)}
        ${_hold('Financial Records', 'Billing, invoices, and transaction records preserved per retention policy', true)}
        ${_hold('GDPR Compliance', 'Data subject requests logged; deletions audited but blockchain seals retained', true)}
      </div>
    </div>

    <div class="sa-card">
      <h3 style="margin-bottom:1rem">${icon('info', 18)} Preservation Policies</h3>
      <div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.8">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div>
            <p><strong>🏛️ Regulatory Hold:</strong> All data subject to active regulatory investigation is preserved indefinitely until hold is lifted.</p>
            <p><strong>📋 Litigation Hold:</strong> When litigation is anticipated, all potentially relevant data is frozen from deletion or modification.</p>
          </div>
          <div>
            <p><strong>🔐 Integrity Guarantee:</strong> Blockchain seal chain ensures any tampering is immediately detectable.</p>
            <p><strong>📊 Export Ready:</strong> All preserved data can be exported in forensic-grade format via the Regulatory Export page.</p>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function _m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`; }
function _hold(title, desc, ok) { return `<div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;border-left:3px solid var(--accent-${ok ? 'green' : 'red'},#ccc)"><div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem"><span>${ok ? '✅' : '⚠️'}</span><span style="font-weight:700;font-size:0.78rem">${title}</span></div><div style="font-size:0.68rem;color:var(--text-secondary)">${desc}</div></div>`; }
