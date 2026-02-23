/**
 * Compliance – Violation Log
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const violations = [
        { id: 'VL-028', type: 'Access', desc: 'User accessed data outside role scope', who: 'ops@company.com', severity: 'high', status: 'open', time: 'Today' },
        { id: 'VL-027', type: 'SoD', desc: 'Same user created and approved batch recall', who: 'admin@trustchecker.io', severity: 'critical', status: 'investigating', time: '2d ago' },
        { id: 'VL-026', type: 'Policy', desc: 'Risk rule modified without review approval', who: 'risk@company.com', severity: 'medium', status: 'resolved', time: '1w ago' },
        { id: 'VL-025', type: 'Data', desc: 'Bulk export without compliance approval', who: 'admin@trustchecker.io', severity: 'high', status: 'resolved', time: '2w ago' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('alert', 28)} Violation Log</h1></div>
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>ID</th><th>Type</th><th>Description</th><th>User</th><th>Severity</th><th>Status</th><th>Time</th></tr></thead>
          <tbody>
            ${violations.map(v => `
              <tr class="${v.severity === 'critical' ? 'ops-alert-row' : ''}">
                <td class="sa-code">${v.id}</td>
                <td><span class="sa-status-pill sa-pill-${v.type === 'SoD' ? 'red' : v.type === 'Access' ? 'orange' : v.type === 'Data' ? 'blue' : 'orange'}">${v.type}</span></td>
                <td>${v.desc}</td>
                <td style="font-size:0.78rem">${v.who}</td>
                <td><span class="sa-score sa-score-${v.severity === 'critical' ? 'danger' : v.severity === 'high' ? 'warning' : 'info'}">${v.severity}</span></td>
                <td><span class="sa-status-pill sa-pill-${v.status === 'open' ? 'red' : v.status === 'investigating' ? 'orange' : 'green'}">${v.status}</span></td>
                <td style="color:var(--text-secondary)">${v.time}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
