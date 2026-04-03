/**
 * Super Admin – Org Detail (Premium Design + User CRUD)
 * ════════════════════════════════════════
 * Live data from /api/platform/orgs/:id
 * Two-tier user model: Platform ≠ Business
 */
import { API } from '../../core/api.js';
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

let org = null;
let orgUsers = [];
let orgRoles = [];
let loading = false;
let currentOrgId = null;
let activeTab = 'overview';
let showAddUser = false;

const FEATURE_LIST = [
  // Core Platform
  { id: 'qr', label: 'QR Traceability', icon: '📱', desc: 'Scan & Trace engine', group: 'core' },
  { id: 'products', label: 'Product Catalog', icon: '📦', desc: 'Product information management', group: 'core' },
  { id: 'scm_tracking', label: 'Supply Chain Tracking', icon: '🚚', desc: 'End-to-end logistics tracking', group: 'core' },
  { id: 'inventory', label: 'Inventory Management', icon: '🏭', desc: 'Warehouse & stock control', group: 'core' },
  { id: 'support', label: 'Premium Support', icon: '🎧', desc: 'Enterprise support SLAs', group: 'core' },
  { id: 'partners', label: 'Partner Portal', icon: '🤝', desc: 'B2B collaboration platform', group: 'core' },
  
  // Intelligence & Compliance
  { id: 'carbon', label: 'Carbon Tracking', icon: '🌱', desc: 'Emission monitoring & credits', group: 'intel' },
  { id: 'risk_radar', label: 'Risk Radar', icon: '🛡', desc: 'Supplier risk assessment scoring', group: 'intel' },
  { id: 'ai_forecast', label: 'AI Forecaster', icon: '🤖', desc: 'Predictive analytics & anomaly', group: 'intel' },
  { id: 'digital_twin', label: 'Digital Twin', icon: '🪞', desc: 'Digital product replicas', group: 'intel' },
  { id: 'kyc', label: 'KYC / AML', icon: '🔍', desc: 'Identity & sanctions screening', group: 'intel' },
  
  // Enterprise Add-ons (Premium Upsells)
  { id: 'overclaim', label: 'Overclaim Detection', icon: '⚠️', desc: 'Greenwashing anomaly alerts', group: 'premium' },
  { id: 'lineage', label: 'Lineage Replay', icon: '⏪', desc: 'What-if simulations & impact replay', group: 'premium' },
  { id: 'governance', label: 'Advanced Governance', icon: '🏛', desc: 'Multi-entity SoD & 6-eyes approval', group: 'premium' },
  { id: 'registry_export', label: 'Registry Export API', icon: '📤', desc: 'GRI/IFRS S2 & Registry syncing', group: 'premium' },
  { id: 'erp_integration', label: 'ERP Integration', icon: '🔌', desc: 'SAP/Oracle automated sync', group: 'premium' },
  { id: 'exec_dashboard', label: 'Exec Risk Dashboard', icon: '📈', desc: 'Board-level reporting & metrics', group: 'premium' },
  { id: 'ivu_cert', label: 'IVU Premium Audit', icon: '🏅', desc: '3rd-party validation workflows', group: 'premium' },

  // Distributed Ledger
  { id: 'blockchain', label: 'Blockchain Anchoring', icon: '⛓', desc: 'Immutable ledger proof', group: 'ledger' },
  { id: 'nft', label: 'NFT Certificates', icon: '🎫', desc: 'Digital asset minting', group: 'ledger' },
];

const PLAN_DEFAULTS = {
  core: ['qr', 'products'],
  pro: ['qr', 'products', 'scm_tracking', 'support', 'partners', 'carbon', 'inventory'],
  enterprise: ['qr', 'products', 'scm_tracking', 'support', 'partners', 'carbon', 'inventory', 'risk_radar', 'ai_forecast', 'digital_twin', 'blockchain', 'kyc', 'overclaim', 'exec_dashboard'],
};

// ─── Company Role Registry (L1–L4) ──────────────────────────────────────────
const COMPANY_ROLES = [
  // L3 — Governance
  { id: 'company_admin', label: 'Company Admin', tier: 'L3', desc: 'IAM, user/role management, SoD waiver', color: '#f59e0b' },
  { id: 'executive', label: 'CEO / Executive', tier: 'L3', desc: 'Dashboard, reports, risk overview, freeze', color: '#f97316' },
  { id: 'carbon_officer', label: 'Carbon Officer', tier: 'L3', desc: 'Emission data, request carbon mint', color: '#10b981', requires: 'carbon' },
  // L4 — Decision Control
  { id: 'compliance_officer', label: 'Compliance Officer', tier: 'L4', desc: 'Freeze, regulatory export, approve mint (dual)', color: '#8b5cf6' },
  { id: 'risk_committee', label: 'Risk Committee', tier: 'L4', desc: 'Risk model, weight proposal, lineage replay', color: '#ec4899', requires: 'fraud_detection' },
  { id: 'ivu_validator', label: 'IVU Validator', tier: 'L4', desc: 'Model validation, bias audit, certification', color: '#06b6d4', requires: 'ai_analytics' },
  // L2 — Operational
  { id: 'ops_manager', label: 'Operations Manager', tier: 'L2', desc: 'Case assign, close, monitor', color: '#3b82f6' },
  { id: 'risk_officer', label: 'Risk Officer', tier: 'L2', desc: 'Investigate fraud, resolve anomaly', color: '#ef4444', requires: 'fraud_detection' },
  { id: 'scm_analyst', label: 'SCM Analyst', tier: 'L2', desc: 'Partner scoring, route risk, supply chain', color: '#14b8a6', requires: 'scm' },
  { id: 'kyc_analyst', label: 'KYC / AML Analyst', tier: 'L2', desc: 'Identity verification, sanctions screening', color: '#d946ef', requires: 'kyc' },
  // L1 — Technical
  { id: 'developer', label: 'Developer', tier: 'L1', desc: 'API integration, technical config', color: '#6366f1' },
  { id: 'blockchain_operator', label: 'Blockchain Operator', tier: 'L1', desc: 'Anchor, smart contract ops', color: '#a855f7', requires: 'blockchain' },
  { id: 'nft_manager', label: 'NFT Manager', tier: 'L1', desc: 'Certificate minting, NFT lifecycle', color: '#e879f9', requires: 'nft' },
  { id: 'auditor', label: 'Auditor', tier: 'L1', desc: 'Read-only audit access', color: '#94a3b8' },
  { id: 'operator', label: 'Operator', tier: 'L1', desc: 'Data entry, product management', color: '#64748b' },
  { id: 'viewer', label: 'Viewer', tier: 'L1', desc: 'Read-only view', color: '#cbd5e1' },
];

const ROLE_MAP = Object.fromEntries(COMPANY_ROLES.map(r => [r.id, r]));
const PLAN_GRADIENTS = {
  pro: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
  enterprise: 'linear-gradient(135deg,#f97316,#ea580c)', core: 'linear-gradient(135deg,#0ea5e9,#0284c7)',
};
const PLAN_COLORS = { core: '#0ea5e9', pro: '#8b5cf6', enterprise: '#f97316' };
const PLAN_LABELS = { core: 'Core', pro: 'Professional', enterprise: 'Enterprise' };
const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

async function loadOrg(id) {
  if (loading) return;
  loading = true;
  try {
    const data = await API.get(`/platform/orgs/${id}`);
    org = data.org || data.org || data;
    orgUsers = data.users || [];
    orgRoles = data.roles || [];
  } catch (e) {
    console.error('[SA] Failed to load org:', e);
    org = null; orgUsers = []; orgRoles = [];
  }
  loading = false;
  window.render();
}

async function doSuspend() {
  if (!org || !confirm(`Suspend ${org.name}? All users will lose access.`)) return;
  try {
    await API.post(`/platform/orgs/${org.id}/suspend`, { reason: 'Suspended by Platform Admin' });
    window.showToast?.('Organization suspended', 'warning');
    currentOrgId = null; loadOrg(org.id);
  } catch (e) { window.showToast?.('Failed: ' + e.message, 'error'); }
}

async function doActivate() {
  if (!org) return;
  try {
    await API.post(`/platform/orgs/${org.id}/activate`, {});
    window.showToast?.('Organization re-activated', 'success');
    currentOrgId = null; loadOrg(org.id);
  } catch (e) { window.showToast?.('Failed: ' + e.message, 'error'); }
}

async function addCompanyUser() {
  const f = document.getElementById('cu-form');
  if (!f || !org) return;
  const username = f.querySelector('#cu-username')?.value?.trim();
  const email = f.querySelector('#cu-email')?.value?.trim();
  const password = f.querySelector('#cu-password')?.value;
  const role = f.querySelector('#cu-role')?.value;
  if (!username || !email || !password || !role) {
    return window.showToast?.('All fields are required', 'error');
  }
  try {
    // Call platform endpoint to add user to this specific org
    await API.post(`/platform/orgs/${org.id}/users`, { username, email, password, role, company: org.name });
    window.showToast?.(`User "${username}" added to ${org.name}`, 'success');
    showAddUser = false;
    currentOrgId = null;
    loadOrg(org.id);
  } catch (e) {
    window.showToast?.(e.message || 'Failed to create user', 'error');
  }
}

async function toggleFeature(featureId, enabled) {
  if (!org) return;
  const currentFlags = org.feature_flags || {};
  const plan = (org.plan || 'core').toLowerCase();
  const planDefaults = PLAN_DEFAULTS[plan] || [];
  const isDefault = planDefaults.includes(featureId);
  
  const newFlags = { ...currentFlags };
  if (enabled === isDefault) {
    // Reverting to default plan state
    delete newFlags[featureId];
  } else {
    // Adding an explicit override
    newFlags[featureId] = enabled;
  }
  
  // Optimistic update
  org.feature_flags = newFlags;
  window.render();
  
  try {
    await API.put(`/platform/orgs/${org.id}`, { feature_flags: newFlags });
    window.showToast?.(`Feature override ${enabled ? 'applied' : 'removed'}`, 'success');
  } catch (e) {
    // Revert on failure
    org.feature_flags = currentFlags;
    window.render();
    window.showToast?.('Failed to apply feature override: ' + e.message, 'error');
  }
}


export function renderPage() {
  const id = State.pageParams?.orgId;
  if (id && id !== currentOrgId && !loading) { currentOrgId = id; org = null; loadOrg(id); }

  if (loading && !org) {
    return `<div style="display:flex;align-items:center;justify-content:center;padding:80px"><div class="spinner"></div></div>`;
  }
  if (!org) {
    return `<div style="text-align:center;padding:80px">
      <div style="font-size:3rem;margin-bottom:12px">🔍</div>
      <h3 style="margin-bottom:8px;color:var(--text-muted)">Organization not found</h3>
      <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:16px">The organization may have been removed or the ID is invalid.</p>
      <button class="btn btn-primary" onclick="navigate('sa-orgs')">← Back to Organizations</button>
    </div>`;
  }

  const status = org.status || 'active';
  const plan = (org.plan || 'core').toLowerCase();
  const pGrad = PLAN_GRADIENTS[plan] || PLAN_GRADIENTS.free;
  const pColor = PLAN_COLORS[plan] || '#94a3b8';
  const statusColor = status === 'active' ? '#10b981' : '#ef4444';
  const created = org.created_at ? new Date(org.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const initials = (org.name || '??').substring(0, 2).toUpperCase();
  const flags = Object.entries(org.feature_flags || {});
  const enabledFlags = flags.filter(([, v]) => v).length;

  return `
    <style>
      .tdt{font-family:var(--font-primary)}
      .tdt-hero{border-radius:20px;padding:28px 32px;position:relative;overflow:hidden;margin-bottom:4px;color:#fff}
      .tdt-hero::before{content:'';position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.07)}
      .tdt-hero::after{content:'';position:absolute;bottom:-60px;left:30%;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.04)}
      .tdt-hero-back{font-size:0.72rem;opacity:0.7;cursor:pointer;display:inline-flex;align-items:center;gap:4px;margin-bottom:14px;transition:opacity 0.2s}
      .tdt-hero-back:hover{opacity:1}
      .tdt-hero-main{display:flex;align-items:center;gap:18px;position:relative;z-index:1}
      .tdt-hero-avatar{width:56px;height:56px;border-radius:14px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:900;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.2);flex-shrink:0}
      .tdt-hero-info{flex:1}
      .tdt-hero-name{font-size:1.4rem;font-weight:800;margin-bottom:4px}
      .tdt-hero-meta{display:flex;align-items:center;gap:12px;font-size:0.75rem;opacity:0.85;flex-wrap:wrap}
      .tdt-hero-tag{background:rgba(255,255,255,0.15);padding:2px 10px;border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:0.68rem;backdrop-filter:blur(4px)}
      .tdt-hero-dot{width:7px;height:7px;border-radius:50%;display:inline-block}
      .tdt-hero-actions{display:flex;gap:8px;position:relative;z-index:1}
      .tdt-hero-btn{padding:8px 18px;border-radius:10px;font-size:0.75rem;font-weight:700;cursor:pointer;border:1px solid rgba(255,255,255,0.25);background:rgba(255,255,255,0.1);color:#fff;backdrop-filter:blur(4px);transition:all 0.2s;display:flex;align-items:center;gap:6px}
      .tdt-hero-btn:hover{background:rgba(255,255,255,0.2);transform:translateY(-1px)}

      .tdt-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}
      .tdt-stat{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;text-align:center;transition:all 0.2s}
      .tdt-stat:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.08)}
      .tdt-stat-val{font-size:1.6rem;font-weight:900;font-family:'JetBrains Mono',monospace;line-height:1}
      .tdt-stat-label{font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-top:6px;font-weight:600}

      .tdt-tabs{display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid var(--border)}
      .tdt-tab{padding:10px 22px;font-size:0.82rem;font-weight:600;color:#64748b;cursor:pointer;border:none;background:none;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all 0.2s}
      .tdt-tab:hover{color:#1e293b}
      .tdt-tab.active{color:#1e293b;font-weight:800;border-bottom-color:#3b82f6}

      .tdt-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .tdt-card{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;overflow:hidden}
      .tdt-card-h{padding:14px 18px;border-bottom:1px solid var(--border);font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;display:flex;align-items:center;gap:8px}
      .tdt-card-b{padding:14px 18px}
      .tdt-kv{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(148,163,184,0.06);font-size:0.78rem}
      .tdt-kv:last-child{border-bottom:none}
      .tdt-kv-l{color:var(--text-muted)}
      .tdt-kv-v{font-weight:600}

      .tdt-flags{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .tdt-flag{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;border:1px solid var(--border);font-size:0.78rem;transition:all 0.15s;cursor:pointer}
      .tdt-flag:hover{background:rgba(148,163,184,0.04)}
      .tdt-flag-on{border-left:3px solid #10b981}
      .tdt-flag-off{border-left:3px solid var(--border);opacity:0.75}

      .tdt-utable{width:100%;border-collapse:collapse}
      .tdt-utable th{text-align:left;font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);padding:10px 14px;border-bottom:1px solid var(--border)}
      .tdt-utable td{padding:10px 14px;font-size:0.78rem;border-bottom:1px solid rgba(148,163,184,0.06)}
      .tdt-utable tr:hover td{background:rgba(148,163,184,0.03)}
      .tdt-u-name{display:flex;align-items:center;gap:10px}
      .tdt-u-av{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.68rem;font-weight:700;color:#fff;flex-shrink:0}
      .tdt-u-role{font-size:0.62rem;font-weight:700;padding:3px 10px;border-radius:8px;display:inline-block}
      .tdt-u-add{padding:6px 16px;border-radius:8px;font-size:0.72rem;font-weight:700;cursor:pointer;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#fff;display:flex;align-items:center;gap:5px;transition:all 0.2s}
      .tdt-u-add:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(16,185,129,0.3)}

      /* Add User Modal */
      .cu-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center}
      .cu-modal{background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:28px 32px;width:480px;max-width:90vw;box-shadow:0 24px 80px rgba(0,0,0,0.3);max-height:80vh;overflow-y:auto}
      .cu-modal h2{font-size:1.1rem;font-weight:800;margin-bottom:16px;display:flex;align-items:center;gap:8px}
      .cu-field{margin-bottom:14px}
      .cu-label{display:block;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:5px}
      .cu-input{width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:0.82rem;outline:none;box-sizing:border-box}
      .cu-input:focus{border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,0.15)}
      .cu-select{width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:0.82rem;outline:none;box-sizing:border-box}
      .cu-tier{font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-top:16px;margin-bottom:6px;font-weight:700}
      .cu-btns{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
      .cu-btn-cancel{padding:8px 18px;border-radius:10px;font-size:0.78rem;font-weight:600;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text-primary)}
      .cu-btn-submit{padding:8px 22px;border-radius:10px;font-size:0.78rem;font-weight:700;cursor:pointer;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#fff}

      @media(max-width:900px){.tdt-grid,.tdt-stats{grid-template-columns:1fr 1fr}.tdt-flags{grid-template-columns:1fr}}
      @media(max-width:600px){.tdt-grid,.tdt-stats{grid-template-columns:1fr}}
    </style>

    <div class="tdt">
      <!-- Hero Banner -->
      <div class="tdt-hero" style="background:${pGrad}">
        <div class="tdt-hero-back" onclick="navigate('sa-orgs')">← Back to Organizations</div>
        <div class="tdt-hero-main">
          <div class="tdt-hero-avatar">${initials}</div>
          <div class="tdt-hero-info">
            <div class="tdt-hero-name">${esc(org.name)}</div>
            <div class="tdt-hero-meta">
              <span class="tdt-hero-tag">${esc(org.slug || '')}</span>
              <span><span class="tdt-hero-dot" style="background:${status === 'active' ? '#4ade80' : '#fbbf24'}"></span> ${status}</span>
              <span>${PLAN_LABELS[plan] || plan.toUpperCase()} Plan</span>
              <span>Created ${created}</span>
            </div>
          </div>
          <div class="tdt-hero-actions">
            ${status === 'active'
      ? `<button class="tdt-hero-btn" onclick="window._saDetailSuspend()">${icon('alert', 13)} Suspend</button>`
      : `<button class="tdt-hero-btn" onclick="window._saDetailActivate()">${icon('check', 13)} Re-Activate</button>`}
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="tdt-stats">
        <div class="tdt-stat"><div class="tdt-stat-val" style="color:#3b82f6">${orgUsers.length}</div><div class="tdt-stat-label">Users</div></div>
        <div class="tdt-stat"><div class="tdt-stat-val" style="color:#10b981">${enabledFlags}</div><div class="tdt-stat-label">Features Active</div></div>
        <div class="tdt-stat"><div class="tdt-stat-val" style="color:${pColor}">${PLAN_LABELS[plan] || plan.toUpperCase()}</div><div class="tdt-stat-label">Current Plan</div></div>
        <div class="tdt-stat"><div class="tdt-stat-val" style="color:${statusColor}">${status === 'active' ? '✓' : '⚠'}</div><div class="tdt-stat-label">Status</div></div>
      </div>

      <!-- Tabs -->
      <div class="tdt-tabs">
        ${['overview', 'users', 'usage', 'security', 'billing'].map(t =>
        `<button class="tdt-tab ${activeTab === t ? 'active' : ''}" onclick="window._saOrgTab('${t}')">${t.charAt(0).toUpperCase() + t.slice(1)}</button>`
      ).join('')}
      </div>

      ${renderTab()}

      <!-- Add User Modal -->
      ${showAddUser ? renderAddUserModal() : ''}
    </div>`;
}

function renderTab() {
  switch (activeTab) {
    case 'overview': return renderOverview();
    case 'users': return renderUsersTab();
    case 'usage': return ph('📊', 'Usage Analytics', 'Usage metrics and quota tracking for this organization.');
    case 'security': return ph('🔒', 'Security Events', 'Audit log, access events, and security configuration.');
    case 'billing': return renderBilling();
    default: return renderOverview();
  }
}

function renderOverview() {
  const plan = (org.plan || 'core').toLowerCase();
  const created = org.created_at ? new Date(org.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const updated = org.updated_at ? new Date(org.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const flags = Object.entries(org.feature_flags || {});

  return `
    <div class="tdt-grid">
      <div class="tdt-card">
        <div class="tdt-card-h">${icon('building', 14)} Organization</div>
        <div class="tdt-card-b">
          <div class="tdt-kv"><span class="tdt-kv-l">Name</span><span class="tdt-kv-v">${esc(org.name)}</span></div>
          <div class="tdt-kv"><span class="tdt-kv-l">Slug</span><span class="tdt-kv-v" style="font-family:'JetBrains Mono',monospace">${esc(org.slug || '')}</span></div>
          <div class="tdt-kv"><span class="tdt-kv-l">Plan</span><span class="tdt-kv-v">${PLAN_LABELS[plan] || plan.toUpperCase()}</span></div>
          <div class="tdt-kv"><span class="tdt-kv-l">Status</span><span class="tdt-kv-v">${org.status || 'active'}</span></div>
          <div class="tdt-kv"><span class="tdt-kv-l">Created</span><span class="tdt-kv-v">${created}</span></div>
          <div class="tdt-kv"><span class="tdt-kv-l">Updated</span><span class="tdt-kv-v">${updated}</span></div>
          <div class="tdt-kv"><span class="tdt-kv-l">Users</span><span class="tdt-kv-v" style="font-family:'JetBrains Mono',monospace">${orgUsers.length}</span></div>
          <div class="tdt-kv"><span class="tdt-kv-l">ID</span><span class="tdt-kv-v" style="font-family:'JetBrains Mono',monospace;font-size:0.68rem;opacity:0.6">${org.id}</span></div>
        </div>
      </div>
      <div class="tdt-card">
        <div class="tdt-card-h">
          ${icon('settings', 14)} Feature Config Overrides
          <span style="margin-left:auto;font-size:0.65rem;color:var(--text-muted);font-weight:400;text-transform:none">Plan: <strong>${PLAN_LABELS[plan] || plan.toUpperCase()}</strong></span>
        </div>
        <div class="tdt-card-b">
          <div class="tdt-flags">
            ${FEATURE_LIST.map(f => {
              const planDefaults = PLAN_DEFAULTS[plan] || [];
              const isDefault = planDefaults.includes(f.id);
              const hasOverride = org.feature_flags && typeof org.feature_flags[f.id] !== 'undefined';
              const isEffectiveOn = hasOverride ? org.feature_flags[f.id] : isDefault;
              
              let tagHtml = '';
              if (hasOverride) {
                tagHtml = isEffectiveOn 
                  ? '<span style="font-size:0.6rem;padding:2px 6px;border-radius:4px;background:#fef3c7;color:#92400e;font-weight:700">➕ Added (Override)</span>'
                  : '<span style="font-size:0.6rem;padding:2px 6px;border-radius:4px;background:#fee2e2;color:#991b1b;font-weight:700">➖ Removed (Override)</span>';
              } else if (isDefault) {
                tagHtml = '<span style="font-size:0.6rem;color:#10b981;font-weight:700">✓ Included in Plan</span>';
              }
              
              return `
              <div class="tdt-flag ${isEffectiveOn ? 'tdt-flag-on' : 'tdt-flag-off'}" style="${hasOverride ? 'border-color:#f59e0b;' : ''}" onclick="window._saToggleOrgFeature('${f.id}', ${!isEffectiveOn})">
                <span style="font-size:1.1rem;flex-shrink:0">${f.icon}</span>
                <div style="flex:1">
                  <div style="font-weight:700;margin-bottom:2px;display:flex;align-items:center;gap:6px">${f.label} ${tagHtml}</div>
                  <div style="font-size:0.65rem;color:var(--text-muted)">${f.desc}</div>
                </div>
                <!-- Toggle Switch -->
                <label style="position:relative;width:34px;height:20px;cursor:pointer;flex-shrink:0">
                  <input type="checkbox" ${isEffectiveOn ? 'checked' : ''} style="display:none" onclick="event.stopPropagation(); window._saToggleOrgFeature('${f.id}', this.checked)">
                  <div style="position:absolute;inset:0;background:${isEffectiveOn ? '#10b981' : '#cbd5e1'};border-radius:10px;transition:0.3s;${hasOverride && isEffectiveOn ? 'background:#f59e0b' : ''}"></div>
                  <div style="position:absolute;top:2px;left:${isEffectiveOn ? '16px' : '2px'};width:16px;height:16px;background:#fff;border-radius:50%;transition:0.3s;box-shadow:0 1px 2px rgba(0,0,0,0.2)"></div>
                </label>
              </div>`;
            }).join('')}
          </div>
          <div style="margin-top:12px;font-size:0.65rem;color:var(--text-muted);text-align:right">
            <em>Config overrides edit the organization contract explicitly. Toggling a default feature logs it as an explicit override.</em>
          </div>
        </div>
      </div>
    </div>`;
}

function renderUsersTab() {
  return `
    <div class="tdt-card">
      <div class="tdt-card-h">
        ${icon('users', 14)} Company Users
        <span style="margin-left:auto;display:flex;align-items:center;gap:12px">
          <span style="font-size:0.65rem;color:var(--text-muted)">${orgUsers.length} total</span>
          <button class="tdt-u-add" onclick="window._cuShowModal()">${icon('plus', 12)} Add User</button>
        </span>
      </div>
      ${orgUsers.length === 0
      ? '<div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:2rem;margin-bottom:8px">👥</div><p style="font-size:0.78rem">No users in this company yet.</p></div>'
      : `<table class="tdt-utable">
        <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Tier</th><th>Type</th><th>Last Login</th></tr></thead>
        <tbody>${orgUsers.map((u, i) => {
        const init = ((u.username || u.email || '??').substring(0, 2)).toUpperCase();
        const bg = AVATAR_COLORS[i % AVATAR_COLORS.length];
        const role = u.role || 'operator';
        const rm = ROLE_MAP[role] || { label: role, color: '#94a3b8', tier: '—' };
        return `<tr>
            <td><div class="tdt-u-name"><div class="tdt-u-av" style="background:${bg}">${init}</div><strong>${esc(u.username || '—')}</strong></div></td>
            <td style="color:var(--text-muted);font-family:'JetBrains Mono',monospace;font-size:0.72rem">${esc(u.email || '—')}</td>
            <td><span class="tdt-u-role" style="background:${rm.color}18;color:${rm.color}">${rm.label}</span></td>
            <td style="font-size:0.68rem;font-weight:700;color:var(--text-muted)">${rm.tier}</td>
            <td style="color:var(--text-muted);font-size:0.72rem">${u.user_type || '—'}</td>
            <td style="color:var(--text-muted);font-size:0.72rem">${u.last_login ? timeSince(u.last_login) : '—'}</td>
          </tr>`;
      }).join('')}</tbody>
      </table>`}
    </div>`;
}

function renderAddUserModal() {
  const tiers = ['L3', 'L4', 'L2', 'L1'];
  const tierLabels = { L3: 'Governance', L4: 'Decision Control', L2: 'Operational', L1: 'Technical' };
  return `
    <div class="cu-overlay" onclick="if(event.target===this)window._cuHideModal()">
      <div class="cu-modal">
        <h2>${icon('plus', 18)} Add Company User</h2>
        <p style="font-size:0.72rem;color:var(--text-muted);margin-bottom:16px">Create a user for <strong>${esc(org.name)}</strong>. This user will only have access to this company's data.</p>
        <form id="cu-form" onsubmit="event.preventDefault();window._cuCreate()">
          <div class="cu-field">
            <label class="cu-label">Username</label>
            <input class="cu-input" id="cu-username" placeholder="e.g. john_ops" required>
          </div>
          <div class="cu-field">
            <label class="cu-label">Email</label>
            <input class="cu-input" id="cu-email" type="email" placeholder="e.g. john@company.com" required>
          </div>
          <div class="cu-field">
            <label class="cu-label">Password</label>
            <input class="cu-input" id="cu-password" type="password" placeholder="Min 8 characters" required minlength="8">
          </div>
          <div class="cu-field">
            <label class="cu-label">Company Role</label>
            <select class="cu-select" id="cu-role" required>
              <option value="">— Select role —</option>
              ${(() => {
      const flags = org?.feature_flags || {};
      const availableRoles = COMPANY_ROLES.filter(r => !r.requires || flags[r.requires]);
      const blockedCount = COMPANY_ROLES.length - availableRoles.length;
      return tiers.map(t => {
        const rolesInTier = availableRoles.filter(r => r.tier === t);
        if (!rolesInTier.length) return '';
        return `<optgroup label="${t} — ${tierLabels[t]}">
                    ${rolesInTier.map(r => `<option value="${r.id}">${r.label} — ${r.desc}</option>`).join('')}
                  </optgroup>`;
      }).join('') + (blockedCount > 0 ? `<optgroup label="⚠ ${blockedCount} roles hidden (requires unactivated features)"></optgroup>` : '');
    })()}
            </select>
          </div>
          <div class="cu-btns">
            <button type="button" class="cu-btn-cancel" onclick="window._cuHideModal()">Cancel</button>
            <button type="submit" class="cu-btn-submit">Create User</button>
          </div>
        </form>
      </div>
    </div>`;
}

function renderBilling() {
  const plan = (org?.plan || 'core').toLowerCase();
  const pColor = PLAN_COLORS[plan] || '#94a3b8';
  const PLAN_BASE_PRICES = { core: 0, pro: 299, enterprise: 5000 };
  const FEATURE_PRICES = {
    qr: 0, products: 0, scm_tracking: 99, inventory: 49, support: 199, partners: 49,
    carbon: 199, risk_radar: 299, ai_forecast: 499, digital_twin: 149, kyc: 249,
    overclaim: 399, lineage: 499, governance: 299, registry_export: 599,
    erp_integration: 999, exec_dashboard: 199, ivu_cert: 499, blockchain: 199, nft: 99
  };
  
  // Compute dynamic MRR 
  const basePrice = PLAN_BASE_PRICES[plan] || 0;
  const defaults = PLAN_DEFAULTS[plan] || [];
  let addonCost = 0;
  const flags = org?.feature_flags || {};
  Object.entries(flags).forEach(([id, enabled]) => {
    if (enabled && !defaults.includes(id) && FEATURE_PRICES[id]) {
      addonCost += FEATURE_PRICES[id];
    }
  });
  const totalMRR = basePrice + addonCost;
  const creditBalance = (org?.credit_balance_cents || 0) / 100;

  return `
    <div class="tdt-grid" style="grid-template-columns:1fr 1fr 1fr 1fr">
      <div class="tdt-card"><div class="tdt-card-b" style="text-align:center;padding:24px">
        <div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Current Plan</div>
        <div style="font-size:1.4rem;font-weight:900;color:${pColor};text-transform:uppercase">${PLAN_LABELS[plan] || plan}</div>
      </div></div>
      <div class="tdt-card"><div class="tdt-card-b" style="text-align:center;padding:24px">
        <div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Monthly MRR</div>
        <div style="font-size:1.4rem;font-weight:900;font-family:'JetBrains Mono',monospace">$${totalMRR.toLocaleString()}<span style="font-size:0.7rem;opacity:0.5">/mo</span></div>
        ${addonCost > 0 ? `<div style="font-size:0.65rem;color:var(--text-muted);margin-top:4px">Base: $${basePrice} + Add-ons: $${addonCost}</div>` : ''}
      </div></div>
      <div class="tdt-card"><div class="tdt-card-b" style="text-align:center;padding:24px">
        <div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Credit Balance</div>
        <div style="font-size:1.4rem;font-weight:900;font-family:'JetBrains Mono',monospace;color:${creditBalance > 0 ? '#10b981' : 'var(--text-muted)'}">$${creditBalance.toLocaleString()}</div>
      </div></div>
      <div class="tdt-card"><div class="tdt-card-b" style="text-align:center;padding:24px">
        <div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Seats Used</div>
        <div style="font-size:1.4rem;font-weight:900;font-family:'JetBrains Mono',monospace;color:#3b82f6">${orgUsers.length}</div>
      </div></div>
    </div>`;
}

function ph(emoji, title, desc) {
  return `<div class="tdt-card"><div style="text-align:center;padding:48px"><div style="font-size:2.5rem;margin-bottom:12px">${emoji}</div><h3 style="margin-bottom:6px">${title}</h3><p style="font-size:0.78rem;color:var(--text-muted)">${desc}</p></div></div>`;
}

function timeSince(d) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

window._saOrgTab = (t) => { activeTab = t; window.render(); };
window._saDetailSuspend = doSuspend;
window._saDetailActivate = doActivate;
window._cuShowModal = () => { showAddUser = true; window.render(); };
window._cuHideModal = () => { showAddUser = false; window.render(); };
window._cuCreate = addCompanyUser;
window._saToggleOrgFeature = toggleFeature;
