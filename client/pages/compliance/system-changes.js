/** Compliance – System Changes — Filtered view of create/update/delete operations */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

export function renderPage() {
  const all = State._auditLogs?.logs || State._auditLogs?.entries || [];
  const changes = all.filter(l => ['create', 'update', 'delete', 'modify', 'INSERT', 'UPDATE', 'DELETE', 'PATCH'].some(a => (l.action || '').toLowerCase().includes(a.toLowerCase())));

  const inserts = changes.filter(l => l.action?.toLowerCase().includes('create') || l.action?.includes('INSERT'));
  const updates = changes.filter(l => l.action?.toLowerCase().includes('update') || l.action?.includes('PATCH') || l.action?.includes('modify'));
  const deletes = changes.filter(l => l.action?.toLowerCase().includes('delete') || l.action?.includes('DELETE'));

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('scroll', 28)} System Changes</h1>
      <div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${changes.length} changes tracked</span></div>
    </div>

    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${_m('Created', inserts.length, '', 'green', 'plus')}
      ${_m('Updated', updates.length, '', 'blue', 'edit')}
      ${_m('Deleted', deletes.length, '', 'red', 'trash')}
      ${_m('Total', changes.length, '', 'slate', 'scroll')}
    </div>

    <div class="sa-card">
      ${changes.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No system changes recorded</p>' : `
      <table class="sa-table"><thead><tr><th>User</th><th>Action</th><th>Resource</th><th>Details</th><th>Time</th></tr></thead>
      <tbody>${changes.slice(0, 100).map(l => {
    const actionClass = l.action?.toLowerCase().includes('delete') ? 'red' : l.action?.toLowerCase().includes('create') ? 'green' : 'blue';
    let detailStr = '—';
    try { const d = typeof l.details === 'string' ? JSON.parse(l.details) : l.details; detailStr = d ? Object.keys(d).slice(0, 3).join(', ') : '—'; } catch { detailStr = (l.details || '—').toString().slice(0, 40); }
    return `<tr>
        <td style="font-weight:600;font-size:0.78rem">${l.actor_email || l.user_email || l.actor || l.actor_id?.slice(0, 8) || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${actionClass}" style="font-size:0.7rem">${l.action || '—'}</span></td>
        <td style="font-size:0.75rem">${l.entity_type || '—'} <span style="color:var(--text-secondary);font-size:0.7rem">${l.entity_id?.slice(0, 8) || ''}</span></td>
        <td style="font-size:0.72rem;color:var(--text-secondary);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${detailStr}</td>
        <td style="font-size:0.7rem;color:var(--text-secondary)">${l.timestamp || l.created_at ? new Date(l.timestamp || l.created_at).toLocaleString() : '—'}</td>
      </tr>`;
  }).join('')}</tbody></table>`}
    </div>
  </div>`;
}

function _m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`; }
