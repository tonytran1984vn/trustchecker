/** Risk – Advanced Filter — reads from State._riskAlerts */
import { icon } from '../../core/icons.js';
import { State, render } from '../../core/state.js';

let _activeSource = null; // null = show all

export function renderPage() {
  const all = State._riskAlerts?.alerts || [];
  const sources = [...new Set(all.map(a => a.source).filter(Boolean))];
  const filtered = _activeSource ? all.filter(a => a.source === _activeSource) : all;
  const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  filtered.forEach(a => { if (sevCounts[a.severity] !== undefined) sevCounts[a.severity]++; });

  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('search', 28)} Advanced Filter</h1><div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${filtered.length}/${all.length} alerts across ${sources.length} sources</span></div></div>
    <div class="sa-card" style="margin-bottom:1rem"><h3>Filter by Source</h3>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.8rem">
        <span class="sa-status-pill sa-pill-${!_activeSource ? 'purple' : 'blue'}" style="cursor:pointer" onclick="window._riskFilterSource(null)">All (${all.length})</span>
        ${sources.map(s => {
    const cnt = all.filter(a => a.source === s).length;
    return `<span class="sa-status-pill sa-pill-${_activeSource === s ? 'purple' : 'blue'}" style="cursor:pointer" onclick="window._riskFilterSource('${s}')">${s} (${cnt})</span>`;
  }).join('') || '<span style="color:var(--text-secondary)">No sources</span>'}
      </div>
      <div style="display:flex;gap:1.2rem;font-size:0.8rem;color:var(--text-secondary)">
        <span>🔴 Critical: <b>${sevCounts.critical}</b></span>
        <span>🟠 High: <b>${sevCounts.high}</b></span>
        <span>🟡 Medium: <b>${sevCounts.medium}</b></span>
        <span>🟢 Low: <b>${sevCounts.low}</b></span>
      </div>
    </div>
    <div class="sa-card">${filtered.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No alerts matching filter</p>' : `
      <table class="sa-table"><thead><tr><th>Source</th><th>Description</th><th>Severity</th><th>Status</th><th>Time</th></tr></thead>
      <tbody>${filtered.slice(0, 50).map(a => `<tr><td class="sa-code">${a.source || '—'}</td><td>${a.description?.slice(0, 60) || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${a.severity === 'critical' || a.severity === 'high' ? 'red' : 'orange'}">${a.severity || '—'}</span></td>
        <td><span class="sa-status-pill sa-pill-${a.status === 'open' ? 'red' : 'green'}">${a.status || '—'}</span></td>
        <td style="font-size:0.7rem;color:var(--text-secondary)">${a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}

// Global handler for filter clicks — triggers full SPA re-render
if (typeof window !== 'undefined') {
  window._riskFilterSource = function (source) {
    _activeSource = source;
    render();
  };
}
