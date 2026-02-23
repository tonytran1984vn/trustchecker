/**
 * IT – ERP / WMS / CRM Integrations
 */
import { icon } from '../../core/icons.js';
export function renderPage() {
    const integrations = [
        { name: 'SAP ERP', type: 'ERP', status: 'connected', lastSync: '5 min ago', errors: 0 },
        { name: 'Oracle WMS', type: 'WMS', status: 'connected', lastSync: '15 min ago', errors: 0 },
        { name: 'Salesforce CRM', type: 'CRM', status: 'error', lastSync: '2h ago', errors: 3 },
        { name: 'Manufacturing MES', type: 'MES', status: 'disconnected', lastSync: '—', errors: 0 },
    ];
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('network', 28)} ERP & Integrations</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Add Integration</button></div></div>
      <div class="sa-card">
        <table class="sa-table"><thead><tr><th>System</th><th>Type</th><th>Status</th><th>Last Sync</th><th>Errors</th><th>Actions</th></tr></thead><tbody>
          ${integrations.map(i => `<tr><td><strong>${i.name}</strong></td><td><span class="sa-status-pill sa-pill-blue">${i.type}</span></td><td><span class="sa-status-pill sa-pill-${i.status === 'connected' ? 'green' : i.status === 'error' ? 'red' : 'orange'}">${i.status}</span></td><td>${i.lastSync}</td><td style="color:${i.errors > 0 ? '#ef4444' : 'var(--text-secondary)'}">${i.errors}</td><td><button class="btn btn-xs btn-outline">Configure</button> <button class="btn btn-xs btn-ghost">Test</button></td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
