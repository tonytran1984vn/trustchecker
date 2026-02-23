/**
 * Super Admin – Platform Roles & Permission Matrix
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const permissions = [
        'Create Tenant', 'Suspend Tenant', 'View Cross-Tenant',
        'Impersonate (time-bound)', 'Access Billing', 'Access Risk Engine',
        'View Audit Logs', 'Manage Platform Users', 'Configure Feature Flags'
    ];
    const roles = [
        { name: 'Super Admin', perms: [1, 1, 1, 1, 1, 1, 1, 1, 1] },
        { name: 'Platform Ops', perms: [0, 0, 1, 0, 0, 0, 1, 0, 0] },
        { name: 'Risk Officer', perms: [0, 1, 1, 0, 0, 1, 1, 0, 0] },
        { name: 'Compliance', perms: [0, 0, 1, 0, 0, 0, 1, 0, 0] },
        { name: 'Support', perms: [0, 0, 1, 1, 0, 0, 1, 0, 0] },
        { name: 'Auditor', perms: [0, 0, 1, 0, 0, 0, 1, 0, 0] },
    ];
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('shield', 28)} Role & Permission Matrix</h1></div>
      <div class="sa-card" style="overflow-x:auto">
        <table class="sa-table sa-matrix-table">
          <thead>
            <tr>
              <th>Permission</th>
              ${roles.map(r => `<th class="sa-matrix-role">${r.name}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${permissions.map((p, i) => `
              <tr>
                <td>${p}</td>
                ${roles.map(r => `<td class="sa-matrix-cell">${r.perms[i] ? '<span class="sa-perm-yes"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '<span class="sa-perm-no">—</span>'}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
