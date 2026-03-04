/** Compliance – Privileged Access — reads from State._auditLogs (filtered for admin/role events) */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const all = State._auditLogs?.logs || State._auditLogs?.entries || [];
  const logs = all.filter(l => l.action?.includes('admin') || l.action?.includes('role') || l.action?.includes('privilege') || l.action?.includes('delete'));
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('shield', 28)} Privileged Access</h1></div>
    <div class="sa-card">${logs.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No privileged access events</p>' : `
      <table class="sa-table"><thead><tr><th>User</th><th>Action</th><th>Resource</th><th>IP</th><th>Time</th></tr></thead>
      <tbody>${logs.map(l => `<tr><td style="font-weight:600">${l.user_email || l.actor || '—'}</td><td class="sa-code">${l.action || '—'}</td><td>${l.entity_type || '—'}</td><td class="sa-code" style="font-size:0.72rem">${l.ip_address || '—'}</td><td style="font-size:0.7rem;color:var(--text-secondary)">${l.timestamp || l.created_at ? new Date(l.timestamp || l.created_at).toLocaleString() : '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
