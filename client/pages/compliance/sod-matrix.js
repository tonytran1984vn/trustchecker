/** Compliance – SoD Matrix — Separation of Duties */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

export function renderPage() {
  const policies = State._compliancePolicies?.policies || [];
  const gaps = State._complianceGaps?.gaps || [];
  const sodPolicies = policies.filter(p => p.type?.includes('sod') || p.type?.includes('separation') || p.category === 'sod');
  const displayPolicies = sodPolicies.length > 0 ? sodPolicies : policies;

  // Built-in SoD rules
  const sodRules = [
    { role1: 'data_entry', role2: 'approver', control: 'Data Entry ≠ Approval', status: 'enforced' },
    { role1: 'developer', role2: 'deployer', control: 'Dev ≠ Deploy', status: 'enforced' },
    { role1: 'requester', role2: 'approver', control: 'Request ≠ Approve', status: 'enforced' },
    { role1: 'admin', role2: 'auditor', control: 'Admin ≠ Audit', status: 'enforced' },
    { role1: 'risk_assessor', role2: 'risk_approver', control: 'Assess ≠ Approve Risk', status: 'advisory' },
    { role1: 'carbon_data_entry', role2: 'compliance_officer', control: 'CIE: Data ≠ Compliance', status: 'enforced' },
  ];

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('shield', 28)} Separation of Duties (SoD)</h1></div>

    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${_m('SoD Rules', sodRules.length, '', 'blue', 'shield')}
      ${_m('Enforced', sodRules.filter(r => r.status === 'enforced').length, '', 'green', 'checkCircle')}
      ${_m('Advisory', sodRules.filter(r => r.status === 'advisory').length, '', 'orange', 'info')}
      ${_m('Compliance Gaps', gaps.length, '', gaps.length > 0 ? 'red' : 'green', 'alertTriangle')}
    </div>

    <div class="sa-card" style="margin-bottom:1.5rem">
      <h3 style="margin-bottom:1rem">${icon('gitBranch', 18)} SoD Control Matrix</h3>
      <table class="sa-table"><thead><tr><th>Control</th><th>Role A</th><th>↔</th><th>Role B</th><th>Status</th></tr></thead>
      <tbody>${sodRules.map(r => `<tr>
        <td style="font-weight:600;font-size:0.78rem">${r.control}</td>
        <td><span class="sa-code" style="font-size:0.72rem">${r.role1}</span></td>
        <td style="text-align:center">🚫</td>
        <td><span class="sa-code" style="font-size:0.72rem">${r.role2}</span></td>
        <td><span class="sa-status-pill sa-pill-${r.status === 'enforced' ? 'green' : 'orange'}" style="font-size:0.7rem">${r.status}</span></td>
      </tr>`).join('')}</tbody></table>
    </div>

    ${gaps.length > 0 ? `<div class="sa-card" style="border:1px solid rgba(239,68,68,0.2)">
      <h3 style="margin-bottom:1rem;color:var(--accent-red,#ef4444)">${icon('alertTriangle', 18)} Identified Gaps</h3>
      <div style="display:grid;gap:0.5rem">
        ${gaps.map(g => `<div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem;background:rgba(239,68,68,0.03);border-radius:6px;border-left:3px solid var(--accent-red,#ef4444)">
          <span class="sa-status-pill sa-pill-${g.severity === 'critical' ? 'red' : 'orange'}" style="min-width:60px;text-align:center;font-size:0.68rem">${g.severity || 'medium'}</span>
          <div style="flex:1">
            <div style="font-weight:600;font-size:0.78rem">${g.framework || g.name || '—'}</div>
            <div style="font-size:0.7rem;color:var(--text-secondary)">${g.description || g.gap || '—'}</div>
          </div>
          <span style="font-size:0.72rem;color:var(--text-secondary)">${g.readiness || ''}</span>
        </div>`).join('')}
      </div>
    </div>` : `<div class="sa-card" style="border:1px solid rgba(16,185,129,0.2);background:rgba(16,185,129,0.03)">
      <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem">
        <span style="font-size:1.5rem">✅</span>
        <div><div style="font-weight:700;font-size:0.88rem">No SoD Violations Detected</div><div style="font-size:0.75rem;color:var(--text-secondary)">All separation of duties controls are properly enforced</div></div>
      </div>
    </div>`}
  </div>`;
}

function _m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`; }
