/** Risk – Escalated Cases — reads from State._riskAlerts */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const all = State._riskAlerts?.alerts || [];
  const esc = all.filter(a => a.severity === 'critical' || a.severity === 'high');
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('alertTriangle', 28)} Escalated Cases</h1><div class="sa-title-actions"><span style="font-size:0.75rem;color:#ef4444;font-weight:600">${esc.length} escalated</span></div></div>
    <div class="sa-card">${esc.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No escalated cases</p>' : `
      <table class="sa-table"><thead><tr><th>Source</th><th>Description</th><th>Severity</th><th>Status</th><th>Time</th></tr></thead>
      <tbody>${esc.map(a => `<tr><td class="sa-code">${a.source || a.alert_type || '—'}</td><td>${a.description?.slice(0, 50) || '—'}</td>
        <td><span class="sa-status-pill sa-pill-red">${a.severity || '—'}</span></td>
        <td><span class="sa-status-pill sa-pill-${a.status === 'open' ? 'red' : 'green'}">${a.status || '—'}</span></td>
        <td style="font-size:0.7rem;color:var(--text-secondary)">${a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
