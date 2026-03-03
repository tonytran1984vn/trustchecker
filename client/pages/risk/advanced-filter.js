/**
 * Risk – Advanced Filter
 * Advanced alert filtering with multi-source aggregation from /api/scm/risk/alerts
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let _data = null;
async function load() {
  if (_data) return;
  try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    _data = await fetch('/api/scm/risk/alerts?limit=200', { headers: h }).then(r => r.json());
  } catch { _data = {}; }
}
load();
export function renderPage() {
  const all = _data?.alerts || [];
  const bySrc = _data?.by_source || {};
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('search', 28)} Advanced Filter</h1></div>
      <div class="sa-metrics-row" style="margin-bottom:1rem">
        ${['fraud', 'anomaly', 'leak', 'sla'].map(s =>
    `<div class="sa-metric-card sa-metric-blue" style="cursor:pointer" onclick="window._riskFilter='${s}';render()"><div class="sa-metric-body"><div class="sa-metric-value">${bySrc[s] || 0}</div><div class="sa-metric-label">${s}</div></div></div>`
  ).join('')}
      </div>
      <div class="sa-card">
        <h3>${all.length} Total Alerts</h3>
        ${all.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No alerts to filter</p>' : `
        <table class="sa-table"><thead><tr><th>Source</th><th>Severity</th><th>Type</th><th>Description</th><th>Status</th><th>Time</th></tr></thead>
        <tbody>${all.slice(0, 50).map(a => `<tr>
          <td class="sa-code">${a.source}</td>
          <td><span class="sa-status-pill sa-pill-${a.severity === 'critical' || a.severity === 'high' ? 'red' : a.severity === 'medium' ? 'orange' : 'blue'}">${a.severity}</span></td>
          <td>${a.alert_type || '—'}</td>
          <td style="font-size:0.78rem;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.description || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${a.status === 'open' ? 'red' : 'green'}">${a.status}</span></td>
          <td style="font-size:0.68rem;color:var(--text-secondary)">${a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</td>
        </tr>`).join('')}</tbody></table>`}
      </div></div>`;
}
