/**
 * Risk – Duplicate Rules
 * Duplicate QR/scan detection — reads from /api/ops/data/duplicate-alerts
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

let _data = null;
async function load() {
  if (_data) return;
  try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    _data = await fetch('/api/ops/data/duplicate-alerts', { headers: h }).then(r => r.json());
  } catch { _data = {}; }
}
load();

export function renderPage() {
  const alerts = _data?.alerts || [];
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('shield', 28)} Duplicate Detection Rules</h1></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Duplicates Found', alerts.length, '', 'red', 'shield')}
      </div>

      <div class="sa-card">
        ${alerts.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No duplicate anomalies detected</p>' : `
        <table class="sa-table"><thead><tr><th>Type</th><th>Severity</th><th>Description</th><th>Status</th><th>Detected</th></tr></thead>
        <tbody>${alerts.map(a => `<tr>
          <td class="sa-code">${a.anomaly_type || a.alert_type || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${a.severity === 'high' || a.severity === 'critical' ? 'red' : a.severity === 'medium' ? 'orange' : 'blue'}">${a.severity || '—'}</span></td>
          <td style="font-size:0.8rem;max-width:300px">${a.description || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${a.status === 'open' ? 'red' : 'green'}">${a.status}</span></td>
          <td style="font-size:0.7rem;color:var(--text-secondary)">${a.detected_at ? new Date(a.detected_at).toLocaleString() : '—'}</td>
        </tr>`).join('')}
        </tbody></table>`}
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
