/** Compliance – System Changes — reads from State._auditLogs (filtered) */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const all = State._auditLogs?.logs || State._auditLogs?.entries || [];
  const changes = all.filter(l => l.action?.includes('update') || l.action?.includes('create') || l.action?.includes('delete') || l.action?.includes('modify'));
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('scroll', 28)} System Changes</h1><div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${changes.length} changes</span></div></div>
    <div class="sa-card">${changes.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No system changes recorded</p>' : `
      <table class="sa-table"><thead><tr><th>User</th><th>Action</th><th>Resource</th><th>Time</th></tr></thead>
      <tbody>${changes.map(l => `<tr><td style="font-weight:600">${l.user_email || l.actor || '—'}</td><td class="sa-code">${l.action || '—'}</td><td>${l.entity_type || '—'} ${l.entity_id?.slice(0, 8) || ''}</td><td style="font-size:0.7rem;color:var(--text-secondary)">${l.timestamp || l.created_at ? new Date(l.timestamp || l.created_at).toLocaleString() : '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
