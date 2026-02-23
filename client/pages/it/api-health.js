/**
 * IT – API Health
 */
import { icon } from '../../core/icons.js';
export function renderPage() {
    const endpoints = [
        { path: '/api/auth/*', uptime: '99.99%', avgLatency: '45ms', p99: '180ms', errors24h: 2, status: 'healthy' },
        { path: '/api/scans/*', uptime: '99.97%', avgLatency: '120ms', p99: '450ms', errors24h: 8, status: 'healthy' },
        { path: '/api/batches/*', uptime: '99.95%', avgLatency: '95ms', p99: '320ms', errors24h: 5, status: 'healthy' },
        { path: '/api/fraud/*', uptime: '99.92%', avgLatency: '180ms', p99: '680ms', errors24h: 18, status: 'degraded' },
        { path: '/api/webhooks/*', uptime: '99.88%', avgLatency: '250ms', p99: '1200ms', errors24h: 42, status: 'degraded' },
    ];
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('check', 28)} API Health</h1></div>
      <div class="sa-card">
        <table class="sa-table"><thead><tr><th>Endpoint</th><th>Uptime</th><th>Avg Latency</th><th>P99</th><th>Errors (24h)</th><th>Status</th></tr></thead><tbody>
          ${endpoints.map(e => `<tr><td class="sa-code"><strong>${e.path}</strong></td><td style="font-weight:600;color:${parseFloat(e.uptime) >= 99.95 ? '#22c55e' : '#f59e0b'}">${e.uptime}</td><td class="sa-code">${e.avgLatency}</td><td class="sa-code">${e.p99}</td><td style="color:${e.errors24h > 10 ? '#ef4444' : 'var(--text-secondary)'}">${e.errors24h}</td><td><span class="sa-status-pill sa-pill-${e.status === 'healthy' ? 'green' : 'orange'}">${e.status}</span></td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
