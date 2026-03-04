/** Risk – Advanced Filter — reads from State._riskAlerts */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const all = State._riskAlerts?.alerts || [];
  const sources = [...new Set(all.map(a => a.source).filter(Boolean))];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('search', 28)} Advanced Filter</h1><div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${all.length} total alerts across ${sources.length} sources</span></div></div>
    <div class="sa-card" style="margin-bottom:1rem"><h3>Filter by Source</h3>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">${sources.map(s => `<span class="sa-status-pill sa-pill-blue" style="cursor:pointer">${s}</span>`).join('') || '<span style="color:var(--text-secondary)">No sources</span>'}</div>
    </div>
    <div class="sa-card">${all.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No alerts</p>' : `
      <table class="sa-table"><thead><tr><th>Source</th><th>Description</th><th>Severity</th><th>Status</th><th>Time</th></tr></thead>
      <tbody>${all.slice(0, 30).map(a => `<tr><td class="sa-code">${a.source || '—'}</td><td>${a.description?.slice(0, 50) || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${a.severity === 'critical' || a.severity === 'high' ? 'red' : 'orange'}">${a.severity || '—'}</span></td>
        <td><span class="sa-status-pill sa-pill-${a.status === 'open' ? 'red' : 'green'}">${a.status || '—'}</span></td>
        <td style="font-size:0.7rem;color:var(--text-secondary)">${a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
