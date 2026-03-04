/** Compliance – SoD Matrix — reads from State._compliancePolicies + State._complianceGaps */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const policies = State._compliancePolicies?.policies || [];
  const gaps = State._complianceGaps?.gaps || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('shield', 28)} Separation of Duties (SoD)</h1></div>
    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${m('Policies', policies.length, '', 'blue', 'shield')}
      ${m('Gaps', gaps.length, '', gaps.length > 0 ? 'orange' : 'green', 'alertTriangle')}
    </div>
    <div class="sa-card"><h3>SoD Controls</h3>
      ${policies.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No policies</p>' : `
      <table class="sa-table"><thead><tr><th>Policy</th><th>Type</th><th>Status</th><th>Enforced</th></tr></thead>
      <tbody>${policies.map(p => `<tr><td style="font-weight:600">${p.name || '—'}</td><td class="sa-code">${p.type || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${p.status === 'active' ? 'green' : 'orange'}">${p.status || '—'}</span></td><td>${p.enforced !== false ? '✅' : '❌'}</td></tr>`).join('')}</tbody></table>`}
    </div></div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
