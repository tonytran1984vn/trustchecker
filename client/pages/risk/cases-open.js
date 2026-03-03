/**
 * Risk – Open Cases
 * Reads fraud/anomaly alerts where status = 'open' from /api/scm/risk/alerts
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

let _data = null;
async function load() {
  if (_data) return;
  try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const res = await fetch('/api/scm/risk/alerts?limit=100', { headers: h }).then(r => r.json());
    _data = (res.alerts || []).filter(a => a.status === 'open');
  } catch { _data = []; }
}
load();

export function renderPage() {
  const cases = _data || [];
  const critical = cases.filter(c => c.severity === 'critical').length;
  const high = cases.filter(c => c.severity === 'high').length;

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('alertTriangle', 28)} Open Cases</h1>
        <div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${cases.length} open · ${critical} critical · ${high} high</span></div>
      </div>

      <div class="sa-card">
        ${cases.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No open cases — all clear ✅</p>' : `
        <table class="sa-table"><thead><tr><th>Severity</th><th>Source</th><th>Type</th><th>Description</th><th>Created</th><th>Actions</th></tr></thead>
        <tbody>${cases.map(c => `<tr class="${c.severity === 'critical' ? 'ops-alert-row' : ''}">
          <td><span class="sa-status-pill sa-pill-${c.severity === 'critical' || c.severity === 'high' ? 'red' : c.severity === 'medium' ? 'orange' : 'blue'}">${c.severity}</span></td>
          <td class="sa-code">${c.source}</td>
          <td style="font-size:0.8rem">${c.alert_type || '—'}</td>
          <td style="font-size:0.8rem;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.description || '—'}</td>
          <td style="font-size:0.7rem;color:var(--text-secondary)">${c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</td>
          <td><button class="btn btn-sm btn-primary" onclick="showToast('Case investigation started','info')">Investigate</button></td>
        </tr>`).join('')}
        </tbody></table>`}
      </div>
    </div>`;
}
