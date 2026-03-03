/** Compliance – System Changes — reads from /api/audit-log/?limit=50 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let _d = null;
async function load() { if (_d) return; try { _d = await fetch('/api/audit-log/?limit=50', { headers: { 'Authorization': 'Bearer ' + State.token } }).then(r => r.json()); } catch { _d = {}; } }
load();
export function renderPage() {
  const logs = (_d?.logs || _d?.entries || []).filter(l => l.action?.includes('update') || l.action?.includes('create') || l.action?.includes('delete') || l.event_type?.includes('config'));
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('settings', 28)} System Changes</h1></div>
    <div class="sa-card">${logs.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No system changes recorded</p>' : `
      <table class="sa-table"><thead><tr><th>Action</th><th>User</th><th>Resource</th><th>Details</th><th>Time</th></tr></thead>
      <tbody>${logs.map(l => `<tr><td class="sa-code">${l.action || l.event_type || '—'}</td><td>${l.user_email || l.actor || '—'}</td><td>${l.resource || l.entity_type || '—'}</td><td style="font-size:0.75rem;max-width:200px">${typeof l.details === 'object' ? JSON.stringify(l.details).slice(0, 80) : l.details || '—'}</td><td style="font-size:0.7rem;color:var(--text-secondary)">${l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
