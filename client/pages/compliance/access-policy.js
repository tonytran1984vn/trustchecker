/** Compliance – Access Policy — Access control policies & retention settings */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

export function renderPage() {
  const retPolicies = State._compliancePolicies?.policies || [];
  const gaps = State._complianceGaps?.gaps || [];

  // Built-in access control policies
  const accessControls = [
    { name: 'Role-Based Access Control (RBAC)', type: 'Authorization', description: 'Multi-level role hierarchy: super_admin, org_owner, admin, compliance_officer, risk_officer, ops_manager, carbon_officer, executive', status: 'active', enforced: true },
    { name: 'JWT Session Management', type: 'Authentication', description: 'Short-lived access tokens + secure refresh tokens. Sessions expire after inactivity.', status: 'active', enforced: true },
    { name: 'Multi-Factor Authentication', type: 'Authentication', description: 'TOTP + WebAuthn/Passkey support for elevated account security', status: 'active', enforced: false },
    { name: 'Permission-Based API Access', type: 'Authorization', description: 'Fine-grained permissions: compliance:manage, products:write, risk:view, etc.', status: 'active', enforced: true },
    { name: 'Organization Data Isolation', type: 'Data Access', description: 'org_id filtering on all queries ensures cross-tenant data isolation', status: 'active', enforced: true },
    { name: 'Rate Limiting', type: 'Protection', description: 'Per-route rate limits to prevent abuse. API: 100/15min, Auth: 5/15min', status: 'active', enforced: true },
    { name: 'IP-Based Session Tracking', type: 'Monitoring', description: 'New IP login detection with audit logging', status: 'active', enforced: true },
  ];

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('key', 28)} Access Policies</h1>
      <div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${accessControls.length} controls active</span></div>
    </div>

    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${_m('Access Controls', accessControls.length, 'configured', 'blue', 'key')}
      ${_m('Active', accessControls.filter(p => p.status === 'active').length, '', 'green', 'checkCircle')}
      ${_m('Enforced', accessControls.filter(p => p.enforced).length, '', 'teal', 'shield')}
      ${_m('Retention Policies', retPolicies.length, 'data policies', 'purple', 'database')}
    </div>

    <div class="sa-card" style="margin-bottom:1.5rem">
      <h3 style="margin-bottom:1rem">${icon('shield', 18)} Active Access Controls</h3>
      <table class="sa-table"><thead><tr><th>Control</th><th>Type</th><th>Description</th><th>Status</th><th>Enforced</th></tr></thead>
      <tbody>${accessControls.map(p => `<tr>
        <td style="font-weight:600;font-size:0.78rem">${p.name}</td>
        <td><span class="sa-code" style="font-size:0.72rem">${p.type}</span></td>
        <td style="font-size:0.75rem;color:var(--text-secondary);max-width:300px">${p.description}</td>
        <td><span class="sa-status-pill sa-pill-green">${p.status}</span></td>
        <td>${p.enforced ? '✅' : '⚙️'}</td>
      </tr>`).join('')}</tbody></table>
    </div>

    ${retPolicies.length > 0 ? `<div class="sa-card">
      <h3 style="margin-bottom:1rem">${icon('database', 18)} Data Retention Rules (${retPolicies.length})</h3>
      <table class="sa-table"><thead><tr><th>Table</th><th>Retention</th><th>Action</th><th>Active</th></tr></thead>
      <tbody>${retPolicies.map(p => `<tr>
        <td style="font-weight:600"><span class="sa-code" style="font-size:0.72rem">${p.table_name || p.table || '—'}</span></td>
        <td>${p.retention_days || p.days || '—'} days</td>
        <td><span class="sa-status-pill sa-pill-${p.action === 'delete' ? 'red' : 'orange'}" style="font-size:0.7rem">${p.action || 'archive'}</span></td>
        <td>${(p.is_active !== false && p.is_active !== 0) ? '✅' : '❌'}</td>
      </tr>`).join('')}</tbody></table>
    </div>` : ''}
  </div>`;
}

function _m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`; }
