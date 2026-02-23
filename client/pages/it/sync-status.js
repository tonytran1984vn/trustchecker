/**
 * IT – Sync Status
 */
import { icon } from '../../core/icons.js';
export function renderPage() {
    const syncs = [
        { system: 'Azure AD → Users', interval: '15 min', lastSync: '14 min ago', records: 48, errors: 0, status: 'synced' },
        { system: 'SAP → Batches', interval: '5 min', lastSync: '3 min ago', records: 12, errors: 0, status: 'synced' },
        { system: 'Oracle WMS → Inventory', interval: '15 min', lastSync: '12 min ago', records: 340, errors: 0, status: 'synced' },
        { system: 'Salesforce → Orders', interval: '30 min', lastSync: '2h ago', records: 0, errors: 3, status: 'failed' },
    ];
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('workflow', 28)} Sync Status</h1></div>
      <div class="sa-card">
        <table class="sa-table"><thead><tr><th>Integration</th><th>Interval</th><th>Last Sync</th><th>Records</th><th>Errors</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${syncs.map(s => `<tr class="${s.status === 'failed' ? 'ops-alert-row' : ''}"><td><strong>${s.system}</strong></td><td>${s.interval}</td><td>${s.lastSync}</td><td>${s.records}</td><td style="color:${s.errors > 0 ? '#ef4444' : 'var(--text-secondary)'}">${s.errors}</td><td><span class="sa-status-pill sa-pill-${s.status === 'synced' ? 'green' : 'red'}">${s.status}</span></td><td><button class="btn btn-xs btn-outline">Force Sync</button></td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
