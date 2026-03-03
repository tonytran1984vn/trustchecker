/**
 * Risk – Closed Cases
 * Shows resolved/closed alerts from /api/scm/risk/alerts
 * Note: The API currently only returns open alerts, so this page will show
 * a DB-direct query when resolved alerts API is available, or empty state.
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

let _data = null;
async function load() {
  if (_data) return;
  try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    // Try to get closed incidents from ops-monitoring
    const res = await fetch('/api/ops/incidents?status=resolved&limit=50', { headers: h }).then(r => r.json());
    _data = (res.incidents || []);
  } catch { _data = []; }
}
load();

export function renderPage() {
  const cases = _data || [];
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('check', 28)} Closed Cases</h1>
        <div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${cases.length} resolved</span></div>
      </div>

      <div class="sa-card">
        ${cases.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No closed cases in history</p>' : `
        <table class="sa-table"><thead><tr><th>ID</th><th>Title</th><th>Severity</th><th>Status</th><th>Resolution</th><th>Resolved At</th></tr></thead>
        <tbody>${cases.map(c => `<tr>
          <td class="sa-code">${c.incident_id || c.id?.slice(0, 12) || '—'}</td>
          <td style="font-size:0.82rem">${c.title || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${c.severity === 'SEV1' ? 'red' : c.severity === 'SEV2' ? 'orange' : 'blue'}">${c.severity || '—'}</span></td>
          <td><span class="sa-status-pill sa-pill-green">${c.status}</span></td>
          <td style="font-size:0.75rem;color:var(--text-secondary)">${c.resolution || '—'}</td>
          <td style="font-size:0.7rem;color:var(--text-secondary)">${c.resolved_at ? new Date(c.resolved_at).toLocaleString() : c.updated_at ? new Date(c.updated_at).toLocaleString() : '—'}</td>
        </tr>`).join('')}
        </tbody></table>`}
      </div>
    </div>`;
}
