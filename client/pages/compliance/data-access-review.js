/** Compliance – Data Access Review — Who accessed what data */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

export function renderPage() {
  const all = State._auditLogs?.logs || State._auditLogs?.entries || [];
  const dataActions = all.filter(l => ['view', 'read', 'export', 'download', 'SELECT', 'query', 'access', 'GDPR_DATA_EXPORT'].some(a => (l.action || '').toLowerCase().includes(a.toLowerCase())));
  // Group by actor
  const byActor = {};
  dataActions.forEach(l => {
    const actor = l.actor_email || l.actor_id || 'unknown';
    if (!byActor[actor]) byActor[actor] = { count: 0, types: new Set(), last: null };
    byActor[actor].count++;
    if (l.entity_type) byActor[actor].types.add(l.entity_type);
    const t = l.timestamp || l.created_at;
    if (t && (!byActor[actor].last || t > byActor[actor].last)) byActor[actor].last = t;
  });
  const actors = Object.entries(byActor).sort((a, b) => b[1].count - a[1].count);

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('eye', 28)} Data Access Review</h1>
      <div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${dataActions.length} data access events</span></div>
    </div>

    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${_m('Access Events', dataActions.length, '', 'blue', 'eye')}
      ${_m('Unique Actors', actors.length, '', 'purple', 'users')}
      ${_m('Resource Types', new Set(dataActions.map(l => l.entity_type).filter(Boolean)).size, '', 'teal', 'database')}
      ${_m('Data Exports', dataActions.filter(l => l.action?.includes('export') || l.action?.includes('EXPORT')).length, '', 'orange', 'download')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 2fr;gap:1.5rem">
      <div class="sa-card">
        <h3 style="margin-bottom:1rem">${icon('users', 18)} Access by User</h3>
        ${actors.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:1.5rem">No data access recorded</p>' : `
        <div style="max-height:400px;overflow-y:auto">
          ${actors.map(([actor, info]) => `<div style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid var(--border-light)">
            <div>
              <div style="font-weight:600;font-size:0.78rem">${actor.length > 30 ? actor.slice(0, 30) + '…' : actor}</div>
              <div style="font-size:0.68rem;color:var(--text-secondary)">${[...info.types].slice(0, 3).join(', ') || 'general'}</div>
            </div>
            <span class="sa-code" style="font-size:0.72rem">${info.count}x</span>
          </div>`).join('')}
        </div>`}
      </div>

      <div class="sa-card">
        <h3 style="margin-bottom:1rem">${icon('scroll', 18)} Recent Data Access Log</h3>
        ${dataActions.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:1.5rem">No data access events</p>' : `
        <table class="sa-table"><thead><tr><th>User</th><th>Action</th><th>Resource</th><th>Time</th></tr></thead>
        <tbody>${dataActions.slice(0, 50).map(l => `<tr>
          <td style="font-weight:600;font-size:0.78rem">${l.actor_email || l.actor_id?.slice(0, 8) || '—'}</td>
          <td><span class="sa-code" style="font-size:0.72rem">${l.action || '—'}</span></td>
          <td style="font-size:0.75rem">${l.entity_type || '—'} ${l.entity_id ? `<span style="color:var(--text-secondary);font-size:0.7rem">${l.entity_id.slice(0, 8)}</span>` : ''}</td>
          <td style="font-size:0.7rem;color:var(--text-secondary)">${l.timestamp || l.created_at ? new Date(l.timestamp || l.created_at).toLocaleString() : '—'}</td>
        </tr>`).join('')}</tbody></table>`}
      </div>
    </div>
  </div>`;
}

function _m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`; }
