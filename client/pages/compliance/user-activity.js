/** Compliance – User Activity — reads from State._auditLogs */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const logs = State._auditLogs?.logs || State._auditLogs?.entries || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('search', 28)} User Activity</h1><div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${logs.length} records</span></div></div>
    <div class="sa-card">${logs.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No audit records</p>' : `
      <table class="sa-table"><thead><tr><th>User</th><th>Action</th><th>Resource</th><th>IP</th><th>Time</th></tr></thead>
      <tbody>${logs.map(l => `<tr><td style="font-weight:600">${l.user_email || l.actor || l.actor_id || '—'}</td><td class="sa-code">${l.action || '—'}</td><td>${l.entity_type || l.resource || '—'}</td><td class="sa-code" style="font-size:0.72rem">${l.ip_address || '—'}</td><td style="font-size:0.7rem;color:var(--text-secondary)">${l.timestamp || l.created_at ? new Date(l.timestamp || l.created_at).toLocaleString() : '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
