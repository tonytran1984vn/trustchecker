/** Risk – Closed Cases — reads from State._riskIncidents */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const incidents = (State._riskIncidents || []).filter(i => i.status === 'resolved' || i.status === 'closed');
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('check', 28)} Closed Cases</h1><div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${incidents.length} resolved</span></div></div>
    <div class="sa-card">${incidents.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No closed cases</p>' : `
      <table class="sa-table"><thead><tr><th>ID</th><th>Title</th><th>Severity</th><th>Resolved</th></tr></thead>
      <tbody>${incidents.map(i => `<tr><td class="sa-code">${i.incident_id || i.id?.slice(0, 12) || '—'}</td><td>${i.title || '—'}</td>
        <td><span class="sa-status-pill sa-pill-green">${i.severity || '—'}</span></td>
        <td style="font-size:0.7rem;color:var(--text-secondary)">${i.resolved_at ? new Date(i.resolved_at).toLocaleString() : '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
