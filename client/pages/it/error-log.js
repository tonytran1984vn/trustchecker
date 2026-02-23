/**
 * IT – Error Log (Technical)
 */
import { icon } from '../../core/icons.js';
export function renderPage() {
    const errors = [
        { time: '16:30:22', level: 'ERROR', source: 'Salesforce Sync', message: 'HTTP 503 — Service Unavailable after 3 retries', count: 3, trace: 'IntegrationService.push():L142' },
        { time: '15:45:10', level: 'WARN', source: 'Rate Limiter', message: 'Client oc_...f4a2 approaching rate limit (82%)', count: 1, trace: 'RateLimiter.check():L88' },
        { time: '14:20:00', level: 'ERROR', source: 'Webhook Delivery', message: 'Connection timeout to analytics.company.com', count: 5, trace: 'WebhookService.deliver():L201' },
        { time: '12:00:00', level: 'WARN', source: 'Memory', message: 'Heap usage 78% — approaching threshold', count: 1, trace: 'HealthMonitor.check():L55' },
    ];
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('alertTriangle', 28)} Error Log</h1><div class="sa-title-actions"><button class="btn btn-outline btn-sm">Export</button></div></div>
      <div class="sa-card">
        <table class="sa-table"><thead><tr><th>Time</th><th>Level</th><th>Source</th><th>Message</th><th>Count</th><th>Trace</th></tr></thead><tbody>
          ${errors.map(e => `<tr class="${e.level === 'ERROR' ? 'ops-alert-row' : ''}"><td class="sa-code">${e.time}</td><td><span class="sa-status-pill sa-pill-${e.level === 'ERROR' ? 'red' : 'orange'}">${e.level}</span></td><td><strong>${e.source}</strong></td><td style="font-size:0.78rem">${e.message}</td><td>${e.count}</td><td class="sa-code" style="font-size:0.7rem;color:var(--text-secondary)">${e.trace}</td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
