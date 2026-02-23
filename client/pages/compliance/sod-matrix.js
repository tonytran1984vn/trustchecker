/**
 * Compliance – SoD Matrix (Separation of Duties conflict detection)
 */
import { icon } from '../../core/icons.js';

const SOD_RULES = [
    { a: 'risk_officer', b: 'compliance_officer', level: 'Medium', action: 'Audit independence compromised', policy: 'Compensating control: monthly CEO review' },
    { a: 'admin', b: 'risk_officer', level: 'High', action: 'User creation + fraud approval overlap', policy: 'Require 2-person approval for fraud cases' },
    { a: 'ops_manager', b: 'compliance_officer', level: 'Medium', action: 'Operational + audit conflict', policy: 'External audit required quarterly' },
    { a: 'admin', b: 'compliance_officer', level: 'Medium', action: 'User management + access audit overlap', policy: 'Separate access reviewer required' },
    { a: 'developer', b: 'admin', level: 'Low', action: 'Technical + business overlap (SME common)', policy: 'Log all admin actions, monthly review' },
];

const CURRENT_OVERLAPS = [
    { user: 'ops@trustchecker.io', roles: ['ops_manager', 'risk_officer'], conflict: 'High', flags: 2, lastFlag: '2d ago' },
    { user: 'admin@trustchecker.io', roles: ['admin', 'developer'], conflict: 'Low', flags: 0, lastFlag: '—' },
];

const SELF_APPROVALS = [
    { user: 'ops@trustchecker.io', action: 'Approved own batch transfer B-2026-0891', time: '2026-02-18 14:30', severity: 'Warning' },
    { user: 'ops@trustchecker.io', action: 'Created and approved risk rule #47', time: '2026-02-17 09:15', severity: 'Critical' },
];

export function renderPage() {
    const roleList = ['executive', 'ops_manager', 'risk_officer', 'compliance_officer', 'developer', 'admin'];
    const roleLabels = { executive: 'CEO', ops_manager: 'Ops', risk_officer: 'Risk', compliance_officer: 'Compliance', developer: 'IT', admin: 'Admin' };
    const conflictMap = {};
    SOD_RULES.forEach(r => {
        conflictMap[r.a + '|' + r.b] = r.level;
        conflictMap[r.b + '|' + r.a] = r.level;
    });

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('shield', 28)} Separation of Duties Matrix</h1></div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>Role Conflict Matrix</h3>
        <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem">Cells indicate risk level when one user holds both roles.</p>
        <table class="sa-table" style="text-align:center">
          <thead><tr><th></th>${roleList.map(r => `<th>${roleLabels[r]}</th>`).join('')}</tr></thead>
          <tbody>
            ${roleList.map(row => `<tr>
              <td style="font-weight:600;text-align:left">${roleLabels[row]}</td>
              ${roleList.map(col => {
        if (row === col) return '<td style="background:rgba(255,255,255,0.02)">—</td>';
        const level = conflictMap[row + '|' + col];
        if (!level) return '<td><span style="color:var(--text-secondary)"><span class="status-icon status-pass" aria-label="Pass">✓</span></span></td>';
        const colors = { Critical: '#ef4444', High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' };
        return `<td><span class="sa-status-pill" style="background:${colors[level]}20;color:${colors[level]};font-size:0.68rem">${level}</span></td>`;
    }).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">
        <div class="sa-card">
          <h3>🚩 Active Overlap Users</h3>
          <table class="sa-table"><thead><tr><th>User</th><th>Roles</th><th>Risk</th><th>Flags</th></tr></thead><tbody>
            ${CURRENT_OVERLAPS.map(o => `<tr>
              <td><strong>${o.user}</strong></td>
              <td>${o.roles.map(r => `<span class="sa-status-pill sa-pill-blue" style="font-size:0.68rem;margin:1px">${r}</span>`).join(' ')}</td>
              <td><span class="sa-status-pill sa-pill-${o.conflict === 'High' ? 'red' : o.conflict === 'Medium' ? 'orange' : 'green'}">${o.conflict}</span></td>
              <td style="color:${o.flags > 0 ? '#ef4444' : 'var(--text-secondary)'}">${o.flags} ${o.flags > 0 ? `(last: ${o.lastFlag})` : ''}</td>
            </tr>`).join('')}
          </tbody></table>
        </div>

        <div class="sa-card">
          <h3><span class="status-icon status-warn" aria-label="Warning">!</span> Self-Approval Flags</h3>
          <table class="sa-table"><thead><tr><th>User</th><th>Action</th><th>Time</th><th>Severity</th></tr></thead><tbody>
            ${SELF_APPROVALS.map(s => `<tr class="${s.severity === 'Critical' ? 'ops-alert-row' : ''}">
              <td><strong>${s.user}</strong></td>
              <td style="font-size:0.82rem">${s.action}</td>
              <td class="sa-code" style="font-size:0.78rem">${s.time}</td>
              <td><span class="sa-status-pill sa-pill-${s.severity === 'Critical' ? 'red' : 'orange'}">${s.severity}</span></td>
            </tr>`).join('')}
          </tbody></table>
        </div>
      </div>

      <div class="sa-card">
        <h3>📋 SoD Policies & Compensating Controls</h3>
        <table class="sa-table"><thead><tr><th>Role A</th><th>Role B</th><th>Risk</th><th>Impact</th><th>Compensating Control</th></tr></thead><tbody>
          ${SOD_RULES.map(r => `<tr>
            <td><span class="sa-status-pill sa-pill-blue" style="font-size:0.7rem">${r.a}</span></td>
            <td><span class="sa-status-pill sa-pill-blue" style="font-size:0.7rem">${r.b}</span></td>
            <td><span class="sa-status-pill sa-pill-${r.level === 'High' || r.level === 'Critical' ? 'red' : r.level === 'Medium' ? 'orange' : 'green'}">${r.level}</span></td>
            <td style="font-size:0.82rem">${r.action}</td>
            <td style="font-size:0.82rem;color:var(--text-secondary)">${r.policy}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
