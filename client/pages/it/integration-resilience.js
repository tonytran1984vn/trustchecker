/**
 * IT – Integration Resilience (Enterprise Connector Health)
 * Retry strategy, idempotency, circuit breaker, DLQ, adapter certification
 */
import { icon } from '../../core/icons.js';

const CONNECTORS = [
    { id: 'SAP-ERP', name: 'SAP S/4HANA', type: 'IDoc/BAPI', protocol: 'RFC + REST', status: 'healthy', uptime: '99.92%', lastSync: '2m ago', retryQueue: 0, dlq: 0, certified: true, version: '2.1.3' },
    { id: 'ORACLE-SCM', name: 'Oracle SCM Cloud', type: 'REST API', protocol: 'OAuth 2.0', status: 'healthy', uptime: '99.87%', lastSync: '5m ago', retryQueue: 0, dlq: 0, certified: true, version: '1.4.0' },
    { id: 'KAFKA', name: 'Kafka Event Bus', type: 'Event Stream', protocol: 'SASL/SCRAM', status: 'healthy', uptime: '99.99%', lastSync: 'real-time', retryQueue: 3, dlq: 0, certified: true, version: '3.6.0' },
    { id: 'WMS-API', name: 'Warehouse WMS', type: 'Webhook', protocol: 'HMAC-SHA256', status: 'degraded', uptime: '98.4%', lastSync: '15m ago', retryQueue: 12, dlq: 2, certified: false, version: '0.9.2' },
    { id: 'STRIPE', name: 'Stripe Billing', type: 'REST API', protocol: 'API Key', status: 'healthy', uptime: '99.98%', lastSync: '1m ago', retryQueue: 0, dlq: 0, certified: true, version: '2.0.1' },
    { id: '3PL-API', name: '3PL Carrier APIs', type: 'REST + Webhook', protocol: 'OAuth/Key', status: 'healthy', uptime: '99.71%', lastSync: '8m ago', retryQueue: 1, dlq: 0, certified: false, version: '1.2.0' },
];

const RETRY_CONFIG = [
    { connector: 'ALL', strategy: 'Exponential backoff', maxRetries: 5, baseDelay: '1s', maxDelay: '60s', jitter: '±25%', idempotencyKey: 'request_id + hash(payload)' },
    { connector: 'SAP-ERP', strategy: 'Exponential + circuit breaker', maxRetries: 3, baseDelay: '2s', maxDelay: '30s', jitter: '±10%', idempotencyKey: 'IDoc number' },
    { connector: 'Kafka', strategy: 'At-least-once + dedup', maxRetries: '∞', baseDelay: '500ms', maxDelay: '10s', jitter: '±5%', idempotencyKey: 'event_id (UUID v4)' },
    { connector: 'Webhook (inbound)', strategy: 'HMAC verify + idempotency', maxRetries: 'N/A', baseDelay: 'N/A', maxDelay: 'N/A', jitter: 'N/A', idempotencyKey: 'X-Idempotency-Key header' },
];

const CIRCUIT_BREAKER = [
    { connector: 'WMS-API', state: 'HALF-OPEN', failures: 8, threshold: 10, resetTime: '30s', lastTrip: '14m ago', action: 'Testing with probe requests' },
    { connector: 'SAP-ERP', state: 'CLOSED', failures: 0, threshold: 5, resetTime: '60s', lastTrip: '72d ago', action: 'Normal operation' },
    { connector: 'KAFKA', state: 'CLOSED', failures: 0, threshold: 3, resetTime: '15s', lastTrip: 'Never', action: 'Normal operation' },
];

const DLQ_ITEMS = [
    { id: 'DLQ-2026-089', connector: 'WMS-API', payload: 'Stock update WH-BKK-01', attempts: 5, lastAttempt: '12m ago', error: '502 Bad Gateway — upstream timeout', action: 'Manual retry after WMS fix' },
    { id: 'DLQ-2026-088', connector: 'WMS-API', payload: 'Transfer confirm TRF-087', attempts: 5, lastAttempt: '14m ago', error: '502 Bad Gateway — upstream timeout', action: 'Manual retry after WMS fix' },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('network', 28)} Integration Resilience</h1></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Connectors', CONNECTORS.length.toString(), `${CONNECTORS.filter(c => c.status === 'healthy').length} healthy`, 'green', 'network')}
        ${m('Avg Uptime', '99.71%', 'Target: 99.9%', 'green', 'check')}
        ${m('Retry Queue', CONNECTORS.reduce((s, c) => s + c.retryQueue, 0).toString(), `${CONNECTORS.filter(c => c.retryQueue > 0).length} connectors with pending`, 'orange', 'clock')}
        ${m('Dead Letter Queue', DLQ_ITEMS.length.toString(), 'Manual intervention needed', 'red', 'alertTriangle')}
      </div>

      <!-- CONNECTOR HEALTH -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🔌 Connector Health Matrix</h3>
        <table class="sa-table"><thead><tr><th>Connector</th><th>Type</th><th>Protocol</th><th>Status</th><th>Uptime</th><th>Last Sync</th><th>Retry Q</th><th>DLQ</th><th>Certified</th><th>Version</th></tr></thead><tbody>
          ${CONNECTORS.map(c => `<tr class="${c.status !== 'healthy' ? 'ops-alert-row' : ''}">
            <td><strong>${c.name}</strong><div style="font-size:0.62rem;color:var(--text-secondary)">${c.id}</div></td>
            <td style="font-size:0.78rem">${c.type}</td>
            <td style="font-size:0.72rem">${c.protocol}</td>
            <td><span class="sa-status-pill sa-pill-${c.status === 'healthy' ? 'green' : 'orange'}">${c.status}</span></td>
            <td style="font-weight:600;color:${parseFloat(c.uptime) > 99.9 ? '#22c55e' : '#f59e0b'}">${c.uptime}</td>
            <td style="font-size:0.78rem">${c.lastSync}</td>
            <td style="text-align:center;color:${c.retryQueue > 0 ? '#f59e0b' : 'inherit'}">${c.retryQueue}</td>
            <td style="text-align:center;color:${c.dlq > 0 ? '#ef4444' : 'inherit'}">${c.dlq}</td>
            <td>${c.certified ? '<span style="color:#22c55e"><span class="status-icon status-pass" aria-label="Pass">✓</span> Certified</span>' : '<span style="color:#f59e0b">Pending</span>'}</td>
            <td class="sa-code" style="font-size:0.72rem">${c.version}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <!-- RETRY + IDEMPOTENCY -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">
        <div class="sa-card">
          <h3>🔄 Retry & Idempotency Strategy</h3>
          <table class="sa-table"><thead><tr><th>Connector</th><th>Strategy</th><th>Max</th><th>Delay</th><th>Idempotency Key</th></tr></thead><tbody>
            ${RETRY_CONFIG.map(r => `<tr>
              <td><strong>${r.connector}</strong></td>
              <td style="font-size:0.72rem">${r.strategy}</td>
              <td class="sa-code">${r.maxRetries}</td>
              <td style="font-size:0.72rem">${r.baseDelay}–${r.maxDelay}</td>
              <td style="font-size:0.68rem;font-family:monospace">${r.idempotencyKey}</td>
            </tr>`).join('')}
          </tbody></table>
        </div>
        <div class="sa-card">
          <h3>⚡ Circuit Breaker State</h3>
          <table class="sa-table"><thead><tr><th>Connector</th><th>State</th><th>Failures</th><th>Threshold</th><th>Reset</th><th>Action</th></tr></thead><tbody>
            ${CIRCUIT_BREAKER.map(cb => `<tr class="${cb.state === 'HALF-OPEN' ? 'ops-alert-row' : ''}">
              <td><strong>${cb.connector}</strong></td>
              <td><span class="sa-status-pill sa-pill-${cb.state === 'CLOSED' ? 'green' : cb.state === 'HALF-OPEN' ? 'orange' : 'red'}">${cb.state}</span></td>
              <td style="text-align:center;color:${cb.failures > 0 ? '#f59e0b' : 'inherit'}">${cb.failures}/${cb.threshold}</td>
              <td class="sa-code">${cb.threshold}</td>
              <td class="sa-code">${cb.resetTime}</td>
              <td style="font-size:0.72rem">${cb.action}</td>
            </tr>`).join('')}
          </tbody></table>
        </div>
      </div>

      <!-- DLQ -->
      <div class="sa-card" style="border-left:4px solid #ef4444">
        <h3>💀 Dead Letter Queue (DLQ)</h3>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:0.75rem">Messages that failed all retry attempts. Require manual investigation and replay.</p>
        <table class="sa-table"><thead><tr><th>DLQ ID</th><th>Connector</th><th>Payload</th><th>Attempts</th><th>Last Attempt</th><th>Error</th><th>Action</th></tr></thead><tbody>
          ${DLQ_ITEMS.map(d => `<tr class="ops-alert-row">
            <td class="sa-code">${d.id}</td><td><strong>${d.connector}</strong></td>
            <td style="font-size:0.78rem">${d.payload}</td>
            <td style="text-align:center">${d.attempts}/5</td>
            <td>${d.lastAttempt}</td>
            <td style="font-size:0.72rem;color:#ef4444">${d.error}</td>
            <td><button class="btn btn-xs btn-primary">Replay</button></td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
