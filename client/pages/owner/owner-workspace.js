/**
 * TrustChecker — Org Owner Workspace (Strategic Governance Authority)
 * ═══════════════════════════════════════════════════════════════════
 * "See everything, touch nothing operational."
 *
 * 8 Modules (Governance-Grade Architecture):
 *   1. Governance Overview — strategic KPIs, privilege risk score, SoD
 *   2. Ownership & Authority — appoint CA/SO, emergency controls
 *   3. Privilege & Access Governance — role tracking, self-elevation log
 *   4. Risk & Integrity Monitoring — anomaly detection, risk signals
 *   5. Compliance & Legal — GDPR, retention, evidence integrity
 *   6. Financial & Plan — billing, usage, invoices
 *   7. Emergency Controls — freeze, reauth, revoke, suspend
 *   8. Governance Activity Log — meta-governance, break-glass log
 */
import { State, render } from '../../core/state.js';
import { API } from '../../core/api.js';
import { showToast } from '../../components/toast.js';
import { icon } from '../../core/icons.js';

// ─── State ──────────────────────────────────────────────────
let _ownerData = {};
let _accessData = {};
let _privilegeData = {};
let _riskData = {};
let _govLogData = {};
let _teamData = null;
let _criticalActions = [];
let _activeTab = 'dashboard';
let _riskLoaded = false;
let _privilegeLoaded = false;
let _riskMonLoaded = false;
let _govLogLoaded = false;
let _teamLoaded = false;
let _riskSubTab = 'signals'; // 'signals' or 'activity'

// ─── Tab Registry ───────────────────────────────────────────
const OWNER_TABS = [
  { id: 'dashboard', label: 'Governance Overview', icon: '📊' },
  { id: 'risk', label: 'Risk & Activity', icon: '⚠️' },
  { id: 'team', label: 'Team & People', icon: '👥' },
  { id: 'privilege', label: 'Privilege & Access', icon: '🛡️' },
  { id: 'compliance', label: 'Compliance & Legal', icon: '📋' },
  { id: 'authority', label: 'Ownership & Authority', icon: '🔑' },
  { id: 'financial', label: 'Financial & Plan', icon: '💰' },
  { id: 'emergency', label: 'Emergency Controls', icon: '🚨' },
];

// ─── Entry Point ────────────────────────────────────────────
export function renderPage() {
  if (!['org_owner', 'super_admin'].includes(State.user?.role)) {
    return '<div class="empty-state"><div class="empty-icon">👑</div><div class="empty-text">Org Owner access required</div></div>';
  }

  setTimeout(() => loadOwnerData(), 50);

  return `
    <div id="owner-content">
      <div class="loading"><div class="spinner"></div></div>
    </div>
  `;
}

window._ownerTab = function (tab) {
  _activeTab = tab;
  window._activeOwnerTab = tab;
  try { const sb = document.querySelector('.sidebar'); if (sb && typeof renderSidebar === 'function') { /* sidebar re-renders via navigate */ } } catch (_) { }
  const el = document.getElementById('owner-content');
  if (el && ['privilege', 'risk', 'financial', 'compliance', 'team'].includes(tab)) {
    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px">
            <div class="spinner"></div>
            <div style="font-size:0.78rem;color:var(--text-muted)">Loading ${OWNER_TABS.find(t => t.id === tab)?.label || tab}…</div>
        </div>`;
  }
  if (tab === 'dashboard') { renderOwnerContent(); loadOwnerData(); }
  else if (tab === 'privilege') loadPrivilegeData();
  else if (tab === 'risk') { _riskMonLoaded = false; _govLogLoaded = false; loadRiskMonitoring(); loadGovernanceLog(); }
  else if (tab === 'team') loadTeamData();
  else renderOwnerContent();
};

window._riskSubTab = function (sub) {
  _riskSubTab = sub;
  renderOwnerContent();
};

// ─── Data Loaders ───────────────────────────────────────────
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

async function loadPrivilegeData() {
  try {
    _privilegeData = await API.get('/tenant/owner/privilege-governance');
    _privilegeLoaded = true;
    renderOwnerContent();
  } catch (e) { _privilegeData = {}; _privilegeLoaded = true; renderOwnerContent(); }
}

async function loadRiskMonitoring() {
  try {
    _riskData = await API.get('/tenant/owner/risk-monitoring');
    _riskMonLoaded = true;
    renderOwnerContent();
  } catch (e) { _riskData = {}; _riskMonLoaded = true; renderOwnerContent(); }
}

async function loadGovernanceLog() {
  try {
    _govLogData = await API.get('/tenant/owner/governance-log');
    _govLogLoaded = true;
    if (_activeTab === 'risk' && _riskMonLoaded) renderOwnerContent();
  } catch (e) { _govLogData = {}; _govLogLoaded = true; if (_activeTab === 'risk') renderOwnerContent(); }
}

async function loadTeamData() {
  try {
    _teamData = await API.get('/tenant/owner/access-oversight');
    _teamLoaded = true;
    renderOwnerContent();
  } catch (e) { _teamData = {}; _teamLoaded = true; renderOwnerContent(); }
}

function renderOwnerContent() {
  const el = document.getElementById('owner-content');
  if (!el) return;

  const renderers = {
    dashboard: renderOverview,
    authority: renderAuthority,
    team: renderTeam,
    privilege: renderPrivilege,
    risk: renderRiskMonitoring,
    compliance: renderCompliance,
    financial: renderFinancial,
    emergency: renderEmergency,
  };
  el.innerHTML = (renderers[_activeTab] || renderOverview)();
}

// ═══════════════════════════════════════════════════════════════
// 1. GOVERNANCE OVERVIEW (Enhanced Strategic Dashboard)
// ═══════════════════════════════════════════════════════════════
function renderOverview() {
  const d = _ownerData;
  if (d.total_users === undefined) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px">
            <div class="spinner"></div>
            <div style="font-size:0.78rem;color:var(--text-muted)">Loading Governance Overview…</div>
        </div>`;
  }

  const kpi = (label, value, color, desc, tooltip) => `
    <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px;flex:1;min-width:140px;position:relative"
         ${tooltip ? `title="${tooltip}"` : ''}>
      <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">${label}</div>
      <div style="font-size:1.8rem;font-weight:800;color:${color}">${value}</div>
      <div style="font-size:0.68rem;color:var(--text-muted);margin-top:4px">${desc}</div>
    </div>`;

  // Privilege Risk Score gauge
  const riskScore = d.privilege_risk_score || 0;
  const riskColor = riskScore <= 20 ? '#10b981' : riskScore <= 50 ? '#f59e0b' : '#ef4444';
  const riskLabel = riskScore <= 20 ? 'Low' : riskScore <= 50 ? 'Moderate' : 'High';

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
        <div style="width:40px;text-align:right;font-size:0.72rem;font-weight:700">${r.count}</div>
      </div>`;
  }).join('');

  // Recent critical (last 5)
  const recentCritical = (d.recent_critical_5 || []).map(a => `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.72rem">
      <span><span style="padding:2px 8px;border-radius:4px;background:${actionColor(a.action)};color:#fff;font-size:0.68rem">${a.action}</span></span>
      <span style="color:var(--text-muted)">${a.actor_email || '—'} · ${timeAgo(a.created_at)}</span>
    </div>
  `).join('') || '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.72rem">No recent critical actions</div>';

  return `
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px">
      ${kpi('Privilege Risk', `${riskScore}`, riskColor, riskLabel, 'Computed: high-risk density + SoD + inactive + self-elevation attempts')}
      ${kpi('Total Users', d.total_users || 0, 'var(--text-primary, #1e293b)', `${d.total_users || 0} organization members`)}
      ${kpi('High-Risk Roles', d.high_risk_role_count || 0, '#ef4444', `${d.high_risk_role_count || 0} privileged accounts`)}
      ${kpi('SoD Violations', d.sod_violation_count || 0, d.sod_violation_count > 0 ? '#ef4444' : '#10b981', d.sod_violation_count > 0 ? 'Conflicts detected' : 'No conflicts')}
      ${kpi('Pending Approvals', d.pending_approvals || 0, '#f59e0b', 'Dual-control queue')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card">
        <div class="card-header">
          <div class="card-title">📊 Role Distribution</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">${roles.length} roles · ${d.total_users || 0} members</div>
        </div>
        <div class="card-body">${roleDist || '<div style="color:var(--text-muted)">No data</div>'}</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">⚡ Recent Critical Actions</div></div>
        <div class="card-body" style="max-height:260px;overflow-y:auto">${recentCritical}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      ${kpi('Carbon Mints (30d)', d.carbon_mints_30d || 0, '#10b981', d.carbon_mints_30d > 0 ? 'Active' : 'No activity')}
      ${kpi('Risk Model', d.risk_model_version || 'N/A', '#8b5cf6', d.risk_model_version !== 'N/A' ? `Version ${d.risk_model_version}` : 'Not deployed')}
      ${kpi('Self-Elevation (30d)', d.self_elevation_attempts_30d || 0, d.self_elevation_attempts_30d > 0 ? '#f59e0b' : '#10b981', 'Blocked attempts')}
    </div>

    <!-- Company Health Summary -->
    <div class="card" style="margin-top:16px;margin-bottom:16px;border-left:4px solid #3b82f6">
      <div class="card-header"><div class="card-title">🏢 Company Health Summary</div></div>
      <div class="card-body" id="company-health-kpi"><div style="color:var(--text-muted);font-size:0.72rem">Loading health data...</div></div>
    </div>
    ${loadCompanyHealth()}

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

function loadCompanyHealth() {
  setTimeout(async () => {
    try {
      const data = await API.get('/tenant/governance/kpi-overview').catch(() => null);
      const el = document.getElementById('company-health-kpi');
      if (!el || !data) return;
      const crce = data.crce || 0;
      const t = data.tiers || {};
      const cc = crce >= 80 ? '#10b981' : crce >= 60 ? '#f59e0b' : '#ef4444';
      const cl = crce >= 80 ? 'Strong' : crce >= 60 ? 'Moderate' : crce >= 40 ? 'Weak' : 'Critical';
      el.innerHTML = `
        <div style="display:grid;grid-template-columns:auto repeat(4,1fr);gap:12px;align-items:center">
          <div style="text-align:center;padding:12px 20px;border-right:2px solid var(--border)">
            <div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase">CRCE Score</div>
            <div style="font-size:2rem;font-weight:900;color:${cc}">${crce}</div>
            <div style="font-size:0.65rem;font-weight:700;color:${cc}">${cl}</div>
          </div>
          ${healthMini('Risk Exposure', t.risk_exposure?.score || 0, '30%')}
          ${healthMini('SLA Control', t.sla_control?.score || 0, '30%')}
          ${healthMini('Throughput', t.throughput?.score || 0, '25%')}
          ${healthMini('Quality', t.quality?.score || 0, '15%')}
        </div>
      `;
    } catch (_) { }
  }, 100);
  return '';
}

function healthMini(label, score, weight) {
  const c = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  return `<div style="text-align:center">
    <div style="font-size:0.6rem;color:var(--text-muted)">${label}</div>
    <div style="font-size:1.2rem;font-weight:800;color:${c}">${score}</div>
    <div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden;margin-top:4px">
      <div style="width:${score}%;height:100%;background:${c};border-radius:2px"></div>
    </div>
    <div style="font-size:0.55rem;color:var(--text-muted);margin-top:2px">${weight}</div>
  </div>`;
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
          <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px">
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

          <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px">
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
// 2.5. TEAM & PEOPLE MANAGEMENT
// ═══════════════════════════════════════════════════════════════
function renderTeam() {
  if (!_teamLoaded) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px">
            <div class="spinner"></div>
            <div style="font-size:0.78rem;color:var(--text-muted)">Loading Team & People…</div>
        </div>`;
  }
  const d = _teamData || {};
  const users = d.role_matrix || [];
  const now = Date.now();
  const activeUsers = users.filter(u => u.last_login && (now - new Date(u.last_login).getTime()) < 7 * 86400000).length;
  const inactiveUsers = users.filter(u => !u.last_login || (now - new Date(u.last_login).getTime()) > 30 * 86400000).length;
  const neverLogged = users.filter(u => !u.last_login).length;

  const statusOf = u => {
    if (!u.last_login) return { label: 'Never Logged In', color: '#9ca3af', bg: '#9ca3af15' };
    const diff = now - new Date(u.last_login).getTime();
    if (diff < 86400000) return { label: 'Active Today', color: '#10b981', bg: '#10b98115' };
    if (diff < 7 * 86400000) return { label: 'Active This Week', color: '#22c55e', bg: '#22c55e15' };
    if (diff < 30 * 86400000) return { label: 'Active This Month', color: '#f59e0b', bg: '#f59e0b15' };
    return { label: 'Inactive (30d+)', color: '#ef4444', bg: '#ef444415' };
  };

  const userRows = users.map(u => {
    const s = statusOf(u);
    const roleName = toTitleCase((u.role || 'unknown').replace(/_/g, ' '));
    const isHighRisk = ['org_owner', 'company_admin', 'admin', 'security_officer', 'compliance_officer', 'risk_officer'].includes(u.role);
    return `
    <tr>
      <td style="font-size:0.72rem"><strong>${esc(u.username || u.email?.split('@')[0] || '—')}</strong></td>
      <td style="font-size:0.68rem;color:var(--text-muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.email)}</td>
      <td><span class="role-badge role-${u.role}" style="font-size:0.65rem">${roleName}</span>${isHighRisk ? ' <span style="color:#ef4444;font-size:0.6rem">⚠</span>' : ''}</td>
      <td><span style="font-size:0.65rem;padding:2px 8px;border-radius:10px;background:${s.bg};color:${s.color};font-weight:600">${s.label}</span></td>
      <td style="font-size:0.68rem;color:var(--text-muted)">${u.last_login ? timeAgo(u.last_login) : '—'}</td>
      <td style="font-size:0.68rem;color:var(--text-muted)">${u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
    </tr>`;
  }).join('');

  return `
    <div style="display:flex;gap:12px;margin-bottom:16px">
      <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px;flex:1">
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Total Members</div>
        <div style="font-size:1.8rem;font-weight:800">${users.length}</div>
      </div>
      <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px;flex:1">
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Active (7d)</div>
        <div style="font-size:1.8rem;font-weight:800;color:#10b981">${activeUsers}</div>
      </div>
      <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px;flex:1">
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Inactive (30d+)</div>
        <div style="font-size:1.8rem;font-weight:800;color:${inactiveUsers > 0 ? '#ef4444' : '#10b981'}">${inactiveUsers}</div>
      </div>
      <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px;flex:1">
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Never Logged In</div>
        <div style="font-size:1.8rem;font-weight:800;color:${neverLogged > 0 ? '#f59e0b' : '#10b981'}">${neverLogged}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">👥 Team Members</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">${users.length} members · Read-only view</div>
      </div>
      <div class="card-body" style="max-height:500px;overflow-y:auto">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Active</th><th>Joined</th></tr></thead>
          <tbody>${userRows || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No team members</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// 3. PRIVILEGE & ACCESS GOVERNANCE (NEW)
// ═══════════════════════════════════════════════════════════════
function renderPrivilege() {
  if (!_privilegeLoaded) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px">
            <div class="spinner"></div>
            <div style="font-size:0.78rem;color:var(--text-muted)">Loading Privilege & Access Governance…</div>
        </div>`;
  }
  const d = _privilegeData;

  // High-risk role mapping table
  const highRiskRows = (d.high_risk_users || []).map(u => `
    <tr>
      <td style="font-weight:600;font-size:0.72rem">${esc(u.username || u.email)}</td>
      <td><span class="role-badge role-${u.role}">${toTitleCase((u.role || '').replace(/_/g, ' '))}</span></td>
      <td style="font-size:0.72rem;text-align:center;font-weight:700">${u.role_count || 0}</td>
      <td style="font-size:0.68rem;color:var(--text-muted)">${u.last_login ? timeAgo(u.last_login) : '⚠️ Never'}</td>
    </tr>`).join('');

  // Recent role assignments
  const roleAssignments = (d.recent_role_assignments || []).slice(0, 15).map(a => {
    let det = {}; try { det = typeof a.details === 'string' ? JSON.parse(a.details) : a.details || {}; } catch (_) { }
    return `
    <tr>
      <td style="font-size:0.68rem;color:var(--text-muted)">${timeAgo(a.created_at)}</td>
      <td><span style="font-size:0.68rem;padding:2px 8px;border-radius:4px;color:#fff;background:${actionColor(a.action)}">${a.action}</span></td>
      <td style="font-size:0.72rem">${esc(a.actor_email || '—')}</td>
      <td style="font-size:0.72rem">${esc(a.target_email || det.email || '—')}</td>
      <td style="font-size:0.68rem;color:var(--text-muted)">${det.role || det.role_name || '—'}</td>
    </tr>`;
  }).join('');

  // Self-elevation log
  const selfLog = (d.self_elevation_log || []).map(e => {
    let det = {}; try { det = typeof e.details === 'string' ? JSON.parse(e.details) : e.details || {}; } catch (_) { }
    return `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.72rem">
      <span>🚫 <strong>${esc(e.actor_email || '—')}</strong> — ${det.reason || 'Self-elevation blocked'}</span>
      <span style="color:var(--text-muted)">${timeAgo(e.created_at)}</span>
    </div>`;
  }).join('') || '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.72rem">✅ No self-elevation attempts</div>';

  // Role expirations
  const expirations = (d.role_expirations || []).map(r => `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.72rem">
      <span>${esc(r.email)} — <strong>${toTitleCase((r.role_name || '').replace(/_/g, ' '))}</strong></span>
      <span style="color:${new Date(r.expires_at) < new Date(Date.now() + 7 * 86400000) ? '#ef4444' : '#f59e0b'}">${new Date(r.expires_at).toLocaleDateString()}</span>
    </div>`).join('') || '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.72rem">No expiring roles</div>';

  return `
    <div class="card" style="margin-bottom:16px;border-left:4px solid #8b5cf6">
      <div class="card-header">
        <div class="card-title">🛡️ High-Risk Role Mapping</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">Read-only · ${(d.high_risk_users || []).length} privileged accounts</div>
      </div>
      <div class="card-body" style="max-height:280px;overflow-y:auto">
        <table class="data-table"><thead><tr><th>User</th><th>Role</th><th>Roles</th><th>Last Login</th></tr></thead>
        <tbody>${highRiskRows || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No high-risk accounts</td></tr>'}</tbody></table>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card">
        <div class="card-header"><div class="card-title">🚫 Self-Elevation Blocks</div></div>
        <div class="card-body" style="max-height:220px;overflow-y:auto">${selfLog}</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">⏰ Role Expirations</div></div>
        <div class="card-body" style="max-height:220px;overflow-y:auto">${expirations}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">📋 Recent Role Assignments</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">Immutable audit trail</div>
      </div>
      <div class="card-body" style="max-height:300px;overflow-y:auto">
        <table class="data-table"><thead><tr><th>When</th><th>Action</th><th>By</th><th>Target</th><th>Role</th></tr></thead>
        <tbody>${roleAssignments || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No role assignments</td></tr>'}</tbody></table>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// 4. RISK & ACTIVITY (MERGED: Risk Monitoring + Governance Log)
// ═══════════════════════════════════════════════════════════════
function renderRiskMonitoring() {
  if (!_riskMonLoaded) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px">
            <div class="spinner"></div>
            <div style="font-size:0.78rem;color:var(--text-muted)">Loading Risk & Activity…</div>
        </div>`;
  }
  const d = _riskData;
  const gd = _govLogData || {};

  // Sub-tab toggle
  const tabs = `
    <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--border);border-radius:8px;padding:3px">
      <button onclick="window._riskSubTab('signals')" style="flex:1;padding:8px;border:none;border-radius:6px;font-size:0.72rem;font-weight:600;cursor:pointer;background:${_riskSubTab === 'signals' ? 'var(--bg-card,#fff)' : 'transparent'};color:${_riskSubTab === 'signals' ? 'var(--text-primary)' : 'var(--text-muted)'}">
        ⚠️ Risk Signals (${d.total_signals || 0})
      </button>
      <button onclick="window._riskSubTab('activity')" style="flex:1;padding:8px;border:none;border-radius:6px;font-size:0.72rem;font-weight:600;cursor:pointer;background:${_riskSubTab === 'activity' ? 'var(--bg-card,#fff)' : 'transparent'};color:${_riskSubTab === 'activity' ? 'var(--text-primary)' : 'var(--text-muted)'}">
        📜 Activity Log (${gd.total_entries || 0})
      </button>
    </div>`;

  // KPI row
  const kpis = `
    <div style="display:flex;gap:12px;margin-bottom:16px">
      <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px;flex:1">
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Total Risk Signals</div>
        <div style="font-size:1.8rem;font-weight:800;color:${(d.total_signals || 0) > 0 ? '#ef4444' : '#10b981'}">${d.total_signals || 0}</div>
      </div>
      <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px;flex:1">
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Anomalies</div>
        <div style="font-size:1.8rem;font-weight:800;color:${(d.anomalies || []).length > 0 ? '#f59e0b' : '#10b981'}">${(d.anomalies || []).length}</div>
      </div>
      <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px;flex:1">
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">New IP Logins</div>
        <div style="font-size:1.8rem;font-weight:800">${(d.new_ip_logins || []).length}</div>
      </div>
      <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px;flex:1">
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Gov Actions</div>
        <div style="font-size:1.8rem;font-weight:800;color:#3b82f6">${gd.total_entries || 0}</div>
      </div>
    </div>`;

  if (_riskSubTab === 'activity') {
    return kpis + tabs + renderActivityContent(gd);
  }

  // Risk signals content
  const signalRows = (d.risk_signals || []).map(s => {
    let det = {}; try { det = typeof s.details === 'string' ? JSON.parse(s.details) : s.details || {}; } catch (_) { }
    return `
    <tr>
      <td style="font-size:0.72rem;color:var(--text-muted)">${timeAgo(s.created_at)}</td>
      <td><span style="font-size:0.68rem;padding:2px 8px;border-radius:4px;color:#fff;background:${actionColor(s.action)}">${s.action}</span></td>
      <td style="font-size:0.72rem">${esc(s.actor_email || '—')}</td>
      <td style="font-size:0.68rem;color:var(--text-muted);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${det.reason || det.message || det.ip || '—'}</td>
    </tr>`;
  }).join('');

  const anomalyRows = (d.anomalies || []).map(a => {
    let det = {}; try { det = typeof a.details === 'string' ? JSON.parse(a.details) : a.details || {}; } catch (_) { }
    return `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.72rem">
      <span><span style="background:#ef444420;color:#ef4444;padding:2px 8px;border-radius:4px;font-size:0.68rem">${a.action}</span> ${esc(a.actor_email || '—')}</span>
      <span style="color:var(--text-muted)">${timeAgo(a.created_at)}</span>
    </div>`;
  }).join('') || '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.72rem">✅ No anomalies detected</div>';

  const ipRows = (d.new_ip_logins || []).map(ip => {
    let det = {}; try { det = typeof ip.details === 'string' ? JSON.parse(ip.details) : ip.details || {}; } catch (_) { }
    return `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.72rem">
      <span>🌐 <strong>${esc(ip.actor_email || '—')}</strong> — ${det.ip || det.new_ip || 'Unknown IP'}</span>
      <span style="color:var(--text-muted)">${timeAgo(ip.created_at)}</span>
    </div>`;
  }).join('') || '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.72rem">No new IP logins</div>';

  return kpis + tabs + `
    <div class="card" style="margin-bottom:16px;border-left:4px solid #ef4444">
      <div class="card-header">
        <div class="card-title">⚠️ Risk Signal Feed</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">Immutable · Read-only · ${(d.risk_signals || []).length} signals</div>
      </div>
      <div class="card-body" style="max-height:350px;overflow-y:auto">
        <table class="data-table"><thead><tr><th>When</th><th>Signal</th><th>Actor</th><th>Details</th></tr></thead>
        <tbody>${signalRows || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No risk signals</td></tr>'}</tbody></table>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header"><div class="card-title">📡 Anomaly Detection</div></div>
        <div class="card-body" style="max-height:250px;overflow-y:auto">${anomalyRows}</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">🌐 New IP Logins</div></div>
        <div class="card-body" style="max-height:250px;overflow-y:auto">${ipRows}</div>
      </div>
    </div>
  `;
}

// Activity Log content (sub-tab of Risk & Activity)
function renderActivityContent(d) {
  const govRows = (d.governance_actions || []).map(a => {
    let det = {}; try { det = typeof a.details === 'string' ? JSON.parse(a.details) : a.details || {}; } catch (_) { }
    return `
    <tr>
      <td style="font-size:0.72rem;color:var(--text-muted)">${timeAgo(a.created_at)}</td>
      <td><span style="font-size:0.68rem;padding:2px 8px;border-radius:4px;color:#fff;background:${actionColor(a.action)}">${a.action}</span></td>
      <td style="font-size:0.72rem">${esc(a.actor_email || '—')}</td>
      <td style="font-size:0.68rem;color:var(--text-muted);max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${det.email || det.role || det.justification || '—'}</td>
      <td style="font-size:0.68rem;color:${det.severity === 'critical' ? '#ef4444' : det.severity === 'high' ? '#f59e0b' : 'var(--text-muted)'}">${det.severity || 'normal'}</td>
    </tr>`;
  }).join('');

  const emergencyRows = (d.emergency_log || []).map(e => {
    let det = {}; try { det = typeof e.details === 'string' ? JSON.parse(e.details) : e.details || {}; } catch (_) { }
    return `
    <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.72rem">
      <div>
        <span style="background:#ef4444;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:700">${e.action}</span>
        <strong style="margin-left:8px">${esc(e.actor_email || '—')}</strong>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-top:4px">${det.justification || '—'}</div>
      </div>
      <span style="color:var(--text-muted);white-space:nowrap;margin-left:12px">${timeAgo(e.created_at)}</span>
    </div>`;
  }).join('') || '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.72rem">✅ No emergency actions recorded</div>';

  const appointRows = (d.appointment_history || []).map(a => {
    let det = {}; try { det = typeof a.details === 'string' ? JSON.parse(a.details) : a.details || {}; } catch (_) { }
    return `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.72rem">
      <span>👑 <strong>${esc(a.actor_email || '—')}</strong> appointed <strong>${esc(a.target_email || det.email || '—')}</strong> as ${toTitleCase((det.role || '—').replace(/_/g, ' '))}</span>
      <span style="color:var(--text-muted)">${timeAgo(a.created_at)}</span>
    </div>`;
  }).join('') || '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.72rem">No appointment history</div>';

  return `
    <div class="card" style="margin-bottom:16px;border-left:4px solid #06b6d4">
      <div class="card-header">
        <div class="card-title">📜 Governance Activity Timeline</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">Immutable · ${d.total_entries || 0} entries · Read-only</div>
      </div>
      <div class="card-body" style="max-height:400px;overflow-y:auto">
        <table class="data-table"><thead><tr><th>When</th><th>Action</th><th>Actor</th><th>Details</th><th>Severity</th></tr></thead>
        <tbody>${govRows || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No governance actions recorded</td></tr>'}</tbody></table>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card" style="border-color:#ef4444">
        <div class="card-header"><div class="card-title" style="color:#ef4444">🚨 Emergency / Break-Glass Log</div></div>
        <div class="card-body" style="max-height:300px;overflow-y:auto">${emergencyRows}</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">👑 Appointment History</div></div>
        <div class="card-body" style="max-height:300px;overflow-y:auto">${appointRows}</div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// 5. COMPLIANCE & LEGAL VIEW
// ═══════════════════════════════════════════════════════════════
function renderCompliance() {
  setTimeout(async () => {
    try {
      const data = await API.get('/tenant/owner/compliance').catch(() => null);
      const el = document.getElementById('owner-compliance-content');
      if (!el) return;
      if (!data) throw new Error('No data');

      const score = data.compliance_score || 0;
      const scoreColor = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
      const consent = data.consent || {};
      const retention = data.retention_policies || [];
      const records = data.compliance_records || [];
      const frameworks = data.frameworks || [];
      const gdprAct = data.gdpr_activity || [];
      const summary = data.summary || {};

      // Framework rows
      const fwRows = frameworks.map(fw => {
        const pct = fw.total > 0 ? Math.round((fw.compliant / fw.total) * 100) : 0;
        const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
        return `<tr>
          <td style="font-size:0.72rem;font-weight:600">${esc(fw.framework)}</td>
          <td style="font-size:0.72rem;text-align:center">${fw.total}</td>
          <td style="font-size:0.72rem;text-align:center;color:#10b981;font-weight:700">${fw.compliant}</td>
          <td style="font-size:0.72rem;text-align:center;color:#f59e0b">${fw.partial}</td>
          <td style="font-size:0.72rem;text-align:center;color:#ef4444">${fw.non_compliant}</td>
          <td><div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;width:80px">
            <div style="width:${pct}%;height:100%;background:${color};border-radius:3px"></div>
          </div></td>
        </tr>`;
      }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:16px;font-size:0.72rem">No compliance records</td></tr>';

      // Retention rows
      const retRows = retention.map(p => {
        const actionColor = p.action === 'archive' ? '#3b82f6' : p.action === 'delete' ? '#ef4444' : '#f59e0b';
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.72rem">
          <span style="font-weight:600">${esc(p.name || p.table_name)}</span>
          <div style="display:flex;gap:12px;align-items:center">
            <span style="font-size:0.68rem;padding:2px 8px;border-radius:10px;background:${actionColor}22;color:${actionColor};font-weight:600">${p.action}</span>
            <span style="color:var(--text-muted)">${p.retention_days} days</span>
            <span style="font-size:0.68rem;padding:2px 8px;border-radius:10px;background:${p.is_active ? '#10b98122' : '#ef444422'};color:${p.is_active ? '#10b981' : '#ef4444'};font-weight:600">${p.is_active ? 'active' : 'inactive'}</span>
            ${p.is_default ? '<span style="font-size:0.62rem;color:var(--text-muted)">(default)</span>' : ''}
          </div>
        </div>`;
      }).join('');

      // GDPR activity rows
      const gdprRows = gdprAct.map(a => `<tr>
        <td style="font-size:0.72rem;color:var(--text-muted)">${timeAgo(a.created_at)}</td>
        <td><span style="font-size:0.68rem;padding:2px 8px;border-radius:4px;color:#fff;background:${actionColor(a.action)}">${a.action}</span></td>
        <td style="font-size:0.72rem">${esc(a.actor_email || '—')}</td>
      </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:16px;font-size:0.72rem">No GDPR activity recorded</td></tr>';

      el.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:16px">
          <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">Compliance Score</div>
            <div style="font-size:1.5rem;font-weight:800;color:${scoreColor};margin-top:6px">${score}%</div>
          </div>
          <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">Consent Rate</div>
            <div style="font-size:1.5rem;font-weight:800;margin-top:6px">${consent.rate || 0}%</div>
            <div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px">${consent.consented || 0} / ${consent.total_users || 0} users</div>
          </div>
          <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">Retention Policies</div>
            <div style="font-size:1.5rem;font-weight:800;margin-top:6px">${retention.length}</div>
          </div>
          <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">Compliance Records</div>
            <div style="font-size:1.5rem;font-weight:800;margin-top:6px">${summary.total_records || 0}</div>
            <div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px">✅ ${summary.compliant || 0} · ⚠️ ${summary.partial || 0} · ❌ ${summary.non_compliant || 0}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div class="card">
            <div class="card-header"><div class="card-title">📋 Framework Compliance</div></div>
            <div class="card-body">
              <table class="data-table">
                <thead><tr><th>Framework</th><th style="text-align:center">Total</th><th style="text-align:center">✅</th><th style="text-align:center">⚠️</th><th style="text-align:center">❌</th><th>Progress</th></tr></thead>
                <tbody>${fwRows}</tbody>
              </table>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">🗂️ Data Retention Policies</div></div>
            <div class="card-body" style="max-height:300px;overflow-y:auto">${retRows || '<div style="text-align:center;color:var(--text-muted);padding:16px;font-size:0.72rem">No policies</div>'}</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">🇪🇺 GDPR Activity Log</div></div>
          <div class="card-body" style="max-height:250px;overflow-y:auto">
            <table class="data-table">
              <thead><tr><th>When</th><th>Action</th><th>User</th></tr></thead>
              <tbody>${gdprRows}</tbody>
            </table>
          </div>
        </div>
      `;
    } catch (e) {
      const el = document.getElementById('owner-compliance-content');
      if (el) el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;padding:40px 20px;gap:12px">
        <div style="font-size:2rem">📋</div>
        <div style="font-size:0.82rem;font-weight:600">Compliance data unavailable</div>
        <div style="font-size:0.72rem;color:var(--text-muted)">Compliance services are temporarily unreachable.</div>
      </div>`;
    }
  }, 50);

  return `<div id="owner-compliance-content"><div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px">
    <div class="spinner"></div>
    <div style="font-size:0.78rem;color:var(--text-muted)">Loading Compliance & Legal…</div>
  </div></div>`;
}

// ═══════════════════════════════════════════════════════════════
// 6. FINANCIAL & PLAN CONTROL
// ═══════════════════════════════════════════════════════════════
function renderFinancial() {
  setTimeout(async () => {
    try {
      const data = await API.get('/tenant/owner/financial').catch(() => null);
      const el = document.getElementById('owner-billing-content');
      if (!el) return;
      if (!data) throw new Error('No data');

      const p = data.plan || {};
      const planName = toTitleCase((p.plan_name || 'N/A').replace(/_/g, ' '));
      const billingCycle = p.billing_cycle || 'monthly';
      const price = p.price_monthly || 0;
      const sla = p.sla_level ? toTitleCase(p.sla_level) : '—';
      const period = data.period || new Date().toISOString().substring(0, 7);
      const allInvoices = data.invoices || [];
      const totalPaid = data.total_paid || allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);

      // Usage bars
      const usageEntries = Object.entries(data.usage || {});
      const usageBars = usageEntries.map(([k, v]) => {
        const isUnlimited = v.limit === '∞' || v.limit === -1;
        const pct = isUnlimited ? 5 : (v.limit > 0 ? Math.min(100, Math.round((v.used / v.limit) * 100)) : 0);
        const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
        return `
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:0.72rem;margin-bottom:4px">
              <span style="font-weight:600;text-transform:capitalize">${k.replace(/_/g, ' ')}</span>
              <span>${v.used || 0} / ${isUnlimited ? '∞' : v.limit || 0}${isUnlimited ? ' (Unlimited)' : ''}</span>
            </div>
            <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px;transition:width 0.3s"></div>
            </div>
          </div>`;
      }).join('') || '<div style="text-align:center;color:var(--text-muted);font-size:0.72rem;padding:12px">No usage data</div>';

      // Invoice rows
      const invoiceRows = allInvoices.map(inv => {
        const statusColor = inv.status === 'paid' ? '#10b981' : inv.status === 'pending' ? '#f59e0b' : '#ef4444';
        const pStart = inv.period_start ? new Date(inv.period_start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';
        const pEnd = inv.period_end ? new Date(inv.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
        const created = inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
        return `
          <tr>
            <td style="font-size:0.72rem;color:var(--text-muted)">${created}</td>
            <td style="font-size:0.72rem;font-weight:600">${toTitleCase((inv.plan_name || '').replace(/_/g, ' '))}</td>
            <td style="font-size:0.72rem;font-weight:700">$${(inv.amount || 0).toLocaleString()}</td>
            <td style="font-size:0.72rem">${inv.currency || 'USD'}</td>
            <td style="font-size:0.72rem">${pStart} — ${pEnd}</td>
            <td><span style="font-size:0.68rem;padding:2px 10px;border-radius:12px;color:#fff;background:${statusColor};font-weight:600">${(inv.status || 'unknown').toUpperCase()}</span></td>
          </tr>`;
      }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;font-size:0.72rem">No invoices</td></tr>';

      el.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:16px">
          <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">Current Plan</div>
            <div style="font-size:1.4rem;font-weight:800;color:#8b5cf6;margin-top:6px">${planName}</div>
            <div style="font-size:0.68rem;color:var(--text-muted);margin-top:4px">${billingCycle} · SLA: ${sla}</div>
          </div>
          <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">Monthly Cost</div>
            <div style="font-size:1.4rem;font-weight:800;color:var(--text-primary,#1e293b);margin-top:6px">$${price.toLocaleString()}</div>
            <div style="font-size:0.68rem;color:var(--text-muted);margin-top:4px">per month</div>
          </div>
          <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">Current Period</div>
            <div style="font-size:1.1rem;font-weight:700;margin-top:6px">${period}</div>
            <div style="font-size:0.68rem;color:var(--text-muted);margin-top:4px">billing cycle</div>
          </div>
          <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">Total Paid</div>
            <div style="font-size:1.4rem;font-weight:800;color:#10b981;margin-top:6px">$${totalPaid.toLocaleString()}</div>
            <div style="font-size:0.68rem;color:var(--text-muted);margin-top:4px">${allInvoices.length} invoices</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div class="card">
            <div class="card-header"><div class="card-title">📊 Usage This Period</div></div>
            <div class="card-body">${usageBars}</div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">📋 Plan Features</div></div>
            <div class="card-body">
              <div style="display:flex;flex-direction:column;gap:6px;font-size:0.72rem">
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)"><span>Scan Limit</span><span style="font-weight:700">${p.scan_limit ? p.scan_limit.toLocaleString() : '∞'}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)"><span>API Limit</span><span style="font-weight:700">${p.api_limit ? p.api_limit.toLocaleString() : '∞'}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)"><span>Storage</span><span style="font-weight:700">${p.storage_mb ? (p.storage_mb / 1000).toFixed(0) + ' GB' : '∞'}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)"><span>Billing Cycle</span><span style="font-weight:700">${toTitleCase(billingCycle)}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0"><span>SLA Level</span><span style="font-weight:700;color:#8b5cf6">${sla}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">🧾 Invoice History</div>
            <div style="font-size:0.68rem;color:var(--text-muted)">${allInvoices.length} invoices · Total: $${totalPaid.toLocaleString()}</div>
          </div>
          <div class="card-body" style="max-height:350px;overflow-y:auto">
            <table class="data-table">
              <thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Currency</th><th>Period</th><th>Status</th></tr></thead>
              <tbody>${invoiceRows}</tbody>
            </table>
          </div>
        </div>
      `;
    } catch (e) {
      const el = document.getElementById('owner-billing-content');
      if (el) el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;padding:40px 20px;gap:12px">
        <div style="font-size:2rem">💰</div>
        <div style="font-size:0.82rem;font-weight:600">Financial data unavailable</div>
        <div style="font-size:0.72rem;color:var(--text-muted)">Billing services are temporarily unreachable.</div>
      </div>`;
    }
  }, 50);

  return `<div id="owner-billing-content"><div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px">
    <div class="spinner"></div>
    <div style="font-size:0.78rem;color:var(--text-muted)">Loading Financial & Plan…</div>
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
        <div style="font-size:0.68rem;color:var(--text-muted)">All actions are logged with justification · Immutable audit trail</div>
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
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;background:var(--bg-card,#fff)">
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
  return colors[role] || 'var(--primary, #3b82f6)';
}

/** Action color by severity */
function actionColor(action) {
  if (['TENANT_FREEZE', 'FORCE_REAUTH', 'REVOKE_ALL_SESSIONS', 'ROLE_SUSPENDED', 'SESSION_HIJACK_DETECTED'].includes(action)) return '#ef4444';
  if (['SELF_ELEVATION_BLOCKED', 'PERMISSION_CEILING_BLOCKED', 'HIGH_RISK_ROLE_REJECTED', 'LOGIN_FAILED'].includes(action)) return '#f59e0b';
  if (['HIGH_RISK_ROLE_PENDING', 'NEW_IP_LOGIN', 'ROLE_EXPIRED', 'SUSPICIOUS_ACCESS'].includes(action)) return '#f97316';
  if (['CA_APPOINTED', 'ROLE_APPOINTED', 'HIGH_RISK_ROLE_APPROVED', 'ROLES_ASSIGNED'].includes(action)) return '#3b82f6';
  if (['CARBON_MINT', 'RISK_MODEL_DEPLOY', 'ORG_CREATED'].includes(action)) return '#10b981';
  return '#6b7280';
}
