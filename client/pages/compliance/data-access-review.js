/** Compliance – Data Access Review — reads from State._auditLogs (filtered for access events) */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const all = State._auditLogs?.logs || State._auditLogs?.entries || [];
  const logs = all.filter(l => l.action?.includes('read') || l.action?.includes('view') || l.action?.includes('export') || l.action?.includes('access'));
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('search', 28)} Data Access Review</h1></div>
    <div class="sa-card">${logs.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No data access events</p>' : `
      <table class="sa-table"><thead><tr><th>User</th><th>Action</th><th>Resource</th><th>Time</th></tr></thead>
      <tbody>${logs.map(l => `<tr><td style="font-weight:600">${l.user_email || l.actor || '—'}</td><td class="sa-code">${l.action || '—'}</td><td>${l.entity_type || l.resource || '—'}</td><td style="font-size:0.7rem;color:var(--text-secondary)">${l.timestamp || l.created_at ? new Date(l.timestamp || l.created_at).toLocaleString() : '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
