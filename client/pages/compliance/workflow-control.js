/** Compliance – Workflow Control — Approval workflows & operational controls */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

export function renderPage() {
  const retPolicies = State._compliancePolicies?.policies || [];

  // Built-in workflow controls
  const workflows = [
    { name: 'Dual Approval for Deletions', type: 'Approval', description: 'GDPR data deletion requires password re-authentication before execution', status: 'active', enforced: true },
    { name: 'Retention Policy Execution', type: 'Scheduled', description: 'Automated data retention sweep runs per active policies. Manual trigger available.', status: 'active', enforced: true },
    { name: 'Evidence Upload Verification', type: 'Validation', description: 'SHA-256 hash chain seals every uploaded evidence item for tamper detection', status: 'active', enforced: true },
    { name: 'QR Code Generation Audit', type: 'Audit', description: 'Every QR code generation is logged with product details and actor identity', status: 'active', enforced: true },
    { name: 'Role Assignment Control', type: 'Approval', description: 'Role changes are audit-logged. Super admin actions require elevated access.', status: 'active', enforced: true },
    { name: 'Compliance Report Generation', type: 'Reporting', description: 'Automated GDPR compliance report with consent rates, data subject requests, and retention status', status: 'active', enforced: true },
    { name: 'Incident Escalation Workflow', type: 'Escalation', description: 'Risk alerts auto-escalate to compliance officer based on severity thresholds', status: 'active', enforced: false },
  ];

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('gitBranch', 28)} Workflow Control</h1>
      <div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${workflows.length} workflows</span></div>
    </div>

    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${_m('Workflows', workflows.length, 'configured', 'blue', 'gitBranch')}
      ${_m('Enforced', workflows.filter(w => w.enforced).length, '', 'green', 'checkCircle')}
      ${_m('Advisory', workflows.filter(w => !w.enforced).length, '', 'orange', 'info')}
      ${_m('Retention Rules', retPolicies.length, 'data policies', 'purple', 'database')}
    </div>

    <div class="sa-card" style="margin-bottom:1.5rem">
      <h3 style="margin-bottom:1rem">${icon('gitBranch', 18)} Active Workflows</h3>
      <table class="sa-table"><thead><tr><th>Workflow</th><th>Type</th><th>Description</th><th>Status</th><th>Enforced</th></tr></thead>
      <tbody>${workflows.map(w => `<tr>
        <td style="font-weight:600;font-size:0.78rem">${w.name}</td>
        <td><span class="sa-code" style="font-size:0.72rem">${w.type}</span></td>
        <td style="font-size:0.75rem;color:var(--text-secondary);max-width:300px">${w.description}</td>
        <td><span class="sa-status-pill sa-pill-green">${w.status}</span></td>
        <td>${w.enforced ? '✅' : '⚙️'}</td>
      </tr>`).join('')}</tbody></table>
    </div>

    <div class="sa-card">
      <h3 style="margin-bottom:0.75rem">${icon('info', 18)} Workflow Architecture</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;font-size:0.78rem">
        <div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px">
          <div style="font-weight:700;margin-bottom:0.25rem">🔄 Automation</div>
          <div style="color:var(--text-secondary)">Retention sweeps, compliance checks, and report generation run on schedule</div>
        </div>
        <div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px">
          <div style="font-weight:700;margin-bottom:0.25rem">🔐 Gate Control</div>
          <div style="color:var(--text-secondary)">Sensitive operations require re-authentication or dual authorization</div>
        </div>
        <div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px">
          <div style="font-weight:700;margin-bottom:0.25rem">📋 Audit Trail</div>
          <div style="color:var(--text-secondary)">Every workflow execution is immutably logged with actor, timestamp, and outcome</div>
        </div>
      </div>
    </div>
  </div>`;
}

function _m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`; }
