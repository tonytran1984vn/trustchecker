/** Compliance – Privileged Access — Admin/elevated role activity monitor */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

export function renderPage() {
  const all = State._auditLogs?.logs || State._auditLogs?.entries || [];
  const privilegedActions = ['role_assign', 'role_remove', 'user_create', 'user_delete', 'password_change', 'mfa_disable', 'permission_grant', 'GDPR_DELETION', 'GDPR_DATA_EXPORT', 'RETENTION_EXECUTED', 'settings_update', 'org_create', 'org_update'];
  const privilegedRoles = ['super_admin', 'admin', 'company_admin', 'org_owner'];

  const logs = all.filter(l =>
    privilegedActions.some(a => (l.action || '').toLowerCase().includes(a.toLowerCase())) ||
    privilegedRoles.includes(l.actor_role)
  );
  // fallback: if no matches, show all admin actions
  const display = logs.length > 0 ? logs : all.filter(l => privilegedRoles.includes(l.actor_role));

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('lock', 28)} Privileged Access Monitor</h1>
      <div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${display.length} privileged actions</span></div>
    </div>

    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${_m('Privileged Ops', display.length, '', display.length > 10 ? 'orange' : 'green', 'lock')}
      ${_m('Unique Actors', new Set(display.map(l => l.actor_id || l.actor_email)).size, '', 'blue', 'users')}
      ${_m('Role Changes', display.filter(l => l.action?.includes('role')).length, '', 'purple', 'userPlus')}
      ${_m('GDPR Actions', display.filter(l => l.action?.includes('GDPR')).length, '', 'teal', 'shield')}
    </div>

    <div class="sa-card">
      ${display.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No privileged access activity</p>' : `
      <table class="sa-table"><thead><tr><th>Actor</th><th>Role</th><th>Action</th><th>Resource</th><th>IP</th><th>Time</th></tr></thead>
      <tbody>${display.slice(0, 100).map(l => {
    const isSensitive = ['delete', 'GDPR', 'password', 'mfa_disable'].some(k => (l.action || '').includes(k));
    return `<tr${isSensitive ? ' style="background:rgba(239,68,68,0.05)"' : ''}>
        <td style="font-weight:600;font-size:0.78rem">${l.actor_email || l.user_email || l.actor_id?.slice(0, 8) || '—'}</td>
        <td><span class="sa-code" style="font-size:0.7rem">${l.actor_role || '—'}</span></td>
        <td><span class="sa-status-pill sa-pill-${isSensitive ? 'red' : 'blue'}" style="font-size:0.7rem">${l.action || '—'}</span></td>
        <td style="font-size:0.75rem">${l.entity_type || '—'} <span style="color:var(--text-secondary);font-size:0.7rem">${l.entity_id?.slice(0, 8) || ''}</span></td>
        <td class="sa-code" style="font-size:0.7rem">${l.ip_address || '—'}</td>
        <td style="font-size:0.7rem;color:var(--text-secondary)">${l.timestamp || l.created_at ? new Date(l.timestamp || l.created_at).toLocaleString() : '—'}</td>
      </tr>`;
  }).join('')}</tbody></table>`}
    </div>

    <div class="sa-card" style="margin-top:1rem;background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15)">
      <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.78rem;color:var(--text-secondary)">
        ${icon('alertTriangle', 16)} <span>Rows highlighted in red indicate <strong>sensitive operations</strong> (deletions, GDPR, password/MFA changes)</span>
      </div>
    </div>
  </div>`;
}

function _m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`; }
