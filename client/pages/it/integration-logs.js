/**
 * IT – Integration Logs
 */
import { icon } from '../../core/icons.js';
export function renderPage() {
    const logs = [
        { time: '16:45:02', system: 'SAP ERP', event: 'batch.sync', status: 'success', duration: '120ms', detail: 'B-2026-0893 synced' },
        { time: '16:30:15', system: 'Salesforce', event: 'order.push', status: 'error', duration: '3200ms', detail: '503 Service Unavailable — retry 1/3' },
        { time: '16:30:18', system: 'Salesforce', event: 'order.push', status: 'error', duration: '3100ms', detail: '503 Service Unavailable — retry 2/3' },
        { time: '16:30:22', system: 'Salesforce', event: 'order.push', status: 'error', duration: '3050ms', detail: '503 Service Unavailable — retry 3/3 FAILED' },
        { time: '16:15:00', system: 'Oracle WMS', event: 'inventory.sync', status: 'success', duration: '450ms', detail: '12 items updated' },
        { time: '16:00:00', system: 'Slack', event: 'webhook.deliver', status: 'success', duration: '85ms', detail: 'Fraud alert delivered' },
    ];
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('scroll', 28)} Integration Logs</h1><div class="sa-title-actions"><button class="btn btn-outline btn-sm">Export</button></div></div>
      <div class="sa-card">
        <table class="sa-table"><thead><tr><th>Time</th><th>System</th><th>Event</th><th>Status</th><th>Duration</th><th>Detail</th></tr></thead><tbody>
          ${logs.map(l => `<tr class="${l.status === 'error' ? 'ops-alert-row' : ''}"><td class="sa-code">${l.time}</td><td><strong>${l.system}</strong></td><td class="sa-code" style="font-size:0.78rem">${l.event}</td><td><span class="sa-status-pill sa-pill-${l.status === 'success' ? 'green' : 'red'}">${l.status}</span></td><td class="sa-code">${l.duration}</td><td style="font-size:0.78rem;color:var(--text-secondary)">${l.detail}</td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
