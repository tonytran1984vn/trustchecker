/**
 * Compliance – Data Retention
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const schedules = [
        { data: 'Audit Logs', retention: '7 years', current: '2.1 years', purge: 'N/A', status: 'compliant' },
        { data: 'Scan Events', retention: '3 years', current: '1.5 years', purge: 'N/A', status: 'compliant' },
        { data: 'Fraud Events', retention: '5 years', current: '1.2 years', purge: 'N/A', status: 'compliant' },
        { data: 'User Sessions', retention: '90 days', current: '112 days', purge: '22 days overdue', status: 'overdue' },
        { data: 'Temp Files', retention: '30 days', current: '45 days', purge: '15 days overdue', status: 'overdue' },
        { data: 'Deleted User Data', retention: '30 days (grace)', current: '8 pending', purge: 'In queue', status: 'pending' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('clock', 28)} Data Retention</h1></div>
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>Data Category</th><th>Retention Policy</th><th>Current Age</th><th>Purge Status</th><th>Status</th></tr></thead>
          <tbody>
            ${schedules.map(s => `
              <tr>
                <td><strong>${s.data}</strong></td>
                <td>${s.retention}</td>
                <td>${s.current}</td>
                <td style="color:${s.purge.includes('overdue') ? '#ef4444' : 'var(--text-secondary)'}">${s.purge}</td>
                <td><span class="sa-status-pill sa-pill-${s.status === 'compliant' ? 'green' : s.status === 'overdue' ? 'red' : 'orange'}">${s.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
