/** Risk – Case Workflow — reads from State._riskIncidents */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const incidents = State._riskIncidents || [];
  const byStatus = {}; incidents.forEach(i => { const s = i.status || 'unknown'; if (!byStatus[s]) byStatus[s] = []; byStatus[s].push(i); });
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('workflow', 28)} Case Workflow</h1><div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${incidents.length} total</span></div></div>
    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${m('Open', (byStatus.open || []).length, '', 'red', 'alert')}
      ${m('In Progress', (byStatus.in_progress || byStatus.investigating || []).length, '', 'orange', 'clock')}
      ${m('Resolved', (byStatus.resolved || byStatus.closed || []).length, '', 'green', 'check')}
    </div>
    <div class="sa-card"><h3>All Cases</h3>
      ${incidents.length === 0 ? '<p style="color:var(--text-secondary)">No cases</p>' : `
        <table class="sa-table"><thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Severity</th></tr></thead>
        <tbody>${incidents.slice(0, 20).map(i => `<tr><td class="sa-code">${i.incident_id || i.id?.slice(0, 12) || '—'}</td><td>${i.title || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${i.status === 'open' ? 'red' : i.status === 'resolved' ? 'green' : 'orange'}">${i.status}</span></td>
          <td><span class="sa-status-pill sa-pill-${i.severity === 'critical' ? 'red' : 'orange'}">${i.severity || '—'}</span></td></tr>`).join('')}</tbody></table>`}
    </div></div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
