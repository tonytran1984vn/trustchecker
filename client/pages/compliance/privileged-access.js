/** Compliance – Privileged Access — reads from /api/audit-log/ */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let _d = null;
async function load() { if (_d) return; try { _d = await fetch('/api/audit-log/?limit=50', { headers: { 'Authorization': 'Bearer ' + State.token } }).then(r => r.json()); } catch { _d = {}; } }
load();
export function renderPage() {
  const logs = (_d?.logs || _d?.entries || []).filter(l => l.action?.includes('admin') || l.action?.includes('role') || l.action?.includes('privilege') || l.action?.includes('delete'));
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('shield', 28)} Privileged Access</h1></div>
    <div class="sa-card">${logs.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No privileged access events</p>' : `
      <table class="sa-table"><thead><tr><th>User</th><th>Action</th><th>Resource</th><th>IP</th><th>Time</th></tr></thead>
      <tbody>${logs.map(l => `<tr><td style="font-weight:600">${l.user_email || l.actor || '—'}</td><td class="sa-code">${l.action || '—'}</td><td>${l.resource || '—'}</td><td class="sa-code" style="font-size:0.72rem">${l.ip_address || '—'}</td><td style="font-size:0.7rem;color:var(--text-secondary)">${l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
