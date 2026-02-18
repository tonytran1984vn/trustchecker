/**
 * TrustChecker – Notification Center Component
 */
import { State } from '../core/state.js';
import { timeAgo } from '../utils/helpers.js';
import { escapeHTML } from '../utils/sanitize.js';

export function updateNotifBadge() {
  const badge = document.getElementById('notif-badge');
  const unread = State.notifications.filter(n => !n.read).length;
  if (badge) {
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';
  }
}

export function toggleNotifications() {
  State.notifOpen = !State.notifOpen;
  State.searchOpen = false;
  const panel = document.getElementById('notif-panel');
  if (panel) panel.style.display = State.notifOpen ? 'block' : 'none';
  const search = document.getElementById('search-panel');
  if (search) search.style.display = 'none';
  if (State.notifOpen) renderNotifPanel();
}

export function renderNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const notifs = State.notifications.slice(0, 20);
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border)">
      <span style="font-weight:700;font-size:0.9rem">🔔 Notifications</span>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm" onclick="markAllRead()" style="font-size:0.7rem">Mark all read</button>
        <button class="btn btn-sm" onclick="clearNotifications()" style="font-size:0.7rem">Clear</button>
      </div>
    </div>
    <div style="max-height:400px;overflow-y:auto">
      ${notifs.length ? notifs.map(n => `
        <div class="notif-item ${n.read ? 'read' : ''}" onclick="markNotifRead(${n.id})">
          <div style="font-weight:${n.read ? '400' : '600'};font-size:0.82rem">${escapeHTML(n.title)}</div>
          <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">${escapeHTML(n.message)}</div>
          <div style="font-size:0.65rem;color:var(--text-muted);margin-top:4px">${timeAgo(n.time)}</div>
        </div>
      `).join('') : '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:0.82rem">No notifications</div>'}
    </div>
  `;
}

export function markNotifRead(id) {
  const n = State.notifications.find(n => n.id === id);
  if (n) n.read = true;
  localStorage.setItem('tc_notifications', JSON.stringify(State.notifications));
  updateNotifBadge();
  renderNotifPanel();
}

export function markAllRead() {
  State.notifications.forEach(n => n.read = true);
  localStorage.setItem('tc_notifications', JSON.stringify(State.notifications));
  updateNotifBadge();
  renderNotifPanel();
}

export function clearNotifications() {
  State.notifications = [];
  localStorage.setItem('tc_notifications', '[]');
  updateNotifBadge();
  renderNotifPanel();
}

window.toggleNotifications = toggleNotifications;
window.markNotifRead = markNotifRead;
window.markAllRead = markAllRead;
window.clearNotifications = clearNotifications;
window.updateNotifBadge = updateNotifBadge;
