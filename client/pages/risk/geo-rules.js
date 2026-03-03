/**
 * Risk – Geo Rules
 * Geo-based fraud detection rules — reads geo alerts from /api/ops/data/geo-alerts
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

let _data = null;
async function load() {
  if (_data) return;
  try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    _data = await fetch('/api/ops/data/geo-alerts', { headers: h }).then(r => r.json());
  } catch { _data = {}; }
}
load();

export function renderPage() {
  const alerts = _data?.alerts || [];
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('globe', 28)} Geo Rules & Alerts</h1></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Geo Alerts', alerts.length, '', 'red', 'globe')}
        ${m('High Risk', alerts.filter(a => a.risk_score > 70 || a.severity === 'high').length, '', 'orange', 'alertTriangle')}
      </div>

      <div class="sa-card">
        ${alerts.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No geo alerts detected</p>' : `
        <table class="sa-table"><thead><tr><th>Type</th><th>Description</th><th>Location</th><th>Severity</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>${alerts.map(a => `<tr>
          <td class="sa-code">${a.alert_type || '—'}</td>
          <td style="font-size:0.8rem;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.description || '—'}</td>
          <td style="font-size:0.8rem">${a.location || a.country || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${a.severity === 'high' || a.severity === 'critical' ? 'red' : a.severity === 'medium' ? 'orange' : 'blue'}">${a.severity || '—'}</span></td>
          <td><span class="sa-status-pill sa-pill-${a.status === 'open' ? 'red' : 'green'}">${a.status || '—'}</span></td>
          <td style="font-size:0.7rem;color:var(--text-secondary)">${a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
        </tr>`).join('')}
        </tbody></table>`}
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
