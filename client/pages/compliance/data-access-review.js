/**
 * Compliance – Data Access Review
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const reviews = [
        { who: 'admin@trustchecker.io', data: 'User PII (email, phone)', access: 'Read + Export', frequency: '18 times/week', risk: 'medium', lastAccess: 'Today' },
        { who: 'risk@company.com', data: 'Fraud Event Details', access: 'Read only', frequency: '42 times/week', risk: 'low', lastAccess: 'Today' },
        { who: 'ops@company.com', data: 'Batch Data + QR Codes', access: 'Read + Write', frequency: '65 times/week', risk: 'low', lastAccess: 'Today' },
        { who: 'admin@trustchecker.io', data: 'Billing Information', access: 'Read + Export', frequency: '3 times/week', risk: 'high', lastAccess: '2d ago' },
        { who: 'dev@company.com', data: 'API Keys + Secrets', access: 'Read', frequency: '2 times/week', risk: 'high', lastAccess: '3d ago' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('search', 28)} Data Access Review</h1></div>
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>User</th><th>Sensitive Data</th><th>Access Level</th><th>Frequency</th><th>Risk</th><th>Last Access</th></tr></thead>
          <tbody>
            ${reviews.map(r => `
              <tr>
                <td style="font-size:0.78rem">${r.who}</td>
                <td><strong>${r.data}</strong></td>
                <td>${r.access}</td>
                <td>${r.frequency}</td>
                <td><span class="sa-score sa-score-${r.risk === 'high' ? 'danger' : r.risk === 'medium' ? 'warning' : 'low'}">${r.risk}</span></td>
                <td style="color:var(--text-secondary)">${r.lastAccess}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
