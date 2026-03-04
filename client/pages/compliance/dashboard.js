/** Compliance – Dashboard — reads from State._complianceData */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._complianceData || {};
  const stats = D.stats || {};
  const gaps = D.gaps || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('shield', 28)} Compliance Dashboard</h1></div>
    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${m('Compliance Score', stats.compliance_score || stats.score || '—', '', 'green', 'shield')}
      ${m('Policies', stats.total_policies || stats.policies || '—', '', 'blue', 'scroll')}
      ${m('Gaps Found', gaps.length, gaps.length > 0 ? 'Review required' : 'Fully compliant', gaps.length > 0 ? 'orange' : 'green', 'alertTriangle')}
    </div>
    <div class="sa-card"><h3>Compliance Gaps</h3>
      ${gaps.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:1rem">No gaps identified</p>' :
      gaps.map(g => `<div style="padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;justify-content:space-between">
          <span style="font-weight:600">${g.requirement || g.gap || g.name || '—'}</span>
          <span class="sa-status-pill sa-pill-${g.severity === 'high' ? 'red' : 'orange'}">${g.severity || g.status || '—'}</span></div>`).join('')}
    </div></div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
