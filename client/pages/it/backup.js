/**
 * IT – Backup & Restore
 */
import { icon } from '../../core/icons.js';
export function renderPage() {
    const backups = [
        { id: 'BK-048', type: 'Auto', size: '2.4 GB', time: 'Today 03:00', retention: '30 days', status: 'completed' },
        { id: 'BK-047', type: 'Auto', size: '2.3 GB', time: 'Yesterday 03:00', retention: '30 days', status: 'completed' },
        { id: 'BK-045', type: 'Manual', size: '2.4 GB', time: '3d ago', retention: '90 days', status: 'completed' },
        { id: 'BK-040', type: 'Auto', size: '2.1 GB', time: '1w ago', retention: '30 days', status: 'completed' },
    ];
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('clock', 28)} Backup & Restore</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">Create Backup</button></div></div>
      <div class="sa-metrics-row" style="margin-bottom:1rem">
        ${m('Last Backup', 'Today 03:00', 'Auto — 2.4 GB', 'green', 'check')}
        ${m('Total Backups', '48', '30 auto + 18 manual', 'blue', 'clock')}
        ${m('Storage Used', '42.8 GB', 'of 100 GB quota', 'blue', 'dashboard')}
        ${m('Health', 'All OK', 'No failed backups', 'green', 'shield')}
      </div>
      <div class="sa-card">
        <table class="sa-table"><thead><tr><th>ID</th><th>Type</th><th>Size</th><th>Time</th><th>Retention</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${backups.map(b => `<tr><td class="sa-code">${b.id}</td><td><span class="sa-status-pill sa-pill-${b.type === 'Auto' ? 'blue' : 'orange'}">${b.type}</span></td><td>${b.size}</td><td>${b.time}</td><td>${b.retention}</td><td><span class="sa-status-pill sa-pill-green">${b.status}</span></td><td><button class="btn btn-xs btn-outline">Restore</button></td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
