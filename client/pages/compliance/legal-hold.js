/** Compliance – Legal Hold — reads from /api/audit/verify-chain */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let _d = null;
async function load() { if (_d) return; try { _d = await fetch('/api/audit/verify-chain', { headers: { 'Authorization': 'Bearer ' + State.token } }).then(r => r.json()); } catch { _d = {}; } }
load();
export function renderPage() {
  const chain = _d || {};
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('lock', 28)} Legal Hold</h1></div>
    <div class="sa-card"><h3>Audit Chain Verification</h3>
      <div class="sa-metrics-row">
        ${m('Chain Valid', chain.valid ? '✅ Yes' : '❌ No', '', chain.valid ? 'green' : 'red', 'check')}
        ${m('Total Blocks', chain.block_count || chain.total || '—', '', 'blue', 'scroll')}
        ${m('Integrity', chain.integrity_score || '—', '', 'green', 'shield')}
      </div>
      <p style="color:var(--text-secondary);font-size:0.85rem;margin-top:1rem">${chain.message || 'Audit chain provides tamper-proof evidence for legal proceedings.'}</p>
    </div></div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
