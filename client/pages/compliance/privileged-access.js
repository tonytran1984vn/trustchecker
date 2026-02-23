/**
 * Compliance – Privileged Access Log
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const events = [
        { who: 'admin@trustchecker.io', action: 'Role escalation attempt', detail: 'Attempted to assign super_admin to ops@company.com — BLOCKED', severity: 'critical', time: '15:30 today' },
        { who: 'admin@trustchecker.io', action: 'Bulk user creation', detail: 'Created 5 new users in 2 minutes', severity: 'medium', time: 'Yesterday' },
        { who: 'risk@company.com', action: 'Mass rule modification', detail: 'Changed 3 risk rules in single session', severity: 'medium', time: '2d ago' },
        { who: 'admin@trustchecker.io', action: 'API key generated', detail: 'Production API key created', severity: 'high', time: '3d ago' },
        { who: 'admin@trustchecker.io', action: 'After-hours login', detail: 'Login at 02:15 AM from unknown IP', severity: 'high', time: '5d ago' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('shield', 28)} Privileged Access</h1></div>
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>User</th><th>Action</th><th>Detail</th><th>Severity</th><th>Time</th></tr></thead>
          <tbody>
            ${events.map(e => `
              <tr class="${e.severity === 'critical' ? 'ops-alert-row' : ''}">
                <td style="font-size:0.78rem">${e.who}</td>
                <td><strong>${e.action}</strong></td>
                <td style="font-size:0.78rem;color:var(--text-secondary)">${e.detail}</td>
                <td><span class="sa-score sa-score-${e.severity === 'critical' ? 'danger' : e.severity === 'high' ? 'warning' : 'info'}">${e.severity}</span></td>
                <td style="color:var(--text-secondary)">${e.time}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
