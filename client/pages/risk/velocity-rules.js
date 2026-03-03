/**
 * Risk – Velocity Rules
 * Velocity-based anomaly detection — reads from /api/scm/risk/alerts + anomalies
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

let _data = null;
async function load() {
  if (_data) return;
  try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const res = await fetch('/api/scm/risk/alerts?limit=50', { headers: h }).then(r => r.json());
    _data = (res.alerts || []).filter(a => a.alert_type?.includes('velocity') || a.alert_type?.includes('spike') || a.source === 'anomaly');
  } catch { _data = []; }
}
load();

export function renderPage() {
  const alerts = _data || [];
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('zap', 28)} Velocity Rules</h1></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Velocity Alerts', alerts.length, '', 'orange', 'zap')}
      </div>

      <div class="sa-card">
        ${alerts.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No velocity anomalies detected</p>' : `
        <table class="sa-table"><thead><tr><th>Source</th><th>Type</th><th>Severity</th><th>Description</th><th>Status</th><th>Time</th></tr></thead>
        <tbody>${alerts.map(a => `<tr>
          <td class="sa-code">${a.source}</td>
          <td style="font-size:0.8rem">${a.alert_type || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${a.severity === 'high' || a.severity === 'critical' ? 'red' : 'orange'}">${a.severity || '—'}</span></td>
          <td style="font-size:0.8rem;max-width:250px">${a.description || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${a.status === 'open' ? 'red' : 'green'}">${a.status}</span></td>
          <td style="font-size:0.7rem;color:var(--text-secondary)">${a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</td>
        </tr>`).join('')}
        </tbody></table>`}
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
