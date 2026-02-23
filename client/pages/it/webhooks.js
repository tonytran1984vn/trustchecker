/**
 * IT – Webhooks
 */
import { icon } from '../../core/icons.js';
export function renderPage() {
    const hooks = [
        { id: 'WH-01', name: 'Fraud Alert → Slack', url: 'https://hooks.slack.com/...', events: 'fraud.created, fraud.escalated', status: 'active', successRate: '100%' },
        { id: 'WH-02', name: 'Batch Complete → SAP', url: 'https://sap.company.com/api/...', events: 'batch.completed', status: 'active', successRate: '98.5%' },
        { id: 'WH-03', name: 'Scan Events → Analytics', url: 'https://analytics.company.com/...', events: 'scan.created', status: 'paused', successRate: '95.2%' },
    ];
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('zap', 28)} Webhooks</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Create Webhook</button></div></div>
      <div class="sa-card">
        <table class="sa-table"><thead><tr><th>ID</th><th>Name</th><th>URL</th><th>Events</th><th>Status</th><th>Success</th><th>Actions</th></tr></thead><tbody>
          ${hooks.map(h => `<tr><td class="sa-code">${h.id}</td><td><strong>${h.name}</strong></td><td class="sa-code" style="font-size:0.7rem;max-width:200px;overflow:hidden;text-overflow:ellipsis">${h.url}</td><td style="font-size:0.72rem">${h.events}</td><td><span class="sa-status-pill sa-pill-${h.status === 'active' ? 'green' : 'orange'}">${h.status}</span></td><td>${h.successRate}</td><td><button class="btn btn-xs btn-outline">Edit</button> <button class="btn btn-xs btn-ghost">Test</button></td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
