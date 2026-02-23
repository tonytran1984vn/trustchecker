/**
 * Compliance – System Changes (Config/rule/role change log with before/after)
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const changes = [
        { id: 'SC-0112', type: 'Rule', entity: 'Duplicate Threshold', who: 'risk@company.com', before: '5 minutes', after: '3 minutes', time: '15:45 today' },
        { id: 'SC-0111', type: 'Role', entity: 'user@company.com', who: 'admin@trustchecker.io', before: 'operator', after: 'manager', time: '15:30 today' },
        { id: 'SC-0110', type: 'Config', entity: 'Session Timeout', who: 'admin@trustchecker.io', before: '60 min', after: '30 min', time: 'Yesterday' },
        { id: 'SC-0109', type: 'Rule', entity: 'Geo Rule — Cambodia', who: 'risk@company.com', before: 'monitored', after: 'blocked', time: '2d ago' },
        { id: 'SC-0108', type: 'Config', entity: 'MFA Policy', who: 'admin@trustchecker.io', before: 'Optional', after: 'Required', time: '3d ago' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('settings', 28)} System Changes</h1>
        <div class="sa-title-actions"><button class="btn btn-outline btn-sm">Export</button></div>
      </div>
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>ID</th><th>Type</th><th>Entity</th><th>Changed By</th><th>Before</th><th>After</th><th>Time</th></tr></thead>
          <tbody>
            ${changes.map(c => `
              <tr>
                <td class="sa-code">${c.id}</td>
                <td><span class="sa-status-pill sa-pill-${c.type === 'Rule' ? 'orange' : c.type === 'Role' ? 'blue' : 'green'}">${c.type}</span></td>
                <td><strong>${c.entity}</strong></td>
                <td style="font-size:0.78rem">${c.who}</td>
                <td style="color:#ef4444;text-decoration:line-through;font-size:0.82rem">${c.before}</td>
                <td style="color:#22c55e;font-weight:600;font-size:0.82rem">${c.after}</td>
                <td style="color:var(--text-secondary)">${c.time}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
