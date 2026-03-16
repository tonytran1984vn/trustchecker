/**
 * Ops – Notifications Center (Premium Design)
 * ═══════════════════════════════════════════════
 * Clean notification cards with type badges, filter chips, and mark-read actions.
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

const ACCENT = '#0d9488';
let _data = null;
let _filter = 'all';

export function renderPage() {
  if (!_data) { loadData(); return loading(); }
  const { notifications, unread_count } = _data;

  const typeMeta = {
    critical: { c: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: '🚨', label: 'CRITICAL' },
    warning:  { c: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: '⚠️', label: 'WARNING' },
    info:     { c: '#3b82f6', bg: 'rgba(59,130,246,0.08)', icon: '📦', label: 'INFO' },
    success:  { c: '#22c55e', bg: 'rgba(34,197,94,0.08)', icon: '✅', label: 'SUCCESS' },
    error:    { c: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: '🚨', label: 'ERROR' },
  };

  const filtered = _filter === 'all' ? notifications : notifications.filter(n => n.type === _filter);
  const critCount = notifications.filter(n => n.type === 'critical').length;
  const warnCount = notifications.filter(n => n.type === 'warning').length;

  return `
    <div class="sa-page">
      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:1.5rem">
        ${nStat(icon('bell', 20, ACCENT), 'Total', notifications.length, ACCENT)}
        ${nStat(icon('alertTriangle', 20, '#3b82f6'), 'Unread', unread_count, '#3b82f6')}
        ${nStat(icon('alertTriangle', 20, '#ef4444'), 'Critical', critCount, '#ef4444')}
        ${nStat(icon('alertTriangle', 20, '#f59e0b'), 'Warnings', warnCount, '#f59e0b')}
      </div>

      <!-- Filters -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;flex-wrap:wrap;gap:8px">
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${['all', 'critical', 'warning', 'info', 'success'].map(f => {
            const isActive = _filter === f;
            const label = f === 'all' ? 'All' : f === 'critical' ? '🚨 Critical' : f === 'warning' ? '⚠️ Warning' : f === 'info' ? 'ℹ️ Info' : '✅ Success';
            return `<button style="padding:4px 12px;border-radius:8px;font-size:0.75rem;font-weight:600;cursor:pointer;border:1px solid ${isActive ? '#0d9488' : 'var(--border-color,rgba(0,0,0,0.1))'};background:${isActive ? '#0d9488' : 'transparent'};color:${isActive ? '#fff' : 'var(--text-primary)'}" onclick="window._notiFilter('${f}')">${label}</button>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:6px">
          ${unread_count > 0 ? `<span style="display:flex;align-items:center;gap:4px;font-size:0.72rem;padding:4px 10px;border-radius:8px;background:rgba(13,148,136,0.08);color:#0d9488;font-weight:600">${unread_count} unread</span>` : ''}
          <button class="btn btn-outline btn-sm" onclick="window._notiMarkAllRead()">Mark All Read</button>
        </div>
      </div>

      <!-- Notification List -->
      ${filtered.length === 0 ? `<div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:3rem;text-align:center;color:var(--text-secondary)">No notifications</div>` : `
      <div style="display:flex;flex-direction:column;gap:8px">
        ${filtered.map(n => {
          const tm = typeMeta[n.type] || typeMeta.info;
          return `<div style="background:var(--card-bg);border-radius:10px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:16px 20px;display:flex;align-items:flex-start;gap:14px;cursor:pointer;transition:box-shadow 0.15s;${n.read ? 'opacity:0.65;' : ''}"
            onmouseover="this.style.boxShadow='0 2px 12px rgba(0,0,0,0.05)'" onmouseout="this.style.boxShadow=''"
            onclick="window._notiMarkRead('${n.id}')">
            <div style="width:38px;height:38px;border-radius:10px;background:${tm.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.2rem">${tm.icon}</div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
                <span style="font-weight:600;font-size:0.85rem;color:var(--text-primary)">${n.title || 'Notification'}</span>
                <span style="font-size:0.55rem;padding:2px 6px;border-radius:4px;background:${tm.bg};color:${tm.c};font-weight:700">${tm.label}</span>
                ${!n.read ? '<span style="width:7px;height:7px;border-radius:50%;background:#3b82f6;flex-shrink:0"></span>' : ''}
              </div>
              <div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${n.message || ''}</div>
            </div>
            <span style="font-size:0.68rem;color:var(--text-secondary);white-space:nowrap;flex-shrink:0">${n.timestamp ? timeAgo(n.timestamp) : ''}</span>
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
      notifications: (r.notifications || []).map(n => ({
        id: n.id,
        type: n.type || 'info',
        title: n.title || 'Notification',
        message: n.message || '',
        timestamp: n.timestamp || n.created_at,
        read: n.read || false,
      })),
      unread_count: r.unread_count || 0
    };
    if (typeof window.render === 'function') window.render();
  } catch (e) { _data = { notifications: [], unread_count: 0 }; if (typeof window.render === 'function') window.render(); }
}

function loading() {
  return `<div class="sa-page"><div style="text-align:center;padding:4rem"><div class="sa-spinner"></div><p style="color:var(--text-secondary);margin-top:1rem">Loading notifications…</p></div></div>`;
}

function timeAgo(d) { const m = Math.floor((Date.now()-new Date(d).getTime())/60000); if (m < 1) return 'Just now'; if (m < 60) return `${m}m ago`; const h = Math.floor(m/60); if (h < 24) return `${h}h ago`; return `${Math.floor(h/24)}d ago`; }

function nStat(iconHtml, label, value, color) {
  return `<div style="background:var(--card-bg);border-radius:12px;padding:16px 20px;border:1px solid var(--border-color,rgba(0,0,0,0.06))">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div style="width:32px;height:32px;border-radius:8px;background:${color}10;display:flex;align-items:center;justify-content:center">${iconHtml}</div>
    </div>
    <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-secondary);font-weight:600">${label}</div>
    <div style="font-size:1.5rem;font-weight:700;color:${color};line-height:1.2">${value}</div>
  </div>`;
}

window._notiFilter = function (f) { _filter = f; if (typeof window.render === 'function') window.render(); };

window._notiMarkRead = async function (id) {
  try {
    await api.put(`/notifications/${id}/read`);
    if (_data) { const n = _data.notifications.find(n => n.id === id); if (n) { n.read = true; _data.unread_count = Math.max(0, _data.unread_count - 1); } }
    if (typeof window.render === 'function') window.render();
  } catch (e) { console.error('[Notifications] Mark read failed', e); }
};

window._notiMarkAllRead = async function () {
  try {
    await api.put('/notifications/read-all');
    showToast('✅ All notifications marked as read', 'success');
    _data = null;
    if (typeof window.render === 'function') window.render();
  } catch (e) { showToast('Failed to mark all read', 'error'); }
};
