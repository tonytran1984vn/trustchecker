/**
 * TrustChecker — Org Owner Workspace (Strategic Governance Authority)
 * ═══════════════════════════════════════════════════════════════════
 * "See everything, touch nothing operational."
 *
 * 7 Modules:
 *   1. Governance Dashboard — strategic KPIs, risk heatmap
 *   2. Ownership & Authority — appoint CA/SO, emergency controls
 *   3. Access Oversight — read-only role matrix, escalation history
 *   4. Governance & Risk — SoD monitor, critical action log
 *   5. Financial & Plan — billing, usage, invoices
 *   6. Compliance & Legal — GDPR, retention, evidence integrity
 *   7. Emergency Controls — freeze, reauth, revoke, suspend
 */
import { State, render } from '../../core/state.js';
import { API } from '../../core/api.js';
import { showToast } from '../../components/toast.js';
import { icon } from '../../core/icons.js';

// ─── State ──────────────────────────────────────────────────
let _ownerData = {};
let _accessData = {};
let _criticalActions = [];
let _activeTab = 'dashboard';
let _riskLoaded = false;

// ─── Tab Registry ───────────────────────────────────────────
const OWNER_TABS = [
  { id: 'dashboard', label: 'Governance Dashboard', icon: '📊' },
  { id: 'authority', label: 'Ownership & Authority', icon: '🔑' },
  { id: 'access', label: 'Access Oversight', icon: '👁️' },
  { id: 'risk', label: 'Governance & Risk', icon: '⚖️' },
  { id: 'financial', label: 'Financial & Plan', icon: '💰' },
  { id: 'compliance', label: 'Compliance & Legal', icon: '📋' },
  { id: 'emergency', label: 'Emergency Controls', icon: '🚨' },
];

// ─── Entry Point ────────────────────────────────────────────
export function renderPage() {
  if (!['org_owner', 'super_admin'].includes(State.user?.role)) {
    return '<div class="empty-state"><div class="empty-icon">👑</div><div class="empty-text">Org Owner access required</div></div>';
  }

  setTimeout(() => loadOwnerData(), 50);

  return `
    <div style="display:flex;flex-direction:column;gap:0">
      <div style="display:flex;gap:4px;padding:0 0 16px;border-bottom:1px solid var(--border);flex-wrap:wrap">
        ${OWNER_TABS.map(t => `
          <button onclick="window._ownerTab('${t.id}')"
            id="owner-tab-${t.id}"
            style="padding:6px 14px;font-size:0.72rem;border-radius:8px;font-weight:600;cursor:pointer;
              ${_activeTab === t.id
      ? 'background:#6d28d9;color:#fff;border:2px solid #6d28d9;box-shadow:0 2px 8px rgba(109,40,217,0.3)'
      : 'background:var(--surface);color:var(--text);border:1px solid var(--border)'}"
          >${t.icon} ${t.label}</button>
        `).join('')}
      </div>
      <div id="owner-content" style="padding-top:16px">
        <div class="loading"><div class="spinner"></div></div>
      </div>
    </div>
  `;
}

window._ownerTab = function (tab) {
  _activeTab = tab;
  // Show loading state immediately for tabs that need data
  const el = document.getElementById('owner-content');
  if (el && ['access', 'risk', 'financial', 'compliance'].includes(tab)) {
    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px">
            <div class="spinner"></div>
            <div style="font-size:0.78rem;color:var(--text-muted)">Loading ${OWNER_TABS.find(t => t.id === tab)?.label || tab}…</div>
        </div>`;
  }
  // Update tab visual immediately
  OWNER_TABS.forEach(t => {
    const btn = document.getElementById(`owner-tab-${t.id}`);
    if (btn) {
      btn.style.background = t.id === _activeTab ? '#6d28d9' : 'var(--surface)';
      btn.style.color = t.id === _activeTab ? '#fff' : 'var(--text)';
      btn.style.borderColor = t.id === _activeTab ? '#6d28d9' : 'var(--border)';
      btn.style.boxShadow = t.id === _activeTab ? '0 2px 8px rgba(109,40,217,0.3)' : 'none';
    }
  });
  // Load data or render immediately for static tabs
  if (tab === 'dashboard') { if (_ownerData.total_users !== undefined) renderOwnerContent(); loadOwnerData(); }
  else if (tab === 'access') loadAccessData();
  else if (tab === 'risk') { _riskLoaded = false; loadCriticalActions(); }
  else renderOwnerContent();
};

async function loadOwnerData() {
  try {
    _ownerData = await API.get('/tenant/owner/dashboard');
    renderOwnerContent();
  } catch (e) {
    console.error('[Owner] Dashboard load error:', e);
    _ownerData = {};
    renderOwnerContent();
  }
}

async function loadAccessData() {
  try {
    _accessData = await API.get('/tenant/owner/access-oversight');
    renderOwnerContent();
  } catch (e) { _accessData = {}; renderOwnerContent(); }
}

async function loadCriticalActions() {
  try {
    const res = await API.get('/tenant/owner/critical-actions');
    _criticalActions = res.actions || [];
  } catch (e) { _criticalActions = []; }
  _riskLoaded = true;
  renderOwnerContent();
}

function renderOwnerContent() {
  const el = document.getElementById('owner-content');
  if (!el) return;

  // Update tab styles (consistent with _ownerTab)
  OWNER_TABS.forEach(t => {
    const btn = document.getElementById(`owner-tab-${t.id}`);
    if (btn) {
      btn.style.background = t.id === _activeTab ? '#6d28d9' : 'var(--surface)';
      btn.style.color = t.id === _activeTab ? '#fff' : 'var(--text)';
      btn.style.borderColor = t.id === _activeTab ? '#6d28d9' : 'var(--border)';
      btn.style.boxShadow = t.id === _activeTab ? '0 2px 8px rgba(109,40,217,0.3)' : 'none';
    }
  });

  const renderers = {
    dashboard: renderDashboard,
    authority: renderAuthority,
    access: renderAccess,
    risk: renderRisk,
    financial: renderFinancial,
    compliance: renderCompliance,
    emergency: renderEmergency,
  };
  el.innerHTML = (renderers[_activeTab] || renderDashboard)();
}

// ═══════════════════════════════════════════════════════════════
// 1. GOVERNANCE DASHBOARD
// ═══════════════════════════════════════════════════════════════
function renderDashboard() {
  const d = _ownerData;
  if (d.total_users === undefined) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px">
            <div class="spinner"></div>
            <div style="font-size:0.78rem;color:var(--text-muted)">Loading Governance Dashboard…</div>
        </div>`;
  }

  const kpi = (label, value, color, desc, tooltip) => `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;flex:1;min-width:160px;position:relative"
         ${tooltip ? `title="${tooltip}"` : ''}>
      <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">${label}</div>
      <div style="font-size:1.8rem;font-weight:800;color:${color}">${value}</div>
      <div style="font-size:0.68rem;color:var(--text-muted);margin-top:4px">${desc}</div>
    </div>`;

  // Role distribution with proportional bars
  const roles = d.role_distribution || [];
  const maxCount = Math.max(...roles.map(r => r.count || 0), 1);
  const roleDist = roles.map(r => {
    const pct = Math.max(Math.round((r.count / maxCount) * 100), 4);
    const roleName = toTitleCase((r.role || 'unknown').replace(/_/g, ' '));
    const roleColor = getRoleColor(r.role);
    return `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <div style="width:140px;font-size:0.72rem;font-weight:600">${roleName}</div>
        <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${roleColor};border-radius:4px;transition:width 0.3s ease"></div>
        </div>
        <div style="width:40px;text-align:right;font-size:0.72rem;font-weight:700;color:var(--text)">${r.count}</div>
      </div>`;
  }).join('');

  const alerts = (d.suspicious_alerts || []).map(a => {
    let det = {};
    try { det = typeof a.details === 'string' ? JSON.parse(a.details) : a.details || {}; } catch (_) { }
    return `
      <div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--border);font-size:0.72rem">
        <span style="font-weight:600">${a.action}</span>
        <span style="color:var(--text-muted)">${timeAgo(a.created_at)}</span>
      </div>`;
  }).join('') || '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.72rem">No alerts</div>';

  // Carbon mints trend text
  const carbonVal = d.carbon_mints_30d || 0;
  const carbonDesc = carbonVal > 0 ? `${carbonVal} this month • Active` : '0 this month • No activity';

  // Risk model tooltip
  const riskVer = d.risk_model_version || 'N/A';
  const riskTooltip = riskVer !== 'N/A' ? `Model ${riskVer} — Click Governance & Risk for details` : 'No risk model deployed yet';

  return `
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px">
      ${kpi('Total Users', d.total_users || 0, 'var(--primary)', `${d.total_users || 0} organization members`)}
      ${kpi('High-Risk Roles', d.high_risk_role_count || 0, '#ef4444', `${d.high_risk_role_count || 0} privileged accounts`, `Includes: compliance_officer, risk_officer, risk_committee, security_officer, org_owner`)}
      ${kpi('Pending Approvals', d.pending_approvals || 0, '#f59e0b', 'Dual-control queue')}
      ${kpi('Carbon Mints (30d)', carbonVal, '#10b981', carbonDesc)}
      ${kpi('Risk Model', riskVer, '#8b5cf6', riskVer !== 'N/A' ? `Version ${riskVer}` : 'Not deployed', riskTooltip)}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header">
          <div class="card-title">📊 Role Distribution</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">${roles.length} roles • ${d.total_users || 0} total members</div>
        </div>
        <div class="card-body">${roleDist || '<div style="color:var(--text-muted)">No data</div>'}</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">🔔 Suspicious Activity</div></div>
        <div class="card-body" style="max-height:300px;overflow-y:auto">${alerts}</div>
      </div>
    </div>

    ${(d.sod_warnings || []).length > 0 ? `
      <div class="card" style="margin-top:16px;border-color:#ef4444">
        <div class="card-header"><div class="card-title" style="color:#ef4444">⚠️ SoD Warnings (${d.sod_warnings.length})</div></div>
        <div class="card-body">
          ${d.sod_warnings.map(w => `<div style="padding:6px 0;font-size:0.72rem;border-bottom:1px solid var(--border)">${esc(w.email)} — ${w.roles?.length || 0} overlapping roles</div>`).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

// ═══════════════════════════════════════════════════════════════
// 2. OWNERSHIP & AUTHORITY
// ═══════════════════════════════════════════════════════════════
function renderAuthority() {
  return `
    <div class="card" style="border-left:4px solid #8b5cf6">
      <div class="card-header"><div class="card-title">👑 Ownership & Authority</div></div>
      <div class="card-body">
        <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:16px">
          As Org Owner, you control strategic appointments and emergency actions. You do not participate in daily operations.
        </p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px">
            <h4 style="margin:0 0 12px;color:#3b82f6">🔧 Appoint Company Admin</h4>
            <div class="input-group" style="margin-bottom:8px">
              <label>Email</label>
              <input class="input" id="appoint-ca-email" type="email" placeholder="admin@company.com">
            </div>
            <div class="input-group" style="margin-bottom:12px">
              <label>Name (optional)</label>
              <input class="input" id="appoint-ca-name" type="text" placeholder="Display name">
            </div>
            <button class="btn btn-sm" style="background:#3b82f6;color:#fff;border:none" onclick="window._ownerAppoint('company_admin')">✓ Appoint CA</button>
          </div>

          <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px">
            <h4 style="margin:0 0 12px;color:#ef4444">🛡️ Appoint Security Officer</h4>
            <div class="input-group" style="margin-bottom:8px">
              <label>Email</label>
              <input class="input" id="appoint-so-email" type="email" placeholder="security@company.com">
            </div>
            <div class="input-group" style="margin-bottom:12px">
              <label>Name (optional)</label>
              <input class="input" id="appoint-so-name" type="text" placeholder="Display name">
            </div>
            <button class="btn btn-sm" style="background:#ef4444;color:#fff;border:none" onclick="window._ownerAppoint('security_officer')">✓ Appoint SO</button>
          </div>
        </div>

        <div id="appoint-result" style="margin-top:16px"></div>
      </div>
    </div>
  `;
}

window._ownerAppoint = async function (role) {
  const prefix = role === 'company_admin' ? 'ca' : 'so';
  const email = document.getElementById(`appoint-${prefix}-email`)?.value;
  const name = document.getElementById(`appoint-${prefix}-name`)?.value;
  if (!email) { showToast('Email is required', 'error'); return; }
  try {
    const res = await API.post('/tenant/owner/appoint', { email, name, role });
    let msg = `✓ ${res.message}`;
    if (res.temp_password) msg += ` — Temp: ${res.temp_password}`;
    showToast(msg, 'success');
    const el = document.getElementById('appoint-result');
    if (el && res.temp_password) {
      el.innerHTML = `<div style="background:#10b98115;border:1px solid #10b981;border-radius:8px;padding:12px;font-size:0.75rem">
        <strong>✓ ${role.replace(/_/g, ' ')} created:</strong> ${esc(email)}<br>
        <strong>Temp password:</strong> <code style="background:var(--border);padding:2px 6px;border-radius:4px">${res.temp_password}</code>
        <br><span style="color:var(--text-muted)">User must change password on first login.</span>
      </div>`;
    }
  } catch (e) {
    showToast(`✗ ${e.response?.data?.error || e.message}`, 'error');
  }
};

// ═══════════════════════════════════════════════════════════════
// 3. ACCESS OVERSIGHT (Read-Only)
// ═══════════════════════════════════════════════════════════════
function renderAccess() {
  const d = _accessData;
  if (!d.role_matrix) return '<div class="loading"><div class="spinner"></div></div>';

  const matrix = (d.role_matrix || []).map(u => `
    <tr>
      <td style="font-weight:600;font-size:0.72rem">${esc(u.username || u.email)}</td>
      <td style="font-family:'JetBrains Mono';font-size:0.68rem">${esc(u.email)}</td>
      <td><span class="role-badge role-${u.role}">${(u.role || '').replace(/_/g, ' ')}</span></td>
      <td style="font-size:0.68rem;color:var(--text-muted)">${u.last_login ? timeAgo(u.last_login) : 'Never'}</td>
    </tr>
  `).join('');

  const escalations = (d.escalation_history || []).slice(0, 20).map(e => {
    let det = {};
    try { det = typeof e.details === 'string' ? JSON.parse(e.details) : e.details || {}; } catch (_) { }
    return `
      <tr>
        <td style="font-size:0.72rem">${esc(e.actor_email || e.actor_id?.substring(0, 8))}</td>
        <td><span style="font-size:0.68rem;padding:2px 8px;border-radius:4px;background:var(--border)">${e.action}</span></td>
        <td style="font-size:0.68rem;color:var(--text-muted)">${det.email || e.entity_id?.substring(0, 8) || '—'}</td>
        <td style="font-size:0.68rem;color:var(--text-muted)">${timeAgo(e.created_at)}</td>
      </tr>`;
  }).join('');

  const riskAccounts = (d.risk_accounts || []).slice(0, 5).map(r => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.72rem">
      <span style="font-weight:600">${esc(r.email)}</span>
      <span><span class="role-badge role-${r.role}">${r.role}</span> — ${r.role_count} roles</span>
    </div>
  `).join('');

  const inactive = (d.inactive_privileged || []).map(i => `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.72rem">
      <span>${esc(i.email)}</span>
      <span style="color:#ef4444">${i.role} — ${i.last_login ? timeAgo(i.last_login) : '⚠️ Never logged in'}</span>
    </div>
  `).join('');

  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><div class="card-title">👁️ Role Matrix (Read-Only)</div></div>
      <div class="card-body" style="max-height:350px;overflow-y:auto">
        <table class="data-table"><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Last Login</th></tr></thead>
        <tbody>${matrix}</tbody></table>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card">
        <div class="card-header"><div class="card-title">🏆 Highest-Risk Accounts</div></div>
        <div class="card-body">${riskAccounts || '<div style="color:var(--text-muted);font-size:0.72rem">No data</div>'}</div>
      </div>
      <div class="card" style="border-color:${(d.inactive_privileged || []).length > 0 ? '#f59e0b' : 'var(--border)'}">
        <div class="card-header"><div class="card-title">💤 Inactive Privileged Accounts</div></div>
        <div class="card-body">${inactive || '<div style="color:var(--text-muted);font-size:0.72rem">All active</div>'}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">📜 Privilege Escalation History</div></div>
      <div class="card-body" style="max-height:300px;overflow-y:auto">
        <table class="data-table"><thead><tr><th>Actor</th><th>Action</th><th>Target</th><th>When</th></tr></thead>
        <tbody>${escalations || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No escalations</td></tr>'}</tbody></table>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// 4. GOVERNANCE & RISK VIEW
// ═══════════════════════════════════════════════════════════════
function renderRisk() {
  const actions = _criticalActions;
  if (!_riskLoaded) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px">
            <div class="spinner"></div>
            <div style="font-size:0.78rem;color:var(--text-muted)">Loading Governance & Risk…</div>
        </div>`;
  }

  const severityColor = (action) => {
    if (['TENANT_FREEZE', 'FORCE_REAUTH', 'REVOKE_ALL_SESSIONS'].includes(action)) return '#ef4444';
    if (['SELF_ELEVATION_BLOCKED', 'PERMISSION_CEILING_BLOCKED'].includes(action)) return '#f59e0b';
    if (['NEW_IP_LOGIN', 'ROLE_EXPIRED'].includes(action)) return '#f97316';
    return '#6b7280';
  };

  const rows = actions.map(a => {
    let det = {};
    try { det = typeof a.details === 'string' ? JSON.parse(a.details) : a.details || {}; } catch (_) { }
    return `
      <tr>
        <td style="font-size:0.72rem;color:var(--text-muted)">${timeAgo(a.created_at)}</td>
        <td><span style="font-size:0.68rem;padding:2px 8px;border-radius:4px;color:#fff;background:${severityColor(a.action)}">${a.action}</span></td>
        <td style="font-size:0.72rem">${esc(a.actor_email || '—')}</td>
        <td style="font-size:0.68rem;color:var(--text-muted);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${det.justification || det.message || det.email || '—'}</td>
      </tr>`;
  }).join('');

  return `
    <div class="card" style="border-left:4px solid #8b5cf6">
      <div class="card-header">
        <div class="card-title">⚖️ Critical Action Log</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">Immutable • Read-only • ${actions.length} entries</div>
      </div>
      <div class="card-body" style="max-height:500px;overflow-y:auto">
        <table class="data-table">
          <thead><tr><th>When</th><th>Action</th><th>Actor</th><th>Details</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No critical actions recorded</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// 5. FINANCIAL & PLAN CONTROL
// ═══════════════════════════════════════════════════════════════
function renderFinancial() {
  setTimeout(async () => {
    try {
      const [plan, usage, invoices] = await Promise.all([
        API.get('/billing/plan').catch(() => ({ plan: null })),
        API.get('/billing/usage').catch(() => ({ period: null, usage: {} })),
        API.get('/billing/invoices').catch(() => ({ invoices: [] })),
      ]);
      const el = document.getElementById('owner-billing-content');
      if (!el) return;
      el.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">Current Plan</div>
            <div style="font-size:1.5rem;font-weight:800;color:var(--primary);margin-top:6px">${plan.plan?.name || 'N/A'}</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">Period</div>
            <div style="font-size:1rem;font-weight:600;margin-top:6px">${usage.period?.start || 'N/A'}</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">Invoices</div>
            <div style="font-size:1.5rem;font-weight:800;margin-top:6px">${(invoices.invoices || []).length}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">📊 Usage</div></div>
          <div class="card-body">
            ${Object.entries(usage.usage || {}).map(([k, v]) => `
              <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.72rem">
                <span style="font-weight:600">${k.replace(/_/g, ' ')}</span>
                <span>${v.used || 0} / ${v.limit === -1 ? '∞' : v.limit || 0}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (e) {
      const el = document.getElementById('owner-billing-content');
      if (el) el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;padding:40px 20px;gap:12px">
        <div style="font-size:2rem">💰</div>
        <div style="font-size:0.82rem;font-weight:600;color:var(--text)">Financial data unavailable</div>
        <div style="font-size:0.72rem;color:var(--text-muted)">Billing services are temporarily unreachable. Please try again later.</div>
      </div>`;
    }
  }, 50);

  return `<div id="owner-billing-content"><div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px">
    <div class="spinner"></div>
    <div style="font-size:0.78rem;color:var(--text-muted)">Loading Financial & Plan…</div>
  </div></div>`;
}

// ═══════════════════════════════════════════════════════════════
// 6. COMPLIANCE & LEGAL VIEW
// ═══════════════════════════════════════════════════════════════
function renderCompliance() {
  setTimeout(async () => {
    try {
      const [compStats, compRecords, retention] = await Promise.all([
        API.get('/compliance/stats').catch(() => ({})),
        API.get('/compliance/records').catch(() => ({ records: [] })),
        API.get('/compliance/retention').catch(() => ({ policies: [] })),
      ]);
      const el = document.getElementById('owner-compliance-content');
      if (!el) return;

      const stats = compStats || {};
      el.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">GDPR Compliance</div>
            <div style="font-size:1.5rem;font-weight:800;color:${(stats.compliance_score || 0) >= 80 ? '#10b981' : '#ef4444'}">${stats.compliance_score || 0}%</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">Retention Policies</div>
            <div style="font-size:1.5rem;font-weight:800">${(retention.policies || []).length}</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">Compliance Records</div>
            <div style="font-size:1.5rem;font-weight:800">${(compRecords.records || []).length}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">📋 Data Retention Policies</div></div>
          <div class="card-body">
            ${(retention.policies || []).length > 0 ? retention.policies.map(p => `
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.72rem">
                <span style="font-weight:600">${esc(p.name || p.type)}</span>
                <span style="color:var(--text-muted)">${p.retention_days || 0} days — ${p.status || 'active'}</span>
              </div>
            `).join('') : '<div style="color:var(--text-muted);text-align:center;padding:20px;font-size:0.72rem">No policies configured</div>'}
          </div>
        </div>
      `;
    } catch (e) {
      const el = document.getElementById('owner-compliance-content');
      if (el) el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;padding:40px 20px;gap:12px">
        <div style="font-size:2rem">📋</div>
        <div style="font-size:0.82rem;font-weight:600;color:var(--text)">Compliance data unavailable</div>
        <div style="font-size:0.72rem;color:var(--text-muted)">Compliance services are temporarily unreachable. Please try again later.</div>
      </div>`;
    }
  }, 50);

  return `<div id="owner-compliance-content"><div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px">
    <div class="spinner"></div>
    <div style="font-size:0.78rem;color:var(--text-muted)">Loading Compliance & Legal…</div>
  </div></div>`;
}

// ═══════════════════════════════════════════════════════════════
// 7. EMERGENCY CONTROLS
// ═══════════════════════════════════════════════════════════════
function renderEmergency() {
  const actions = [
    { id: 'TENANT_FREEZE', icon: '🔴', label: 'Tenant Freeze', desc: 'Stop all write operations. Tenant becomes read-only.', color: '#ef4444' },
    { id: 'FORCE_REAUTH', icon: '🔒', label: 'Force Re-Authentication', desc: 'Invalidate all sessions. Every user must log in again.', color: '#f59e0b' },
    { id: 'REVOKE_ALL_SESSIONS', icon: '⛔', label: 'Revoke All Sessions', desc: 'Immediately revoke every active session.', color: '#f97316' },
    { id: 'SUSPEND_ROLE', icon: '⏸️', label: 'Suspend High-Risk Role', desc: 'Demote all users with a specific role to viewer.', color: '#8b5cf6' },
    { id: 'EMERGENCY_AUDIT_EXPORT', icon: '📤', label: 'Emergency Audit Export', desc: 'Export last 1000 audit entries immediately.', color: '#06b6d4' },
  ];

  return `
    <div class="card" style="border-left:4px solid #ef4444;margin-bottom:16px">
      <div class="card-header">
        <div class="card-title" style="color:#ef4444">🚨 Emergency Controls</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">All actions are logged with justification • Immutable audit trail</div>
      </div>
      <div class="card-body">
        <div style="background:#ef444410;border:1px solid #ef4444;border-radius:8px;padding:12px;margin-bottom:16px;font-size:0.72rem;color:#ef4444">
          ⚠️ <strong>Warning:</strong> These are irreversible emergency actions. Each action is permanently logged and alerts the compliance officer.
        </div>

        <div class="input-group" style="margin-bottom:16px">
          <label style="font-weight:700;color:#ef4444">Justification (required)</label>
          <textarea class="input" id="emergency-justification" rows="2" placeholder="Explain the reason for this emergency action (min 10 chars)..." style="resize:vertical"></textarea>
        </div>

        ${actions.map(a => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;background:var(--surface)">
            <div>
              <div style="font-weight:700;font-size:0.82rem">${a.icon} ${a.label}</div>
              <div style="font-size:0.68rem;color:var(--text-muted)">${a.desc}</div>
            </div>
            <button class="btn btn-sm" style="background:${a.color};color:#fff;border:none;min-width:100px"
              onclick="window._ownerEmergency('${a.id}'${a.id === 'SUSPEND_ROLE' ? ', true' : ''})">Execute</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

window._ownerEmergency = async function (action, needsRole = false) {
  const justification = document.getElementById('emergency-justification')?.value;
  if (!justification || justification.length < 10) {
    showToast('⚠️ Justification is required (min 10 chars)', 'error');
    return;
  }

  let target_role = null;
  if (needsRole) {
    target_role = prompt('Enter role to suspend (e.g., company_admin, risk_officer):');
    if (!target_role) return;
  }

  if (!confirm(`⚠️ EMERGENCY ACTION: ${action}\n\nThis action is irreversible and will be permanently logged.\n\nProceed?`)) return;

  try {
    const res = await API.post('/tenant/owner/emergency', { action, justification, target_role });
    showToast(`🚨 ${res.message}`, 'warning');
    renderOwnerContent();
  } catch (e) {
    showToast(`✗ ${e.response?.data?.error || e.message}`, 'error');
  }
};

// ─── Helpers ────────────────────────────────────────────────
function esc(s) { return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function timeAgo(d) {
  if (!d) return '—';
  let dt = new Date(d);
  if (isNaN(dt.getTime())) dt = new Date(d + 'Z');
  if (isNaN(dt.getTime())) return '—';
  const s = Math.floor((Date.now() - dt.getTime()) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

/** Convert 'nft manager' → 'NFT Manager', 'kyc analyst' → 'KYC Analyst' */
function toTitleCase(str) {
  const UPPER = new Set(['nft', 'kyc', 'it', 'api', 'sod', 'ca', 'so', 'hr']);
  return str.split(' ').map(w => UPPER.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Color palette for role distribution bars */
function getRoleColor(role) {
  const colors = {
    org_owner: '#8b5cf6', company_admin: '#3b82f6', admin: '#3b82f6',
    security_officer: '#ef4444', compliance_officer: '#f59e0b', risk_officer: '#f97316',
    risk_committee: '#f97316', carbon_officer: '#10b981', blockchain_operator: '#06b6d4',
    auditor: '#6366f1', developer: '#8b5cf6', ops_manager: '#0ea5e9',
    nft_manager: '#a855f7', kyc_analyst: '#14b8a6',
  };
  return colors[role] || 'var(--primary)';
}
