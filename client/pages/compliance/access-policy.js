/**
 * Compliance – Access Policy
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const policies = [
        { name: 'MFA Requirement', scope: 'All users', status: 'enforced', version: 'v2.1', lastReview: '30d ago', nextReview: '60d' },
        { name: 'Password Complexity', scope: 'All users', status: 'enforced', version: 'v1.3', lastReview: '30d ago', nextReview: '60d' },
        { name: 'Role-Based Access Control', scope: 'All roles', status: 'enforced', version: 'v3.0', lastReview: '45d ago', nextReview: '15d (overdue soon)' },
        { name: 'Session Management', scope: 'All users', status: 'enforced', version: 'v2.0', lastReview: '20d ago', nextReview: '70d' },
        { name: 'API Key Policy', scope: 'admin, developer', status: 'enforced', version: 'v1.0', lastReview: '60d ago', nextReview: 'Overdue' },
        { name: 'Data Access Segregation', scope: 'All roles', status: 'partial', version: 'v1.2', lastReview: '90d ago', nextReview: 'Overdue' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('lock', 28)} Access Policy</h1></div>
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>Policy</th><th>Scope</th><th>Status</th><th>Version</th><th>Last Review</th><th>Next Review</th></tr></thead>
          <tbody>
            ${policies.map(p => `
              <tr>
                <td><strong>${p.name}</strong></td>
                <td style="font-size:0.78rem">${p.scope}</td>
                <td><span class="sa-status-pill sa-pill-${p.status === 'enforced' ? 'green' : 'orange'}">${p.status}</span></td>
                <td class="sa-code">${p.version}</td>
                <td style="color:var(--text-secondary)">${p.lastReview}</td>
                <td style="color:${p.nextReview.includes('Overdue') ? '#ef4444' : 'var(--text-secondary)'}; font-weight:${p.nextReview.includes('Overdue') ? '600' : '400'}">${p.nextReview}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
