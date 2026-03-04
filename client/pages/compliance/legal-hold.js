/** Compliance – Legal Hold — reads from State._auditChain */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._auditChain || {}; const c = D.chain || {}; const s = D.stats || {};
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('lock', 28)} Legal Hold</h1></div>
    <div class="sa-card"><h3>Audit Chain Verification</h3>
      <div class="sa-metrics-row">
        ${m('Chain Valid', c.valid ? '✅ Yes' : '❌ No', '', c.valid ? 'green' : 'red', 'check')}
        ${m('Total Blocks', c.block_count || s.total || '—', '', 'blue', 'scroll')}
        ${m('Integrity', c.integrity_score || '—', '', 'green', 'shield')}
      </div>
      <p style="color:var(--text-secondary);font-size:0.85rem;margin-top:1rem">${c.message || 'Tamper-proof evidence for legal proceedings.'}</p>
    </div></div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
