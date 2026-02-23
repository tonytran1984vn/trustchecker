/**
 * TrustChecker – Organization Management Page (Super Admin)
 * CRUD for multi-tenant organizations.
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../core/router.js';

export function renderPage() {
    const d = State.orgData;
    if (!d) return '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Loading organizations…</div></div>';

    const orgs = d.organizations || [];
    const planCounts = {};
    orgs.forEach(o => { planCounts[o.plan] = (planCounts[o.plan] || 0) + 1; });

    return `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${orgs.length}</div><div class="stat-label">Total Organizations</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--emerald)">${orgs.filter(o => o.status === 'active').length}</div><div class="stat-label">Active</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--cyan)">${planCounts.enterprise || 0}</div><div class="stat-label">Enterprise</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--violet)">${planCounts.pro || 0}</div><div class="stat-label">Pro</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--amber)">${planCounts.free || 0}</div><div class="stat-label">Free</div></div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">🏢 Organizations</div>
        <button class="btn btn-primary" onclick="showCreateOrg()">+ Create Organization</button>
      </div>
      <div class="table-container">
        <table>
          <tr><th>Name</th><th>Slug</th><th>Plan</th><th>Members</th><th>Status</th><th>Created</th><th>Actions</th></tr>
          ${orgs.map(o => `
            <tr>
              <td style="font-weight:600">${o.name}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${o.slug}</td>
              <td><span class="badge ${o.plan === 'enterprise' ? 'valid' : o.plan === 'pro' ? 'info' : 'warning'}">${o.plan}</span></td>
              <td style="text-align:center">${o.member_count || 0}</td>
              <td><span class="badge ${o.status === 'active' ? 'valid' : 'suspicious'}">${o.status}</span></td>
              <td style="font-size:0.72rem;color:var(--text-muted)">${o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
              <td>
                <button class="btn btn-sm" onclick="showUpdatePlan('${o.id}','${o.plan}')" title="Change Plan">📋 Plan</button>
                <button class="btn btn-sm" onclick="deleteOrg('${o.id}','${o.name}')" style="margin-left:4px;color:var(--rose)" title="Delete">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>
  `;
}

function showCreateOrg() {
    State.modal = `
    <div class="modal">
      <div class="modal-title">🏢 Create Organization</div>
      <div class="input-group"><label>Organization Name *</label><input class="input" id="org-name" placeholder="e.g. Acme Corp"></div>
      <div class="input-group"><label>Slug *</label><input class="input" id="org-slug" placeholder="e.g. acme-corp" oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9-]/g,'')"></div>
      <div class="input-group">
        <label>Plan</label>
        <select class="input" id="org-plan">
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-primary" onclick="submitCreateOrg()" style="flex:1">Create</button>
        <button class="btn" onclick="State.modal=null;render()">Cancel</button>
      </div>
    </div>
  `;
    render();
}

async function submitCreateOrg() {
    const name = document.getElementById('org-name')?.value?.trim();
    const slug = document.getElementById('org-slug')?.value?.trim();
    const plan = document.getElementById('org-plan')?.value;
    if (!name || !slug) return showToast('Name and slug are required', 'error');
    try {
        await API.post('/org', { name, slug, plan });
        showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Organization created', 'success');
        State.modal = null;
        navigate('org-management');
    } catch (e) { showToast(e.message || 'Failed to create organization', 'error'); }
}

function showUpdatePlan(id, currentPlan) {
    State.modal = `
    <div class="modal">
      <div class="modal-title">📋 Update Organization Plan</div>
      <div class="input-group">
        <label>New Plan</label>
        <select class="input" id="org-new-plan">
          ${['free', 'starter', 'pro', 'business', 'enterprise'].map(p =>
        `<option value="${p}" ${p === currentPlan ? 'selected' : ''}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`
    ).join('')}
        </select>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-primary" onclick="submitUpdatePlan('${id}')" style="flex:1">Update Plan</button>
        <button class="btn" onclick="State.modal=null;render()">Cancel</button>
      </div>
    </div>
  `;
    render();
}

async function submitUpdatePlan(id) {
    const plan = document.getElementById('org-new-plan')?.value;
    try {
        await API.put(`/org/${id}/plan`, { plan });
        showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Plan updated', 'success');
        State.modal = null;
        navigate('org-management');
    } catch (e) { showToast(e.message || 'Failed to update plan', 'error'); }
}

async function deleteOrg(id, name) {
    if (!confirm(`Delete organization "${name}"? This cannot be undone.`)) return;
    try {
        await API.delete(`/org/${id}`);
        showToast('Organization deleted', 'info');
        navigate('org-management');
    } catch (e) { showToast(e.message || 'Delete failed', 'error'); }
}

// Window exports
window.showCreateOrg = showCreateOrg;
window.submitCreateOrg = submitCreateOrg;
window.showUpdatePlan = showUpdatePlan;
window.submitUpdatePlan = submitUpdatePlan;
window.deleteOrg = deleteOrg;
