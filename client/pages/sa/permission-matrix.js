/**
 * SuperAdmin – Permission Matrix (120+ atomic permissions × roles)
 */
import { icon } from '../../core/icons.js';

const DOMAINS = {
  operations: {
    label: '🏭 Operations',
    permissions: [
      'batch.create', 'batch.view', 'batch.edit', 'batch.delete', 'batch.transfer.initiate', 'batch.transfer.approve',
      'batch.split', 'batch.merge', 'batch.recall', 'batch.destroy',
      'qr.generate', 'qr.view', 'qr.deactivate', 'qr.bulk.generate',
      'node.create', 'node.edit', 'node.delete', 'node.view',
      'transfer.create', 'transfer.approve', 'transfer.reject', 'transfer.view',
      'product.create', 'product.edit', 'product.delete', 'product.view',
    ],
  },
  risk: {
    label: '🚨 Risk',
    permissions: [
      'risk.rule.create', 'risk.rule.edit', 'risk.rule.delete', 'risk.rule.activate',
      'risk.case.create', 'risk.case.view', 'risk.case.assign', 'risk.case.close', 'risk.case.escalate',
      'fraud.alert.view', 'fraud.alert.dismiss', 'fraud.alert.escalate',
      'risk.report.view', 'risk.report.export', 'risk.score.override',
    ],
  },
  compliance: {
    label: '📋 Compliance',
    permissions: [
      'audit.log.view', 'audit.log.export', 'audit.log.search',
      'compliance.report.create', 'compliance.report.view', 'compliance.report.export',
      'compliance.policy.create', 'compliance.policy.edit', 'compliance.policy.approve',
      'legal.hold.create', 'legal.hold.release', 'legal.hold.view',
      'sod.rule.create', 'sod.rule.edit', 'sod.matrix.view',
      'investigation.create', 'investigation.view', 'investigation.close',
    ],
  },
  identity: {
    label: '👥 Identity & Access',
    permissions: [
      'user.create', 'user.edit', 'user.delete', 'user.suspend', 'user.view',
      'role.create', 'role.edit', 'role.delete', 'role.assign', 'role.view',
      'permission.assign', 'permission.revoke',
      'sso.config', 'sso.test', 'scim.config', 'scim.sync',
      'domain.verify', 'domain.delete',
      'mfa.enforce', 'mfa.reset',
    ],
  },
  integration: {
    label: '🔗 Integration',
    permissions: [
      'api.key.create', 'api.key.rotate', 'api.key.revoke', 'api.key.view',
      'oauth.client.create', 'oauth.client.edit', 'oauth.client.delete',
      'webhook.create', 'webhook.edit', 'webhook.delete', 'webhook.test',
      'erp.connect', 'erp.disconnect', 'erp.sync',
      'integration.log.view', 'integration.log.export',
    ],
  },
  security: {
    label: '🔐 Security',
    permissions: [
      'security.ip.whitelist', 'security.ip.blacklist',
      'security.geo.config', 'security.vpn.config',
      'security.session.config', 'security.device.trust',
      'security.conditional.access', 'security.incident.view',
      'security.certificate.upload', 'security.certificate.rotate',
    ],
  },
  data: {
    label: '🗄 Data Governance',
    permissions: [
      'data.export.initiate', 'data.export.approve', 'data.export.view',
      'data.retention.config', 'data.masking.config',
      'data.backup.create', 'data.backup.restore',
      'data.sandbox.create', 'data.sandbox.reset',
      'data.pii.access', 'data.pii.mask',
    ],
  },
  system: {
    label: '⚙ System',
    permissions: [
      'config.branding', 'config.email', 'config.notification',
      'billing.view', 'billing.manage', 'billing.invoice.download',
      'tenant.settings', 'tenant.plan.change',
      'system.health.view', 'system.sla.config',
      'system.status.publish', 'system.escalation.config',
    ],
  },
};

const ROLES = [
  { key: 'ops_sup', label: 'Ops Supervisor' },
  { key: 'ops_op', label: 'Operator' },
  { key: 'risk_mgr', label: 'Risk Manager' },
  { key: 'risk_analyst', label: 'Risk Analyst' },
  { key: 'comp_off', label: 'Compliance Officer' },
  { key: 'comp_aud', label: 'Auditor' },
  { key: 'it_sec', label: 'IT Security' },
  { key: 'it_integ', label: 'Integration Admin' },
  { key: 'exec', label: 'Executive' },
  { key: 'admin', label: 'Company Admin' },
];

// Simple permission assignment : role key → domain prefix
const ROLE_PERMS = {
  ops_sup: ['operations', 'data'],
  ops_op: ['operations'],
  risk_mgr: ['risk'],
  risk_analyst: ['risk'],
  comp_off: ['compliance', 'data'],
  comp_aud: ['compliance'],
  it_sec: ['security', 'identity', 'integration'],
  it_integ: ['integration'],
  exec: [],
  admin: ['identity', 'system'],
};

export function renderPage() {
  const totalPerms = Object.values(DOMAINS).reduce((s, d) => s + d.permissions.length, 0);
  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('shield', 28)} Permission Matrix</h1>
        <div class="sa-title-actions">
          <span style="font-size:0.78rem;color:var(--text-secondary)">${totalPerms} permissions × ${ROLES.length} roles</span>
          <button class="btn btn-outline btn-sm">Export CSV</button>
        </div>
      </div>

      ${Object.entries(DOMAINS).map(([domainKey, domain]) => `
        <div class="sa-card" style="margin-bottom:1rem;overflow-x:auto">
          <h3>${domain.label} <span style="font-size:0.72rem;color:var(--text-secondary)">(${domain.permissions.length} permissions)</span></h3>
          <table class="sa-table" style="font-size:0.72rem;text-align:center;white-space:nowrap">
            <thead><tr><th style="text-align:left;min-width:200px">Permission</th>${ROLES.map(r => `<th style="writing-mode:vertical-lr;transform:rotate(180deg);height:90px;font-size:0.65rem">${r.label}</th>`).join('')}</tr></thead>
            <tbody>
              ${domain.permissions.map(p => `<tr>
                <td style="text-align:left;font-family:monospace;font-size:0.7rem">${p}</td>
                ${ROLES.map(r => {
                  const has = (ROLE_PERMS[r.key] || []).includes(domainKey);
                  const isRead = p.includes('.view') || p.includes('.search');
                  const show = has || (r.key === 'exec' && isRead);
                  return `<td>${show ? '<span class="sa-perm-yes" style="color:#22c55e;font-weight:bold"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '<span style="color:#334155">—</span>'}</td>`;
                }).join('')}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}
    </div>`;
}
