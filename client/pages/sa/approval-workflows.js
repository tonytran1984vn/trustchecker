/**
 * SuperAdmin – Approval Workflows (4-Eyes / 6-Eyes Engine)
 */
import { icon } from '../../core/icons.js';

const WORKFLOWS = [
    // 4-Eyes (dual approval)
    { id: 'WF-001', name: 'Batch Transfer', trigger: 'batch.transfer.initiate', condition: 'quantity > 1000 OR value > $10,000', eyes: 4, approvers: 'Ops Supervisor + Risk Manager', sla: '4h', status: 'active' },
    { id: 'WF-002', name: 'Risk Rule Change', trigger: 'risk.rule.edit', condition: 'All changes', eyes: 4, approvers: 'Risk Manager + Compliance Officer', sla: '8h', status: 'active' },
    { id: 'WF-003', name: 'Role Escalation', trigger: 'role.assign (privileged)', condition: 'Target role: admin, risk_officer, compliance_officer', eyes: 4, approvers: 'Company Admin + IT Security', sla: '24h', status: 'active' },
    { id: 'WF-004', name: 'User Suspension', trigger: 'user.suspend', condition: 'All users', eyes: 4, approvers: 'Company Admin + HR representative', sla: '2h', status: 'active' },
    { id: 'WF-005', name: 'Data Export (PII)', trigger: 'data.export.initiate', condition: 'Contains PII fields', eyes: 4, approvers: 'Compliance Officer + Data Owner', sla: '24h', status: 'active' },
    // 6-Eyes (triple approval)
    { id: 'WF-006', name: 'Compliance Policy Change', trigger: 'compliance.policy.edit', condition: 'All policy documents', eyes: 6, approvers: 'Compliance + Risk + Executive', sla: '48h', status: 'active' },
    { id: 'WF-007', name: 'Encryption Key Rotation', trigger: 'security.certificate.rotate', condition: 'Production keys only', eyes: 6, approvers: 'IT Security + Compliance + Executive', sla: '72h', status: 'active' },
    { id: 'WF-008', name: 'Legal Hold Release', trigger: 'legal.hold.release', condition: 'All holds', eyes: 6, approvers: 'Legal + Compliance + Executive', sla: '72h', status: 'active' },
    { id: 'WF-009', name: 'SoD Override', trigger: 'sod.rule.exception', condition: 'Temporary override', eyes: 6, approvers: 'Compliance + Risk + IT Security', sla: '24h', status: 'active' },
];

const PENDING = [
    { id: 'APR-1201', workflow: 'WF-001', action: 'Batch transfer B-2026-0895 (2,500 units)', requester: 'ops@company.com', step: '1/2', waiting: 'Risk Manager', elapsed: '1h 20m', sla: '4h' },
    { id: 'APR-1200', workflow: 'WF-002', action: 'Risk rule #52 threshold change: 85→70', requester: 'risk-analyst@company.com', step: '1/2', waiting: 'Compliance Officer', elapsed: '3h 45m', sla: '8h' },
    { id: 'APR-1198', workflow: 'WF-006', action: 'Anti-fraud policy v3.2 update', requester: 'compliance@company.com', step: '2/3', waiting: 'Executive', elapsed: '18h', sla: '48h' },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('workflow', 28)} Approval Workflows</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Create Workflow</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${metric('Active Workflows', WORKFLOWS.length, `${WORKFLOWS.filter(w => w.eyes === 4).length} × 4-Eyes · ${WORKFLOWS.filter(w => w.eyes === 6).length} × 6-Eyes`, 'blue', 'workflow')}
        ${metric('Pending Approvals', PENDING.length, '1 approaching SLA', 'orange', 'clock')}
        ${metric('Approved (7d)', '24', 'Avg time: 3.2h', 'green', 'check')}
        ${metric('SLA Breaches', '0', 'Last 30 days', 'green', 'shield')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>⏳ Pending Approvals</h3>
        <table class="sa-table"><thead><tr><th>ID</th><th>Workflow</th><th>Action</th><th>Requester</th><th>Step</th><th>Waiting For</th><th>Elapsed</th><th>SLA</th><th>Actions</th></tr></thead><tbody>
          ${PENDING.map(p => {
        const pct = parseFloat(p.elapsed) / parseFloat(p.sla) * 100;
        const urgent = pct > 70;
        return `<tr class="${urgent ? 'ops-alert-row' : ''}">
              <td class="sa-code">${p.id}</td><td class="sa-code" style="font-size:0.72rem">${p.workflow}</td>
              <td style="font-size:0.78rem">${p.action}</td><td>${p.requester}</td>
              <td><strong>${p.step}</strong></td><td>${p.waiting}</td>
              <td style="color:${urgent ? '#ef4444' : 'var(--text-secondary)'}">${p.elapsed}</td><td>${p.sla}</td>
              <td><button class="btn btn-xs btn-outline">Review</button></td>
            </tr>`;
    }).join('')}
        </tbody></table>
      </div>

      <div class="sa-card" style="margin-bottom:1rem">
        <h3>👁 4-Eyes Workflows (Dual Approval)</h3>
        <table class="sa-table"><thead><tr><th>ID</th><th>Name</th><th>Trigger</th><th>Condition</th><th>Approvers</th><th>SLA</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${WORKFLOWS.filter(w => w.eyes === 4).map(wfRow).join('')}
        </tbody></table>
      </div>

      <div class="sa-card">
        <h3>👁👁 6-Eyes Workflows (Triple Approval — Critical)</h3>
        <table class="sa-table"><thead><tr><th>ID</th><th>Name</th><th>Trigger</th><th>Condition</th><th>Approvers</th><th>SLA</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${WORKFLOWS.filter(w => w.eyes === 6).map(wfRow).join('')}
        </tbody></table>
      </div>
    </div>`;
}

function wfRow(w) {
    return `<tr>
    <td class="sa-code">${w.id}</td><td><strong>${w.name}</strong></td>
    <td class="sa-code" style="font-size:0.7rem">${w.trigger}</td>
    <td style="font-size:0.78rem">${w.condition}</td>
    <td style="font-size:0.78rem">${w.approvers}</td><td>${w.sla}</td>
    <td><span class="sa-status-pill sa-pill-green">${w.status}</span></td>
    <td><button class="btn btn-xs btn-outline">Edit</button></td>
  </tr>`;
}

function metric(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
