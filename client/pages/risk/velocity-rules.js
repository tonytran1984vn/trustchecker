/** Risk – Velocity Rules — reads from State._riskAlerts */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const all = State._riskAlerts?.alerts || [];
  const velocity = all.filter(a => a.source?.includes('velocity') || a.alert_type?.includes('velocity') || a.source?.includes('spike') || a.anomaly_type?.includes('velocity'));
  const list = velocity.length > 0 ? velocity : all.filter(a => a.source === 'anomaly_detections');
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('zap', 28)} Velocity Rules</h1></div>
    <div class="sa-card">${list.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No velocity anomalies detected</p>' : `
      <table class="sa-table"><thead><tr><th>Source</th><th>Description</th><th>Severity</th><th>Status</th></tr></thead>
      <tbody>${list.map(a => `<tr><td class="sa-code">${a.source || '—'}</td><td>${a.description?.slice(0, 60) || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${a.severity === 'high' ? 'red' : 'orange'}">${a.severity || '—'}</span></td>
        <td><span class="sa-status-pill sa-pill-${a.status === 'open' ? 'red' : 'green'}">${a.status || '—'}</span></td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
