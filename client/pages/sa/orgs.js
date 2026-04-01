/**
 * Super Admin – Org Management — Phoenix Clean Edition
 * ═══════════════════════════════════════════════════════
 * Light theme, white cards, subtle borders, pastel accents,
 * clean typography — inspired by Phoenix React Admin.
 */
import { API } from '../../core/api.js';
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

let orgs = [];
let loading = false;
let loadStarted = false;
let filter = 'all';
let searchTerm = '';
let currentPage = 1;
const ROWS_PER_PAGE = 10;
let showCreateModal = false;
let createError = '';
let creating = false;
let createdCredentials = null;

// ─── Name/Slug Validation State ──────────────────────────
let nameStatus = null; // null | 'checking' | 'available' | 'taken'
let slugStatus = null;
let slugSuggestions = [];
let _checkTimer = null;

async function checkAvailability(name, slug) {
  if (!name && !slug) return;
  nameStatus = 'checking'; slugStatus = 'checking';
  window.render();
  try {
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    if (slug) params.set('slug', slug);
    const res = await API.get(`/platform/orgs/check-availability?${params}`);
    nameStatus = name ? (res.name_available ? 'available' : 'taken') : null;
    slugStatus = slug ? (res.slug_available ? 'available' : 'taken') : null;
    slugSuggestions = res.suggestions || [];
  } catch {
    nameStatus = null; slugStatus = null; slugSuggestions = [];
  }
  window.render();
}

function debouncedCheck() {
  clearTimeout(_checkTimer);
  _checkTimer = setTimeout(() => {
    const nameEl = document.getElementById('ct-name');
    const slugEl = document.getElementById('ct-slug');
    const name = nameEl?.value?.trim();
    const slug = slugEl?.value?.trim();
    if (name && name.length >= 2) {
      checkAvailability(name, slug);
    } else {
      nameStatus = null; slugStatus = null; slugSuggestions = []; window.render();
    }
  }, 400);
}

const PLAN_MRR = { free: 0, starter: 99, growth: 299, business: 749, enterprise: 5000 };

async function loadOrgs() {
  if (loading) return;
  loading = true;
  try {
    const data = await API.get('/platform/orgs');
    orgs = Array.isArray(data) ? data : (data.orgs || []);
  } catch (e) {
    console.error('[SA] Failed to load orgs:', e);
    orgs = [];
  }
  loading = false;
  window.render();
}

async function createOrg(form) {
  creating = true; createError = ''; window.render();
  try {
    await API.post('/platform/orgs', form);
    creating = false;
    createdCredentials = {
      company: form.name,
      slug: form.slug,
      plan: form.plan,
      loginUrl: 'https://tonytran.work/trustchecker/',
      email: form.admin_email,
      password: form.admin_password,
    };
    window.render();
    window.showToast?.('✅ Organization created successfully', 'success');
    loadStarted = false; loadOrgs();
  } catch (e) {
    createError = e.message || 'Failed to create organization';
    creating = false; window.render();
  }
}

async function suspendOrg(id) {
  if (!confirm('Suspend this organization? Their users will lose access.')) return;
  try {
    await API.post(`/platform/orgs/${id}/suspend`, { reason: 'Suspended by Super Admin' });
    window.showToast?.('Organization suspended', 'warning');
    loadStarted = false; await loadOrgs();
  } catch (e) { window.showToast?.('Failed to suspend: ' + e.message, 'error'); }
}

async function activateOrg(id) {
  try {
    await API.post(`/platform/orgs/${id}/activate`, {});
    window.showToast?.('Organization activated', 'success');
    loadStarted = false; await loadOrgs();
  } catch (e) { window.showToast?.('Failed: ' + e.message, 'error'); }
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
}

function genPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!%&';
  let pw = '';
  for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

function copyText(text) {
  navigator.clipboard?.writeText(text).then(() => window.showToast?.('📋 Copied to clipboard!', 'success'));
}

function closeModal() { showCreateModal = false; createError = ''; creating = false; createdCredentials = null; nameStatus = null; slugStatus = null; slugSuggestions = []; window.render(); }

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && showCreateModal) { e.preventDefault(); closeModal(); }
});

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function timeSince(d) {
  if (!d) return '—';
  const dt = new Date(d);
  const now = new Date();
  const diffMs = now - dt;
  const diffDays = Math.floor(diffMs / 86400000);
  let relative = '';
  if (diffDays === 0) relative = 'Today';
  else if (diffDays === 1) relative = 'Yesterday';
  else if (diffDays < 30) relative = diffDays + 'd ago';
  else if (diffDays < 365) relative = Math.floor(diffDays / 30) + 'mo ago';
  else relative = Math.floor(diffDays / 365) + 'y ago';
  const formatted = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `<span title="${formatted}">${formatted}</span><div style="font-size:0.62rem;color:#94a3b8;margin-top:1px">${relative}</div>`;
}

const FEATURE_LIST = [
  // Core Platform
  { id: 'qr', label: 'QR Traceability', icon: '📱', desc: 'Scan & Trace engine', group: 'core', price: 0, minTier: 'core' },
  { id: 'products', label: 'Product Catalog', icon: '📦', desc: 'Product information management', group: 'core', price: 0, minTier: 'core' },
  { id: 'scm_tracking', label: 'Supply Chain Tracking', icon: '🚚', desc: 'End-to-end logistics tracking', group: 'core', price: 99, minTier: 'core' },
  { id: 'inventory', label: 'Inventory Management', icon: '🏭', desc: 'Warehouse & stock control', group: 'core', price: 49, minTier: 'core' },
  { id: 'support', label: 'Premium Support', icon: '🎧', desc: 'Enterprise support SLAs', group: 'core', price: 199, minTier: 'core' },
  { id: 'partners', label: 'Partner Portal', icon: '🤝', desc: 'B2B collaboration platform', group: 'core', price: 49, minTier: 'core' },
  
  // Intelligence & Compliance (Requires Pro Base chassis)
  { id: 'carbon', label: 'Carbon Tracking', icon: '🌱', desc: 'Emission monitoring & credits', group: 'intel', price: 199, minTier: 'pro' },
  { id: 'risk_radar', label: 'Risk Radar', icon: '🛡', desc: 'Supplier risk assessment scoring', group: 'intel', price: 299, minTier: 'pro' },
  { id: 'ai_forecast', label: 'AI Forecaster', icon: '🤖', desc: 'Predictive analytics & anomaly', group: 'intel', price: 499, minTier: 'pro' },
  { id: 'digital_twin', label: 'Digital Twin', icon: '🪞', desc: 'Digital product replicas', group: 'intel', price: 149, minTier: 'pro' },
  { id: 'kyc', label: 'KYC / AML', icon: '🔍', desc: 'Identity & sanctions screening', group: 'intel', price: 249, minTier: 'pro' },
  
  // Enterprise Add-ons (Premium Upsells - Requires Enterprise Base chassis)
  { id: 'overclaim', label: 'Overclaim Detection', icon: '⚠️', desc: 'Greenwashing anomaly alerts', group: 'premium', price: 399, minTier: 'enterprise' },
  { id: 'lineage', label: 'Lineage Replay', icon: '⏪', desc: 'What-if simulations & impact replay', group: 'premium', price: 499, minTier: 'enterprise' },
  { id: 'governance', label: 'Advanced Governance', icon: '🏛', desc: 'Multi-entity SoD & 6-eyes approval', group: 'premium', price: 299, minTier: 'enterprise' },
  { id: 'registry_export', label: 'Registry Export API', icon: '📤', desc: 'GRI/IFRS S2 & Registry syncing', group: 'premium', price: 599, minTier: 'enterprise' },
  { id: 'erp_integration', label: 'ERP Integration', icon: '🔌', desc: 'SAP/Oracle automated sync', group: 'premium', price: 999, minTier: 'enterprise' },
  { id: 'exec_dashboard', label: 'Exec Risk Dashboard', icon: '📈', desc: 'Board-level reporting & metrics', group: 'premium', price: 199, minTier: 'enterprise' },
  { id: 'ivu_cert', label: 'IVU Premium Audit', icon: '🏅', desc: '3rd-party validation workflows', group: 'premium', price: 499, minTier: 'enterprise' },

  // Distributed Ledger (Requires Pro Base chassis)
  { id: 'blockchain', label: 'Blockchain Anchoring', icon: '⛓', desc: 'Immutable ledger proof', group: 'ledger', price: 199, minTier: 'pro' },
  { id: 'nft', label: 'NFT Certificates', icon: '🎫', desc: 'Digital asset minting', group: 'ledger', price: 99, minTier: 'pro' },
];

const PLAN_BASE_PRICES = { core: 0, pro: 299, enterprise: 5000 };

const PLAN_DEFAULTS = {
  core: ['qr', 'products'],
  pro: ['qr', 'products', 'scm_tracking', 'support', 'partners', 'carbon', 'inventory'],
  enterprise: ['qr', 'products', 'scm_tracking', 'support', 'partners', 'carbon', 'inventory', 'risk_radar', 'ai_forecast', 'digital_twin', 'blockchain', 'kyc', 'overclaim', 'exec_dashboard'],
};

function featureFlags(flags) {
  if (!flags || typeof flags !== 'object') return '';
  const m = Object.fromEntries(FEATURE_LIST.map(f => [f.id, f.label]));
  const active = Object.keys(flags).filter(k => flags[k] && m[k]);
  if (!active.length) return '';
  return `<div class="phx-features">${active.map(k =>
    `<span class="phx-feature-tag">${m[k]}</span>`
  ).join('')}</div>`;
}

// ─── RENDER ──────────────────────────────────────────────────
export function renderPage() {
  if (!loadStarted) { loadStarted = true; loadOrgs(); }
  if (State.page === 'sa-create-org' && !showCreateModal) showCreateModal = true;

  const filtered = orgs.filter(t => {
    if (filter !== 'all' && (t.status || 'active') !== filter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (t.name || '').toLowerCase().includes(q) || (t.slug || '').toLowerCase().includes(q);
    }
    return true;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;
  const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
  const paginated = filtered.slice(startIdx, startIdx + ROWS_PER_PAGE);

  const counts = {
    all: orgs.length,
    active: orgs.filter(t => (t.status || 'active') === 'active').length,
    suspended: orgs.filter(t => t.status === 'suspended').length,
    archived: orgs.filter(t => t.status === 'archived').length,
  };
  const totalUsers = orgs.reduce((s, t) => s + (t.user_count || 0), 0);
  const totalMRR = orgs.reduce((s, t) => {
    const p = (t.plan || 'free').toLowerCase();
    if (p === 'enterprise' && t.enterprise_config?.monthly_base) return s + t.enterprise_config.monthly_base;
    return s + (PLAN_MRR[p] || 0);
  }, 0);
  const entCount = orgs.filter(t => t.plan === 'enterprise').length;
  const growthCount = orgs.filter(t => t.plan === 'growth').length;

  return `
    <div class="sa-page phx-page">
      <!-- Header -->
      <div class="phx-page-header">
        <div>
          <h1 class="phx-page-title">Organization Management</h1>
          <p class="phx-page-desc">Real-time overview of all your organizations</p>
        </div>
        <button class="phx-btn-primary" onclick="window._saShowCreate()">
          ${icon('plus', 16)} Add organization
        </button>
      </div>

      <!-- KPI Strip -->
      <div class="phx-kpi-row">
        ${kpiCard(icon('building', 20), counts.all, 'Total Organizations', 'All registered organizations', 'blue', 'all')}
        ${kpiCard(icon('check', 20), counts.active, 'Active Organizations', 'Currently operational', 'green', 'active')}
        ${kpiCard(icon('barChart', 20), '$' + totalMRR.toLocaleString(), 'Total MRR', '$' + (totalMRR * 12).toLocaleString() + ' ARR', 'purple')}
        ${kpiCard(icon('shield', 20), entCount, 'Enterprise Plans', `${growthCount} Growth plans`, 'orange')}
      </div>

      <!-- Toolbar -->
      <div class="phx-card phx-card-table">
        <div class="phx-table-toolbar">
          <div class="phx-tab-row">
            ${tabBtn('all', 'All', counts.all)}
            ${tabBtn('active', 'Active', counts.active)}
            ${tabBtn('suspended', 'Suspended', counts.suspended)}
            ${tabBtn('archived', 'Archived', counts.archived)}
          </div>
          <div class="phx-search-pill">
            ${icon('search', 15)}
            <input type="text" placeholder="Search organizations..." value="${searchTerm}"
              oninput="window._saOrgsSearch(this.value)">
          </div>
        </div>

        <!-- Table -->
        ${loading && orgs.length === 0 ?
      `<div class="phx-loading">${icon('activity', 20)} Loading organizations...</div>` :
      filtered.length === 0 ?
        `<div class="phx-empty">
              <div class="phx-empty-art">${icon('building', 44)}</div>
              <h3>No organizations found</h3>
              <p>${orgs.length === 0 ? 'Get started by adding your first organization.' : 'Try adjusting your filters.'}</p>
              ${orgs.length === 0 ? `<button class="phx-btn-primary phx-btn-sm" onclick="window._saShowCreate()">${icon('plus', 14)} Add first organization</button>` : ''}
            </div>` :
        renderTable(paginated) + renderPagination(filtered.length)
    }
      </div>

      ${showCreateModal ? renderModal() : ''}
    </div>`;
}

function kpiCard(ic, val, title, desc, color, filterVal) {
  const click = filterVal ? ` onclick="window._saOrgsFilter('${filterVal}')" style="cursor:pointer"` : '';
  return `<div class="phx-kpi"${click}>
    <div class="phx-kpi-icon phx-kpi-${color}">${ic}</div>
    <div class="phx-kpi-body">
      <span class="phx-kpi-val">${val}</span>
      <span class="phx-kpi-title">${title}</span>
    </div>
    <span class="phx-kpi-desc">${desc}</span>
  </div>`;
}

function tabBtn(val, label, count) {
  return `<button class="phx-tab ${filter === val ? 'active' : ''}" onclick="window._saOrgsFilter('${val}')">
    ${label} <span class="phx-tab-count">${count}</span>
  </button>`;
}

function renderTable(list) {
  return `
    <table class="phx-table">
      <thead>
        <tr>
          <th>Organization</th>
          <th>Plan</th>
          <th>Status</th>
          <th style="text-align:right">MRR</th>
          <th style="text-align:right">Features</th>
          <th>Created</th>
          <th class="phx-th-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(t => tableRow(t)).join('')}
      </tbody>
    </table>`;
}

function renderPagination(totalItems) {
  const totalPages = Math.max(1, Math.ceil(totalItems / ROWS_PER_PAGE));
  if (totalPages <= 1) return '';
  const startItem = (currentPage - 1) * ROWS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ROWS_PER_PAGE, totalItems);

  let pages = '';
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
      pages += `<button class="phx-page-btn ${i === currentPage ? 'active' : ''}" onclick="window._saOrgsPage(${i})">${i}</button>`;
    } else if (Math.abs(i - currentPage) === 2) {
      pages += `<span class="phx-page-dots">\u2026</span>`;
    }
  }
  return `<div class="phx-pagination">
    <span class="phx-page-info">Showing ${startItem}\u2013${endItem} of ${totalItems}</span>
    <div class="phx-page-nav">
      <button class="phx-page-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="window._saOrgsPage(${currentPage - 1})">\u2039 Prev</button>
      ${pages}
      <button class="phx-page-btn" ${currentPage >= totalPages ? 'disabled' : ''} onclick="window._saOrgsPage(${currentPage + 1})">Next \u203a</button>
    </div>
  </div>`;
}

function tableRow(t) {
  const status = t.status || 'active';
  const plan = t.plan || 'free';
  const initial = (t.name || 'T')[0];
  const planColors = { enterprise: 'orange', business: 'orange', growth: 'purple', starter: 'blue', free: 'gray', core: 'teal' };
  const statusColors = { active: 'green', suspended: 'red', archived: 'gray' };
  const feats = featureFlags(t.feature_flags);
  const featCount = t.feature_flags ? Object.keys(t.feature_flags).filter(k => t.feature_flags[k]).length : 0;
  const mrrVal = (plan === 'enterprise' && t.enterprise_config?.monthly_base) ? t.enterprise_config.monthly_base : (PLAN_MRR[plan] || 0);
  const mrrColor = mrrVal === 0 ? '#10b981' : plan === 'enterprise' ? '#ef4444' : plan === 'business' ? '#f59e0b' : '#10b981';

  return `<tr class="phx-row" onclick="navigate('sa-org-detail',{orgId:'${t.id}'})">
      <td>
        <div class="phx-org-cell">
          <div class="phx-avatar phx-avatar-${planColors[plan] || 'blue'}">${initial}</div>
          <div>
            <div class="phx-org-name">${esc(t.name || '')}</div>
            <div class="phx-org-slug">${esc(t.slug || '')}</div>
          </div>
        </div>
      </td>
      <td><span class="phx-badge phx-badge-${planColors[plan] || 'blue'}">${plan}</span></td>
      <td><span class="phx-status-badge phx-status-badge-${statusColors[status] || 'gray'}"><span class="phx-status-dot-inline"></span>${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
      <td style="text-align:right">
        <span class="phx-mono" style="color:${mrrColor};font-weight:700">$${mrrVal.toLocaleString()}/mo</span>
      </td>
      <td style="text-align:right">${featCount > 0 ? `<span class="phx-feat-count">${featCount} Features</span>` : '<span class="phx-muted">—</span>'}</td>
      <td class="phx-muted">${timeSince(t.created_at)}</td>
      <td class="phx-td-actions" onclick="event.stopPropagation()">
        ${status === 'active' ? `<button class="phx-btn-outline phx-btn-xs phx-btn-warn" onclick="window._saSuspend('${t.id}')" title="Suspend this organization">⚠ Suspend</button>` : ''}
        ${status === 'suspended' ? `<button class="phx-btn-solid-green phx-btn-xs" onclick="window._saActivate('${t.id}')" title="Reactivate this organization">✓ Reactivate</button>` : ''}
        <button class="phx-btn-outline phx-btn-xs" onclick="navigate('sa-org-detail',{orgId:'${t.id}'})" title="View details">👁</button>
      </td>
    </tr>`;
}

function renderModal() {
  // After creation — show credential summary card
  if (createdCredentials) {
    const c = createdCredentials;
    return `
    <div class="phx-overlay" onclick="if(event.target===this)window._saCloseCreate()">
      <div class="phx-modal">
        <div class="phx-modal-head">
          <h2>✅ Organization Created Successfully</h2>
          <button class="phx-modal-close" onclick="window._saCloseCreate()">✕</button>
        </div>
        <div class="phx-modal-body">
          <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:16px">
            Copy the credentials below and send to the client. The password <strong>cannot be retrieved</strong> after closing this window.
          </p>

          <style>
            .cred-card{background:var(--bg-secondary,#f8fafc);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:12px}
            .cred-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(148,163,184,0.1);font-size:0.82rem}
            .cred-row:last-child{border-bottom:none}
            .cred-label{font-weight:600;color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;min-width:100px}
            .cred-val{font-family:'JetBrains Mono',monospace;font-size:0.82rem;word-break:break-all;flex:1;margin:0 12px}
            .cred-copy{padding:4px 12px;border-radius:6px;font-size:0.68rem;font-weight:600;cursor:pointer;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);transition:all 0.15s;white-space:nowrap}
            .cred-copy:hover{background:#3b82f6;color:#fff;border-color:#3b82f6}
            .cred-pw{background:#fef3c7;border-color:#f59e0b;border-radius:10px;padding:12px 16px;margin-top:10px;display:flex;align-items:center;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:0.88rem;font-weight:700;letter-spacing:1px}
            .cred-warn{display:flex;align-items:center;gap:6px;font-size:0.72rem;color:#92400e;font-family:var(--font-primary);font-weight:600;margin-top:8px}
            .cred-all{margin-top:14px;display:flex;gap:8px}
            .cred-btn-all{flex:1;padding:10px;border-radius:10px;font-size:0.78rem;font-weight:700;cursor:pointer;border:none;text-align:center;transition:all 0.2s}
          </style>

          <div class="cred-card">
            <div class="cred-row">
              <span class="cred-label">Company</span>
              <span class="cred-val">${esc(c.company)}</span>
              <button class="cred-copy" onclick="window._saCopy('${esc(c.company)}')">Copy</button>
            </div>
            <div class="cred-row">
              <span class="cred-label">Plan</span>
              <span class="cred-val" style="text-transform:uppercase">${esc(c.plan)}</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">Login URL</span>
              <span class="cred-val">${esc(c.loginUrl)}</span>
              <button class="cred-copy" onclick="window._saCopy('${esc(c.loginUrl)}')">Copy</button>
            </div>
            <div class="cred-row">
              <span class="cred-label">Email</span>
              <span class="cred-val">${esc(c.email)}</span>
              <button class="cred-copy" onclick="window._saCopy('${esc(c.email)}')">Copy</button>
            </div>
          </div>

          <div class="cred-pw">
            <span>${esc(c.password)}</span>
            <button class="cred-copy" onclick="window._saCopy('${esc(c.password)}')">📋 Copy</button>
          </div>
          <div class="cred-warn">⚠️ This password will NOT be shown again after closing.</div>

          <div class="cred-all">
            <button class="cred-btn-all" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff"
              onclick="window._saCopyAll()">📋 Copy All Credentials</button>
            <button class="cred-btn-all" style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border)"
              onclick="window._saCloseCreate()">Done</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  // Create form
  return `
    <div class="phx-overlay" onclick="if(event.target===this)window._saCloseCreate()">
      <div class="phx-modal" style="max-width:640px;max-height:90vh;display:flex;flex-direction:column">
        <div class="phx-modal-head" style="padding:14px 20px">
          <h2 style="font-size:1rem">Add new organization</h2>
          <button class="phx-modal-close" onclick="window._saCloseCreate()">✕</button>
        </div>
        <form onsubmit="event.preventDefault();window._saDoCreate(this)" class="phx-modal-body" style="padding:14px 20px;overflow-y:auto;flex:1">
          ${createError ? `<div class="phx-alert-error" style="margin-bottom:10px;font-size:0.78rem">${esc(createError)}</div>` : ''}

          <div style="display:grid;grid-template-columns:1fr 140px 140px;gap:10px;margin-bottom:12px">
            <div class="phx-form-group" style="margin:0">
              <label class="phx-label" style="font-size:0.7rem;margin-bottom:3px">Company name <span class="phx-req">*</span></label>
              <input class="phx-input" type="text" name="name" id="ct-name" required placeholder="e.g. Amazon CA" autocomplete="off" style="padding:7px 10px;font-size:0.82rem${nameStatus === 'taken' ? ';border-color:#ef4444' : nameStatus === 'available' ? ';border-color:#10b981' : ''}"
                oninput="document.getElementById('ct-slug').value=window._saSlugify(this.value);window._saCheckAvail()">
              ${nameStatus === 'checking' ? '<div class="avail-msg avail-check">⏳ Checking...</div>' : nameStatus === 'taken' ? '<div class="avail-msg avail-taken">❌ Name already exists — please choose a different name</div>' : nameStatus === 'available' ? '<div class="avail-msg avail-ok">✅ Name available</div>' : ''}
            </div>
            <div class="phx-form-group" style="margin:0">
              <label class="phx-label" style="font-size:0.7rem;margin-bottom:3px">Slug <span style="font-weight:400;font-size:0.58rem;color:var(--text-muted)">(auto)</span></label>
              <input class="phx-input" type="text" name="slug" id="ct-slug" required placeholder="amazon-ca" pattern="[a-z0-9\\-]+" autocomplete="off" style="padding:7px 10px;font-size:0.82rem;color:var(--text-muted);background:var(--bg-secondary,#f1f5f9)${slugStatus === 'taken' ? ';border-color:#ef4444' : slugStatus === 'available' ? ';border-color:#10b981' : ''}" oninput="window._saCheckAvail()">
              ${slugStatus === 'checking' ? '<div class="avail-msg avail-check">⏳ Checking...</div>' : slugStatus === 'taken' ? `<div class="avail-msg avail-taken">❌ Slug already taken${slugSuggestions.length ? ' — try:' : ''}</div>${slugSuggestions.length ? '<div class="slug-suggestions">' + slugSuggestions.map(s => `<button type="button" class="slug-chip" onclick="window._saPickSlug('${s}')">${s}</button>`).join('') + '</div>' : ''}` : slugStatus === 'available' ? '<div class="avail-msg avail-ok">✅ Slug available</div>' : ''}
            </div>
            <div class="phx-form-group" style="margin:0">
              <label class="phx-label" style="font-size:0.7rem;margin-bottom:3px">Plan</label>
              <select class="phx-input" name="plan" id="ct-plan" style="padding:7px 10px;font-size:0.82rem" onchange="window._planChanged(this.value)">
                <option value="core" selected>Core ($0/mo)</option>
                <option value="pro">Pro ($299/mo)</option>
                <option value="enterprise">Enterprise ($5,000/mo)</option>
              </select>
            </div>
          </div>

          <style>
            .avail-msg{font-size:0.65rem;margin-top:2px;font-weight:600}
            .avail-ok{color:#10b981}
            .avail-taken{color:#ef4444}
            .avail-check{color:#94a3b8}
            .slug-suggestions{display:flex;flex-wrap:wrap;gap:4px;margin-top:3px}
            .slug-chip{padding:3px 8px;border-radius:12px;border:1px solid #3b82f6;background:rgba(59,130,246,0.06);color:#3b82f6;font-size:0.62rem;font-weight:600;cursor:pointer;transition:all 0.15s;font-family:monospace}
            .slug-chip:hover{background:#3b82f6;color:#fff}
            .ff-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
            .ff-chip{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:24px;border:1px solid var(--border,#e2e8f0);cursor:pointer;transition:all 0.2s;font-size:0.75rem;font-weight:500;user-select:none;white-space:nowrap;background:var(--bg-secondary)}
            .ff-chip:hover{border-color:#94a3b8}
            .ff-chip.checked{background:#fff;border-color:#3b82f6;color:#1e293b;box-shadow:0 1px 3px rgba(59,130,246,0.1)}
            .ff-chip.override{border-color:#f59e0b;box-shadow:0 0 0 2px rgba(245,158,11,0.2)}
            .ff-chip.override.checked{background:#fffbeb;color:#92400e}
            .ff-chip input{display:none}
            .addon-label{display:flex;align-items:center;gap:6px;font-size:0.72rem;padding:8px 10px;border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:all 0.15s}
            .addon-label:hover{border-color:#3b82f6;background:rgba(59,130,246,0.04)}
            .addon-label input:checked ~ span{font-weight:700}
            .addon-price{margin-left:auto;font-size:0.65rem;font-weight:600;white-space:nowrap}
          </style>
          <div style="margin-bottom:4px;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted,#94a3b8)">Entitlements & Features</div>
          <div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:12px;line-height:1.4">Toggling an 'Available Upgrade' creates a custom configuration override for this organization.</div>
          <div id="ff-chips-container">
            <!-- Rendered by _planChanged -->
          </div>
          
          <div id="ff-price-calc" style="margin:16px 0 10px;padding:12px 16px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;display:flex;justify-content:space-between;align-items:center">
             <div>
               <div style="font-size:0.68rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Estimated Cost</div>
               <div id="calc-breakdown" style="font-size:0.75rem;color:#64748b;margin-top:2px">Core Base + 0 Overrides</div>
             </div>
             <div id="calc-total" style="font-size:1.4rem;font-weight:900;color:#1e293b;font-family:'JetBrains Mono',monospace">$0/mo</div>
          </div>

          <!-- Initialize chips when modal opens -->
          <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" onload="window._planChanged(document.getElementById('ct-plan').value)" style="display:none">

          <hr class="phx-divider" style="margin:10px 0">
          <div style="margin-bottom:6px;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted,#94a3b8)">Company Admin Account</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
            <div class="phx-form-group" style="margin:0">
              <label class="phx-label" style="font-size:0.7rem;margin-bottom:3px">Admin Email <span class="phx-req">*</span></label>
              <input class="phx-input" type="email" name="admin_email" required placeholder="admin@company.com" autocomplete="off" style="padding:7px 10px;font-size:0.82rem">
            </div>
            <div class="phx-form-group" style="margin:0">
              <label class="phx-label" style="font-size:0.7rem;margin-bottom:3px">Password <span class="phx-req">*</span></label>
              <div style="display:flex;gap:6px">
                <input class="phx-input" type="text" name="admin_password" id="ct-pw" required minlength="8" placeholder="Click Generate →" autocomplete="off" style="flex:1;padding:7px 10px;font-size:0.78rem;font-family:'JetBrains Mono',monospace">
                <button type="button" class="phx-btn-secondary" style="white-space:nowrap;padding:6px 12px;font-size:0.7rem;border-radius:8px" onclick="document.getElementById('ct-pw').value=window._saGenPw()">🔑 Gen</button>
              </div>
            </div>
          </div>

          <div class="phx-modal-foot" style="padding:10px 0 0">
            <button type="button" class="phx-btn-secondary" style="padding:8px 18px;font-size:0.78rem" onclick="window._saCloseCreate()">Cancel</button>
            <button type="submit" class="phx-btn-primary" style="padding:8px 18px;font-size:0.78rem" ${creating || nameStatus === 'taken' || slugStatus === 'taken' ? 'disabled' : ''}>
              ${creating ? '<span class="phx-spinner-sm"></span> Creating...' : nameStatus === 'taken' || slugStatus === 'taken' ? '⚠ Fix conflicts above' : `${icon('plus', 14)} Create organization`}
            </button>
          </div>
        </form>
      </div>
    </div>`;
}

// ─── Exports ─────────────────────────────────────────────────
window._saOrgsFilter = (f) => { filter = f; currentPage = 1; window.render(); };
window._saOrgsSearch = (q) => { searchTerm = q; currentPage = 1; window.render(); };
window._saOrgsPage = (p) => { currentPage = p; window.render(); };
window._saShowCreate = () => { showCreateModal = true; createError = ''; createdCredentials = null; window.render(); };
window._saCloseCreate = closeModal;
window._saSlugify = slugify;
window._saGenPw = genPassword;
window._saCopy = copyText;
window._saCheckAvail = debouncedCheck;
window._saPickSlug = (slug) => {
  const el = document.getElementById('ct-slug');
  if (el) { el.value = slug; debouncedCheck(); }
};
window._saCopyAll = () => {
  if (!createdCredentials) return;
  const c = createdCredentials;
  const text = `🏢 ${c.company}\n📧 Login: ${c.loginUrl}\n📧 Email: ${c.email}\n🔑 Password: ${c.password}\n📋 Plan: ${c.plan}`;
  copyText(text);
};
window._saDoCreate = (form) => {
  const d = new FormData(form);
  const slug = d.get('slug');
  const adminUsername = slug.replace(/-/g, '_') + '_admin';
  const plan = d.get('plan');
  const defaults = PLAN_DEFAULTS[plan] || [];
  
  const feature_flags = {};
  FEATURE_LIST.forEach(f => { 
    const isChecked = !!d.get('ff_' + f.id);
    const isDefault = defaults.includes(f.id);
    // Only capture exceptions / overrides
    if (isChecked !== isDefault) {
      feature_flags[f.id] = isChecked;
    }
  });

  const payload = {
    name: d.get('name'), slug, plan, feature_flags,
    admin_username: adminUsername, admin_email: d.get('admin_email'), admin_password: d.get('admin_password')
  };

  createOrg(payload);
};

window._saCalcDynamicPrice = () => {
  const planSelect = document.getElementById('ct-plan');
  if (!planSelect) return;
  
  const checkedFeatureIds = new Set();
  FEATURE_LIST.forEach(f => {
    const cb = document.querySelector(`input[name="ff_${f.id}"]`);
    if (cb && cb.checked) {
      checkedFeatureIds.add(f.id);
    }
  });

  const TIER_RANK = { core: 1, pro: 2, enterprise: 3 };
  
  // Enforce Minimum Chassis Requirements
  let requiredMinimumTier = 'core';
  checkedFeatureIds.forEach(id => {
      const feature = FEATURE_LIST.find(f => f.id === id);
      if (feature && feature.minTier) {
          if (TIER_RANK[feature.minTier] > TIER_RANK[requiredMinimumTier]) {
              requiredMinimumTier = feature.minTier;
          }
      }
  });

  let bestPlan = requiredMinimumTier;
  let bestCost = Infinity;
  let bestAddons = [];
  let bestAddonCost = 0;

  // We only evaluate plans that meet the exact minimum required chassis or higher
  ['core', 'pro', 'enterprise'].forEach(p => {
      if (TIER_RANK[p] < TIER_RANK[requiredMinimumTier]) return;
      
      const defaults = PLAN_DEFAULTS[p] || [];
      const basePrice = PLAN_BASE_PRICES[p] || 0;
      let addonCost = 0;
      let addons = [];
      
      checkedFeatureIds.forEach(id => {
          if (!defaults.includes(id)) {
              const feature = FEATURE_LIST.find(f => f.id === id);
              if (feature) {
                  addonCost += feature.price || 0;
                  addons.push(id);
              }
          }
      });
      
      const totalCost = basePrice + addonCost;
      // Prefer cheaper total. If equal, prefer the higher tier
      if (totalCost < bestCost || (totalCost === bestCost && basePrice > (PLAN_BASE_PRICES[bestPlan] || 0))) {
          bestCost = totalCost;
          bestPlan = p;
          bestAddonCost = addonCost;
          bestAddons = addons;
      }
  });

  // Auto-switch UI to the best architectural plan
  if (planSelect.value !== bestPlan) {
      planSelect.value = bestPlan;
      window._planChanged(bestPlan, true);
      return; 
  }

  const plan = planSelect.value;
  // Recalculate based on current actual plan selection in case we didn't auto-switch down
  const defaults = PLAN_DEFAULTS[plan] || [];
  let basePrice = PLAN_BASE_PRICES[plan] || 0;
  let currentAddonCost = 0;
  let currentAddons = [];
  checkedFeatureIds.forEach(id => {
     if (!defaults.includes(id)) {
         const feat = FEATURE_LIST.find(f => f.id === id);
         if (feat) { currentAddonCost += feat.price || 0; currentAddons.push(id); }
     }
  });
  const currentTotal = basePrice + currentAddonCost;
  const addonCount = currentAddons.length;

  const planNames = {core: 'Core', pro: 'Pro', enterprise: 'Enterprise'};
  const origPrices = {core: 0, pro: 299, enterprise: 5000};
  
  for (let i = 0; i < planSelect.options.length; i++) {
    const pVal = planSelect.options[i].value;
    planSelect.options[i].text = `${planNames[pVal]} ($${origPrices[pVal].toLocaleString()}/mo)`;
  }
  
  const opt = planSelect.options[planSelect.selectedIndex];
  if (addonCount > 0) {
    opt.text = `${planNames[plan]}+ ($${currentTotal.toLocaleString()}/mo)`;
  }
  
  const bd = document.getElementById('calc-breakdown');
  const tt = document.getElementById('calc-total');
  if (bd && tt) {
    if (addonCount > 0) {
      bd.innerHTML = `<strong>${planNames[plan]}+</strong> base ($${basePrice}) + ${addonCount} add-on(s) ($${currentAddonCost})`;
      tt.innerHTML = `$${currentTotal.toLocaleString()}<span style="font-size:0.7rem;opacity:0.6">/mo</span>`;
      tt.style.color = '#3b82f6';
    } else {
      let unselectedDefaults = defaults.filter(id => !checkedFeatureIds.has(id));
      let deductMsg = unselectedDefaults.length > 0 ? `<br><span style="font-size:0.65rem;color:#ef4444;font-style:italic">- ${unselectedDefaults.length} unused feature(s)</span>` : '';
      bd.innerHTML = `Standard ${planNames[plan]} Plan ($${basePrice})${deductMsg}`;
      tt.innerHTML = `$${currentTotal.toLocaleString()}<span style="font-size:0.7rem;opacity:0.6">/mo</span>`;
      tt.style.color = '#1e293b';
    }
  }
};

window._planChanged = (plan, preserveChecks = false) => {
  const container = document.getElementById('ff-chips-container');
  if (!container) return;
  const defaults = PLAN_DEFAULTS[plan] || [];
  
  const currentChecked = new Set();
  if (preserveChecks) {
      FEATURE_LIST.forEach(f => {
         const cb = document.querySelector(`input[name="ff_${f.id}"]`);
         if (cb && cb.checked) currentChecked.add(f.id);
      });
      // Ensure the new higher plan's default inclusions are automatically checked for them
      defaults.forEach(id => currentChecked.add(id));
  } else {
      defaults.forEach(id => currentChecked.add(id));
  }

  const included = FEATURE_LIST.filter(f => defaults.includes(f.id));
  const addons = FEATURE_LIST.filter(f => !defaults.includes(f.id));
  
  const renderChip = (f, isDefault) => {
    const isChecked = currentChecked.has(f.id);
    const isOverride = isChecked !== isDefault;
    return `
    <label class="ff-chip ${isChecked ? 'checked' : ''} ${isOverride ? 'override' : ''}">
      <input type="checkbox" name="ff_${f.id}" value="1" ${isChecked ? 'checked' : ''} onchange="this.parentElement.classList.toggle('override', this.checked !== ${isDefault}); this.parentElement.classList.toggle('checked', this.checked); window._saCalcDynamicPrice();">
      <span style="font-size:1.1rem">${f.icon}</span> 
      <span style="font-weight:600">${f.label}</span>
      ${!isDefault && f.price > 0 ? `<span class="addon-price">+$${f.price}</span>` : ''}
      ${isDefault ? '<span style="color:#10b981;font-weight:800;margin-left:auto">✓</span>' : ''}
    </label>`;
  };

  let html = '';
  
  if (included.length > 0) {
    html += `<div style="margin-bottom:8px;font-size:0.65rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">✓ Included in Plan</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      ${included.map(f => renderChip(f, true)).join('')}
    </div>`;
  }
  
  if (addons.length > 0) {
    html += `<div style="margin-bottom:8px;font-size:0.65rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">➕ Available Upgrades / Add-ons</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      ${addons.map(f => renderChip(f, false)).join('')}
    </div>`;
  }

  container.innerHTML = html;
  
  // Calculate price whenever plan changes (and thus chips reset)
  setTimeout(() => window._saCalcDynamicPrice(), 50);
};

window._saSuspend = (id) => suspendOrg(id);
window._saActivate = (id) => activateOrg(id);
