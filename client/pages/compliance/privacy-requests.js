/**
 * Compliance – Privacy Requests (PII / Right to Delete)
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const requests = [
        { id: 'PR-012', type: 'Right to Delete', subject: 'customer@example.com', data: 'Scan history + PII', status: 'pending', sla: '48h remaining', submitted: 'Today' },
        { id: 'PR-011', type: 'Data Portability', subject: 'user@company.com', data: 'Full account data', status: 'in_progress', sla: '5d remaining', submitted: '2d ago' },
        { id: 'PR-010', type: 'Right to Delete', subject: 'retailer@shop.com', data: 'Account + scan data', status: 'completed', sla: '—', submitted: '1w ago' },
        { id: 'PR-009', type: 'Data Masking', subject: 'partner@dist.com', data: 'PII fields', status: 'completed', sla: '—', submitted: '2w ago' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('users', 28)} Privacy Requests</h1></div>
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>ID</th><th>Type</th><th>Subject</th><th>Data Scope</th><th>Status</th><th>SLA</th><th>Submitted</th><th>Actions</th></tr></thead>
          <tbody>
            ${requests.map(r => `
              <tr>
                <td class="sa-code">${r.id}</td>
                <td><span class="sa-status-pill sa-pill-${r.type.includes('Delete') ? 'red' : r.type === 'Data Portability' ? 'blue' : 'orange'}">${r.type}</span></td>
                <td style="font-size:0.78rem">${r.subject}</td>
                <td style="font-size:0.78rem">${r.data}</td>
                <td><span class="sa-status-pill sa-pill-${r.status === 'pending' ? 'orange' : r.status === 'in_progress' ? 'blue' : 'green'}">${r.status.replace('_', ' ')}</span></td>
                <td style="color:${r.sla.includes('48h') ? '#ef4444' : 'var(--text-secondary)'}">${r.sla}</td>
                <td style="color:var(--text-secondary)">${r.submitted}</td>
                <td>${r.status !== 'completed' ? '<button class="btn btn-xs btn-primary">Process</button>' : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
