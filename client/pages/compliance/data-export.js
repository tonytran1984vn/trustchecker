/**
 * Compliance – Data Export Log
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const exports = [
        { id: 'EX-084', who: 'admin@trustchecker.io', type: 'Fraud Events', rows: '2,400', format: 'CSV', ip: '171.252.xx.xx', time: '14:20 today' },
        { id: 'EX-083', who: 'risk@company.com', type: 'Scan Data', rows: '12,000', format: 'CSV', ip: '103.5.xx.xx', time: 'Yesterday' },
        { id: 'EX-082', who: 'admin@trustchecker.io', type: 'User List', rows: '48', format: 'JSON', ip: '171.252.xx.xx', time: '3d ago' },
        { id: 'EX-081', who: 'compliance@company.com', type: 'Audit Report', rows: '—', format: 'PDF', ip: '14.161.xx.xx', time: '1w ago' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('scroll', 28)} Data Export Log</h1></div>
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>ID</th><th>Exported By</th><th>Data Type</th><th>Rows</th><th>Format</th><th>IP</th><th>Time</th></tr></thead>
          <tbody>
            ${exports.map(e => `
              <tr>
                <td class="sa-code">${e.id}</td>
                <td style="font-size:0.78rem">${e.who}</td>
                <td><strong>${e.type}</strong></td>
                <td class="sa-code">${e.rows}</td>
                <td><span class="sa-status-pill sa-pill-blue">${e.format}</span></td>
                <td class="sa-code" style="font-size:0.72rem">${e.ip}</td>
                <td style="color:var(--text-secondary)">${e.time}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
