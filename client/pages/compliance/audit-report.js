/** Compliance – Audit Report — reads from /api/compliance/report + /api/audit-log/stats */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let D = {};
async function load() {
  const h = { 'Authorization': 'Bearer ' + State.token };
  const [report, stats] = await Promise.all([
    fetch('/api/compliance/report', { headers: h }).then(r => r.json()).catch(() => ({})),
    fetch('/api/audit-log/stats', { headers: h }).then(r => r.json()).catch(() => ({})),
  ]);
  D = { report, stats };
}
export function renderPage() {
  load();
  const r = D.report || {};
  const s = D.stats || {};
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('scroll', 28)} Audit Report</h1></div>
    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${m('Compliance Score', r.compliance_score || '—', '', 'green', 'shield')}
      ${m('Total Events', s.total || s.total_entries || '—', '', 'blue', 'scroll')}
      ${m('Critical Events', s.critical || s.high_risk || '—', '', 'red', 'alert')}
    </div>
    <div class="sa-card"><h3>Report Summary</h3>
      <p style="color:var(--text-secondary);font-size:0.85rem">${r.summary || r.description || 'Audit report generated from compliance data. View individual sections for details.'}</p>
      ${r.sections ? r.sections.map(sec => `<div style="margin-top:1rem;padding:0.8rem;border:1px solid rgba(255,255,255,0.06);border-radius:8px"><h4 style="color:#f1f5f9;margin:0 0 4px">${sec.title || '—'}</h4><p style="color:var(--text-secondary);font-size:0.8rem;margin:0">${sec.content || sec.description || ''}</p></div>`).join('') : ''}
    </div></div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
