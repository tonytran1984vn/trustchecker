/**
 * TrustChecker – Admin Users Page (Full CRUD)
 * Create, View, Edit Role, Suspend, Delete — org_id scoped
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';
import { timeAgo } from '../utils/helpers.js';
import { escapeHTML } from '../utils/sanitize.js';

let _showCreate = false;

export function renderPage() {
  if (!['admin', 'super_admin', 'company_admin', 'org_owner'].includes(State.user?.role)) {
    return '<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-text">Admin access required</div></div>';
  }
  const isOrgOwner = ['org_owner', 'super_admin'].includes(State.user?.role);
  // Auto-load after DOM insert (works as tab in workspace)
  setTimeout(() => loadAdminUsers(), 50);
  return `
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-title">👥 User Management</div>
        <div style="display:flex;gap:8px">
          ${isOrgOwner ? '<button class="btn btn-sm" style="background:#8b5cf6;color:#fff;border:none" onclick="window._umShowAppoint()">👑 Appoint Admin</button>' : ''}
          <button class="btn btn-primary btn-sm" onclick="window._umShowCreate()">+ Create User</button>
        </div>
      </div>
      <div class="card-body">
        <div id="create-user-modal"></div>
        <div id="appoint-admin-modal"></div>
        <div id="admin-users-list">
          <div class="loading"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  `;
}

export async function loadAdminUsers() {
  try {
    const res = await API.get('/admin/users');
    const el = document.getElementById('admin-users-list');
    if (!el) return;

    const users = res.users || [];
    if (users.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">No users found in your organization</div>';
      return;
    }

    el.innerHTML = `
      <table class="data-table">
        <thead><tr>
          <th>User</th><th>Email</th><th>Role</th><th>Status</th><th>MFA</th><th>Last Login</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${users.map(u => {
      const isSelf = u.id === State.user.id;
      const status = u.status || 'active';
      const statusColor = status === 'active' ? '#10b981' : status === 'suspended' ? '#f59e0b' : '#ef4444';
      return `
            <tr style="${status === 'suspended' ? 'opacity:0.6' : ''}">
              <td style="font-weight:600">${escapeHTML(u.username)}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${escapeHTML(u.email)}</td>
              <td>
                <select class="input" style="width:130px;padding:4px 8px;font-size:0.72rem"
                  onchange="window._umChangeRole('${escapeHTML(u.id)}', this.value)" ${isSelf ? 'disabled' : ''}>
                  ${['org_owner', 'company_admin', 'admin', 'security_officer', 'manager', 'operator', 'viewer', 'executive', 'ops_manager', 'risk_officer', 'compliance_officer', 'developer'].map(r =>
        `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r.replace(/_/g, ' ')}</option>`
      ).join('')}
                </select>
              </td>
              <td>
                <button onclick="window._umToggleStatus('${escapeHTML(u.id)}', '${status}')" style="border:none;background:none;cursor:${isSelf ? 'default' : 'pointer'};padding:2px 10px;border-radius:4px;font-size:0.72rem;font-weight:600;color:${statusColor};background:${statusColor}15" ${isSelf ? 'disabled' : ''}>
                  ${status}
                </button>
              </td>
              <td>${u.mfa_enabled ? '<span style="color:#10b981;font-weight:700">✓</span>' : '—'}</td>
              <td style="font-size:0.72rem;color:var(--text-muted)">${u.last_login ? timeAgo(u.last_login) : 'Never'}</td>
              <td>
                ${isSelf ? '<span class="badge valid">You</span>' : `
                  <button onclick="window._umResetPw('${escapeHTML(u.id)}', '${escapeHTML(u.username)}')" title="Reset Password" style="border:none;background:none;cursor:pointer;font-size:1rem;padding:2px 6px">🔑</button>
                  <button onclick="window._umDelete('${escapeHTML(u.id)}', '${escapeHTML(u.username)}')" title="Delete User" style="border:none;background:none;cursor:pointer;font-size:1rem;padding:2px 6px">🗑</button>
                `}
              </td>
            </tr>`;
    }).join('')}
        </tbody>
      </table>
      <div style="margin-top:12px;font-size:0.72rem;color:var(--text-muted)">Total: ${res.total || users.length} users</div>
    `;
  } catch (e) {
    console.error('Admin users error:', e);
    const el = document.getElementById('admin-users-list');
    if (el) el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">Failed to load users: ${escapeHTML(e.message)}</div>`;
  }
}

// ─── Create User ────────────────────────────────────────────
window._umShowCreate = function () {
  _showCreate = true;
  const el = document.getElementById('create-user-modal');
  if (!el) return;
  el.innerHTML = `
    <div style="background:var(--bg-card,var(--surface));border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:16px">
      <h3 style="margin:0 0 16px;font-size:0.92rem">+ Create New User</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-size:0.75rem;color:var(--text-muted)">Username *</label>
          <input id="cu-username" class="input" placeholder="john.doe" style="width:100%">
        </div>
        <div>
          <label style="font-size:0.75rem;color:var(--text-muted)">Email *</label>
          <input id="cu-email" class="input" type="email" placeholder="user@company.com" style="width:100%">
        </div>
        <div>
          <label style="font-size:0.75rem;color:var(--text-muted)">Password *</label>
          <input id="cu-password" class="input" type="password" placeholder="Min 8 characters" style="width:100%">
        </div>
        <div>
          <label style="font-size:0.75rem;color:var(--text-muted)">Role</label>
          <select id="cu-role" class="input" style="width:100%">
            <option value="operator">Operator</option>
            <option value="viewer">Viewer</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
            <option value="executive">Executive</option>
            <option value="ops_manager">Ops Manager</option>
            <option value="risk_officer">Risk Officer</option>
            <option value="compliance_officer">Compliance Officer</option>
            <option value="developer">Developer</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
        <button class="btn btn-ghost btn-sm" onclick="window._umHideCreate()">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="window._umDoCreate()">Create User</button>
      </div>
    </div>
  `;
};

window._umHideCreate = function () {
  _showCreate = false;
  const el = document.getElementById('create-user-modal');
  if (el) el.innerHTML = '';
};

window._umDoCreate = async function () {
  const username = document.getElementById('cu-username')?.value?.trim();
  const email = document.getElementById('cu-email')?.value?.trim();
  const password = document.getElementById('cu-password')?.value;
  const role = document.getElementById('cu-role')?.value || 'operator';

  if (!email || !password) { showToast('Email and password are required', 'error'); return; }
  if (password.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }

  try {
    await API.post('/admin/users', { username: username || email.split('@')[0], email, password, role });
    showToast('✓ User created successfully', 'success');
    window._umHideCreate();
    loadAdminUsers();
  } catch (e) { showToast('Failed: ' + (e.message || 'Unknown error'), 'error'); }
};

// ─── Change Role ────────────────────────────────────────────
window._umChangeRole = async function (userId, role) {
  try {
    await API.put(`/admin/users/${userId}/role`, { role });
    showToast(`✓ Role updated to ${role}`, 'success');
  } catch (e) { showToast('✗ ' + e.message, 'error'); loadAdminUsers(); }
};

// ─── Toggle Status ──────────────────────────────────────────
window._umToggleStatus = async function (userId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
  const action = newStatus === 'suspended' ? 'Suspend' : 'Activate';
  if (!confirm(`${action} this user?`)) return;

  try {
    await API.put(`/admin/users/${userId}/status`, { status: newStatus });
    showToast(`✓ User ${newStatus}`, 'success');
    loadAdminUsers();
  } catch (e) { showToast('✗ ' + e.message, 'error'); }
};

// ─── Reset Password ─────────────────────────────────────────
window._umResetPw = async function (userId, username) {
  const newPw = prompt(`Reset password for ${username}?\nEnter new password (min 8 chars):`);
  if (!newPw) return;
  if (newPw.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }

  try {
    await API.post(`/admin/users/${userId}/reset-password`, { new_password: newPw });
    showToast(`✓ Password reset for ${username}`, 'success');
  } catch (e) { showToast('✗ ' + e.message, 'error'); }
};

// ─── Delete User ────────────────────────────────────────────
window._umDelete = async function (userId, username) {
  if (!confirm(`⚠️ Delete user "${username}"?\n\nThis action cannot be undone.`)) return;

  try {
    await API.delete(`/admin/users/${userId}`);
    showToast(`✓ User ${username} deleted`, 'success');
    loadAdminUsers();
  } catch (e) { showToast('✗ ' + e.message, 'error'); }
};

// ─── Appoint Company Admin (Org Owner only) ─────────────────
window._umShowAppoint = function () {
  const el = document.getElementById('appoint-admin-modal');
  if (!el) return;
  el.innerHTML = `
    <div style="background:var(--surface);border:1px solid #8b5cf6;border-radius:12px;padding:20px;margin-bottom:16px">
      <h3 style="margin:0 0 12px;color:#8b5cf6">👑 Appoint Company Admin</h3>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px">Enter the email address. A new account will be created if the user doesn't exist.</p>
      <div class="input-group" style="margin-bottom:8px">
        <label>Email</label>
        <input class="input" id="appoint-email" type="email" placeholder="admin@company.com">
      </div>
      <div class="input-group" style="margin-bottom:12px">
        <label>Display Name (optional)</label>
        <input class="input" id="appoint-name" type="text" placeholder="John Doe">
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm" style="background:#8b5cf6;color:#fff;border:none" onclick="window._umDoAppoint()">✓ Appoint</button>
        <button class="btn btn-ghost btn-sm" onclick="window._umHideAppoint()">Cancel</button>
      </div>
    </div>
  `;
};

window._umHideAppoint = function () {
  const el = document.getElementById('appoint-admin-modal');
  if (el) el.innerHTML = '';
};

window._umDoAppoint = async function () {
  const email = document.getElementById('appoint-email')?.value;
  const name = document.getElementById('appoint-name')?.value;
  if (!email) { showToast('Email is required', 'error'); return; }
  try {
    const res = await API.post('/tenant/appoint-admin', { email, name });
    let msg = `✓ ${res.message}`;
    if (res.temp_password) {
      msg += ` — Temp password: ${res.temp_password}`;
    }
    showToast(msg, 'success');
    window._umHideAppoint();
    loadAdminUsers();
  } catch (e) {
    const data = e.response?.data || {};
    showToast(`✗ ${data.error || e.message}`, 'error');
  }
};

// Window exports
window.loadAdminUsers = loadAdminUsers;
