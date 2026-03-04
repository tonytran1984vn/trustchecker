/** Compliance – Audit Report — reads from State._complianceReport */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._complianceReport || {};
  const r = D.report || {}; const s = D.stats || {};
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('scroll', 28)} Audit Report</h1></div>
    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${m('Compliance Score', r.compliance_score || '—', '', 'green', 'shield')}
      ${m('Total Events', s.total || s.total_entries || '—', '', 'blue', 'scroll')}
      ${m('Critical Events', s.critical || s.high_risk || '—', '', 'red', 'alert')}
    </div>
    <div class="sa-card"><h3>Report Summary</h3>
      <p style="color:var(--text-secondary);font-size:0.85rem">${r.summary || r.description || 'Generated from compliance records.'}</p>
    </div></div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
