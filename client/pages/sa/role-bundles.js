/**
 * SuperAdmin – Role Bundles (Starter / Growth / Enterprise presets)
 */
import { icon } from '../../core/icons.js';

const BUNDLES = [
    {
        name: 'Starter',
        target: 'SME (5–20 people)',
        description: '2 roles cover all needs. 1 person can manage business + basic security.',
        roles: [
            { role: 'admin', label: 'Business Admin', desc: 'Full tenant control: users, products, orders, batches, basic risk view' },
            { role: 'developer', label: 'Technical Admin', desc: 'Security, SSO, API keys, integrations, monitoring' },
        ],
        color: '#22c55e',
        users: '2–5 users',
    },
    {
        name: 'Growth',
        target: 'Mid-size (20–200 people)',
        description: 'Separate strategic, operational, risk, and technical concerns. Risk covers basic compliance.',
        roles: [
            { role: 'executive', label: 'CEO / Executive', desc: 'Read-only strategic dashboards, KPIs, financial overview' },
            { role: 'ops_manager', label: 'Ops Manager', desc: 'Supply chain, batches, nodes, QR operations' },
            { role: 'risk_officer', label: 'Risk + Compliance', desc: 'Fraud detection, risk rules, basic audit logs' },
            { role: 'developer', label: 'IT Admin', desc: 'Security, integrations, API management' },
        ],
        color: '#3b82f6',
        users: '5–20 users',
    },
    {
        name: 'Enterprise',
        target: 'Large org (200+ people)',
        description: 'Full separation of duties. Each function has dedicated personnel. Maximum governance & audit readiness.',
        roles: [
            { role: 'executive', label: 'CEO / Executive', desc: 'Strategic insight, board reporting' },
            { role: 'ops_manager', label: 'Ops Manager', desc: 'Operational flow, supply chain' },
            { role: 'risk_officer', label: 'Risk Officer', desc: 'Fraud control, risk rules, investigation' },
            { role: 'compliance_officer', label: 'Compliance Officer', desc: 'Governance, audit trail, regulatory' },
            { role: 'developer', label: 'IT Admin', desc: 'Security, SSO, API, monitoring' },
            { role: 'admin', label: 'Company Admin', desc: 'User management, branding, settings' },
        ],
        color: '#a855f7',
        users: '20+ users',
    },
];

const SOD_CONFLICTS = [
    { a: 'risk_officer', b: 'compliance_officer', level: 'Medium', reason: 'Same person controls fraud rules AND audits them' },
    { a: 'admin', b: 'risk_officer', level: 'High', reason: 'Creates users AND approves fraud cases' },
    { a: 'ops_manager', b: 'compliance_officer', level: 'Medium', reason: 'Manages batches AND audits batch operations' },
    { a: 'admin', b: 'compliance_officer', level: 'Medium', reason: 'Manages users AND audits access' },
    { a: 'developer', b: 'super_admin', level: 'Critical', reason: 'Tenant IT AND platform control' },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('workflow', 28)} Role Bundles</h1></div>
      <p style="color:var(--text-secondary);margin-bottom:1.5rem">
        Pre-configured role sets for different organization sizes. Apply a bundle to quickly assign appropriate roles to your team.
      </p>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-bottom:2rem">
        ${BUNDLES.map(b => `
          <div class="sa-card" style="border-top:3px solid ${b.color}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
              <h3 style="margin:0;color:${b.color}">${b.name}</h3>
              <span class="sa-status-pill" style="background:${b.color}15;color:${b.color};font-size:0.7rem">${b.target}</span>
            </div>
            <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem">${b.description}</p>
            <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1rem">
              ${b.roles.map(r => `
                <div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.75rem;border-radius:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04)">
                  <span class="role-switch-dot" style="background:${({ "executive": "#6366f1", "ops_manager": "#14b8a6", "risk_officer": "#ef4444", "compliance_officer": "#a855f7", "developer": "#06b6d4", "admin": "#3b82f6" })[r.role] || '#64748b'};width:8px;height:8px;border-radius:50%;flex-shrink:0"></span>
                  <div>
                    <div style="font-weight:600;font-size:0.82rem">${r.label}</div>
                    <div style="font-size:0.72rem;color:var(--text-secondary)">${r.desc}</div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:0.72rem;color:var(--text-secondary)">${b.users}</span>
              <button class="btn btn-sm btn-outline" style="border-color:${b.color};color:${b.color}">Apply Bundle</button>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="sa-card">
        <h3><span class="status-icon status-warn" aria-label="Warning">!</span> SoD Conflict Rules</h3>
        <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem">
          These conflicts are automatically flagged when a single user holds both roles simultaneously.
        </p>
        <table class="sa-table"><thead><tr><th>Role A</th><th>Role B</th><th>Risk</th><th>Reason</th></tr></thead><tbody>
          ${SOD_CONFLICTS.map(c => `<tr>
            <td><span class="sa-status-pill sa-pill-blue">${c.a}</span></td>
            <td><span class="sa-status-pill sa-pill-blue">${c.b}</span></td>
            <td><span class="sa-status-pill sa-pill-${c.level === 'Critical' ? 'red' : c.level === 'High' ? 'red' : 'orange'}">${c.level}</span></td>
            <td style="font-size:0.82rem">${c.reason}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
