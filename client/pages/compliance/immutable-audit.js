/** Compliance – Immutable Audit — reads from State._auditChain */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._auditChain || {}; const c = D.chain || {}; const s = D.stats || {};
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('scroll', 28)} Immutable Audit Trail</h1></div>
    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${m('Chain Valid', c.valid ? '✅' : '❌', '', c.valid ? 'green' : 'red', 'check')}
      ${m('Total Blocks', c.block_count || s.total || '—', '', 'blue', 'scroll')}
      ${m('Integrity', c.integrity_score || '—', '', 'green', 'shield')}
      ${m('Last Verified', c.verified_at ? new Date(c.verified_at).toLocaleDateString() : '—', '', 'blue', 'clock')}
    </div>
    <div class="sa-card"><h3>Hash Chain Details</h3>
      <p style="color:var(--text-secondary);font-size:0.85rem">${c.message || 'Tamper-evident logging for all system operations.'}</p>
      ${c.latest_hash ? `<div style="margin-top:0.5rem"><span style="color:var(--text-secondary);font-size:0.72rem">Latest Hash:</span> <code style="font-size:0.7rem;color:#22c55e">${c.latest_hash}</code></div>` : ''}
    </div></div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
