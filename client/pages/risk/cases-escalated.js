/**
 * Risk – Escalated Cases
 * Reads from /api/scm/risk/alerts with severity = critical/high
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

let _data = null;
async function load() {
  if (_data) return;
  try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const res = await fetch('/api/scm/risk/alerts?limit=100', { headers: h }).then(r => r.json());
    _data = (res.alerts || []).filter(a => a.severity === 'critical' || a.severity === 'high');
  } catch { _data = []; }
}
load();

export function renderPage() {
  const cases = _data || [];
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('alert', 28)} Escalated Cases</h1>
        <div class="sa-title-actions"><span style="font-size:0.75rem;color:#ef4444;font-weight:700">${cases.length} escalated</span></div>
      </div>

      <div class="sa-card">
        ${cases.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No escalated cases</p>' : `
        <table class="sa-table"><thead><tr><th>Severity</th><th>Source</th><th>Type</th><th>Description</th><th>Status</th><th>Created</th></tr></thead>
        <tbody>${cases.map(c => `<tr class="ops-alert-row">
          <td><span class="sa-status-pill sa-pill-red">${c.severity}</span></td>
          <td class="sa-code">${c.source}</td>
          <td style="font-size:0.8rem">${c.alert_type || '—'}</td>
          <td style="font-size:0.8rem;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.description || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${c.status === 'open' ? 'red' : 'orange'}">${c.status}</span></td>
          <td style="font-size:0.7rem;color:var(--text-secondary)">${c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</td>
        </tr>`).join('')}
        </tbody></table>`}
      </div>
    </div>`;
}
