/**
 * Ops – Notifications Center
 * Data from PostgreSQL via /api/notifications
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

let _data = null;
let _filter = 'all';

export function renderPage() {
  if (!_data) { loadData(); return loading(); }
  const { notifications, unread_count } = _data;
  const typeColors = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6', success: '#22c55e', error: '#ef4444' };

  const filtered = _filter === 'all' ? notifications : notifications.filter(n => n.type === _filter);

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('bell', 28)} Notifications</h1>
        <div class="sa-title-actions">
          ${unread_count > 0 ? `<span style="background:#ef4444;color:#fff;padding:2px 10px;border-radius:10px;font-size:0.75rem;font-weight:700">${unread_count} unread</span>` : ''}
          <button class="btn btn-outline btn-sm" onclick="window._notiMarkAllRead()">Mark All Read</button>
          <button class="btn btn-ghost btn-sm" onclick="window._notiShowPrefs()">⚙ Preferences</button>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:1.5rem;flex-wrap:wrap">
        ${['all', 'critical', 'warning', 'info', 'success'].map(f =>
    `<button class="btn btn-sm ${_filter === f ? 'btn-primary' : 'btn-outline'}" onclick="window._notiFilter('${f}')">${f === 'all' ? 'All' : f === 'critical' ? '🚨 Critical' : f === 'warning' ? '⚠️ Warning' : f === 'info' ? 'ℹ️ Info' : '✅ Success'}</button>`
  ).join('')}
      </div>

      ${filtered.length === 0 ? '<div class="sa-card" style="padding:2rem;text-align:center;color:var(--text-secondary)">No notifications</div>' : `
      <div style="display:flex;flex-direction:column;gap:8px">
        ${filtered.map(n => {
    const color = typeColors[n.type] || '#3b82f6';
    const iconMap = { critical: '🚨', warning: '⚠️', info: '📦', success: '✅', error: '🚨' };
    return `
          <div class="sa-card" style="padding:14px 18px;border-left:4px solid ${color};${n.read ? 'opacity:0.7;' : ''}cursor:pointer;transition:transform 0.1s" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform=''" onclick="window._notiMarkRead('${n.id}')">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
              <div style="display:flex;gap:12px;flex:1">
                <span style="font-size:1.5rem;line-height:1">${iconMap[n.type] || '📝'}</span>
                <div style="flex:1">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
                    <strong style="font-size:0.88rem">${n.title || n.action || ''}</strong>
                    ${!n.read ? '<span style="width:8px;height:8px;border-radius:50%;background:#3b82f6;display:inline-block"></span>' : ''}
                  </div>
                  <div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.4">${n.message || n.summary || ''}</div>
                </div>
              </div>
              <div style="text-align:right;white-space:nowrap">
                <div style="font-size:0.7rem;color:var(--text-secondary)">${n.timestamp ? timeAgo(n.timestamp) : ''}</div>
                <span class="sa-code" style="font-size:0.65rem">${n.id?.slice(0, 8) || ''}</span>
              </div>
            </div>
          </div>`;
  }).join('')}
      </div>`}
    </div>
  `;
}

async function loadData() {
  try {
    const r = await api.get('/notifications?limit=50');
    _data = {
      notifications: (r.notifications || []).map(n => {
        // Parse details if JSON string
        let details = {};
        try { details = typeof n.details === 'string' ? JSON.parse(n.details) : (n.details || {}); } catch (e) { }
        const action = n.action || '';
        const type = action.includes('CRITICAL') || action.includes('RECALL') ? 'critical'
          : action.includes('WARNING') || action.includes('BREACH') || action.includes('SLA') ? 'warning'
            : action.includes('SUCCESS') || action.includes('RESOLVED') ? 'success' : 'info';
        return {
          id: n.id,
          type,
          title: details.title || action.replace('NOTIFY_', '').replace(/_/g, ' '),
          message: details.message || details.summary || n.entity_type || '',
          timestamp: n.timestamp || n.created_at,
          read: details.read || false,
        };
      }),
      unread_count: r.unread_count || 0
    };
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
  } catch (e) { console.error('[Notifications]', e); _data = { notifications: [], unread_count: 0 }; const el = document.getElementById('main-content'); if (el) el.innerHTML = renderPage(); }
}

function loading() {
  return `<div class="sa-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading notifications...</div></div></div>`;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

window._notiFilter = function (f) {
  _filter = f;
  const el = document.getElementById('main-content');
  if (el) el.innerHTML = renderPage();
};

window._notiMarkRead = async function (id) {
  try {
    await api.put(`/notifications/${id}/read`);
    if (_data) {
      const n = _data.notifications.find(n => n.id === id);
      if (n) { n.read = true; _data.unread_count = Math.max(0, _data.unread_count - 1); }
    }
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
  } catch (e) { console.error('[Notifications] Mark read failed', e); }
};

window._notiMarkAllRead = async function () {
  try {
    await api.put('/notifications/read-all');
    showToast('✅ All notifications marked as read', 'success');
    _data = null;
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
  } catch (e) { showToast('Failed to mark all read', 'error'); }
};

window._notiShowPrefs = async function () {
  try {
    const prefs = await api.get('/notifications/preferences');
    const modal = document.createElement('div');
    modal.id = 'noti-prefs-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5)';
    modal.innerHTML = `
      <div style="background:var(--card-bg, #fff);border-radius:12px;padding:24px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <h3 style="margin:0 0 16px">⚙ Notification Preferences</h3>
        <div style="display:flex;flex-direction:column;gap:12px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="_np_email" ${prefs.email !== false ? 'checked' : ''}> Email notifications</label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="_np_push" ${prefs.push !== false ? 'checked' : ''}> Push notifications</label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="_np_inapp" ${prefs.in_app !== false ? 'checked' : ''}> In-app notifications</label>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('noti-prefs-modal')?.remove()">Cancel</button>
          <button class="btn btn-primary btn-sm" onclick="window._notiSavePrefs()">Save</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  } catch (e) { showToast('Failed to load preferences', 'error'); }
};

window._notiSavePrefs = async function () {
  const email = document.getElementById('_np_email')?.checked;
  const push = document.getElementById('_np_push')?.checked;
  const in_app = document.getElementById('_np_inapp')?.checked;
  try {
    await api.put('/notifications/preferences', { email, push, in_app });
    showToast('✅ Preferences saved', 'success');
    document.getElementById('noti-prefs-modal')?.remove();
  } catch (e) { showToast('Failed to save preferences', 'error'); }
};
