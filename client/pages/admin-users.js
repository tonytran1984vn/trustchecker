/**
 * TrustChecker – Admin Users Page
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';
import { timeAgo } from '../utils/helpers.js';
import { escapeHTML } from '../utils/sanitize.js';

export function renderPage() {
  if (State.user?.role !== 'admin') {
    return '<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-text">Admin access required</div></div>';
  }
  return `
    <div class="card">
      <div class="card-header"><div class="card-title">👥 All Users</div></div>
      <div class="card-body">
        <div id="admin-users-list">
          <div class="loading"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  `;
}
export async function loadAdminUsers() {
  try {
    const res = await API.get('/auth/users');
    const el = document.getElementById('admin-users-list');
    if (!el) return;

    el.innerHTML = `
      <table class="data-table">
        <thead><tr><th>User</th><th>Email</th><th>Role</th><th>MFA</th><th>Last Login</th><th>Action</th></tr></thead>
        <tbody>
          ${res.users.map(u => `
            <tr>
              <td style="font-weight:600">${escapeHTML(u.username)}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${escapeHTML(u.email)}</td>
              <td>
                <select class="input" style="width:120px;padding:4px 8px;font-size:0.72rem"
                  onchange="changeUserRole('${escapeHTML(u.id)}', this.value)" ${u.id === State.user.id ? 'disabled' : ''}>
                  ${['admin', 'manager', 'operator', 'viewer'].map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
              </td>
              <td>${u.mfa_enabled ? '✅' : '—'}</td>
              <td style="font-size:0.72rem;color:var(--text-muted)">${u.last_login ? timeAgo(u.last_login) : 'Never'}</td>
              <td>${u.id === State.user.id ? '<span class="badge valid">You</span>' : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) { console.error('Admin users error:', e); }
}
async function changeUserRole(userId, role) {
  try {
    await API.put(`/auth/users/${userId}/role`, { role });
    showToast(`✅ Role updated to ${role}`, 'success');
  } catch (e) { showToast('❌ ' + e.message, 'error'); loadAdminUsers(); }
}

// Window exports for onclick handlers
window.loadAdminUsers = loadAdminUsers;
window.changeUserRole = changeUserRole;
