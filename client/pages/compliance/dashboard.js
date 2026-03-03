/**
 * Compliance – Dashboard
 * Reads from /api/compliance/stats + /api/compliance/report + /api/compliance-regtech/gaps
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let D = {};
async function load() {
  const h = { 'Authorization': 'Bearer ' + State.token };
  const [stats, report, gaps] = await Promise.all([
    fetch('/api/compliance/stats', { headers: h }).then(r => r.json()).catch(() => ({})),
    fetch('/api/compliance/report', { headers: h }).then(r => r.json()).catch(() => ({})),
    fetch('/api/compliance-regtech/gaps', { headers: h }).then(r => r.json()).catch(() => ({})),
  ]);
  D = { stats, report, gaps: gaps.gaps || [] };
}
export function renderPage() {
  load();
  const s = D.stats || {};
  const r = D.report || {};
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('dashboard', 28)} Compliance Dashboard</h1></div>
      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Compliance Score', s.compliance_score || r.compliance_score || '—', '', 'green', 'shield')}
        ${m('Policies Active', s.total_policies || s.active_policies || '—', '', 'blue', 'scroll')}
        ${m('Gaps Found', D.gaps.length, '', D.gaps.length > 0 ? 'orange' : 'green', 'alertTriangle')}
        ${m('Audit Records', s.total_records || s.audit_count || '—', '', 'blue', 'search')}
      </div>
      ${D.gaps.length > 0 ? `<div class="sa-card" style="margin-bottom:1.5rem"><h3>${icon('alertTriangle', 16)} Compliance Gaps</h3>
        <table class="sa-table"><thead><tr><th>Gap</th><th>Framework</th><th>Priority</th><th>Status</th></tr></thead>
        <tbody>${D.gaps.map(g => `<tr>
          <td style="font-weight:600">${g.description || g.gap || '—'}</td>
          <td class="sa-code">${g.framework || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${g.priority === 'high' ? 'red' : g.priority === 'medium' ? 'orange' : 'blue'}">${g.priority || '—'}</span></td>
          <td>${g.status || '—'}</td>
        </tr>`).join('')}</tbody></table></div>` : ''}
      <div class="sa-card"><h3>Summary</h3>
        <p style="color:var(--text-secondary);font-size:0.85rem">${r.summary || r.description || 'Compliance report data available via API. Run full assessment for detailed results.'}</p>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
