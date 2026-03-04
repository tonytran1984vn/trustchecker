/** Risk – Event Feed — reads from State._riskAlerts */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const alerts = State._riskAlerts?.alerts || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('alert', 28)} Event Feed</h1><div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${alerts.length} events</span></div></div>
    <div class="sa-card">${alerts.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No events</p>' : `
      <table class="sa-table"><thead><tr><th>Source</th><th>Description</th><th>Severity</th><th>Status</th><th>Time</th></tr></thead>
      <tbody>${alerts.map(a => `<tr><td class="sa-code">${a.source || a.alert_type || '—'}</td><td>${a.description?.slice(0, 60) || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${a.severity === 'critical' ? 'red' : a.severity === 'high' ? 'orange' : 'blue'}">${a.severity || '—'}</span></td>
        <td><span class="sa-status-pill sa-pill-${a.status === 'open' ? 'red' : 'green'}">${a.status || '—'}</span></td>
        <td style="font-size:0.7rem;color:var(--text-secondary)">${a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
