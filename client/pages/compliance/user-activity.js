/**
 * Compliance – User Activity (Immutable audit trail)
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const logs = [
        { who: 'admin@trustchecker.io', what: 'Login', when: '16:12:05', ip: '171.252.xx.xx', device: 'Chrome / macOS', detail: 'Successful MFA login' },
        { who: 'ops@company.com', what: 'Batch Created', when: '16:08:22', ip: '14.161.xx.xx', device: 'Safari / iOS', detail: 'B-2026-0893 · 500 units' },
        { who: 'risk@company.com', what: 'Rule Modified', when: '15:45:10', ip: '103.5.xx.xx', device: 'Chrome / Win', detail: 'Duplicate threshold: 5min → 3min' },
        { who: 'admin@trustchecker.io', what: 'Role Changed', when: '15:30:00', ip: '171.252.xx.xx', device: 'Chrome / macOS', detail: 'user@company.com: operator → manager' },
        { who: 'ops@company.com', what: 'Transfer Created', when: '14:55:18', ip: '14.161.xx.xx', device: 'Safari / iOS', detail: 'T-4522 · HCM-01 → BKK-02' },
        { who: 'admin@trustchecker.io', what: 'Data Export', when: '14:20:00', ip: '171.252.xx.xx', device: 'Chrome / macOS', detail: 'Fraud events export · 2,400 rows' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('users', 28)} User Activity</h1>
        <div class="sa-title-actions"><button class="btn btn-outline btn-sm">Export Log</button></div>
      </div>
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>Who</th><th>Action</th><th>Time</th><th>IP</th><th>Device</th><th>Detail</th></tr></thead>
          <tbody>
            ${logs.map(l => `
              <tr>
                <td style="font-size:0.78rem">${l.who}</td>
                <td><strong>${l.what}</strong></td>
                <td class="sa-code">${l.when}</td>
                <td class="sa-code" style="font-size:0.72rem">${l.ip}</td>
                <td style="font-size:0.72rem">${l.device}</td>
                <td style="font-size:0.78rem;color:var(--text-secondary)">${l.detail}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
