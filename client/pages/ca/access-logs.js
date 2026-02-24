/**
 * Company Admin – Access Logs (Tenant Scope)
 * ════════════════════════════════════════════
 * Real data from /api/audit-log
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let logs = null, loading = false, activeTab = 'all';
export function renderPage() {
  return `<div id="access-logs-root">${renderContent()}</div>`;
}

window._caAccessTab = (t) => { activeTab = t; { const _el = document.getElementById('access-logs-root'); if (_el) _el.innerHTML = renderContent ? renderContent() : ''; } };

async function load() {
  if (loading) return; loading = true;
  try {
    const res = await API.get('/tenant/audit?limit=100');
    logs = Array.isArray(res) ? res : (res.logs || res.entries || []);
  } catch (e) { logs = []; }
  loading = false;
  setTimeout(() => { const el = document.getElementById('access-logs-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
}

function timeAgo(d) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), dd = Math.floor(h / 24);
  if (m < 1) return 'Just now'; if (m < 60) return m + 'm ago'; if (h < 24) return h + 'h ago'; return dd + 'd ago';
}

function renderContent() {
  if (!logs && !loading) { load(); }
  if (loading && !logs) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Access Logs...</div></div>`;

  const list = logs || [];
  const loginActions = ['LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'MFA_VERIFIED', 'login', 'logout'];
  const permActions = ['ROLE_CHANGED', 'USER_CREATED', 'USER_DISABLED', 'MFA_ENFORCED', 'role_changed', 'user_created'];

  let filtered = list;
  if (activeTab === 'login') filtered = list.filter(l => loginActions.some(a => (l.action || '').toUpperCase().includes(a.toUpperCase())));
  else if (activeTab === 'permissions') filtered = list.filter(l => permActions.some(a => (l.action || '').toUpperCase().includes(a.toUpperCase())));

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('scroll', 28)} Access Logs</h1>
        <div class="sa-title-actions">
          <button class="btn btn-outline btn-sm">Export CSV</button>
        </div>
      </div>

      <div class="sa-tabs">
        ${tab('all', 'All Logs (' + list.length + ')')}
        ${tab('login', 'Login History')}
        ${tab('permissions', 'Permission Changes')}
      </div>

      <div class="sa-card">
        ${filtered.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--text-muted)">No logs found</div>' : `
        <table class="sa-table">
          <thead><tr><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th><th>IP</th><th>Time</th></tr></thead>
          <tbody>
            ${filtered.map(l => {
    const details = typeof l.details === 'string' ? (() => { try { return JSON.parse(l.details); } catch (e) { return {}; } })() : (l.details || {});
    const detailStr = Object.entries(details).slice(0, 2).map(([k, v]) => k + ': ' + v).join(', ') || '—';
    return `<tr>
                <td><strong>${l.actor_id ? l.actor_id.substring(0, 8) : '—'}</strong></td>
                <td><span class="sa-status-pill sa-pill-${l.action?.includes('FAIL') || l.action?.includes('DELETE') ? 'red' : l.action?.includes('CREATE') ? 'green' : 'blue'}">${(l.action || '').replace(/_/g, ' ')}</span></td>
                <td>${l.entity_type || '—'}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.78rem;color:var(--text-secondary)">${detailStr}</td>
                <td class="sa-code">${l.ip_address || '—'}</td>
                <td style="color:var(--text-secondary)">${timeAgo(l.created_at)}</td>
              </tr>`;
  }).join('')}
          </tbody>
        </table>`}
      </div>
    </div>
  `;
}

function tab(id, label) {
  return `<button class="sa-tab ${activeTab === id ? 'active' : ''}" onclick="_caAccessTab('${id}')">${label}</button>`;
}
