/** Risk – Open Cases — reads from State._riskAlerts */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const all = State._riskAlerts?.alerts || [];
  const cases = all.filter(a => a.status === 'open');
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('alert', 28)} Open Cases</h1><div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${cases.length} open</span></div></div>
    <div class="sa-card">${cases.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No open cases</p>' : `
      <table class="sa-table"><thead><tr><th>Source</th><th>Description</th><th>Severity</th><th>Time</th></tr></thead>
      <tbody>${cases.map(a => `<tr><td class="sa-code">${a.source || a.alert_type || '—'}</td><td>${a.description?.slice(0, 60) || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${a.severity === 'critical' ? 'red' : a.severity === 'high' ? 'orange' : 'blue'}">${a.severity || '—'}</span></td>
        <td style="font-size:0.7rem;color:var(--text-secondary)">${a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
