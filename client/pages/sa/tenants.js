/**
 * Super Admin – Tenant Management — Phoenix Clean Edition
 * ═══════════════════════════════════════════════════════
 * Light theme, white cards, subtle borders, pastel accents,
 * clean typography — inspired by Phoenix React Admin.
 */
import { API } from '../../core/api.js';
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

let tenants = [];
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

const PLAN_MRR = { free: 0, starter: 99, growth: 299, business: 749, enterprise: 5000 };

async function loadTenants() {
  if (loading) return;
  loading = true;
  try {
    const data = await API.get('/platform/tenants');
    tenants = Array.isArray(data) ? data : (data.tenants || []);
  } catch (e) {
    console.error('[SA] Failed to load tenants:', e);
    tenants = [];
  }
  loading = false;
  window.render();
}

async function createTenant(form) {
  creating = true; createError = ''; window.render();
  try {
    await API.post('/platform/tenants', form);
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
    loadStarted = false; loadTenants();
  } catch (e) {
    createError = e.message || 'Failed to create organization';
    creating = false; window.render();
  }
}

async function suspendTenant(id) {
  if (!confirm('Suspend this organization? Their users will lose access.')) return;
  try {
    await API.post(`/platform/tenants/${id}/suspend`, { reason: 'Suspended by Super Admin' });
    window.showToast?.('Organization suspended', 'warning');
    loadStarted = false; await loadTenants();
  } catch (e) { window.showToast?.('Failed to suspend: ' + e.message, 'error'); }
}

async function activateTenant(id) {
  try {
    await API.post(`/platform/tenants/${id}/activate`, {});
    window.showToast?.('Organization activated', 'success');
    loadStarted = false; await loadTenants();
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

function closeModal() { showCreateModal = false; createError = ''; creating = false; createdCredentials = null; window.render(); }

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
  { id: 'blockchain', label: 'Blockchain', icon: '⛓', desc: 'Immutable ledger & anchoring' },
  { id: 'nft', label: 'NFT Certificates', icon: '🎫', desc: 'Digital product certificates' },
  { id: 'ai_analytics', label: 'AI Analytics', icon: '🤖', desc: 'Anomaly detection & scoring' },
  { id: 'trustgraph', label: 'Trust Graph', icon: '🕸', desc: 'Network relationship mapping' },
  { id: 'consortium', label: 'Consortium', icon: '🤝', desc: 'Multi-party verification' },
  { id: 'digital_twin', label: 'Digital Twin', icon: '🪞', desc: 'Product digital replicas' },
  { id: 'carbon', label: 'Carbon Tracking', icon: '🌱', desc: 'Emission monitoring & credits' },
  { id: 'scm', label: 'Supply Chain', icon: '🚚', desc: 'End-to-end logistics tracking' },
  { id: 'fraud_detection', label: 'Fraud Detection', icon: '🛡', desc: 'Real-time fraud alerts' },
  { id: 'kyc', label: 'KYC / AML', icon: '🔍', desc: 'Identity & sanctions screening' },
];

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
  if (!loadStarted) { loadStarted = true; loadTenants(); }
  if (State.page === 'sa-create-tenant' && !showCreateModal) showCreateModal = true;

  const filtered = tenants.filter(t => {
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
    all: tenants.length,
    active: tenants.filter(t => (t.status || 'active') === 'active').length,
    suspended: tenants.filter(t => t.status === 'suspended').length,
    archived: tenants.filter(t => t.status === 'archived').length,
  };
  const totalUsers = tenants.reduce((s, t) => s + (t.user_count || 0), 0);
  const totalMRR = tenants.reduce((s, t) => {
    const p = (t.plan || 'free').toLowerCase();
    if (p === 'enterprise' && t.enterprise_config?.monthly_base) return s + t.enterprise_config.monthly_base;
    return s + (PLAN_MRR[p] || 0);
  }, 0);
  const entCount = tenants.filter(t => t.plan === 'enterprise').length;
  const growthCount = tenants.filter(t => t.plan === 'growth').length;

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
              oninput="window._saTenantsSearch(this.value)">
          </div>
        </div>

        <!-- Table -->
        ${loading && tenants.length === 0 ?
      `<div class="phx-loading">${icon('activity', 20)} Loading organizations...</div>` :
      filtered.length === 0 ?
        `<div class="phx-empty">
              <div class="phx-empty-art">${icon('building', 44)}</div>
              <h3>No organizations found</h3>
              <p>${tenants.length === 0 ? 'Get started by adding your first organization.' : 'Try adjusting your filters.'}</p>
              ${tenants.length === 0 ? `<button class="phx-btn-primary phx-btn-sm" onclick="window._saShowCreate()">${icon('plus', 14)} Add first organization</button>` : ''}
            </div>` :
        renderTable(paginated) + renderPagination(filtered.length)
    }
      </div>

      ${showCreateModal ? renderModal() : ''}
    </div>`;
}

function kpiCard(ic, val, title, desc, color, filterVal) {
  const click = filterVal ? ` onclick="window._saTenantsFilter('${filterVal}')" style="cursor:pointer"` : '';
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
  return `<button class="phx-tab ${filter === val ? 'active' : ''}" onclick="window._saTenantsFilter('${val}')">
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
      pages += `<button class="phx-page-btn ${i === currentPage ? 'active' : ''}" onclick="window._saTenantsPage(${i})">${i}</button>`;
    } else if (Math.abs(i - currentPage) === 2) {
      pages += `<span class="phx-page-dots">\u2026</span>`;
    }
  }
  return `<div class="phx-pagination">
    <span class="phx-page-info">Showing ${startItem}\u2013${endItem} of ${totalItems}</span>
    <div class="phx-page-nav">
      <button class="phx-page-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="window._saTenantsPage(${currentPage - 1})">\u2039 Prev</button>
      ${pages}
      <button class="phx-page-btn" ${currentPage >= totalPages ? 'disabled' : ''} onclick="window._saTenantsPage(${currentPage + 1})">Next \u203a</button>
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

  return `<tr class="phx-row" onclick="navigate('sa-tenant-detail',{tenantId:'${t.id}'})">
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
        <button class="phx-btn-outline phx-btn-xs" onclick="navigate('sa-tenant-detail',{tenantId:'${t.id}'})" title="View details">👁</button>
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
      <div class="phx-modal" style="max-width:600px">
        <div class="phx-modal-head" style="padding:14px 20px">
          <h2 style="font-size:1rem">Add new organization</h2>
          <button class="phx-modal-close" onclick="window._saCloseCreate()">✕</button>
        </div>
        <form onsubmit="event.preventDefault();window._saDoCreate(this)" class="phx-modal-body" style="padding:14px 20px">
          ${createError ? `<div class="phx-alert-error" style="margin-bottom:10px;font-size:0.78rem">${esc(createError)}</div>` : ''}

          <div style="display:grid;grid-template-columns:1fr 140px 140px;gap:10px;margin-bottom:12px">
            <div class="phx-form-group" style="margin:0">
              <label class="phx-label" style="font-size:0.7rem;margin-bottom:3px">Company name <span class="phx-req">*</span></label>
              <input class="phx-input" type="text" name="name" id="ct-name" required placeholder="e.g. Amazon CA" autocomplete="off" style="padding:7px 10px;font-size:0.82rem"
                oninput="document.getElementById('ct-slug').value=window._saSlugify(this.value)">
            </div>
            <div class="phx-form-group" style="margin:0">
              <label class="phx-label" style="font-size:0.7rem;margin-bottom:3px">Slug <span style="font-weight:400;font-size:0.58rem;color:var(--text-muted)">(auto)</span></label>
              <input class="phx-input" type="text" name="slug" id="ct-slug" required placeholder="amazon-ca" pattern="[a-z0-9\\-]+" autocomplete="off" style="padding:7px 10px;font-size:0.82rem;color:var(--text-muted);background:var(--bg-secondary,#f1f5f9)">
            </div>
            <div class="phx-form-group" style="margin:0">
              <label class="phx-label" style="font-size:0.7rem;margin-bottom:3px">CIE Tier</label>
              <select class="phx-input" name="plan" id="ct-plan" style="padding:7px 10px;font-size:0.82rem" onchange="window._planChanged(this.value)">
                <option value="sme" selected>🏭 SME Exporter ($1.5–3K/mo)</option>
                <option value="mid_enterprise">🏢 Mid Enterprise ($6–12K/mo)</option>
                <option value="large_enterprise">👑 Large Enterprise ($18–40K/mo)</option>
                <option value="buyer">🌐 Multinational Buyer (API)</option>
                <option value="bank">🏦 Bank / ESG Fund (Scoring)</option>
              </select>
            </div>
          </div>

          <style>
            .ff-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
            .ff-chip{display:flex;align-items:center;gap:4px;padding:5px 10px;border-radius:20px;border:1px solid var(--border,#e2e8f0);cursor:pointer;transition:all 0.15s;font-size:0.72rem;font-weight:500;user-select:none;white-space:nowrap}
            .ff-chip:hover{background:rgba(59,130,246,0.06);border-color:rgba(59,130,246,0.4)}
            .ff-chip.checked{background:linear-gradient(135deg,#3b82f6,#2563eb);border-color:#2563eb;color:#fff;font-weight:700;box-shadow:0 2px 8px rgba(59,130,246,0.35);transform:scale(1.03)}
            .ff-chip input{display:none}
            .addon-label{display:flex;align-items:center;gap:6px;font-size:0.72rem;padding:8px 10px;border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:all 0.15s}
            .addon-label:hover{border-color:#3b82f6;background:rgba(59,130,246,0.04)}
            .addon-label input:checked ~ span{font-weight:700}
            .addon-price{margin-left:auto;font-size:0.65rem;font-weight:600;white-space:nowrap}
          </style>
          <div style="margin-bottom:4px;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted,#94a3b8)">Feature Modules</div>
          <div class="ff-chips">
            ${FEATURE_LIST.map(f => `
              <label class="ff-chip">
                <input type="checkbox" name="ff_${f.id}" onchange="this.parentElement.classList.toggle('checked',this.checked)">
                <span>${f.icon}</span> ${f.label}
              </label>
            `).join('')}
          </div>

          <!-- CIE Module Configuration -->
          <div id="addons-config" style="margin-bottom:12px">
            <div style="background:linear-gradient(135deg,rgba(16,185,129,0.04),rgba(59,130,246,0.04));border:1px solid rgba(16,185,129,0.15);border-radius:12px;padding:14px">
              <div style="font-size:0.72rem;font-weight:800;color:#10b981;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">🌱 Carbon Integrity Engine</div>
              <div style="font-size:0.62rem;color:var(--text-muted);margin-bottom:10px" id="cie-tier-desc">SME Exporter · ≤300 staff · ≤50 suppliers · ARPU $25–40K/yr</div>

              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px">
                <div class="phx-form-group" style="margin:0">
                  <label class="phx-label" style="font-size:0.65rem;margin-bottom:2px">Base License</label>
                  <input class="phx-input" type="text" id="cie-base" style="padding:6px 8px;font-size:0.75rem;color:var(--text-muted)" value="$1,500–3,000/mo" readonly>
                </div>
                <div class="phx-form-group" style="margin:0">
                  <label class="phx-label" style="font-size:0.65rem;margin-bottom:2px">Batch Limit</label>
                  <select class="phx-input" name="cie_batch" id="cie-batch" style="padding:6px 8px;font-size:0.75rem">
                    <option value="5000">5,000 batch/yr</option>
                    <option value="10000">10,000 batch/yr</option>
                  </select>
                </div>
                <div class="phx-form-group" style="margin:0">
                  <label class="phx-label" style="font-size:0.65rem;margin-bottom:2px">Usage Overage</label>
                  <input class="phx-input" type="text" id="cie-overage" style="padding:6px 8px;font-size:0.75rem;color:var(--text-muted)" value="$0.30–0.50/batch" readonly>
                </div>
              </div>

              <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:6px">CIE Modules Included</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px" id="cie-modules">
                <label class="addon-label" style="flex-direction:column;align-items:stretch;gap:2px">
                  <div style="display:flex;align-items:center;gap:6px">
                    <input type="checkbox" name="mod_ingestion" checked disabled>
                    <span style="font-weight:700">📡 Data Ingestion</span>
                    <span class="addon-price" style="color:#10b981" id="mod-ingestion-p">✓ Included</span>
                  </div>
                  <div style="font-size:0.6rem;color:var(--text-muted);padding-left:22px" id="mod-ingestion-d">Scope 1,2,3 · Source integrity hash</div>
                </label>
                <label class="addon-label" style="flex-direction:column;align-items:stretch;gap:2px">
                  <div style="display:flex;align-items:center;gap:6px">
                    <input type="checkbox" name="mod_emission" checked disabled>
                    <span style="font-weight:700">🏭 Emission Engine</span>
                    <span class="addon-price" style="color:#10b981" id="mod-emission-p">✓ Included</span>
                  </div>
                  <div style="font-size:0.6rem;color:var(--text-muted);padding-left:22px" id="mod-emission-d">GHG Protocol v4.2 · Per-batch calculation</div>
                </label>
                <label class="addon-label" style="flex-direction:column;align-items:stretch;gap:2px">
                  <div style="display:flex;align-items:center;gap:6px">
                    <input type="checkbox" name="mod_benchmark" id="chk-benchmark">
                    <span style="font-weight:700">📊 Benchmark</span>
                    <span class="addon-price" style="color:#f59e0b" id="mod-benchmark-p">Basic only</span>
                  </div>
                  <div style="font-size:0.6rem;color:var(--text-muted);padding-left:22px" id="mod-benchmark-d">Industry comparison · No percentile</div>
                </label>
                <label class="addon-label" style="flex-direction:column;align-items:stretch;gap:2px">
                  <div style="display:flex;align-items:center;gap:6px">
                    <input type="checkbox" name="mod_passport" checked disabled>
                    <span style="font-weight:700">📜 Carbon Passport</span>
                    <span class="addon-price" style="color:#10b981" id="mod-passport-p">✓ Included</span>
                  </div>
                  <div style="font-size:0.6rem;color:var(--text-muted);padding-left:22px" id="mod-passport-d">CIP issuance · Basic audit log</div>
                </label>
                <label class="addon-label" style="flex-direction:column;align-items:stretch;gap:2px">
                  <div style="display:flex;align-items:center;gap:6px">
                    <input type="checkbox" name="mod_overclaim" id="chk-overclaim">
                    <span style="font-weight:700">⚠️ Overclaim Detection</span>
                    <span class="addon-price" style="color:#64748b" id="mod-overclaim-p">Not available</span>
                  </div>
                  <div style="font-size:0.6rem;color:var(--text-muted);padding-left:22px" id="mod-overclaim-d">Mid Enterprise+ · Risk scoring</div>
                </label>
                <label class="addon-label" style="flex-direction:column;align-items:stretch;gap:2px">
                  <div style="display:flex;align-items:center;gap:6px">
                    <input type="checkbox" name="mod_lineage" id="chk-lineage">
                    <span style="font-weight:700">🔍 Lineage Replay</span>
                    <span class="addon-price" style="color:#64748b" id="mod-lineage-p">Not available</span>
                  </div>
                  <div style="font-size:0.6rem;color:var(--text-muted);padding-left:22px" id="mod-lineage-d">Mid Enterprise+ · +$2K/mo add-on</div>
                </label>
                <label class="addon-label" style="flex-direction:column;align-items:stretch;gap:2px">
                  <div style="display:flex;align-items:center;gap:6px">
                    <input type="checkbox" name="mod_governance" id="chk-governance">
                    <span style="font-weight:700">🛡️ Governance</span>
                    <span class="addon-price" style="color:#64748b" id="mod-governance-p">Basic log only</span>
                  </div>
                  <div style="font-size:0.6rem;color:var(--text-muted);padding-left:22px" id="mod-governance-d">Full SoD: Mid Enterprise+</div>
                </label>
                <label class="addon-label" style="flex-direction:column;align-items:stretch;gap:2px">
                  <div style="display:flex;align-items:center;gap:6px">
                    <input type="checkbox" name="mod_blockchain" id="chk-blockchain">
                    <span style="font-weight:700">⛓️ Blockchain Anchor</span>
                    <span class="addon-price" style="color:#64748b" id="mod-blockchain-p">Not available</span>
                  </div>
                  <div style="font-size:0.6rem;color:var(--text-muted);padding-left:22px" id="mod-blockchain-d">Mid Enterprise+ · Hash anchoring</div>
                </label>
                <label class="addon-label" style="flex-direction:column;align-items:stretch;gap:2px">
                  <div style="display:flex;align-items:center;gap:6px">
                    <input type="checkbox" name="mod_export" id="chk-export">
                    <span style="font-weight:700">📤 Export Engine</span>
                    <span class="addon-price" style="color:#10b981" id="mod-export-p">ESG only</span>
                  </div>
                  <div style="font-size:0.6rem;color:var(--text-muted);padding-left:22px" id="mod-export-d">ESG basic · IFRS/GRI: Mid Enterprise+</div>
                </label>
              </div>
            </div>
          </div>

          <!-- Enterprise Deal Config (Large + Buyer + Bank) -->
          <div id="ent-config" style="display:none;margin-bottom:12px">
            <div style="background:linear-gradient(135deg,rgba(239,68,68,0.06),rgba(249,115,22,0.06));border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:14px">
              <div style="font-size:0.72rem;font-weight:800;color:#ef4444;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px" id="ent-config-title">👑 Enterprise Deal Configuration</div>

              <div id="ent-deal-fields" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px">
                <div class="phx-form-group" style="margin:0">
                  <label class="phx-label" style="font-size:0.65rem;margin-bottom:2px">MAC Tier</label>
                  <select class="phx-input" name="ent_mac" style="padding:6px 8px;font-size:0.75rem">
                    <option value="none">No commitment</option>
                    <option value="100k">$100K/yr MAC</option>
                    <option value="200k">$200K/yr MAC</option>
                    <option value="500k">$500K/yr MAC</option>
                    <option value="1m">$1M/yr MAC</option>
                  </select>
                </div>
                <div class="phx-form-group" style="margin:0">
                  <label class="phx-label" style="font-size:0.65rem;margin-bottom:2px">Monthly Base ($)</label>
                  <input class="phx-input" type="number" name="ent_monthly" placeholder="18000" min="5000" step="1000" style="padding:6px 8px;font-size:0.75rem">
                </div>
                <div class="phx-form-group" style="margin:0">
                  <label class="phx-label" style="font-size:0.65rem;margin-bottom:2px">Infra Fee</label>
                  <select class="phx-input" name="ent_infra" style="padding:6px 8px;font-size:0.75rem">
                    <option value="5000">$5K/mo compute</option>
                    <option value="10000">$10K/mo compute</option>
                    <option value="20000">$20K/mo compute</option>
                  </select>
                </div>
              </div>

              <div id="ent-api-fields" style="display:none;margin-bottom:10px">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                  <div class="phx-form-group" style="margin:0">
                    <label class="phx-label" style="font-size:0.65rem;margin-bottom:2px">Supplier Coverage</label>
                    <select class="phx-input" name="ent_suppliers" style="padding:6px 8px;font-size:0.75rem">
                      <option value="100">≤100 suppliers ($200/ea/yr)</option>
                      <option value="500">≤500 suppliers ($350/ea/yr)</option>
                      <option value="1000">≤1,000 suppliers ($500/ea/yr)</option>
                      <option value="unlimited">Unlimited (contract)</option>
                    </select>
                  </div>
                  <div class="phx-form-group" style="margin:0">
                    <label class="phx-label" style="font-size:0.65rem;margin-bottom:2px">Contract Type</label>
                    <select class="phx-input" name="ent_contract" style="padding:6px 8px;font-size:0.75rem">
                      <option value="annual">Annual ($100K–500K/yr)</option>
                      <option value="multi">Multi-year (discount)</option>
                      <option value="per_deal">Per-deal scoring</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:6px">Enterprise Add-ons & Services</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
                <label class="addon-label">
                  <input type="checkbox" name="svc_ivu"> <span>🔍 IVU Premium Certification ($20K–100K/audit)</span>
                </label>
                <label class="addon-label">
                  <input type="checkbox" name="svc_erp"> <span>🔗 ERP Integration — SAP/Oracle ($50K–150K)</span>
                </label>
                <label class="addon-label">
                  <input type="checkbox" name="svc_stress_test"> <span>📊 Carbon Stress Test ($5K–25K/sim)</span>
                </label>
                <label class="addon-label">
                  <input type="checkbox" name="svc_registry_export"> <span>📤 Registry Export Pack ($3K–10K)</span>
                </label>
                <label class="addon-label">
                  <input type="checkbox" name="svc_exec_dashboard"> <span>📈 Executive Risk Dashboard (+$2K/mo)</span>
                </label>
                <label class="addon-label">
                  <input type="checkbox" name="svc_governance_support"> <span>🎧 Dedicated Governance ($100K/yr)</span>
                </label>
              </div>
            </div>
          </div>

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
            <button type="submit" class="phx-btn-primary" style="padding:8px 18px;font-size:0.78rem" ${creating ? 'disabled' : ''}>
              ${creating ? '<span class="phx-spinner-sm"></span> Creating...' : `${icon('plus', 14)} Create organization`}
            </button>
          </div>
        </form>
      </div>
    </div>`;
}

// ─── Exports ─────────────────────────────────────────────────
window._saTenantsFilter = (f) => { filter = f; currentPage = 1; window.render(); };
window._saTenantsSearch = (q) => { searchTerm = q; currentPage = 1; window.render(); };
window._saTenantsPage = (p) => { currentPage = p; window.render(); };
window._saShowCreate = () => { showCreateModal = true; createError = ''; createdCredentials = null; window.render(); };
window._saCloseCreate = closeModal;
window._saSlugify = slugify;
window._saGenPw = genPassword;
window._saCopy = copyText;
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
  const feature_flags = {};
  FEATURE_LIST.forEach(f => { feature_flags[f.id] = !!d.get('ff_' + f.id); });
  const plan = d.get('plan');
  const payload = {
    name: d.get('name'), slug, plan, feature_flags,
    admin_username: adminUsername, admin_email: d.get('admin_email'), admin_password: d.get('admin_password')
  };

  // CIE modules for all tiers
  payload.cie_config = {
    tier: plan,
    modules: {
      ingestion: true,
      emission: true,
      benchmark: !!d.get('mod_benchmark'),
      passport: true,
      overclaim: !!d.get('mod_overclaim'),
      lineage: !!d.get('mod_lineage'),
      governance: !!d.get('mod_governance'),
      blockchain: !!d.get('mod_blockchain'),
      export: !!d.get('mod_export'),
    },
    batch_limit: d.get('cie_batch') || '5000',
  };
  // Enable carbon tracking feature flag
  feature_flags.carbon_tracking = true;

  // Enterprise deal config (large_enterprise, buyer, bank)
  if (['large_enterprise', 'buyer', 'bank'].includes(plan)) {
    payload.enterprise_config = {
      mac_tier: d.get('ent_mac') || 'none',
      monthly_base: parseInt(d.get('ent_monthly')) || 18000,
      infra_fee: d.get('ent_infra') || '5000',
      supplier_coverage: d.get('ent_suppliers') || '',
      contract_type: d.get('ent_contract') || 'annual',
      services: {
        ivu_certification: !!d.get('svc_ivu'),
        erp_integration: !!d.get('svc_erp'),
        stress_test: !!d.get('svc_stress_test'),
        registry_export: !!d.get('svc_registry_export'),
        exec_dashboard: !!d.get('svc_exec_dashboard'),
        governance_support: !!d.get('svc_governance_support'),
      },
    };
  }
  createTenant(payload);
};

// Dynamic plan change — 5-tier CIE pricing
const CIE_TIERS = {
  sme: {
    desc: 'SME Exporter · ≤300 staff · ≤50 suppliers · ARPU $25–40K/yr',
    base: '$1,500–3,000/mo', batch: ['5000:5,000 batch/yr', '10000:10,000 batch/yr'], overage: '$0.30–0.50/batch',
    mods: {
      ingestion: ['✓ Included', 'Scope 1,2,3 · Source integrity hash'],
      emission: ['✓ Included', 'GHG Protocol v4.2 · Per-batch calc'],
      benchmark: ['Basic only', 'Industry comparison · No percentile', false],
      passport: ['✓ Included', 'CIP issuance · Basic audit log'],
      overclaim: ['Not available', 'Mid Enterprise+ · Risk scoring', true],
      lineage: ['Not available', 'Mid Enterprise+ · +$2K/mo add-on', true],
      governance: ['Basic log only', 'Full SoD: Mid Enterprise+', false],
      blockchain: ['Not available', 'Mid Enterprise+ · Hash anchoring', true],
      export: ['ESG only', 'ESG basic · IFRS/GRI: Mid Enterprise+', false],
    },
    showEnt: false,
  },
  mid_enterprise: {
    desc: 'Mid Enterprise · 300–2K staff · 50–500 suppliers · ARPU $100–200K/yr',
    base: '$6,000–12,000/mo', batch: ['25000:25,000 batch/yr', '50000:50,000 batch/yr'], overage: '$0.20–0.35/batch',
    mods: {
      ingestion: ['✓ Included', 'Multi-source · Duplicate detection'],
      emission: ['✓ Included', 'Unlimited products · Scope 3 visibility'],
      benchmark: ['✓ Percentile', 'Industry rank · Overclaim alert', false],
      passport: ['✓ Included', 'Full CIP · Compliance approval flow'],
      overclaim: ['✓ Risk Score', 'Carbon Risk Score · Fraud signals', false],
      lineage: ['+$2K/mo', 'Replay simulation · Impact analysis', false],
      governance: ['✓ Full SoD', 'Governance workflow · Approval chain', false],
      blockchain: ['✓ Anchor', 'Hash-only · Polygon', false],
      export: ['✓ IFRS/GRI', 'ESG + IFRS S2 + GRI 302/305', false],
    },
    showEnt: false,
  },
  large_enterprise: {
    desc: 'Large Enterprise · >2K staff · >500 suppliers · ARPU $300K–1.2M/yr',
    base: '$18,000–40,000/mo', batch: ['unlimited:Unlimited batch'], overage: '$5K–20K/mo infra',
    mods: {
      ingestion: ['✓ Full', 'Multi-entity · All scopes'],
      emission: ['✓ Unlimited', 'Multi-plant · Node complexity'],
      benchmark: ['✓ Premium', 'Deep industry benchmark · Ranking', false],
      passport: ['✓ Full', 'Multi-entity CIP · Advanced SoD'],
      overclaim: ['✓ Full Engine', 'Anomaly detection · Auto-escalate', false],
      lineage: ['✓ Included', 'Deep replay · What-if simulation', false],
      governance: ['✓ Advanced', 'Multi-entity SoD · 6-eyes override', false],
      blockchain: ['✓ Included', 'Full anchoring · Verification API', false],
      export: ['✓ Full + API', 'All formats + Registry API + Custom', false],
    },
    showEnt: true, entTitle: '👑 Large Enterprise Deal Configuration',
  },
  buyer: {
    desc: 'Multinational Buyer · Supplier carbon risk coverage · Highest margin · API model',
    base: '$200–500/supplier/yr', batch: ['api:API-based'], overage: 'Contract pricing',
    mods: {
      ingestion: ['✓ Supplier Feed', 'Supplier carbon data ingestion'],
      emission: ['— N/A', 'Buyer does not calculate', true],
      benchmark: ['✓ Supplier Rank', 'Supplier carbon scoring', false],
      passport: ['— Read Only', 'Read supplier CIPs', true],
      overclaim: ['✓ Core Product', 'Overclaim detection · Risk heatmap', false],
      lineage: ['✓ Supplier Trail', 'Supplier emission lineage', false],
      governance: ['✓ Procurement', 'Procurement API integration', false],
      blockchain: ['✓ Verify', 'Verify supplier proof anchors', false],
      export: ['✓ Scope 3', 'Scope 3 risk heatmap · Procurement API', false],
    },
    showEnt: true, entTitle: '🌐 Buyer Contract Configuration',
  },
  bank: {
    desc: 'Bank / ESG Fund · Carbon due diligence scoring · $2K–10K/deal or $150–400K/yr',
    base: '$2,000–10,000/deal', batch: ['scoring:Deal-based scoring'], overage: '$150–400K/yr unlimited',
    mods: {
      ingestion: ['— N/A', 'Bank does not ingest data', true],
      emission: ['— N/A', 'Bank does not calculate', true],
      benchmark: ['✓ Due Diligence', 'Carbon integrity scoring', false],
      passport: ['✓ Verify', 'Verify counterparty CIPs', false],
      overclaim: ['✓ Core Product', 'Greenwashing probability · Risk', false],
      lineage: ['✓ Deal Trail', 'Deal-level carbon defensibility', false],
      governance: ['✓ Compliance', 'Audit-grade defensibility report', false],
      blockchain: ['✓ Verify', 'Verify proof anchors', false],
      export: ['✓ Deal Report', 'Carbon defensibility report · PDF/API', false],
    },
    showEnt: true, entTitle: '🏦 Bank / ESG Fund Contract',
  },
};

window._planChanged = (plan) => {
  const tier = CIE_TIERS[plan];
  if (!tier) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

  // Tier description + base pricing
  set('cie-tier-desc', tier.desc);
  setVal('cie-base', tier.base);
  setVal('cie-overage', tier.overage);

  // Batch selector
  const batchEl = document.getElementById('cie-batch');
  if (batchEl) {
    batchEl.innerHTML = tier.batch.map(b => {
      const [v, l] = b.split(':');
      return `<option value="${v}">${l}</option>`;
    }).join('');
  }

  // Module availability
  const modNames = ['ingestion', 'emission', 'benchmark', 'passport', 'overclaim', 'lineage', 'governance', 'blockchain', 'export'];
  modNames.forEach(m => {
    const info = tier.mods[m];
    if (!info) return;
    set('mod-' + m + '-p', info[0]);
    set('mod-' + m + '-d', info[1]);
    const priceEl = document.getElementById('mod-' + m + '-p');
    if (priceEl) {
      const isOk = info[0].startsWith('✓');
      const isNa = info[0].startsWith('—') || info[0] === 'Not available';
      priceEl.style.color = isOk ? '#10b981' : isNa ? '#64748b' : '#f59e0b';
    }
  });

  // Enterprise deal config visibility
  const entEl = document.getElementById('ent-config');
  if (entEl) entEl.style.display = tier.showEnt ? 'block' : 'none';
  if (tier.entTitle) set('ent-config-title', tier.entTitle);

  // Show/hide enterprise deal fields vs API fields
  const dealFields = document.getElementById('ent-deal-fields');
  const apiFields = document.getElementById('ent-api-fields');
  if (dealFields) dealFields.style.display = plan === 'large_enterprise' ? 'grid' : 'none';
  if (apiFields) apiFields.style.display = ['buyer', 'bank'].includes(plan) ? 'block' : 'none';
};
window._saSuspend = (id) => suspendTenant(id);
window._saActivate = (id) => activateTenant(id);
