/**
 * TrustChecker – Role Manager (RBAC Permission Matrix)
 * Company Admin UI for managing custom roles, permissions, and user assignments.
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';
import { escapeHTML } from '../utils/sanitize.js';
import { timeAgo } from '../utils/helpers.js';

// ─── Local state ────────────────────────────────────────────
let _roles = [];
let _users = [];
let _matrix = [];       // permission matrix (grouped by resource)
let _editingRole = null; // role being edited (null = list view)
let _activeTab = 'roles'; // 'roles' | 'users' | 'audit'
let _editPerms = {};    // { "resource:action": boolean } for current role edit
let _newRole = { name: '', display_name: '', description: '' };
let _showCreateModal = false;
let _auditLogs = [];

// ─── PAGE ACCESS CHECK ──────────────────────────────────────
function hasRoleAccess() {
    const role = State.user?.role;
    const ut = State.user?.user_type;
    return role === 'super_admin' || role === 'admin' || ut === 'platform'
        || role === 'company_admin';
}

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════

export function renderPage() {
    if (!hasRoleAccess()) {
        return `<div class="empty-state"><div class="empty-icon">🔒</div>
      <div class="empty-text">Company Admin access required</div></div>`;
    }

    return `
    <div class="card" style="margin-bottom:0">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div class="card-title" style="display:flex;align-items:center;gap:8px">
          <span style="font-size:20px">🛡️</span> Role & Permission Manager
        </div>
        <div style="display:flex;gap:6px">
          ${renderTabs()}
        </div>
      </div>
      <div class="card-body" style="padding:0">
        <div id="rbac-content" style="min-height:400px">
          <div class="loading"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  `;
}

function renderTabs() {
    const tabs = [
        { id: 'roles', label: '📋 Roles', icon: '' },
        { id: 'users', label: '👥 Users', icon: '' },
        { id: 'audit', label: '📜 Audit', icon: '' },
    ];
    return tabs.map(t => `
    <button class="btn btn-sm ${_activeTab === t.id ? 'btn-primary' : ''}"
      onclick="rbacSwitchTab('${t.id}')"
      style="font-size:0.78rem;padding:6px 14px">${t.label}</button>
  `).join('');
}

// ─── ROLES TAB ──────────────────────────────────────────────
function renderRolesTab() {
    if (_editingRole) return renderPermissionMatrix();

    const roleRows = _roles.map(r => `
    <tr>
      <td style="font-weight:600">
        ${escapeHTML(r.display_name || r.name)}
        ${r.is_system ? '<span class="badge" style="background:var(--primary);color:#fff;font-size:10px;margin-left:6px">SYSTEM</span>' : ''}
      </td>
      <td><code style="font-size:0.72rem;color:var(--text-secondary)">${escapeHTML(r.name)}</code></td>
      <td style="text-align:center"><span class="badge valid">${r.permissions?.length || 0}</span></td>
      <td style="text-align:center">${r.user_count || 0}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm" onclick="rbacEditRole('${escapeHTML(r.id)}')" title="Edit permissions">✏️</button>
          ${!r.is_system ? `<button class="btn btn-sm" onclick="rbacDeleteRole('${escapeHTML(r.id)}', '${escapeHTML(r.display_name || r.name)}')" title="Delete" style="color:var(--danger)">🗑️</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');

    return `
    <div style="padding:16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border)">
      <div style="font-size:0.82rem;color:var(--text-secondary)">${_roles.length} roles in this tenant</div>
      <button class="btn btn-primary btn-sm" onclick="rbacShowCreateRole()" style="font-size:0.78rem">+ Create Role</button>
    </div>
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>Role</th><th>Slug</th><th style="text-align:center">Permissions</th><th style="text-align:center">Users</th><th>Actions</th></tr></thead>
        <tbody>${roleRows || '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted)">No custom roles yet. Click "Create Role" to get started.</td></tr>'}</tbody>
      </table>
    </div>
    ${_showCreateModal ? renderCreateModal() : ''}
  `;
}

// ─── PERMISSION MATRIX ──────────────────────────────────────
function renderPermissionMatrix() {
    const role = _editingRole;
    const groupedByLevel = {};

    for (const group of _matrix) {
        const lvl = group.level || 'business';
        if (lvl === 'platform') continue; // Company Admin can't see platform perms
        if (!groupedByLevel[lvl]) groupedByLevel[lvl] = [];
        groupedByLevel[lvl].push(group);
    }

    const levelLabels = { tenant: '🏢 Tenant Management', business: '📊 Business Modules' };

    const sections = Object.entries(groupedByLevel).map(([level, groups]) => {
        const rows = groups.map(g => {
            const cells = g.actions.map(a => {
                const key = `${g.resource}:${a.action}`;
                const checked = _editPerms[key] ? 'checked' : '';
                return `
          <td style="text-align:center;padding:6px">
            <label style="cursor:pointer" title="${escapeHTML(a.description || key)}">
              <input type="checkbox" ${checked} ${role.is_system ? 'disabled' : ''}
                onchange="rbacTogglePerm('${escapeHTML(key)}')"
                style="width:16px;height:16px;cursor:pointer">
            </label>
          </td>`;
            }).join('');

            // Pad to consistent columns
            const maxActions = ['view', 'create', 'update', 'delete', 'export', 'manage', 'verify', 'resolve', 'approve', 'generate', 'upload', 'mint', 'simulate'];
            const actionCols = maxActions.map(act => {
                const match = g.actions.find(a => a.action === act);
                if (!match) return '<td style="text-align:center;padding:6px;color:var(--border)">—</td>';
                const key = `${g.resource}:${match.action}`;
                const checked = _editPerms[key] ? 'checked' : '';
                return `<td style="text-align:center;padding:6px">
          <label style="cursor:pointer" title="${escapeHTML(match.description || key)}">
            <input type="checkbox" ${checked} ${role.is_system ? 'disabled' : ''}
              onchange="rbacTogglePerm('${escapeHTML(key)}')"
              style="width:16px;height:16px;cursor:pointer">
          </label></td>`;
            });

            return `<tr>
        <td style="font-weight:600;white-space:nowrap;padding:8px 12px;min-width:130px">
          ${formatResourceName(g.resource)}
        </td>
        ${actionCols.join('')}
      </tr>`;
        }).join('');

        return `
      <div style="margin-bottom:24px">
        <div style="padding:10px 16px;font-weight:700;font-size:0.82rem;background:var(--surface);border-bottom:1px solid var(--border);color:var(--primary)">${levelLabels[level] || level}</div>
        <div style="overflow-x:auto">
          <table class="data-table" style="margin:0">
            <thead><tr>
              <th style="min-width:130px">Resource</th>
              <th style="text-align:center;font-size:0.72rem;min-width:52px">View</th>
              <th style="text-align:center;font-size:0.72rem;min-width:52px">Create</th>
              <th style="text-align:center;font-size:0.72rem;min-width:52px">Update</th>
              <th style="text-align:center;font-size:0.72rem;min-width:52px">Delete</th>
              <th style="text-align:center;font-size:0.72rem;min-width:52px">Export</th>
              <th style="text-align:center;font-size:0.72rem;min-width:52px">Manage</th>
              <th style="text-align:center;font-size:0.72rem;min-width:52px">Verify</th>
              <th style="text-align:center;font-size:0.72rem;min-width:52px">Resolve</th>
              <th style="text-align:center;font-size:0.72rem;min-width:52px">Approve</th>
              <th style="text-align:center;font-size:0.72rem;min-width:52px">Generate</th>
              <th style="text-align:center;font-size:0.72rem;min-width:52px">Upload</th>
              <th style="text-align:center;font-size:0.72rem;min-width:52px">Mint</th>
              <th style="text-align:center;font-size:0.72rem;min-width:52px">Simulate</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
    }).join('');

    const permCount = Object.values(_editPerms).filter(Boolean).length;

    return `
    <div style="padding:16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:8px">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn btn-sm" onclick="rbacBackToList()">← Back</button>
        <div>
          <span style="font-weight:700;font-size:0.92rem">${escapeHTML(role.display_name || role.name)}</span>
          ${role.is_system ? '<span class="badge" style="background:var(--primary);color:#fff;font-size:10px;margin-left:6px">SYSTEM</span>' : ''}
          <div style="font-size:0.72rem;color:var(--text-secondary)">${permCount} permissions selected</div>
        </div>
      </div>
      ${!role.is_system ? `<button class="btn btn-primary btn-sm" onclick="rbacSavePermissions()">💾 Save Permissions</button>` : '<div style="font-size:0.72rem;color:var(--warning)"><span class="status-icon status-warn" aria-label="Warning">!</span> System roles cannot be modified</div>'}
    </div>
    ${sections}
  `;
}

// ─── CREATE ROLE MODAL ──────────────────────────────────────
function renderCreateModal() {
    return `
    <div class="modal-overlay glass-overlay" onclick="if(event.target===this){rbacHideCreateRole()}" style="position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px)">
      <div class="card" style="width:420px;max-width:90vw;margin:0;animation:slideUp 0.2s ease">
        <div class="card-header"><div class="card-title">✨ Create New Role</div></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
          <div>
            <label style="font-size:0.78rem;font-weight:600;margin-bottom:4px;display:block">Slug (internal name)</label>
            <input class="input" id="new-role-name" placeholder="e.g. quality_inspector" value="${escapeHTML(_newRole.name)}"
              oninput="window._rbacNewRole.name=this.value" style="font-family:'JetBrains Mono';font-size:0.78rem">
          </div>
          <div>
            <label style="font-size:0.78rem;font-weight:600;margin-bottom:4px;display:block">Display Name</label>
            <input class="input" id="new-role-display" placeholder="e.g. Quality Inspector" value="${escapeHTML(_newRole.display_name)}"
              oninput="window._rbacNewRole.display_name=this.value">
          </div>
          <div>
            <label style="font-size:0.78rem;font-weight:600;margin-bottom:4px;display:block">Description</label>
            <textarea class="input" id="new-role-desc" rows="2" placeholder="Brief description of this role"
              oninput="window._rbacNewRole.description=this.value" style="resize:vertical">${escapeHTML(_newRole.description)}</textarea>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
            <button class="btn btn-sm" onclick="rbacHideCreateRole()">Cancel</button>
            <button class="btn btn-primary btn-sm" onclick="rbacDoCreateRole()">Create Role</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── USERS TAB ──────────────────────────────────────────────
function renderUsersTab() {
    const userRows = _users.map(u => {
        const roleNames = (u.rbac_roles || []).map(r => `<span class="badge valid" style="font-size:10px;margin:1px">${escapeHTML(r.display_name || r.name)}</span>`).join(' ');
        return `
      <tr>
        <td style="font-weight:600">${escapeHTML(u.username)}</td>
        <td style="font-family:'JetBrains Mono';font-size:0.72rem">${escapeHTML(u.email)}</td>
        <td><code style="font-size:0.72rem">${escapeHTML(u.role)}</code></td>
        <td>${roleNames || '<span style="color:var(--text-muted);font-size:0.72rem">No RBAC roles</span>'}</td>
        <td style="font-size:0.72rem;color:var(--text-muted)">${u.last_login ? timeAgo(u.last_login) : 'Never'}</td>
        <td>
          <button class="btn btn-sm" onclick="rbacAssignRole('${escapeHTML(u.id)}','${escapeHTML(u.username)}')" title="Assign roles">🏷️</button>
        </td>
      </tr>`;
    }).join('');

    return `
    <div style="padding:16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border)">
      <div style="font-size:0.82rem;color:var(--text-secondary)">${_users.length} users in this tenant</div>
    </div>
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>User</th><th>Email</th><th>Legacy Role</th><th>RBAC Roles</th><th>Last Login</th><th>Actions</th></tr></thead>
        <tbody>${userRows || '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted)">No users found</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

// ─── AUDIT TAB ──────────────────────────────────────────────
function renderAuditTab() {
    const logRows = _auditLogs.map(l => {
        let details = '';
        try { details = JSON.stringify(JSON.parse(l.details || '{}'), null, 0); } catch { details = l.details || ''; }
        return `
      <tr>
        <td style="font-size:0.72rem;white-space:nowrap;color:var(--text-secondary)">${new Date(l.created_at).toLocaleString()}</td>
        <td style="font-weight:600">${escapeHTML(l.actor_name || l.actor_id?.slice(0, 8) || '?')}</td>
        <td><code style="font-size:0.72rem">${escapeHTML(l.action)}</code></td>
        <td style="font-size:0.72rem">${escapeHTML(l.entity_type)}/${escapeHTML((l.entity_id || '').slice(0, 12))}</td>
        <td style="font-size:0.68rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHTML(details)}">${escapeHTML(details)}</td>
      </tr>`;
    }).join('');

    return `
    <div style="padding:16px;font-size:0.82rem;color:var(--text-secondary);border-bottom:1px solid var(--border)">Recent RBAC actions</div>
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
        <tbody>${logRows || '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted)">No audit entries</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// DATA LOADING
// ═══════════════════════════════════════════════════════════════

export async function loadRoleManager() {
    try {
        const [rolesRes, usersRes, permsRes] = await Promise.all([
            API.get('/tenant/roles'),
            API.get('/tenant/users'),
            API.get('/tenant/permissions'),
        ]);
        _roles = rolesRes.roles || [];
        _users = usersRes.users || [];
        _matrix = permsRes.matrix || [];
        refreshContent();
    } catch (err) {
        console.error('[RoleManager] Load error:', err);
        const el = document.getElementById('rbac-content');
        if (el) el.innerHTML = `<div class="empty-state"><div class="empty-icon"><span class="status-icon status-warn" aria-label="Warning">!</span></div><div class="empty-text">Failed to load RBAC data: ${escapeHTML(err.message)}</div></div>`;
    }
}

function refreshContent() {
    const el = document.getElementById('rbac-content');
    if (!el) return;
    if (_activeTab === 'roles') el.innerHTML = renderRolesTab();
    else if (_activeTab === 'users') el.innerHTML = renderUsersTab();
    else if (_activeTab === 'audit') el.innerHTML = renderAuditTab();
}

// ═══════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════

function switchTab(tab) {
    _activeTab = tab;
    _editingRole = null;
    if (tab === 'audit' && _auditLogs.length === 0) loadAudit();
    render();
    setTimeout(loadRoleManager, 100);
}

function editRole(roleId) {
    const role = _roles.find(r => r.id === roleId);
    if (!role) return;
    _editingRole = role;
    _editPerms = {};
    (role.permissions || []).forEach(p => { _editPerms[p] = true; });
    refreshContent();
}

function backToList() {
    _editingRole = null;
    refreshContent();
}

function togglePerm(key) {
    _editPerms[key] = !_editPerms[key];
    // No refresh needed — checkbox state is handled by DOM
}

async function savePermissions() {
    if (!_editingRole) return;
    const perms = Object.entries(_editPerms).filter(([_, v]) => v).map(([k]) => k);
    try {
        await API.put(`/tenant/roles/${_editingRole.id}`, { permissions: perms });
        showToast(`<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Saved ${perms.length} permissions for ${_editingRole.display_name}`, 'success');
        await loadRoleManager();
        editRole(_editingRole.id); // Re-enter edit to show updated state
    } catch (err) {
        showToast(`<span class="status-icon status-fail" aria-label="Fail">✗</span> ${err.message || 'Failed to save'}`, 'error');
    }
}

function showCreateRole() {
    _showCreateModal = true;
    _newRole = { name: '', display_name: '', description: '' };
    window._rbacNewRole = _newRole;
    refreshContent();
}

function hideCreateRole() {
    _showCreateModal = false;
    refreshContent();
}

async function doCreateRole() {
    const name = window._rbacNewRole?.name || _newRole.name;
    const display_name = window._rbacNewRole?.display_name || _newRole.display_name;
    const description = window._rbacNewRole?.description || _newRole.description;

    if (!name || !display_name) {
        showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> Slug and display name are required', 'error');
        return;
    }
    try {
        await API.post('/tenant/roles', { name, display_name, description, permissions: [] });
        showToast(`<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Role "${display_name}" created`, 'success');
        _showCreateModal = false;
        await loadRoleManager();
    } catch (err) {
        showToast(`<span class="status-icon status-fail" aria-label="Fail">✗</span> ${err.message || 'Create failed'}`, 'error');
    }
}

async function deleteRole(roleId, roleName) {
    if (!confirm(`Delete role "${roleName}"? This cannot be undone.`)) return;
    try {
        await API.delete(`/tenant/roles/${roleId}`);
        showToast(`<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Role "${roleName}" deleted`, 'success');
        await loadRoleManager();
    } catch (err) {
        showToast(`<span class="status-icon status-fail" aria-label="Fail">✗</span> ${err.message || 'Delete failed'}`, 'error');
    }
}

async function assignRole(userId, username) {
    // Show a simple role selection modal
    const roleOptions = _roles.map(r =>
        `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer">
      <input type="checkbox" value="${escapeHTML(r.id)}" class="rbac-assign-cb"
        ${(_users.find(u => u.id === userId)?.rbac_roles || []).some(ur => ur.id === r.id) ? 'checked' : ''}
        style="width:16px;height:16px">
      <span style="font-weight:600">${escapeHTML(r.display_name || r.name)}</span>
      <span style="font-size:0.72rem;color:var(--text-muted)">(${r.permissions?.length || 0} perms)</span>
    </label>`
    ).join('');

    State.modal = `
    <div class="card" style="width:400px;max-width:90vw;margin:auto">
      <div class="card-header"><div class="card-title">🏷️ Assign Roles to ${escapeHTML(username)}</div></div>
      <div class="card-body" style="max-height:400px;overflow-y:auto">${roleOptions}</div>
      <div style="padding:12px 16px;display:flex;gap:8px;justify-content:flex-end;border-top:1px solid var(--border)">
        <button class="btn btn-sm" onclick="State.modal=null;render()">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="rbacDoAssign('${escapeHTML(userId)}')">Save</button>
      </div>
    </div>
  `;
    render();
}

async function doAssign(userId) {
    const checkboxes = document.querySelectorAll('.rbac-assign-cb:checked');
    const roleIds = Array.from(checkboxes).map(cb => cb.value);
    try {
        await API.put(`/tenant/users/${userId}/roles`, { role_ids: roleIds });
        showToast(`<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Roles updated`, 'success');
        State.modal = null;
        await loadRoleManager();
    } catch (err) {
        showToast(`<span class="status-icon status-fail" aria-label="Fail">✗</span> ${err.message || 'Assignment failed'}`, 'error');
    }
}

async function loadAudit() {
    try {
        const res = await API.get('/tenant/audit?limit=50');
        _auditLogs = res.logs || [];
        refreshContent();
    } catch (err) {
        console.error('[RoleManager] Audit error:', err);
    }
}

// ─── Helpers ────────────────────────────────────────────────
function formatResourceName(resource) {
    const map = {
        dashboard: '📊 Dashboard', product: '📦 Product', scan: '🔍 Scan', qr: '📱 QR Code',
        evidence: '🔐 Evidence', trust_score: '⭐ Trust Score', stakeholder: '👥 Stakeholder',
        supply_chain: '🔗 Supply Chain', inventory: '📋 Inventory', logistics: '🚚 Logistics',
        partner: '🤝 Partner', epcis: '📡 EPCIS', trustgraph: '🕸️ TrustGraph',
        digital_twin: '🪞 Digital Twin', fraud: '🚨 Fraud', fraud_case: '📁 Fraud Case',
        risk_radar: '🎯 Risk Radar', anomaly: '⚡ Anomaly', leak_monitor: '💧 Leak Monitor',
        ai_analytics: '🤖 AI Analytics', kyc: '🏛️ KYC', esg: '🌱 ESG',
        sustainability: '♻️ Sustainability', compliance: '📜 Compliance', report: '📈 Report',
        blockchain: '⛓️ Blockchain', nft: '🎨 NFT', wallet: '💰 Wallet',
        api_key: '🔑 API Key', webhook: '🪝 Webhook', notification: '🔔 Notification',
        billing: '💳 Billing', settings: '⚙️ Settings',
        tenant: '🏢 Tenant Mgmt',
    };
    return map[resource] || resource.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// ─── Window exports ─────────────────────────────────────────
window.rbacSwitchTab = switchTab;
window.rbacEditRole = editRole;
window.rbacBackToList = backToList;
window.rbacTogglePerm = togglePerm;
window.rbacSavePermissions = savePermissions;
window.rbacShowCreateRole = showCreateRole;
window.rbacHideCreateRole = hideCreateRole;
window.rbacDoCreateRole = doCreateRole;
window.rbacDeleteRole = deleteRole;
window.rbacAssignRole = assignRole;
window.rbacDoAssign = doAssign;
