/**
 * Risk – Case Workflow
 * Case management workflow — reads incidents from /api/ops/incidents
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let _data = null;
async function load() {
  if (_data) return;
  try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const res = await fetch('/api/ops/incidents?limit=50', { headers: h }).then(r => r.json());
    _data = res.incidents || [];
  } catch { _data = []; }
}
load();
export function renderPage() {
  const cases = _data || [];
  const byStatus = {};
  cases.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('workflow', 28)} Case Workflow</h1></div>
      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${Object.entries(byStatus).map(([s, n]) =>
    `<div class="sa-metric-card sa-metric-${s === 'open' ? 'red' : s === 'resolved' ? 'green' : s === 'escalated' ? 'orange' : 'blue'}"><div class="sa-metric-body"><div class="sa-metric-value">${n}</div><div class="sa-metric-label">${s}</div></div></div>`
  ).join('')}
      </div>
      <div class="sa-card">
        ${cases.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No cases in workflow</p>' : `
        <table class="sa-table"><thead><tr><th>ID</th><th>Title</th><th>Severity</th><th>Status</th><th>Entity</th><th>Created</th></tr></thead>
        <tbody>${cases.map(c => `<tr>
          <td class="sa-code">${c.incident_id || c.id?.slice(0, 12) || '—'}</td>
          <td style="font-size:0.82rem">${c.title || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${c.severity === 'SEV1' ? 'red' : c.severity === 'SEV2' ? 'orange' : 'blue'}">${c.severity || '—'}</span></td>
          <td><span class="sa-status-pill sa-pill-${c.status === 'open' ? 'red' : c.status === 'resolved' ? 'green' : 'orange'}">${c.status}</span></td>
          <td style="font-size:0.8rem">${c.affected_entity || '—'}</td>
          <td style="font-size:0.7rem;color:var(--text-secondary)">${c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</td>
        </tr>`).join('')}</tbody></table>`}
      </div></div>`;
}
