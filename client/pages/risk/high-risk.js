/**
 * Risk – High Risk Events
 * Critical/high risk alerts from /api/scm/risk/alerts?severity=critical
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
  const items = _data || [];
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('alertTriangle', 28)} High Risk Events</h1>
        <div class="sa-title-actions"><span style="font-size:0.75rem;color:#ef4444;font-weight:700">${items.length} high risk</span></div></div>
      <div class="sa-card">
        ${items.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No high risk events — all clear</p>' : `
        <table class="sa-table"><thead><tr><th>Severity</th><th>Source</th><th>Type</th><th>Description</th><th>Status</th><th>Time</th></tr></thead>
        <tbody>${items.map(a => `<tr class="ops-alert-row">
          <td><span class="sa-status-pill sa-pill-red">${a.severity}</span></td>
          <td class="sa-code">${a.source}</td><td>${a.alert_type || '—'}</td>
          <td style="font-size:0.8rem;max-width:300px">${a.description || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${a.status === 'open' ? 'red' : 'green'}">${a.status}</span></td>
          <td style="font-size:0.7rem;color:var(--text-secondary)">${a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</td>
        </tr>`).join('')}</tbody></table>`}
      </div></div>`;
}
