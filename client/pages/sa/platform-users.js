/**
 * Super Admin – Platform Users (Live API)
 * ════════════════════════════════════════
 * Manages infrastructure-level users only (NOT business/tenant users).
 * Platform ≠ Business — strict separation of concerns.
 */
import { API } from '../../core/api.js';
import { icon } from '../../core/icons.js';

let users = [];
let loading = false;
let loadStarted = false;
let showModal = false;
let editUser = null;

const PLATFORM_ROLES = [
  { id: 'super_admin', label: 'Super Admin', desc: 'Infrastructure custodian — tenant lifecycle, config, platform health', color: '#ef4444', icon: '🔴' },
  { id: 'platform_security', label: 'Platform Security', desc: 'SOC/CSIRT — key rotation, incident response, session monitoring', color: '#f59e0b', icon: '🛡' },
  { id: 'data_gov_officer', label: 'Data Governance', desc: 'Data classification, retention, GDPR, cross-border policy', color: '#8b5cf6', icon: '📊' },
  { id: 'auditor', label: 'Platform Auditor', desc: 'Read-only audit across all platform sections', color: '#94a3b8', icon: '🔍' },
  { id: 'developer', label: 'Platform Developer', desc: 'API maintenance, deployment, CI/CD, technical infrastructure', color: '#10b981', icon: '💻' },
  { id: 'platform_devops', label: 'DevOps', desc: 'Server, database, monitoring, scaling, uptime', color: '#06b6d4', icon: '🔧' },
];

const ROLE_MAP = Object.fromEntries(PLATFORM_ROLES.map(r => [r.id, r]));

async function loadUsers() {
  if (loading) return;
  loading = true;
  try {
    const data = await API.get('/platform/users');
    users = data.users || [];
  } catch (e) {
    console.error('[SA] Failed to load platform users:', e);
    users = [];
  }
  loading = false;
  window.render();
}

async function createUser() {
  const f = document.getElementById('pu-form');
  if (!f) return;
  const username = f.querySelector('#pu-username')?.value?.trim();
  const email = f.querySelector('#pu-email')?.value?.trim();
  const password = f.querySelector('#pu-password')?.value;
  const role = f.querySelector('#pu-role')?.value;
  if (!username || !email || !password || !role) {
    return window.showToast?.('All fields are required', 'error');
  }
  try {
    await API.post('/platform/users', { username, email, password, role });
    window.showToast?.('Platform user created', 'success');
    showModal = false;
    loadStarted = false;
    loadUsers();
  } catch (e) {
    window.showToast?.(e.message || 'Failed to create user', 'error');
  }
}

async function deleteUser(id, name) {
  if (!confirm(`Remove platform user "${name}"? This cannot be undone.`)) return;
  try {
    await API.delete(`/platform/users/${id}`);
    window.showToast?.('User removed', 'success');
    loadStarted = false;
    loadUsers();
  } catch (e) {
    window.showToast?.(e.message || 'Failed to delete', 'error');
  }
}

async function updateUser() {
  if (!editUser) return;
  const role = document.getElementById('pe-role')?.value;
  const password = document.getElementById('pe-password')?.value;
  const status = document.getElementById('pe-status')?.value;
  const body = {};
  if (role && role !== editUser.role) body.role = role;
  if (password) body.password = password;
  if (status && status !== (editUser.status || 'active')) body.status = status;
  if (Object.keys(body).length === 0) return window.showToast?.('Không có thay đổi', 'warning');
  try {
    await API.put(`/platform/users/${editUser.id}`, body);
    window.showToast?.('Đã cập nhật user', 'success');
    editUser = null;
    loadStarted = false;
    loadUsers();
  } catch (e) {
    window.showToast?.(e.message || 'Update failed', 'error');
  }
}

export function renderPage() {
  if (!loadStarted) { loadStarted = true; loadUsers(); }
  if (loading && users.length === 0) {
    return `<div style="display:flex;align-items:center;justify-content:center;padding:80px"><div class="spinner"></div></div>`;
  }

  const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

  return `
    <style>
      .pu{font-family:var(--font-primary)}
      .pu-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
      .pu-h1{font-size:1.3rem;font-weight:800;display:flex;align-items:center;gap:10px}
      .pu-sub{font-size:0.72rem;color:var(--text-muted);margin-top:3px}
      .pu-add{padding:8px 18px;border-radius:10px;font-size:0.78rem;font-weight:700;cursor:pointer;border:none;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;display:flex;align-items:center;gap:6px;transition:all 0.2s;box-shadow:0 4px 12px rgba(59,130,246,0.3)}
      .pu-add:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(59,130,246,0.4)}

      .pu-card{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;overflow:hidden}
      .pu-table{width:100%;border-collapse:collapse}
      .pu-table th{text-align:left;font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);padding:12px 16px;border-bottom:1px solid var(--border)}
      .pu-table td{padding:12px 16px;font-size:0.78rem;border-bottom:1px solid rgba(148,163,184,0.06)}
      .pu-table tr:hover td{background:rgba(148,163,184,0.03)}
      .pu-name{display:flex;align-items:center;gap:10px}
      .pu-av{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:700;color:#fff;flex-shrink:0}
      .pu-role{font-size:0.62rem;font-weight:700;padding:4px 12px;border-radius:8px;display:inline-block}
      .pu-mfa{font-size:0.72rem;font-weight:600}
      .pu-del{padding:4px 10px;border-radius:6px;font-size:0.68rem;cursor:pointer;border:1px solid rgba(239,68,68,0.2);background:rgba(239,68,68,0.06);color:#ef4444;transition:all 0.15s}
      .pu-del:hover{background:rgba(239,68,68,0.12)}
      .pu-edit{padding:4px 10px;border-radius:6px;font-size:0.68rem;cursor:pointer;border:1px solid rgba(59,130,246,0.2);background:rgba(59,130,246,0.06);color:#3b82f6;transition:all 0.15s;margin-right:4px}
      .pu-edit:hover{background:rgba(59,130,246,0.12)}

      /* Role Info Section */
      .pu-roles{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:20px}
      .pu-role-card{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;position:relative;overflow:hidden}
      .pu-role-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
      .pu-role-icon{font-size:1.4rem;margin-bottom:8px}
      .pu-role-name{font-size:0.78rem;font-weight:700;margin-bottom:4px}
      .pu-role-desc{font-size:0.68rem;color:var(--text-muted);line-height:1.4}

      /* Modal */
      .pu-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center}
      .pu-modal{background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:28px 32px;width:420px;max-width:90vw;box-shadow:0 24px 80px rgba(0,0,0,0.3)}
      .pu-modal h2{font-size:1.1rem;font-weight:800;margin-bottom:16px;display:flex;align-items:center;gap:8px}
      .pu-field{margin-bottom:14px}
      .pu-label{display:block;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:5px}
      .pu-input{width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:0.82rem;outline:none;box-sizing:border-box}
      .pu-input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.15)}
      .pu-select{width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:0.82rem;outline:none;box-sizing:border-box}
      .pu-btns{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
      .pu-btn-cancel{padding:8px 18px;border-radius:10px;font-size:0.78rem;font-weight:600;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text-primary)}
      .pu-btn-submit{padding:8px 22px;border-radius:10px;font-size:0.78rem;font-weight:700;cursor:pointer;border:none;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff}

      @media(max-width:900px){.pu-roles{grid-template-columns:1fr 1fr}}
    </style>

    <div class="pu">
      <div class="pu-head">
        <div>
          <div class="pu-h1">${icon('users', 24)} Platform Users</div>
          <div class="pu-sub">Infrastructure team · Platform ≠ Business</div>
        </div>
        <button class="pu-add" onclick="window._puShowModal()">${icon('plus', 14)} Add Platform User</button>
      </div>

      <div class="pu-card">
        <table class="pu-table">
          <thead><tr><th>User</th><th>Email</th><th>Role</th><th>MFA</th><th>Last Login</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${users.map((u, i) => {
    const r = ROLE_MAP[u.role] || { label: u.role, color: '#94a3b8' };
    const init = (u.username || '??').substring(0, 2).toUpperCase();
    const bg = AVATAR_COLORS[i % AVATAR_COLORS.length];
    const mfa = u.mfa_enabled ? '<span class="pu-mfa" style="color:#10b981">Enabled</span>' : '<span class="pu-mfa" style="color:var(--text-muted)">Disabled</span>';
    const login = u.last_login ? timeSince(u.last_login) : '—';
    const isSelf = false; // Will check on server side
    return `<tr>
                <td><div class="pu-name"><div class="pu-av" style="background:${bg}">${init}</div><strong>${esc(u.username)}</strong></div></td>
                <td style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;color:var(--text-muted)">${esc(u.email)}</td>
                <td><span class="pu-role" style="background:${r.color}18;color:${r.color}">${r.label}</span></td>
                <td>${mfa}</td>
                <td style="color:var(--text-muted);font-size:0.72rem">${login}</td>
                <td style="padding:8px 12px;text-align:center"><span style="display:inline-flex;align-items:center;gap:4px;font-size:0.72rem"><span style="width:6px;height:6px;border-radius:50%;background:${(u.status || 'active') === 'active' ? '#10b981' : '#ef4444'};display:inline-block"></span> ${(u.status || 'active') === 'active' ? 'Active' : 'Suspended'}</span></td>
                <td><button class="pu-edit" onclick="window._puEdit('${u.id}')" title="Edit">✎</button><button class="pu-del" onclick="window._puDelete('${u.id}','${esc(u.username)}')" title="Remove">✕</button></td>
              </tr>`;
  }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Platform Role Reference -->
      <div class="pu-roles">
        ${PLATFORM_ROLES.map(r => `
          <div class="pu-role-card" style="border-top:3px solid ${r.color}">
            <div class="pu-role-icon">${r.icon}</div>
            <div class="pu-role-name">${r.label}</div>
            <div class="pu-role-desc">${r.desc}</div>
          </div>
        `).join('')}
      </div>

      <!-- Create Modal -->
      ${showModal ? `
      <div class="pu-overlay" onclick="if(event.target===this)window._puHideModal()">
        <div class="pu-modal">
          <h2>${icon('plus', 18)} New Platform User</h2>
          <form id="pu-form" onsubmit="event.preventDefault();window._puCreate()">
            <div class="pu-field">
              <label class="pu-label">Username</label>
              <input class="pu-input" id="pu-username" placeholder="e.g. security_lead" required>
            </div>
            <div class="pu-field">
              <label class="pu-label">Email</label>
              <input class="pu-input" id="pu-email" type="email" placeholder="e.g. lead@trustchecker.io" required>
            </div>
            <div class="pu-field">
              <label class="pu-label">Password</label>
              <input class="pu-input" id="pu-password" type="password" placeholder="Min 8 characters" required minlength="8">
            </div>
            <div class="pu-field">
              <label class="pu-label">Platform Role</label>
              <select class="pu-select" id="pu-role" required>
                <option value="">— Select role —</option>
                ${PLATFORM_ROLES.map(r => `<option value="${r.id}">${r.icon} ${r.label}</option>`).join('')}
              </select>
            </div>
            <div class="pu-btns">
              <button type="button" class="pu-btn-cancel" onclick="window._puHideModal()">Cancel</button>
              <button type="submit" class="pu-btn-submit">Create User</button>
            </div>
          </form>
        </div>
      </div>` : ''}

      <!-- Edit Modal -->
      ${editUser ? `
      <div class="pu-overlay" onclick="if(event.target===this)window._puEditClose()">
        <div class="pu-modal">
          <h2>${icon('users', 18)} Chỉnh sửa: ${esc(editUser.username)}</h2>
          <form onsubmit="event.preventDefault();window._puUpdate()">
            <div class="pu-field">
              <label class="pu-label">Role</label>
              <select class="pu-select" id="pe-role">
                ${PLATFORM_ROLES.map(r => `<option value="${r.id}"${r.id === editUser.role ? ' selected' : ''}>${r.icon} ${r.label}</option>`).join('')}
              </select>
            </div>
            <div class="pu-field">
              <label class="pu-label">Reset Password (để trống nếu không đổi)</label>
              <input class="pu-input" id="pe-password" type="password" placeholder="Nhập password mới..." minlength="6">
            </div>
            <div class="pu-field">
              <label class="pu-label">Status</label>
              <select class="pu-select" id="pe-status">
                <option value="active"${(editUser.status || 'active') === 'active' ? ' selected' : ''}>✅ Active</option>
                <option value="suspended"${editUser.status === 'suspended' ? ' selected' : ''}>🚫 Suspended</option>
              </select>
            </div>
            <div class="pu-btns">
              <button type="button" class="pu-btn-cancel" onclick="window._puEditClose()">Cancel</button>
              <button type="submit" class="pu-btn-submit">Save Changes</button>
            </div>
          </form>
        </div>
      </div>` : ''}
    </div>`;
}

function timeSince(d) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

window._puShowModal = () => { showModal = true; window.render(); };
window._puHideModal = () => { showModal = false; window.render(); };
window._puCreate = createUser;
window._puDelete = deleteUser;
window._puEdit = (id) => { editUser = users.find(u => u.id === id) || null; window.render(); };
window._puEditClose = () => { editUser = null; window.render(); };
window._puUpdate = updateUser;
