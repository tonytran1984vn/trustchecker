/**
 * IT – Integration Hub (Unified connector management, event bus, monitoring)
 */
import { icon } from '../../core/icons.js';

const CONNECTORS = [
    { id: 'INT-001', name: 'SAP S/4HANA', type: 'ERP', protocol: 'OData v4', status: 'connected', sync: 'Real-time', lastSync: '2 min ago', events24h: 1247, errors: 0 },
    { id: 'INT-002', name: 'Oracle NetSuite', type: 'ERP', protocol: 'REST', status: 'connected', sync: 'Every 15m', lastSync: '8 min ago', events24h: 892, errors: 2 },
    { id: 'INT-003', name: 'Salesforce', type: 'CRM', protocol: 'REST + Streaming', status: 'connected', sync: 'Real-time', lastSync: '1 min ago', events24h: 423, errors: 0 },
    { id: 'INT-004', name: 'Azure AD (SCIM)', type: 'Identity', protocol: 'SCIM 2.0', status: 'connected', sync: 'Every 5m', lastSync: '3 min ago', events24h: 156, errors: 0 },
    { id: 'INT-005', name: 'Kafka Event Bus', type: 'Message Broker', protocol: 'Kafka 3.x', status: 'connected', sync: 'Real-time', lastSync: 'Live', events24h: 28450, errors: 3 },
    { id: 'INT-006', name: 'WMS (Warehouse)', type: 'ERP', protocol: 'REST', status: 'degraded', sync: 'Every 30m', lastSync: '35 min ago', events24h: 312, errors: 18 },
    { id: 'INT-007', name: 'Stripe Billing', type: 'Finance', protocol: 'REST + Webhook', status: 'connected', sync: 'Event-driven', lastSync: '12 min ago', events24h: 89, errors: 0 },
    { id: 'INT-008', name: 'Blockchain (VeChain)', type: 'Ledger', protocol: 'JSON-RPC', status: 'connected', sync: 'Per-transaction', lastSync: '5 min ago', events24h: 234, errors: 0 },
];

const EVENT_TOPICS = [
    { topic: 'batch.lifecycle', partitions: 6, consumers: 3, msgRate: '42/s', lag: '0', retention: '7d' },
    { topic: 'scan.events', partitions: 12, consumers: 5, msgRate: '180/s', lag: '12', retention: '30d' },
    { topic: 'risk.alerts', partitions: 3, consumers: 2, msgRate: '8/s', lag: '0', retention: '90d' },
    { topic: 'audit.actions', partitions: 3, consumers: 4, msgRate: '25/s', lag: '0', retention: '365d' },
    { topic: 'integration.sync', partitions: 6, consumers: 8, msgRate: '65/s', lag: '3', retention: '7d' },
    { topic: 'webhook.delivery', partitions: 3, consumers: 2, msgRate: '15/s', lag: '45', retention: '3d' },
];

const DLQ = [
    { id: 'DLQ-441', topic: 'integration.sync', key: 'SAP-ORDER-98231', error: 'Timeout after 30s', retries: 3, firstFail: '2h ago', status: 'pending' },
    { id: 'DLQ-440', topic: 'webhook.delivery', key: 'WH-evt-7823', error: 'HTTP 503 from endpoint', retries: 5, firstFail: '4h ago', status: 'pending' },
    { id: 'DLQ-438', topic: 'scan.events', key: 'SCAN-dup-check', error: 'Schema validation failed', retries: 1, firstFail: '6h ago', status: 'resolved' },
];

export function renderPage() {
    const totalEv = CONNECTORS.reduce((s, c) => s + c.events24h, 0);
    const totalErr = CONNECTORS.reduce((s, c) => s + c.errors, 0);
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('network', 28)} Integration Hub</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Add Connector</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Connectors', `${CONNECTORS.filter(c => c.status === 'connected').length}/${CONNECTORS.length}`, '1 degraded', 'green', 'network')}
        ${m('Events (24h)', totalEv.toLocaleString(), '6 topics · 320/s avg', 'blue', 'zap')}
        ${m('Errors (24h)', totalErr, `${DLQ.filter(d => d.status === 'pending').length} in DLQ`, totalErr > 10 ? 'red' : 'green', 'alertTriangle')}
        ${m('Avg Latency', '45ms', 'P99: 210ms', 'green', 'clock')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🔌 Connectors</h3>
        <table class="sa-table"><thead><tr><th>ID</th><th>System</th><th>Type</th><th>Protocol</th><th>Sync Mode</th><th>Last Sync</th><th>Events 24h</th><th>Errors</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${CONNECTORS.map(c => `<tr class="${c.status === 'degraded' ? 'ops-alert-row' : ''}">
            <td class="sa-code">${c.id}</td><td><strong>${c.name}</strong></td>
            <td><span class="sa-status-pill sa-pill-blue">${c.type}</span></td>
            <td class="sa-code" style="font-size:0.72rem">${c.protocol}</td>
            <td style="font-size:0.82rem">${c.sync}</td><td>${c.lastSync}</td>
            <td style="text-align:right">${c.events24h.toLocaleString()}</td>
            <td style="text-align:right;color:${c.errors > 0 ? '#ef4444' : 'var(--text-secondary)'}">${c.errors}</td>
            <td><span class="sa-status-pill sa-pill-${c.status === 'connected' ? 'green' : c.status === 'degraded' ? 'orange' : 'red'}">${c.status}</span></td>
            <td><button class="btn btn-xs btn-outline">Config</button></td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📡 Event Bus (Kafka Topics)</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Event-driven architecture: all system events flow through message bus for decoupled processing.</p>
        <table class="sa-table"><thead><tr><th>Topic</th><th>Partitions</th><th>Consumers</th><th>Msg Rate</th><th>Consumer Lag</th><th>Retention</th></tr></thead><tbody>
          ${EVENT_TOPICS.map(t => `<tr class="${parseInt(t.lag) > 10 ? 'ops-alert-row' : ''}">
            <td class="sa-code" style="font-size:0.78rem">${t.topic}</td>
            <td style="text-align:center">${t.partitions}</td><td style="text-align:center">${t.consumers}</td>
            <td style="text-align:center"><strong>${t.msgRate}</strong></td>
            <td style="text-align:center;color:${parseInt(t.lag) > 10 ? '#ef4444' : '#22c55e'}">${t.lag}</td>
            <td>${t.retention}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <div class="sa-card">
        <h3>💀 Dead Letter Queue (DLQ)</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Failed messages after max retries. Require manual investigation or replay.</p>
        <table class="sa-table"><thead><tr><th>ID</th><th>Topic</th><th>Key</th><th>Error</th><th>Retries</th><th>First Fail</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${DLQ.map(d => `<tr class="${d.status === 'pending' ? 'ops-alert-row' : ''}">
            <td class="sa-code">${d.id}</td><td class="sa-code" style="font-size:0.72rem">${d.topic}</td>
            <td class="sa-code" style="font-size:0.72rem">${d.key}</td>
            <td style="font-size:0.78rem">${d.error}</td>
            <td style="text-align:center">${d.retries}</td><td>${d.firstFail}</td>
            <td><span class="sa-status-pill sa-pill-${d.status === 'pending' ? 'orange' : 'green'}">${d.status}</span></td>
            <td>${d.status === 'pending' ? '<button class="btn btn-xs btn-outline">Replay</button> <button class="btn btn-xs btn-ghost">Skip</button>' : ''}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
