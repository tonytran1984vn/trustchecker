/**
 * Risk – Event Feed
 * Live feed of all risk alerts from fraud_alerts, leak_alerts, sla_violations, anomaly_detections
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

let _data = null;
async function load() {
  if (_data) return;
  try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    _data = await fetch('/api/scm/risk/alerts?limit=100', { headers: h }).then(r => r.json());
  } catch { _data = {}; }
}
load();

export function renderPage() {
  const alerts = (_data?.alerts || []);
  const bySev = _data?.by_severity || {};
  const bySrc = _data?.by_source || {};

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('scroll', 28)} Risk Event Feed</h1>
        <div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${alerts.length} active alerts</span></div>
      </div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Critical', bySev.critical || 0, '', 'red', 'alert')}
        ${m('High', bySev.high || 0, '', 'orange', 'alertTriangle')}
        ${m('Medium', bySev.medium || 0, '', 'blue', 'shield')}
        ${m('Low', bySev.low || 0, '', 'green', 'check')}
      </div>

      <div class="sa-card">
        <h3>All Active Alerts</h3>
        ${alerts.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No active alerts</p>' : `
        <table class="sa-table"><thead><tr><th>Severity</th><th>Source</th><th>Type</th><th>Description</th><th>Status</th><th>Time</th></tr></thead>
        <tbody>${alerts.map(a => `<tr class="${a.severity === 'critical' ? 'ops-alert-row' : ''}">
          <td><span class="sa-status-pill sa-pill-${a.severity === 'critical' || a.severity === 'high' ? 'red' : a.severity === 'medium' ? 'orange' : 'blue'}">${a.severity}</span></td>
          <td class="sa-code">${a.source}</td>
          <td style="font-size:0.8rem">${a.alert_type || '—'}</td>
          <td style="font-size:0.8rem;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.description || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${a.status === 'open' ? 'red' : 'green'}">${a.status}</span></td>
          <td style="font-size:0.7rem;color:var(--text-secondary)">${a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</td>
        </tr>`).join('')}
        </tbody></table>`}
      </div>
    </div>`;
}

function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
