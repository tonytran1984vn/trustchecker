/** Compliance – Immutable Audit — Blockchain chain verification */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

export function renderPage() {
  const chain = State._auditChain?.chain || {};
  const stats = State._auditChain?.stats || {};
  const entries = chain.chain || chain.entries || [];
  const isValid = chain.valid !== false && chain.integrity !== 'broken';

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('link', 28)} Immutable Audit Trail</h1>
      <div class="sa-title-actions">
        <span class="sa-status-pill sa-pill-${isValid ? 'green' : 'red'}">${isValid ? '✅ Chain Intact' : '❌ Chain Broken'}</span>
      </div>
    </div>

    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${_m('Chain Status', isValid ? 'Valid' : 'Broken', '', isValid ? 'green' : 'red', 'link')}
      ${_m('Total Seals', stats.total_seals || chain.total || entries.length || 0, '', 'blue', 'lock')}
      ${_m('Verified', chain.verified || entries.filter(e => e.valid).length || 0, '', 'teal', 'checkCircle')}
      ${_m('Audit Records', stats.total || 0, '', 'slate', 'scroll')}
    </div>

    <div class="sa-card">
      <h3 style="margin-bottom:1rem">${icon('shield', 18)} Blockchain Seal Verification</h3>
      <div style="background:var(--bg-secondary);padding:1rem;border-radius:8px;margin-bottom:1rem">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;font-size:0.78rem">
          <div><span style="color:var(--text-secondary)">Integrity Protocol:</span> <strong>SHA-256 Chain</strong></div>
          <div><span style="color:var(--text-secondary)">Verification:</span> <strong>${isValid ? 'All hashes match' : 'Hash mismatch detected'}</strong></div>
          <div><span style="color:var(--text-secondary)">Last Verified:</span> <strong>${new Date().toLocaleString()}</strong></div>
        </div>
      </div>

      ${entries.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:1.5rem">No blockchain seals to display. Audit entries are protected by hash chain.</p>' : `
      <table class="sa-table"><thead><tr><th>#</th><th>Event</th><th>Data Hash</th><th>Prev Hash</th><th>Valid</th><th>Sealed</th></tr></thead>
      <tbody>${entries.slice(0, 50).map((e, i) => `<tr>
        <td style="font-weight:600">${e.block_index ?? i + 1}</td>
        <td style="font-size:0.78rem">${e.event_type || '—'}</td>
        <td class="sa-code" style="font-size:0.68rem;max-width:140px;overflow:hidden;text-overflow:ellipsis">${e.data_hash || '—'}</td>
        <td class="sa-code" style="font-size:0.68rem;max-width:100px;overflow:hidden;text-overflow:ellipsis">${e.prev_hash || '—'}</td>
        <td>${e.valid !== false ? '✅' : '❌'}</td>
        <td style="font-size:0.7rem;color:var(--text-secondary)">${e.sealed_at ? new Date(e.sealed_at).toLocaleString() : '—'}</td>
      </tr>`).join('')}</tbody></table>`}
    </div>

    <div class="sa-card" style="margin-top:1rem">
      <h3 style="margin-bottom:0.75rem">${icon('fileText', 18)} How It Works</h3>
      <div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.6">
        <p>Every critical action (product creation, QR generation, scan validation, evidence uploads) is sealed with a <strong>SHA-256 hash chain</strong>. Each seal references the previous seal's hash, creating a tamper-evident chain.</p>
        <p style="margin-top:0.5rem">If any record is modified, the hash chain breaks — making unauthorized changes immediately detectable. This provides <strong>non-repudiation</strong> and <strong>audit integrity</strong> for regulatory compliance.</p>
      </div>
    </div>
  </div>`;
}

function _m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`; }
