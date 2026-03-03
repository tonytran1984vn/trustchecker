/**
 * Compliance – User Activity
 * Reads from /api/audit-log/ for user activity tracking
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let _data = null;
async function load() {
  if (_data) return;
  try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    _data = await fetch('/api/audit-log/?limit=50', { headers: h }).then(r => r.json());
  } catch { _data = {}; }
}
load();
export function renderPage() {
  const logs = _data?.logs || _data?.entries || [];
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('users', 28)} User Activity</h1></div>
      <div class="sa-card">
        ${logs.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No user activity logs</p>' : `
        <table class="sa-table"><thead><tr><th>User</th><th>Action</th><th>Resource</th><th>IP</th><th>Time</th></tr></thead>
        <tbody>${logs.map(l => `<tr>
          <td style="font-weight:600">${l.user_email || l.actor || '—'}</td>
          <td class="sa-code">${l.action || l.event_type || '—'}</td>
          <td style="font-size:0.8rem">${l.resource || l.entity_type || '—'}</td>
          <td class="sa-code" style="font-size:0.72rem">${l.ip_address || l.ip || '—'}</td>
          <td style="font-size:0.7rem;color:var(--text-secondary)">${l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
        </tr>`).join('')}</tbody></table>`}
      </div></div>`;
}
