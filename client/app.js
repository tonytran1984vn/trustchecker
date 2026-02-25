/**
 * <span class="status-icon status-warn" aria-label="Warning">!</span>  DEPRECATED — DO NOT USE OR MODIFY
 * ══════════════════════════════════════════════════════════════
 * This monolithic file (3700+ lines) has been fully replaced by the
 * modular ES6 architecture loaded via main.js (see index.html line 33).
 *
 * The modular equivalent lives in:
 *   - core/    → state, api, router, features, websocket, error-boundary
 *   - pages/   → dashboard, products, scanner, settings, admin-users, etc.
 *   - components/ → sidebar, header, toast, notifications, search
 *   - services/   → auth, branding, i18n, csv-export
 *
 * This file is kept ONLY as a historical reference.
 * It is NOT loaded in production (commented out in index.html).
 * Safe to delete when comfortable with the modular version.
 * ══════════════════════════════════════════════════════════════
 *
 * TrustChecker SPA – Legacy Frontend Application (pre-v9.6)
 * Distributed Digital Trust Infrastructure Dashboard
 */

// ─── API Client ──────────────────────────────────────────────
const API = {
  base: window.location.origin + '/api',
  token: localStorage.getItem('tc_token'),
  refreshToken: localStorage.getItem('tc_refresh'),
  _refreshing: null,

  async request(method, path, body, _isRetry) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (this.token) opts.headers['Authorization'] = `Bearer ${this.token}`;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(this.base + path, opts);
    const data = await res.json();

    // Auto-refresh on token expiry
    if (res.status === 401 && data.code === 'TOKEN_EXPIRED' && !_isRetry && this.refreshToken) {
      await this.doRefresh();
      return this.request(method, path, body, true);
    }

    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  async doRefresh() {
    if (this._refreshing) return this._refreshing;
    this._refreshing = (async () => {
      try {
        const res = await fetch(this.base + '/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: this.refreshToken })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        this.setToken(data.token, data.refresh_token);
      } catch (e) {
        console.error('Token refresh failed:', e);
        this.clearToken();
        State.user = null;
        render();
      }
    })();
    await this._refreshing;
    this._refreshing = null;
  },

  get(p) { return this.request('GET', p); },
  post(p, b) { return this.request('POST', p, b); },
  put(p, b) { return this.request('PUT', p, b); },
  delete(p) { return this.request('DELETE', p); },

  setToken(t, r) {
    this.token = t; localStorage.setItem('tc_token', t);
    if (r) { this.refreshToken = r; localStorage.setItem('tc_refresh', r); }
  },
  clearToken() {
    this.token = null; this.refreshToken = null;
    localStorage.removeItem('tc_token'); localStorage.removeItem('tc_refresh'); localStorage.removeItem('tc_user');
  }
};

// ─── State ───────────────────────────────────────────────────
const State = {
  page: 'dashboard',
  user: JSON.parse(localStorage.getItem('tc_user') || 'null'),
  dashboardStats: null,
  products: [],
  fraudAlerts: [],
  scanHistory: [],
  blockchain: null,
  events: [],
  ws: null,
  modal: null,
  scanResult: null,
  toasts: [],
  // SCM state
  scmDashboard: null,
  scmInventory: null,
  scmShipments: null,
  scmPartners: null,
  scmLeaks: null,
  scmGraph: null,
  scmOptimization: null,
  scmForecast: null,
  scmSlaViolations: null,
  // Phase 6 state
  kycData: null,
  evidenceData: null,
  stakeholderData: null,
  billingData: null,
  // Phase 6B state
  publicData: null,
  // Phase 6C state
  notifications: JSON.parse(localStorage.getItem('tc_notifications') || '[]'),
  notifOpen: false,
  searchOpen: false,
  searchQuery: '',
  searchResults: null,
  // Phase 6D state
  integrationsSchema: null,
  integrationsData: null,
  // v9.1 — Feature flags & Branding
  featureFlags: JSON.parse(localStorage.getItem('tc_features') || '{}'),
  branding: JSON.parse(localStorage.getItem('tc_branding') || 'null'),
  plan: 'free',
  org: null,
};

// ─── Feature Flag System (v9.1) ──────────────────────────────
// Maps sidebar page IDs to backend feature keys from FEATURE_PLANS
const PAGE_FEATURE_MAP = {
  'fraud': 'fraud',
  'reports': 'reports',
  'scm-dashboard': 'scm_tracking',
  'scm-inventory': 'inventory',
  'scm-logistics': 'logistics',
  'scm-partners': 'partners',
  'scm-leaks': 'leaks',
  'scm-trustgraph': 'trust_graph',
  'scm-epcis': 'epcis',
  'scm-ai': 'ai_forecast',
  'scm-risk-radar': 'risk_radar',
  'scm-carbon': 'carbon',
  'scm-twin': 'digital_twin',
  'kyc': 'kyc',
  'evidence': 'evidence',
  'sustainability': 'sustainability',
  'compliance': 'compliance',
  'anomaly': 'anomaly',
  'nft': 'nft',
  'wallet': 'wallet',
  'branding': 'branding',
  'blockchain': 'blockchain',
  'integrations': 'integrations',
};

const PLAN_NAMES = {
  free: 'Free',
  core: 'Core — $29/mo',
  pro: 'Pro — $79/mo',
  enterprise: 'Enterprise — $199/mo',
};

const FEATURE_REQUIRED_PLAN = {
  products: 'free', qr: 'free', dashboard: 'free',
  fraud: 'core', reports: 'core', scm_tracking: 'core', support: 'core',
  inventory: 'pro', logistics: 'pro', partners: 'pro', ai_forecast: 'pro',
  demand_sensing: 'pro', risk_radar: 'pro', anomaly: 'pro', kyc: 'pro',
  compliance: 'pro', evidence: 'pro', sustainability: 'pro',
  leaks: 'pro', trust_graph: 'pro', what_if: 'pro', monte_carlo: 'pro',
  carbon: 'enterprise', digital_twin: 'enterprise', epcis: 'enterprise',
  blockchain: 'enterprise', nft: 'enterprise', branding: 'enterprise',
  wallet: 'enterprise', webhooks: 'enterprise', integrations: 'enterprise',
  white_label: 'enterprise',
};

function hasFeature(featureKey) {
  if (!featureKey) return true; // No gate = always visible
  if (State.user?.role === 'admin') return true; // Admin bypass
  return State.featureFlags[featureKey] === true;
}

function getRequiredPlanForFeature(featureKey) {
  return FEATURE_REQUIRED_PLAN[featureKey] || 'enterprise';
}

async function loadFeatureFlags() {
  try {
    const data = await API.get('/auth/me');
    if (data.feature_flags) {
      State.featureFlags = data.feature_flags;
      State.plan = data.user?.plan || 'free';
      State.org = data.user?.org || null;
      localStorage.setItem('tc_features', JSON.stringify(data.feature_flags));
    }
  } catch (e) {
    console.warn('[features] Could not load feature flags:', e.message);
  }
}

function showUpgradeModal(featureKey) {
  const requiredPlan = getRequiredPlanForFeature(featureKey);
  const planName = PLAN_NAMES[requiredPlan] || requiredPlan;
  State.modal = {
    title: '🔒 Feature Locked',
    body: `
      <div style="text-align:center;padding:20px">
        <div style="font-size:48px;margin-bottom:16px">🔐</div>
        <h3 style="margin-bottom:8px">Upgrade Required</h3>
        <p style="color:var(--text-secondary);margin-bottom:20px">
          This feature requires the <strong>${planName}</strong> plan.
          <br>Your current plan: <strong>${PLAN_NAMES[State.plan] || State.plan}</strong>
        </p>
        <button class="btn btn-primary" onclick="navigate('pricing')">View Plans & Upgrade</button>
      </div>
    `,
  };
  render();
}

// ─── White-Label / Dynamic Branding (v9.1) ───────────────────
async function loadBranding() {
  try {
    const data = await API.get('/branding');
    if (data && data.config) {
      State.branding = data.config;
      localStorage.setItem('tc_branding', JSON.stringify(data.config));
      applyBranding(data.config);
    }
  } catch (e) {
    // Branding not available — use defaults
    applyBranding(null);
  }
}

function applyBranding(config) {
  const root = document.documentElement;
  if (!config) return;

  // Apply CSS variables
  if (config.primary_color) root.style.setProperty('--primary', config.primary_color);
  if (config.accent_color) root.style.setProperty('--accent', config.accent_color);
  if (config.bg_color) root.style.setProperty('--bg-primary', config.bg_color);

  // Apply logo
  if (config.logo_url) {
    const logoEl = document.querySelector('.logo-icon');
    if (logoEl) logoEl.innerHTML = `<img src="${escapeHTML(config.logo_url)}" alt="Logo" style="width:32px;height:32px;border-radius:8px">`;
  }

  // Apply app name
  if (config.app_name) {
    document.title = config.app_name;
    const nameEl = document.querySelector('.logo-text');
    if (nameEl) nameEl.textContent = config.app_name;
  }

  // Apply favicon
  if (config.favicon_url) {
    let link = document.querySelector('link[rel~="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = config.favicon_url;
  }
}

// ─── WebSocket ───────────────────────────────────────────────
function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  State.ws = new WebSocket(`${proto}//${location.host}/ws`);
  State.ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      State.events.unshift(msg);
      if (State.events.length > 100) State.events.pop();
      // Re-render event feed if on dashboard
      const feed = document.getElementById('event-feed');
      if (feed) feed.innerHTML = renderEventFeed();
      // Push to notification center
      const notif = {
        id: Date.now(),
        type: msg.type,
        title: msg.type === 'FraudFlagged' ? '🚨 Fraud Alert' : msg.type === 'ScanEvent' ? '📱 New Scan' : '📢 ' + msg.type,
        message: msg.data?.description || msg.data?.product_name || msg.type,
        time: new Date().toISOString(),
        read: false
      };
      State.notifications.unshift(notif);
      if (State.notifications.length > 50) State.notifications.pop();
      localStorage.setItem('tc_notifications', JSON.stringify(State.notifications));
      updateNotifBadge();
      // Show toast for important events
      if (msg.type === 'FraudFlagged') {
        showToast('🚨 Fraud Alert: ' + (msg.data?.description || msg.data?.type || 'New alert'), 'error');
      }
    } catch (e) { }
  };
  State.ws.onclose = () => setTimeout(connectWS, 3000);
}

// ─── Toast ───────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const id = Date.now();
  State.toasts.push({ id, msg, type });
  renderToasts();
  setTimeout(() => {
    State.toasts = State.toasts.filter(t => t.id !== id);
    renderToasts();
  }, 4000);
}

function renderToasts() {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; c.className = 'toast-container'; document.body.appendChild(c); }
  c.innerHTML = State.toasts.map(t => `<div class="toast ${escapeHTML(t.type)}">${t.msg}</div>`).join('');
}

// ─── Notification Center ─────────────────────────────────────
function updateNotifBadge() {
  const badge = document.getElementById('notif-badge');
  const unread = State.notifications.filter(n => !n.read).length;
  if (badge) {
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';
  }
}

function toggleNotifications() {
  State.notifOpen = !State.notifOpen;
  State.searchOpen = false;
  const panel = document.getElementById('notif-panel');
  if (panel) panel.style.display = State.notifOpen ? 'block' : 'none';
  const search = document.getElementById('search-panel');
  if (search) search.style.display = 'none';
  if (State.notifOpen) renderNotifPanel();
}

function renderNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const notifs = State.notifications.slice(0, 20);
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border)">
      <span style="font-weight:700;font-size:0.9rem">🔔 Notifications</span>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm" onclick="markAllRead()" style="font-size:0.7rem">Mark all read</button>
        <button class="btn btn-sm" onclick="clearNotifications()" style="font-size:0.7rem">Clear</button>
      </div>
    </div>
    <div style="max-height:400px;overflow-y:auto">
      ${notifs.length ? notifs.map(n => `
        <div class="notif-item ${n.read ? 'read' : ''}" onclick="markNotifRead(${n.id})">
          <div style="font-weight:${n.read ? '400' : '600'};font-size:0.82rem">${escapeHTML(n.title)}</div>
          <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">${escapeHTML(n.message)}</div>
          <div style="font-size:0.65rem;color:var(--text-muted);margin-top:4px">${timeAgo(n.time)}</div>
        </div>
      `).join('') : '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:0.82rem">No notifications</div>'}
    </div>
  `;
}

function markNotifRead(id) {
  const n = State.notifications.find(n => n.id === id);
  if (n) n.read = true;
  localStorage.setItem('tc_notifications', JSON.stringify(State.notifications));
  updateNotifBadge();
  renderNotifPanel();
}

function markAllRead() {
  State.notifications.forEach(n => n.read = true);
  localStorage.setItem('tc_notifications', JSON.stringify(State.notifications));
  updateNotifBadge();
  renderNotifPanel();
}

function clearNotifications() {
  State.notifications = [];
  localStorage.setItem('tc_notifications', '[]');
  updateNotifBadge();
  renderNotifPanel();
}

// ─── Global Search ──────────────────────────────────────────
function toggleSearch() {
  State.searchOpen = !State.searchOpen;
  State.notifOpen = false;
  const panel = document.getElementById('search-panel');
  if (panel) panel.style.display = State.searchOpen ? 'block' : 'none';
  const notif = document.getElementById('notif-panel');
  if (notif) notif.style.display = 'none';
  if (State.searchOpen) {
    setTimeout(() => {
      const input = document.getElementById('global-search-input');
      if (input) input.focus();
    }, 100);
  }
}

async function globalSearch(q) {
  State.searchQuery = q;
  if (!q || q.length < 2) { State.searchResults = null; renderSearchResults(); return; }
  try {
    const [products, scans, evidence] = await Promise.all([
      API.get(`/products?search=${encodeURIComponent(q)}`),
      API.get(`/scans?limit=5`),
      API.get('/evidence')
    ]);
    State.searchResults = {
      products: (products.products || []).filter(p => (p.name + p.sku).toLowerCase().includes(q.toLowerCase())).slice(0, 5),
      scans: (scans.events || scans.scans || []).filter(s => (s.product_name || '').toLowerCase().includes(q.toLowerCase())).slice(0, 5),
      evidence: (evidence.items || []).filter(e => (e.title + e.description).toLowerCase().includes(q.toLowerCase())).slice(0, 5)
    };
    renderSearchResults();
  } catch (e) { State.searchResults = null; renderSearchResults(); }
}

function renderSearchResults() {
  const container = document.getElementById('search-results');
  if (!container) return;
  const r = State.searchResults;
  if (!r) { container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.82rem">Type to search across products, scans, evidence…</div>'; return; }
  const total = (r.products?.length || 0) + (r.scans?.length || 0) + (r.evidence?.length || 0);
  container.innerHTML = `
    <div style="padding:8px 16px;font-size:0.72rem;color:var(--text-muted);border-bottom:1px solid var(--border)">${total} results for "${escapeHTML(State.searchQuery)}"</div>
    ${r.products?.length ? `
      <div style="padding:8px 16px;font-size:0.7rem;font-weight:700;color:var(--cyan);text-transform:uppercase;letter-spacing:1px">📦 Products</div>
      ${r.products.map(p => `
        <div class="search-item" onclick="toggleSearch();navigate('products');setTimeout(()=>showProductDetail('${escapeHTML(p.id)}'),300)">
          <span style="font-weight:600">${escapeHTML(p.name)}</span>
          <span style="font-size:0.72rem;color:var(--text-muted)">${escapeHTML(p.sku)}</span>
        </div>
      `).join('')}
    ` : ''}
    ${r.scans?.length ? `
      <div style="padding:8px 16px;font-size:0.7rem;font-weight:700;color:var(--emerald);text-transform:uppercase;letter-spacing:1px">🔍 Scans</div>
      ${r.scans.map(s => `
        <div class="search-item" onclick="toggleSearch();navigate('scans')">
          <span style="font-weight:600">${s.product_name || 'Scan'}</span>
          <span class="badge ${s.result}" style="font-size:0.65rem">${s.result}</span>
        </div>
      `).join('')}
    ` : ''}
    ${r.evidence?.length ? `
      <div style="padding:8px 16px;font-size:0.7rem;font-weight:700;color:var(--amber);text-transform:uppercase;letter-spacing:1px">🔒 Evidence</div>
      ${r.evidence.map(e => `
        <div class="search-item" onclick="toggleSearch();navigate('evidence')">
          <span style="font-weight:600">${e.title}</span>
          <span style="font-size:0.72rem;color:var(--text-muted)">${e.file_type}</span>
        </div>
      `).join('')}
    ` : ''}
    ${total === 0 ? '<div style="padding:20px;text-align:center;color:var(--text-muted)">No results found</div>' : ''}
  `;
}

// ─── CSV Export ──────────────────────────────────────────────
function exportCSV(filename, headers, rows) {
  const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(`📊 ${filename} exported successfully`, 'success');
}

function exportProductsCSV() {
  exportCSV('products.csv',
    ['Name', 'SKU', 'Category', 'Manufacturer', 'Origin', 'Trust Score', 'Status'],
    State.products.map(p => [p.name, p.sku, p.category, p.manufacturer, p.origin_country, p.trust_score, p.status])
  );
}

function exportScansCSV() {
  exportCSV('scan-history.csv',
    ['Product', 'Result', 'Fraud %', 'Trust Score', 'City', 'Country', 'Response ms', 'Time'],
    (State.scanHistory || []).map(s => [s.product_name, s.result, (s.fraud_score * 100).toFixed(1), s.trust_score, s.geo_city, s.geo_country, s.response_time_ms, s.scanned_at])
  );
}

function exportEvidenceCSV() {
  const items = State.evidenceData?.items || [];
  exportCSV('evidence.csv',
    ['Title', 'Description', 'Type', 'Size', 'SHA-256', 'Status', 'Created'],
    items.map(e => [e.title, e.description, e.file_type, e.file_size, e.sha256_hash, e.blockchain_seal_id ? 'Anchored' : 'Pending', e.created_at])
  );
}

function exportFraudCSV() {
  exportCSV('fraud-alerts.csv',
    ['Type', 'Description', 'Severity', 'Product', 'Status', 'Time'],
    State.fraudAlerts.map(a => [a.alert_type, a.description, a.severity, a.product_name, a.status, a.created_at])
  );
}

// ─── Router ──────────────────────────────────────────────────
const _appBasePath = (() => {
  const p = window.location.pathname;
  const match = p.match(/^(\/[^/]+\/)/);
  if (match && match[1] !== '/api/' && match[1] !== '/ws/') return match[1].replace(/\/$/, '');
  return '';
})();

function navigate(page) {
  // v9.1: Block navigation to locked features
  const featureKey = PAGE_FEATURE_MAP[page];
  if (featureKey && !hasFeature(featureKey)) {
    showUpgradeModal(featureKey);
    return;
  }
  State.page = page;
  // Update browser URL
  const url = _appBasePath + '/' + page;
  history.pushState({ page }, '', url);
  render();
  loadPageData(page);
}

async function loadPageData(page) {
  try {
    if (page === 'dashboard') {
      State.dashboardStats = await API.get('/qr/dashboard-stats');
      render();
      setTimeout(() => initDashboardCharts(), 50);
    } else if (page === 'products') {
      const res = await API.get('/products');
      State.products = res.products || [];
      render();
    } else if (page === 'fraud') {
      const res = await API.get('/qr/fraud-alerts?status=open&limit=50');
      State.fraudAlerts = res.alerts || [];
      render();
    } else if (page === 'scans') {
      const res = await API.get('/qr/scan-history?limit=50');
      State.scanHistory = res.scans || [];
      render();
    } else if (page === 'blockchain') {
      State.blockchain = await API.get('/qr/blockchain');
      render();
    } else if (page === 'scm-dashboard') {
      State.scmDashboard = await API.get('/scm/dashboard');
      render();
    } else if (page === 'scm-inventory') {
      State.scmInventory = await API.get('/scm/inventory');
      State.scmForecast = await API.get('/scm/inventory/forecast');
      render();
    } else if (page === 'scm-logistics') {
      const [ships, sla, opt] = await Promise.all([
        API.get('/scm/shipments'),
        API.get('/scm/sla/violations'),
        API.get('/scm/optimization')
      ]);
      State.scmShipments = ships;
      State.scmSlaViolations = sla;
      State.scmOptimization = opt;
      render();
    } else if (page === 'scm-partners') {
      const res = await API.get('/scm/partners');
      State.scmPartners = res.partners || [];
      render();
    } else if (page === 'scm-leaks') {
      State.scmLeaks = await API.get('/scm/leaks/stats');
      render();
    } else if (page === 'scm-trustgraph') {
      State.scmGraph = await API.get('/scm/graph/analysis');
      render();
    } else if (page === 'kyc') {
      const [stats, biz] = await Promise.all([API.get('/kyc/stats'), API.get('/kyc/businesses')]);
      State.kycData = { stats, businesses: biz.businesses || [] };
      render();
    } else if (page === 'evidence') {
      const [stats, items] = await Promise.all([API.get('/evidence/stats'), API.get('/evidence')]);
      State.evidenceData = { stats, items: items.items || [] };
      render();
    } else if (page === 'stakeholder') {
      const [dashboard, certs, compliance] = await Promise.all([
        API.get('/trust/dashboard'), API.get('/trust/certifications'), API.get('/trust/compliance')
      ]);
      State.stakeholderData = { dashboard, certifications: certs.certifications || [], compliance: compliance.records || [] };
      render();
    } else if (page === 'billing') {
      const [planRes, usageRes, invoiceRes] = await Promise.all([
        API.get('/billing/plan'),
        API.get('/billing/usage'),
        API.get('/billing/invoices'),
      ]);
      State.billingData = { plan: planRes.plan, available: planRes.available_plans, period: usageRes.period, usage: usageRes.usage, invoices: invoiceRes.invoices };
      render();
    } else if (page === 'pricing') {
      try {
        const res = await fetch(API.base + '/billing/pricing');
        if (res.ok) {
          State.pricingData = await res.json();
        } else {
          throw new Error('HTTP ' + res.status);
        }
      } catch (e) {
        console.warn('[app] Pricing fetch failed, using static fallback:', e.message);
        State.pricingData = {
          plans: {
            free: { name: 'Free', slug: 'free', tagline: 'Get started with product verification', price_monthly: 0, price_annual: 0, limits: { scans: 500, api_calls: 1000, storage_mb: 100, nft_mints: 0, carbon_calcs: 0 }, features: ['Basic QR verification', 'Public trust check page'], sla: null, badge: null },
            starter: { name: 'Starter', slug: 'starter', tagline: 'For growing brands building trust', price_monthly: 49, price_annual: 470, limits: { scans: 5000, api_calls: 10000, storage_mb: 1024, nft_mints: 10, carbon_calcs: 100 }, features: ['Everything in Free', 'Fraud detection alerts'], sla: '99%', badge: null },
            pro: { name: 'Pro', slug: 'pro', tagline: 'Advanced trust infrastructure for scale', price_monthly: 199, price_annual: 1910, limits: { scans: 25000, api_calls: 100000, storage_mb: 10240, nft_mints: 100, carbon_calcs: 1000 }, features: ['Everything in Starter', 'AI anomaly detection'], sla: '99.5%', badge: 'POPULAR' },
            business: { name: 'Business', slug: 'business', tagline: 'Full-stack trust for enterprise brands', price_monthly: 499, price_annual: 4790, limits: { scans: 100000, api_calls: 500000, storage_mb: 51200, nft_mints: 500, carbon_calcs: 5000 }, features: ['Everything in Pro', 'Digital twin simulation'], sla: '99.9%', badge: null },
            enterprise: { name: 'Enterprise', slug: 'enterprise', tagline: 'Custom deployment with white-glove service', price_monthly: null, price_annual: null, limits: { scans: -1, api_calls: -1, storage_mb: -1, nft_mints: -1, carbon_calcs: -1 }, features: ['Everything in Business', 'On-premise deployment'], sla: '99.95%', badge: null },
          },
          usage_pricing: {
            scans: { name: 'QR Scans', unit: 'scan', tiers: [{ up_to: 1000, price: 0.05 }, { up_to: 10000, price: 0.03 }, { up_to: 50000, price: 0.02 }, { up_to: null, price: 0.01 }] },
            nft_mints: { name: 'NFT Certificate Mints', unit: 'mint', tiers: [{ up_to: 50, price: 2.00 }, { up_to: 200, price: 1.50 }, { up_to: null, price: 0.50 }] },
            carbon_calcs: { name: 'Carbon Calculations', unit: 'calculation', tiers: [{ up_to: null, price: 0.01 }], bundle: { size: 1000, price: 10.00 } },
            api_calls: { name: 'API Calls', unit: 'call', tiers: [{ up_to: null, price: 0.001 }] },
          },
          currency: 'USD', annual_discount_percent: 20, free_trial_days: 14,
        };
      }
      render();
    } else if (page === 'public-dashboard') {
      const [stats, trends, trustDist, scanResults, alertSev] = await Promise.all([
        fetch('/api/public/stats').then(r => r.json()),
        fetch('/api/public/scan-trends').then(r => r.json()),
        fetch('/api/public/trust-distribution').then(r => r.json()),
        fetch('/api/public/scan-results').then(r => r.json()),
        fetch('/api/public/alert-severity').then(r => r.json())
      ]);
      State.publicData = { stats, trends, trustDist, scanResults, alertSev };
      render();
      setTimeout(() => initPublicCharts(), 50);
    } else if (page === 'api-docs') {
      render();
    } else if (page === 'settings') {
      render();
      loadSettingsData();
      return; // loadSettingsData does its own rendering
    } else if (page === 'admin-users') {
      render();
      loadAdminUsers();
      return;
    } else if (page === 'integrations') {
      try {
        const [schema, data] = await Promise.all([
          API.get('/integrations/schema'),
          API.get('/integrations')
        ]);
        State.integrationsSchema = schema;
        State.integrationsData = data;
      } catch (e) { }
    } else if (page === 'scm-epcis') {
      const [events, stats] = await Promise.all([API.get('/scm/epcis/events'), API.get('/scm/epcis/stats')]);
      State.epcisData = { events: events.events || [], stats };
      render();
    } else if (page === 'scm-ai') {
      const [forecast, sensing] = await Promise.all([API.get('/scm/ai/forecast-demand'), API.get('/scm/ai/demand-sensing')]);
      State.aiData = { forecast, sensing };
      render();
    } else if (page === 'scm-risk-radar') {
      const [radar, heatmap, alerts] = await Promise.all([API.get('/scm/risk/radar'), API.get('/scm/risk/heatmap'), API.get('/scm/risk/alerts')]);
      State.riskRadarData = { radar, heatmap, alerts };
      render();
    } else if (page === 'scm-carbon') {
      const [scope, leaderboard, report] = await Promise.all([API.get('/scm/carbon/scope'), API.get('/scm/carbon/leaderboard'), API.get('/scm/carbon/report')]);
      State.carbonData = { scope, leaderboard, report };
      render();
    } else if (page === 'scm-twin') {
      const [model, kpis, anomalies] = await Promise.all([API.get('/scm/twin/model'), API.get('/scm/twin/kpis'), API.get('/scm/twin/anomalies')]);
      State.twinData = { model, kpis, anomalies };
      render();
    } else if (page === 'sustainability') {
      const [stats, scores] = await Promise.all([API.get('/sustainability/stats'), API.get('/sustainability/leaderboard')]);
      State.sustainData = { stats, scores: scores.scores || [] };
      render();
    } else if (page === 'compliance') {
      const [stats, records, policies] = await Promise.all([API.get('/compliance/stats'), API.get('/compliance/records'), API.get('/compliance/retention')]);
      State.complianceData = { stats, records: records.records || [], policies: policies.policies || [] };
      render();
    } else if (page === 'anomaly') {
      const res = await API.get('/anomaly?limit=50');
      State.anomalyData = res;
      render();
    } else if (page === 'reports') {
      const res = await API.get('/reports/templates');
      State.reportsData = res;
      render();
    } else if (page === 'nft') {
      const res = await API.get('/nft');
      State.nftData = res;
      render();
    } else if (page === 'wallet') {
      const [wallets, txns] = await Promise.all([API.get('/wallet/wallets'), API.get('/wallet/transactions')]);
      State.walletData = { wallets: wallets.wallets || [], transactions: txns.transactions || [] };
      render();
    } else if (page === 'branding') {
      const res = await API.get('/branding');
      State.brandingData = res;
      render();
    }
  } catch (e) {
    console.error('Load data error:', e);
  }
}

// ─── Helpers ─────────────────────────────────────────────────
function timeAgo(date) {
  if (!date) return '—';
  let d = new Date(date);
  if (isNaN(d.getTime())) d = new Date(date + 'Z');
  if (isNaN(d.getTime())) return '—';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 0) {
    const abs = Math.abs(s);
    if (abs < 3600) return 'in ' + Math.floor(abs / 60) + 'm';
    if (abs < 86400) return 'in ' + Math.floor(abs / 3600) + 'h';
    return 'in ' + Math.floor(abs / 86400) + 'd';
  }
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function shortHash(h) { return h ? h.substring(0, 12) + '...' : '—'; }

function scoreColor(s) {
  if (s >= 80) return 'var(--emerald)';
  if (s >= 60) return 'var(--amber)';
  return 'var(--rose)';
}

function eventIcon(type) {
  const icons = {
    'QRScanned': '📱', 'QRValidated': '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', 'QRInvalid': '<span class="status-icon status-fail" aria-label="Fail">✗</span>',
    'FraudFlagged': '🚨', 'FraudResolved': '✔️', 'TrustScoreUpdated': '📊',
    'ProductRegistered': '📦', 'BlockchainSealed': '🔗', 'UserLogin': '👤',
    'CONNECTED': '🔌', 'SystemAlert': '⚡'
  };
  return icons[type] || '📋';
}

// ─── RENDER ──────────────────────────────────────────────────
function render() {
  const app = document.getElementById('app');
  if (!State.user || !API.token) {
    app.innerHTML = renderLogin();
    return;
  }
  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar()}
      <div class="main-content">
        ${renderPageHeader()}
        <div class="page-body">${renderPage()}</div>
      </div>
    </div>
  `;
  if (State.modal) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) { State.modal = null; render(); } };
    overlay.innerHTML = State.modal;
    document.body.appendChild(overlay);
  }
}

// ─── Login ───────────────────────────────────────────────────
let _mfaToken = null; // temporary MFA challenge token

function renderLogin() {
  if (_mfaToken) {
    return `
      <div class="login-page">
        <div class="login-card">
          <div class="login-logo">🔐</div>
          <div class="login-title">Two-Factor Authentication</div>
          <div class="login-subtitle">Enter the 6-digit code from your authenticator app</div>
          <div id="login-error" class="login-error" style="display:none"></div>
          <div class="input-group">
            <label>MFA Code</label>
            <input class="input mfa-code-input" id="mfa-code" type="text" maxlength="6" placeholder="000000" autocomplete="one-time-code" autofocus
              oninput="if(this.value.length===6) doMfaVerify()" onkeydown="if(event.key==='Enter') doMfaVerify()">
          </div>
          <button class="btn btn-primary" style="width:100%;padding:12px;margin-top:8px" onclick="doMfaVerify()"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Verify</button>
          <button class="btn btn-sm" style="width:100%;margin-top:8px;opacity:0.7" onclick="_mfaToken=null;render()">← Back to Login</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">🛡️</div>
        <div class="login-title">TrustChecker</div>
        <div class="login-subtitle">Digital Trust Infrastructure v9.0.0</div>
        <div id="login-error" class="login-error" style="display:none"></div>
        <div class="input-group">
          <label>Email</label>
          <input class="input" id="login-user" type="email" placeholder="admin@company.com" autocomplete="email">
        </div>
        <div class="input-group">
          <label>Password</label>
          <input class="input" id="login-pass" type="password" placeholder="Enter password"
            onkeydown="if(event.key==='Enter') doLogin()">
        </div>
        <button class="btn btn-primary" style="width:100%;padding:12px;margin-top:8px" onclick="doLogin()">🔐 Sign In</button>
        <div style="margin-top:16px;font-size:0.7rem;color:var(--text-muted)">Enterprise Identity System</div>
      </div>
    </div>
  `;
}

async function doLogin() {
  const email = document.getElementById('login-user').value;
  const password = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  try {
    const res = await API.post('/auth/login', { email, password });

    // MFA required — show code input
    if (res.mfa_required) {
      _mfaToken = res.mfa_token;
      render();
      setTimeout(() => document.getElementById('mfa-code')?.focus(), 100);
      return;
    }

    // Force password change
    if (res.must_change_password) {
      errEl.style.display = 'block';
      errEl.textContent = '🔒 Password change required. Please contact your admin.';
      return;
    }

    API.setToken(res.token, res.refresh_token);
    State.user = res.user;
    State.plan = res.user?.plan || 'free';
    localStorage.setItem('tc_user', JSON.stringify(res.user));

    // v9.1: Load feature flags + branding after login
    await Promise.all([loadFeatureFlags(), loadBranding()]);

    connectWS();
    // Role-aware landing page
    const landingPage = {
      org_owner: 'owner-governance', super_admin: 'control-tower',
      executive: 'exec-overview', ops_manager: 'ops-dashboard',
    }[res.user.role] || 'dashboard';
    navigate(landingPage);
    showToast('✓ Welcome back, ' + escapeHTML(res.user.email), 'success');

    // P3: Security warnings from backend
    if (res.security_warning) {
      setTimeout(() => showToast('🌐 ' + res.security_warning.message, 'warning'), 1500);
    }
    if (res.expired_roles && res.expired_roles.length > 0) {
      setTimeout(() => showToast('⏰ Expired roles removed: ' + res.expired_roles.join(', '), 'info'), 2500);
    }
  } catch (e) {
    errEl.style.display = 'block';
    errEl.textContent = e.message;
  }
}

async function doMfaVerify() {
  const code = document.getElementById('mfa-code')?.value;
  const errEl = document.getElementById('login-error');
  if (!code || code.length !== 6) return;
  try {
    const res = await API.post('/auth/login', { mfa_token: _mfaToken, mfa_code: code });
    _mfaToken = null;
    API.setToken(res.token, res.refresh_token);
    State.user = res.user;
    localStorage.setItem('tc_user', JSON.stringify(res.user));
    connectWS();
    const landingPage = { org_owner: 'owner-governance', super_admin: 'control-tower', executive: 'exec-overview' }[res.user.role] || 'dashboard';
    navigate(landingPage);
    showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Welcome back, ' + escapeHTML(res.user.email) + ' (MFA verified)', 'success');
  } catch (e) {
    errEl.style.display = 'block';
    errEl.textContent = e.message;
  }
}

function doLogout() {
  API.clearToken();
  State.user = null;
  render();
}

// ─── SVG Icon Helper (inline, no module import) ─────────────
const _svgI = (d, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const _IC = {
  dashboard: (s) => _svgI('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="11" width="7" height="10" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>', s),
  scanner: (s) => _svgI('<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/>', s),
  products: (s) => _svgI('<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>', s),
  search: (s) => _svgI('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', s),
  alert: (s) => _svgI('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', s),
  blockchain: (s) => _svgI('<rect x="14" y="14" width="8" height="8" rx="2"/><rect x="2" y="2" width="8" height="8" rx="2"/><path d="M7 14v1a2 2 0 0 0 2 2h1"/><path d="M14 7h1a2 2 0 0 1 2 2v1"/>', s),
  building: (s) => _svgI('<rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>', s),
  lock: (s) => _svgI('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', s),
  star: (s) => _svgI('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>', s),
  factory: (s) => _svgI('<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>', s),
  clipboard: (s) => _svgI('<rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>', s),
  truck: (s) => _svgI('<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>', s),
  handshake: (s) => _svgI('<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>', s),
  network: (s) => _svgI('<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>', s),
  satellite: (s) => _svgI('<path d="M13 7 9 3 5 7l4 4"/><path d="m17 11 4 4-4 4-4-4"/><path d="m8 12 4 4 6-6-4-4Z"/><path d="m16 8 3-3"/><path d="M9 21a6 6 0 0 0-6-6"/>', s),
  brain: (s) => _svgI('<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>', s),
  target: (s) => _svgI('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>', s),
  leaf: (s) => _svgI('<path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>', s),
  mirror: (s) => _svgI('<path d="M9.5 2A5.5 5.5 0 0 0 5 9.5a5.5 5.5 0 0 0 4.5 5.41V22h5v-7.09A5.5 5.5 0 0 0 19 9.5 5.5 5.5 0 0 0 14.5 4H14V2Z"/>', s),
  recycle: (s) => _svgI('<path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/><path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/><path d="m14 16-3 3 3 3"/><path d="M8.293 13.596 7.196 9.5 3.1 10.598"/><path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"/><path d="m13.378 9.633 4.096 1.098 1.097-4.096"/>', s),
  scroll: (s) => _svgI('<path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/>', s),
  zap: (s) => _svgI('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>', s),
  barChart: (s) => _svgI('<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>', s),
  palette: (s) => _svgI('<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z"/>', s),
  wallet: (s) => _svgI('<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>', s),
  plug: (s) => _svgI('<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6V8Z"/>', s),
  radio: (s) => _svgI('<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>', s),
  creditCard: (s) => _svgI('<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>', s),
  tag: (s) => _svgI('<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>', s),
  globe: (s) => _svgI('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>', s),
  book: (s) => _svgI('<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>', s),
  settings: (s) => _svgI('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>', s),
  users: (s) => _svgI('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', s),
  logout: (s) => _svgI('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>', s),
  shield: (s) => _svgI('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>', s),
};
function _i(name, size) { return (_IC[name] || (() => ''))(size); }

// ─── Sidebar (v9.6 — SVG Icons) ─────────────────────────────
function renderNavItem(n) {
  const featureKey = PAGE_FEATURE_MAP[n.id];
  const isLocked = featureKey && !hasFeature(featureKey);
  const activeClass = State.page === n.id ? 'active' : '';
  const lockedClass = isLocked ? 'nav-locked' : '';

  if (isLocked) {
    const requiredPlan = getRequiredPlanForFeature(featureKey);
    return `
      <div class="nav-item ${lockedClass}" onclick="showUpgradeModal('${featureKey}')" title="Requires ${PLAN_NAMES[requiredPlan] || requiredPlan} plan">
        <span class="nav-icon">${n.icon}</span>
        <span>${n.label}</span>
        <span class="nav-lock-icon">${_i('lock', 14)}</span>
      </div>
    `;
  }

  return `
    <div class="nav-item ${activeClass}" onclick="navigate('${n.id}')">
      <span class="nav-icon">${n.icon}</span>
      <span>${n.label}</span>
      ${n.badge ? `<span class="nav-badge">${n.badge}</span>` : ''}
    </div>
  `;
}

function renderSidebar() {

  // ── Role-Based Sidebar Configuration (v2.0) ──────────────────────
  // Each role maps to an array of page IDs they can see in the sidebar
  const ROLE_SIDEBAR_CONFIG = {
    // L5: Platform
    super_admin: '*', // sees everything
    platform_security: [
      'dashboard', 'fraud', 'kyc', 'evidence',
      'scm-leaks', 'scm-trustgraph',
      'compliance', 'anomaly', 'reports',
    ],
    data_gov_officer: [
      'dashboard',
      'sustainability', 'compliance', 'reports',
      'scm-carbon',
    ],
    // L4: Global Governance
    ggc_member: [
      'dashboard', 'scm-trustgraph',
      'sustainability', 'compliance', 'reports',
    ],
    risk_committee: [
      'dashboard', 'fraud', 'kyc', 'evidence',
      'scm-trustgraph', 'scm-risk-radar',
      'scm-ai',
      'compliance', 'anomaly', 'reports',
    ],
    compliance_officer: [
      'dashboard', 'evidence',
      'scm-carbon',
      'sustainability', 'compliance', 'anomaly', 'reports',
    ],
    ivu_validator: [
      'dashboard',
      'scm-trustgraph', 'scm-risk-radar',
      'scm-ai',
      'compliance', 'anomaly', 'reports',
    ],
    // L3: Tenant Governance
    org_owner: '*', // legal representative — full tenant oversight
    company_admin: '*', // operational tenant admin
    admin: '*', // company admin sees everything within tenant
    security_officer: [
      'dashboard', 'fraud', 'evidence',
      'scm-leaks', 'scm-trustgraph',
      'compliance', 'anomaly', 'reports',
    ],
    executive: [
      'dashboard', 'stakeholder',
      'scm-dashboard',
      'scm-risk-radar',
      'sustainability', 'compliance', 'reports',
    ],
    carbon_officer: [
      'dashboard',
      'scm-carbon',
      'sustainability', 'reports',
    ],
    // L2: Operational
    ops_manager: [
      'dashboard', 'scanner', 'products', 'scans', 'fraud', 'blockchain', 'kyc', 'evidence', 'stakeholder',
      'scm-dashboard', 'scm-inventory', 'scm-logistics', 'scm-partners', 'scm-leaks', 'scm-trustgraph',
      'scm-epcis', 'scm-ai', 'scm-risk-radar', 'scm-carbon', 'scm-twin',
      'sustainability', 'compliance', 'anomaly', 'reports',
      'nft', 'wallet', 'branding',
    ],
    risk_officer: [
      'dashboard', 'fraud', 'kyc', 'evidence',
      'scm-leaks', 'scm-trustgraph',
      'scm-ai', 'scm-risk-radar',
      'compliance', 'anomaly', 'reports',
    ],
    scm_analyst: [
      'dashboard', 'products', 'stakeholder',
      'scm-dashboard', 'scm-inventory', 'scm-logistics', 'scm-partners', 'scm-leaks', 'scm-trustgraph',
      'scm-epcis', 'scm-ai', 'scm-risk-radar', 'scm-carbon', 'scm-twin',
      'sustainability', 'reports',
    ],
    // L1: Technical Execution
    developer: [
      'dashboard', 'blockchain',
      'scm-epcis',
      'reports',
    ],
    blockchain_operator: [
      'dashboard', 'blockchain',
      'scm-carbon',
      'nft',
    ],
    operator: [
      'dashboard', 'scanner', 'products', 'scans', 'evidence',
      'scm-dashboard', 'scm-inventory', 'scm-logistics',
      'reports',
    ],
    auditor: [
      'dashboard',
      'compliance', 'reports',
    ],
    viewer: [
      'dashboard', 'products', 'scans',
      'reports',
    ],
  };

  // Get allowed pages for current role
  const role = State.user?.role || 'viewer';
  const allowedPages = ROLE_SIDEBAR_CONFIG[role] || ROLE_SIDEBAR_CONFIG.viewer;
  const isFullAccess = allowedPages === '*';
  const allowedSet = isFullAccess ? null : new Set(allowedPages);

  // Filter helper — show item only if role has access
  const filterItems = (items) => isFullAccess ? items : items.filter(n => allowedSet.has(n.id));

  const navItems = filterItems([
    { id: 'dashboard', icon: _i('dashboard'), label: 'Dashboard' },
    { id: 'scanner', icon: _i('scanner'), label: 'QR Scanner' },
    { id: 'products', icon: _i('products'), label: 'Products' },
    { id: 'scans', icon: _i('search'), label: 'Scan History' },
    { id: 'fraud', icon: _i('alert'), label: 'Fraud Center', badge: State.dashboardStats?.open_alerts || '' },
    { id: 'blockchain', icon: _i('blockchain'), label: 'Blockchain' },
    { id: 'kyc', icon: _i('building'), label: 'KYC Business' },
    { id: 'evidence', icon: _i('lock'), label: 'Evidence Vault' },
    { id: 'stakeholder', icon: _i('star'), label: 'Trust & Ratings' },
  ]);

  const scmItems = filterItems([
    { id: 'scm-dashboard', icon: _i('factory'), label: 'Supply Chain' },
    { id: 'scm-inventory', icon: _i('clipboard'), label: 'Inventory' },
    { id: 'scm-logistics', icon: _i('truck'), label: 'Logistics' },
    { id: 'scm-partners', icon: _i('handshake'), label: 'Partners' },
    { id: 'scm-leaks', icon: _i('search'), label: 'Leak Monitor' },
    { id: 'scm-trustgraph', icon: _i('network'), label: 'TrustGraph' },
  ]);

  const scmIntelItems = filterItems([
    { id: 'scm-epcis', icon: _i('satellite'), label: 'EPCIS 2.0' },
    { id: 'scm-ai', icon: _i('brain'), label: 'AI Analytics' },
    { id: 'scm-risk-radar', icon: _i('target'), label: 'Risk Radar' },
    { id: 'scm-carbon', icon: _i('leaf'), label: 'Carbon / ESG' },
    { id: 'scm-twin', icon: _i('mirror'), label: 'Digital Twin' },
  ]);

  const complianceItems = filterItems([
    { id: 'sustainability', icon: _i('recycle'), label: 'Sustainability' },
    { id: 'compliance', icon: _i('scroll'), label: 'GDPR Compliance' },
    { id: 'anomaly', icon: _i('zap'), label: 'Anomaly Monitor' },
    { id: 'reports', icon: _i('barChart'), label: 'Reports' },
  ]);

  const commerceItems = filterItems([
    { id: 'nft', icon: _i('palette'), label: 'NFT Certificates' },
    { id: 'wallet', icon: _i('wallet'), label: 'Wallet / Payment' },
    { id: 'branding', icon: _i('palette'), label: 'White-Label' },
  ]);

  // Org + plan info for sidebar
  const orgName = State.org?.name || '';
  const planLabel = PLAN_NAMES[State.plan] || State.plan;
  const brandName = State.branding?.app_name || 'TrustChecker';
  const versionLabel = `v9.6.0 • ${State.plan === 'enterprise' ? 'Enterprise' : planLabel}`;

  return `
    <div class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-icon">${_i('shield', 22)}</div>
          <div>
            <div class="logo-text">${brandName}</div>
            <div class="logo-version">${versionLabel}</div>
          </div>
        </div>
        ${orgName ? `<div class="sidebar-org" title="Organization: ${orgName}">
          <span style="font-size:11px;color:var(--text-secondary)">${_i('building', 12)} ${orgName}</span>
        </div>` : ''}
      </div>
      <div class="sidebar-nav">
        ${navItems.length ? `<div class="nav-section">
          <div class="nav-section-label">Main</div>
          ${navItems.map(n => renderNavItem(n)).join('')}
        </div>` : ''}
        ${scmItems.length ? `<div class="nav-section">
          <div class="nav-section-label">Supply Chain</div>
          ${scmItems.map(n => renderNavItem(n)).join('')}
        </div>` : ''}
        ${scmIntelItems.length ? `<div class="nav-section">
          <div class="nav-section-label">SCM Intelligence</div>
          ${scmIntelItems.map(n => renderNavItem(n)).join('')}
        </div>` : ''}
        ${complianceItems.length ? `<div class="nav-section">
          <div class="nav-section-label">Compliance & Reports</div>
          ${complianceItems.map(n => renderNavItem(n)).join('')}
        </div>` : ''}
        ${commerceItems.length ? `<div class="nav-section">
          <div class="nav-section-label">Commerce</div>
          ${commerceItems.map(n => renderNavItem(n)).join('')}
        </div>` : ''}
        ${isFullAccess || ['ops_manager', 'executive', 'developer'].includes(role) ? `<div class="nav-section">
          <div class="nav-section-label">System</div>
          ${isFullAccess || role === 'ops_manager' ? `
          <div class="nav-item ${State.page === 'events' ? 'active' : ''}" onclick="navigate('events')">
            <span class="nav-icon">${_i('radio')}</span><span>Event Stream</span>
          </div>` : ''}
          <div class="nav-item ${State.page === 'billing' ? 'active' : ''}" onclick="navigate('billing')">
            <span class="nav-icon">${_i('creditCard')}</span><span>Billing</span>
          </div>
          <div class="nav-item ${State.page === 'pricing' ? 'active' : ''}" onclick="navigate('pricing')">
            <span class="nav-icon">${_i('tag')}</span><span>Pricing</span>
          </div>
          ${isFullAccess ? `
          <div class="nav-item ${State.page === 'public-dashboard' ? 'active' : ''}" onclick="navigate('public-dashboard')">
            <span class="nav-icon">${_i('globe')}</span><span>Public Insights</span>
          </div>` : ''}
          ${isFullAccess || role === 'developer' ? `
          <div class="nav-item ${State.page === 'api-docs' ? 'active' : ''}" onclick="navigate('api-docs')">
            <span class="nav-icon">${_i('book')}</span><span>API Docs</span>
          </div>` : ''}
          <div class="nav-item ${State.page === 'settings' ? 'active' : ''}" onclick="navigate('settings')">
            <span class="nav-icon">${_i('settings')}</span><span>Settings</span>
          </div>
          ${role === 'admin' || role === 'super_admin' ? `
          <div class="nav-item ${State.page === 'admin-users' ? 'active' : ''}" onclick="navigate('admin-users')">
            <span class="nav-icon">${_i('users')}</span><span>User Management</span>
          </div>
          ${renderNavItem({ id: 'integrations', icon: _i('plug'), label: 'Integrations' })}` : ''}
        </div>` : ''}
      </div>
      <div class="sidebar-footer">
        <div class="user-avatar role-${State.user?.role || 'operator'}">${(State.user?.email || 'U')[0].toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${State.user?.email || 'User'}</div>
          <div class="user-role"><span class="role-badge role-${State.user?.role || 'operator'}">${State.user?.role || 'operator'}</span></div>
        </div>
        <button class="btn btn-sm" onclick="doLogout()" title="Logout" aria-label="Logout">${_i('logout', 18)}</button>
      </div>
    </div>
  `;
}

// ─── Page Header ─────────────────────────────────────────────
function renderPageHeader() {
  const titles = {
    dashboard: ['Dashboard', 'Real-time overview of trust infrastructure'],
    scanner: ['QR Scanner', 'Validate products in real-time'],
    products: ['Products', 'Manage registered products and QR codes'],
    scans: ['Scan History', 'Audit trail of all scan events'],
    fraud: ['Fraud Center', 'Monitor and investigate fraud alerts'],
    blockchain: ['Blockchain', 'Immutable hash seal verification'],
    events: ['Event Stream', 'Real-time system events'],
    'scm-dashboard': ['Supply Chain', 'End-to-end supply chain visibility'],
    'scm-inventory': ['Inventory', 'Stock levels, alerts & AI forecasting'],
    'scm-logistics': ['Logistics', 'Shipments, IoT & SLA monitoring'],
    'scm-partners': ['Partners', 'KYC, trust scoring & connector sync'],
    'scm-leaks': ['Leak Monitor', 'Marketplace scanning & gray market detection'],
    'scm-trustgraph': ['TrustGraph', 'Network analysis & toxic supplier detection'],
    'kyc': ['KYC Business', 'Business verification, sanction screening & GDPR'],
    'evidence': ['Evidence Vault', 'Tamper-proof digital evidence & blockchain anchoring'],
    'stakeholder': ['Trust & Ratings', 'Community ratings, certifications & compliance'],
    'billing': ['Billing & Usage', 'Plan management, usage metering & invoices'],
    'public-dashboard': ['Public Insights', 'Platform-wide statistics & transparency dashboard'],
    'api-docs': ['API Documentation', 'REST API endpoints & integration guide'],
    'settings': ['Settings', 'Security, MFA, password & session management'],
    'admin-users': ['User Management', 'Manage users, roles & permissions'],
    'integrations': ['Integrations', 'API keys & external service configuration'],
    'scm-epcis': ['EPCIS 2.0', 'GS1 EPCIS event tracking & compliance'],
    'scm-ai': ['AI Analytics', 'Holt-Winters forecasting, Monte Carlo risk & demand sensing'],
    'scm-risk-radar': ['Risk Radar', '8-dimensional supply chain threat assessment'],
    'scm-carbon': ['Carbon / ESG', 'Scope 1/2/3 emissions, carbon passport & GRI reporting'],
    'scm-twin': ['Digital Twin', 'Virtual supply chain model, KPIs & anomaly detection'],
    'sustainability': ['Sustainability', 'Environmental scoring & green certification'],
    'compliance': ['GDPR Compliance', 'Data protection, consent & retention management'],
    'anomaly': ['Anomaly Monitor', 'Real-time anomaly detection & AI scoring'],
    'reports': ['Reports', 'Custom report builder & data export'],
    'nft': ['NFT Certificates', 'Mint, transfer & verify product authentication NFTs'],
    'wallet': ['Wallet / Payment', 'Cryptocurrency wallets & payment management'],
    'branding': ['White-Label', 'Custom branding, themes & logo configuration'],
  };
  const [title, sub] = titles[State.page] || ['Page', ''];

  const unread = State.notifications.filter(n => !n.read).length;
  return `
    <div class="page-header">
      <div>
        <div class="page-title">${title}</div>
        <div class="page-subtitle">${sub}</div>
      </div>
      <div class="header-actions">
        <button class="header-icon-btn" onclick="toggleSearch()" title="Search">
          🔍
        </button>
        <div style="position:relative">
          <button class="header-icon-btn" onclick="toggleNotifications()" title="Notifications">
            🔔
            <span class="notif-count" id="notif-badge" style="display:${unread > 0 ? 'flex' : 'none'}">${unread > 9 ? '9+' : unread}</span>
          </button>
          <div class="dropdown-panel" id="notif-panel" style="display:none"></div>
        </div>
        <span class="status-dot green"></span>
        <span style="font-size:0.75rem;color:var(--text-muted)">System Online</span>
      </div>
    </div>
    <div class="dropdown-panel search-panel" id="search-panel" style="display:none;position:fixed;top:60px;left:50%;transform:translateX(-50%);width:560px;z-index:1000">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border)">
        <input class="form-input" id="global-search-input" placeholder="Search products, scans, evidence…" oninput="globalSearch(this.value)" style="width:100%;background:var(--surface)">
      </div>
      <div id="search-results"><div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.82rem">Type to search…</div></div>
    </div>
  `;
}

// ─── Page Router ─────────────────────────────────────────────
function renderPage() {
  switch (State.page) {
    case 'dashboard': return renderDashboard();
    case 'scanner': return renderScanner();
    case 'products': return renderProducts();
    case 'scans': return renderScans();
    case 'fraud': return renderFraud();
    case 'blockchain': return renderBlockchain();
    case 'events': return renderEvents();
    case 'scm-dashboard': return renderSCMDashboard();
    case 'scm-inventory': return renderSCMInventory();
    case 'scm-logistics': return renderSCMLogistics();
    case 'scm-partners': return renderSCMPartners();
    case 'scm-leaks': return renderSCMLeaks();
    case 'scm-trustgraph': return renderSCMTrustGraph();
    case 'kyc': return renderKYC();
    case 'evidence': return renderEvidence();
    case 'stakeholder': return renderStakeholder();
    case 'billing': return renderBilling();
    case 'pricing': return renderPricingPage();
    case 'public-dashboard': return renderPublicDashboard();
    case 'api-docs': return renderApiDocs();
    case 'settings': return renderSettings();
    case 'admin-users': return renderAdminUsers();
    case 'integrations': return renderIntegrations();
    case 'scm-epcis': return renderSCMEpcis();
    case 'scm-ai': return renderSCMAI();
    case 'scm-risk-radar': return renderSCMRiskRadar();
    case 'scm-carbon': return renderSCMCarbon();
    case 'scm-twin': return renderSCMTwin();
    case 'sustainability': return renderSustainability();
    case 'compliance': return renderCompliance();
    case 'anomaly': return renderAnomaly();
    case 'reports': return renderReports();
    case 'nft': return renderNFT();
    case 'wallet': return renderWallet();
    case 'branding': return renderBranding();
    default: return '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">Page not found</div></div>';
  }
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function renderDashboard() {
  const s = State.dashboardStats;
  if (!s) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading dashboard...</span></div>';

  return `
    <div class="stats-grid">
      <div class="stat-card cyan">
        <div class="stat-icon">📦</div>
        <div class="stat-value">${s.total_products}</div>
        <div class="stat-label">Registered Products</div>
      </div>
      <div class="stat-card violet">
        <div class="stat-icon">📱</div>
        <div class="stat-value">${s.total_scans}</div>
        <div class="stat-label">Total Scans</div>
        <div class="stat-change up">↗ ${s.today_scans} today</div>
      </div>
      <div class="stat-card ${s.open_alerts > 0 ? 'rose' : 'emerald'}">
        <div class="stat-icon">🚨</div>
        <div class="stat-value">${s.open_alerts}</div>
        <div class="stat-label">Open Alerts</div>
      </div>
      <div class="stat-card emerald">
        <div class="stat-icon">📊</div>
        <div class="stat-value">${s.avg_trust_score}</div>
        <div class="stat-label">Avg Trust Score</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-icon">🔗</div>
        <div class="stat-value">${s.total_blockchain_seals}</div>
        <div class="stat-label">Blockchain Seals</div>
      </div>
    </div>

    <div class="grid-2-1">
      <div class="card">
        <div class="card-header">
          <div class="card-title">📡 Recent Activity</div>
        </div>
        <div class="table-container">
          <table>
            <tr><th>Product</th><th>Result</th><th>Fraud</th><th>Trust</th><th>Time</th></tr>
            ${(s.recent_activity || []).map(a => `
              <tr>
                <td style="font-weight:600;color:var(--text-primary)">${a.product_name || '—'}</td>
                <td><span class="badge ${a.result}">${a.result}</span></td>
                <td style="font-family:'JetBrains Mono';font-size:0.75rem;color:${a.fraud_score > 0.5 ? 'var(--rose)' : 'var(--emerald)'}">${(a.fraud_score * 100).toFixed(0)}%</td>
                <td style="font-family:'JetBrains Mono';font-size:0.75rem;color:${scoreColor(a.trust_score)}">${Math.round(a.trust_score)}</td>
                <td class="event-time">${timeAgo(a.scanned_at)}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">📡 Live Events</div>
        </div>
        <div class="event-feed" id="event-feed">${renderEventFeed()}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">📈 Scan Results Distribution</div></div>
        <div style="position:relative;height:260px;padding:10px"><canvas id="scanDoughnutChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><span class="status-icon status-warn" aria-label="Warning">!</span> Alert Severity</div></div>
        <div style="position:relative;height:260px;padding:10px"><canvas id="alertPolarChart"></canvas></div>
      </div>
    </div>
  `;
}

// Initialize Chart.js charts after dashboard renders
function initDashboardCharts() {
  const s = State.dashboardStats;
  if (!s) return;
  // Scan Distribution Doughnut
  const scanData = s.scans_by_result || [];
  const scanCanvas = document.getElementById('scanDoughnutChart');
  if (scanCanvas && scanData.length) {
    const colorMap = { valid: '#00d264', warning: '#ffa500', suspicious: '#ff6b6b', counterfeit: '#ff3366', pending: '#636e7b' };
    new Chart(scanCanvas, {
      type: 'doughnut',
      data: {
        labels: scanData.map(d => d.result),
        datasets: [{ data: scanData.map(d => d.count), backgroundColor: scanData.map(d => colorMap[d.result] || '#00d2ff'), borderWidth: 0, borderRadius: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#c8d6e5', padding: 12, usePointStyle: true, font: { family: 'Inter', size: 11 } } } },
        cutout: '65%'
      }
    });
  }
  // Alert Severity Polar
  const alertData = s.alerts_by_severity || [];
  const alertCanvas = document.getElementById('alertPolarChart');
  if (alertCanvas && alertData.length) {
    const sevColors = { critical: '#ff3366', high: '#ffa500', medium: '#a855f7', low: '#00d2ff' };
    new Chart(alertCanvas, {
      type: 'polarArea',
      data: {
        labels: alertData.map(d => d.severity),
        datasets: [{ data: alertData.map(d => d.count), backgroundColor: alertData.map(d => (sevColors[d.severity] || '#00d2ff') + '99'), borderWidth: 0 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#c8d6e5', padding: 12, usePointStyle: true, font: { family: 'Inter', size: 11 } } } },
        scales: { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.06)' } } }
      }
    });
  }
}

function renderScanDistribution(data) {
  if (!data || !data.length) return '<div class="empty-state"><div class="empty-text">No scan data yet</div></div>';
  const colors = { valid: 'var(--emerald)', warning: 'var(--amber)', suspicious: 'var(--rose)', counterfeit: 'var(--rose)', pending: 'var(--text-muted)' };
  const total = data.reduce((s, d) => s + d.count, 0);
  return `<div style="display:flex;flex-direction:column;gap:10px">${data.map(d => `
    <div class="factor-bar-container">
      <div class="factor-bar-label">
        <span><span class="badge ${d.result}">${d.result}</span></span>
        <span>${d.count} (${total ? Math.round(d.count / total * 100) : 0}%)</span>
      </div>
      <div class="factor-bar">
        <div class="fill" style="width:${total ? d.count / total * 100 : 0}%;background:${colors[d.result] || 'var(--cyan)'}"></div>
      </div>
    </div>
  `).join('')}</div>`;
}

function renderAlertSeverity(data) {
  if (!data || !data.length) return '<div class="empty-state"><div class="empty-text">No alerts — system clean <span class="status-dot green"></span></div></div>';
  const colors = { critical: 'var(--rose)', high: 'var(--amber)', medium: 'var(--violet)', low: 'var(--cyan)' };
  const total = data.reduce((s, d) => s + d.count, 0);
  return `<div style="display:flex;flex-direction:column;gap:10px">${data.map(d => `
    <div class="factor-bar-container">
      <div class="factor-bar-label">
        <span><span class="badge ${d.severity}">${d.severity}</span></span>
        <span>${d.count}</span>
      </div>
      <div class="factor-bar">
        <div class="fill" style="width:${total ? d.count / total * 100 : 0}%;background:${colors[d.severity] || 'var(--cyan)'}"></div>
      </div>
    </div>
  `).join('')}</div>`;
}

function renderEventFeed() {
  if (!State.events.length) return '<div class="empty-state"><div class="empty-icon">📡</div><div class="empty-text">Waiting for events...</div></div>';
  return State.events.slice(0, 20).map(ev => `
    <div class="event-item">
      <div class="event-icon">${eventIcon(ev.type)}</div>
      <div class="event-content">
        <div class="event-title">${ev.type}</div>
        <div class="event-desc">${ev.data?.product_name || ev.data?.message || ev.data?.type || JSON.stringify(ev.data || {}).substring(0, 60)}</div>
      </div>
      <div class="event-time">${ev.timestamp ? timeAgo(ev.timestamp) : 'now'}</div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════════════
// QR SCANNER
// ═══════════════════════════════════════════════════════════════
function renderScanner() {
  return `
    <div class="grid-2">
      <div>
        <div class="card" style="margin-bottom:20px">
          <div class="card-header"><div class="card-title">📱 Scan QR Code</div></div>
          <div class="qr-scanner-area" id="scanner-area">
            <div class="scanner-icon">📷</div>
            <div class="scanner-text">Enter QR data below or paste a product ID to validate</div>
          </div>
          <div style="margin-top:16px">
            <div class="input-group">
              <label>QR Data / Product Code</label>
              <input class="input" id="qr-input" type="text" placeholder="Paste or type QR code data here...">
            </div>
            <div style="display:flex;gap:10px">
              <button class="btn btn-primary" onclick="validateQR()" style="flex:1">🔍 Validate</button>
              <button class="btn" onclick="simulateRandomScan()">🎲 Random Test</button>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div class="card">
          <div class="card-header"><div class="card-title">📋 Validation Result</div></div>
          <div id="scan-result">${State.scanResult ? renderScanResult(State.scanResult) : '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">Scan a QR code to see results</div></div>'}</div>
        </div>
      </div>
    </div>
  `;
}

async function validateQR() {
  const qrData = document.getElementById('qr-input').value.trim();
  if (!qrData) { showToast('Please enter QR data', 'error'); return; }
  try {
    showToast('🔍 Validating...', 'info');
    const result = await API.post('/qr/validate', {
      qr_data: qrData,
      device_fingerprint: 'web-' + navigator.userAgent.substring(0, 20),
      ip_address: '127.0.0.1'
    });
    State.scanResult = result;
    const el = document.getElementById('scan-result');
    if (el) el.innerHTML = renderScanResult(result);
    showToast(result.message, result.valid ? 'success' : 'error');
  } catch (e) {
    showToast('Validation failed: ' + e.message, 'error');
  }
}

async function simulateRandomScan() {
  try {
    const res = await API.get('/products?limit=10');
    if (res.products?.length) {
      // Get a random product's QR code
      const prod = res.products[Math.floor(Math.random() * res.products.length)];
      const detail = await API.get(`/products/${prod.id}`);
      if (detail.qr_codes?.length) {
        document.getElementById('qr-input').value = detail.qr_codes[0].qr_data;
        validateQR();
        return;
      }
    }
    // Fallback: test with unknown QR
    document.getElementById('qr-input').value = 'FAKE-QR-' + Date.now();
    validateQR();
  } catch (e) {
    document.getElementById('qr-input').value = 'TEST-UNKNOWN-QR-' + Date.now();
    validateQR();
  }
}

function renderScanResult(r) {
  if (!r) return '';
  return `
    <div class="qr-result ${r.result}">
      <div style="font-size:1.5rem;font-weight:900;margin-bottom:8px">${r.message}</div>
      <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:12px">
        Response: ${r.response_time_ms}ms • Scan ID: ${r.scan_id?.substring(0, 8) || '—'}
      </div>
    </div>
    ${r.product ? `
    <div style="margin-top:16px">
      <div style="font-weight:700;margin-bottom:8px">📦 Product Details</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.8rem">
        <div style="color:var(--text-muted)">Name</div><div>${r.product.name}</div>
        <div style="color:var(--text-muted)">SKU</div><div style="font-family:'JetBrains Mono'">${r.product.sku}</div>
        <div style="color:var(--text-muted)">Manufacturer</div><div>${r.product.manufacturer || '—'}</div>
        <div style="color:var(--text-muted)">Origin</div><div>${r.product.origin_country || '—'}</div>
      </div>
    </div>` : ''}
    <div style="margin-top:16px">
      <div style="font-weight:700;margin-bottom:8px">🔍 Fraud Analysis</div>
      <div class="factor-bar-container">
        <div class="factor-bar-label"><span>Fraud Score</span><span style="color:${r.fraud?.score > 0.5 ? 'var(--rose)' : 'var(--emerald)'}">${(r.fraud?.score * 100).toFixed(1)}%</span></div>
        <div class="factor-bar"><div class="fill" style="width:${r.fraud?.score * 100}%;background:${r.fraud?.score > 0.5 ? 'var(--rose)' : r.fraud?.score > 0.2 ? 'var(--amber)' : 'var(--emerald)'}"></div></div>
      </div>
      ${(r.fraud?.details || []).map(a => `<div style="font-size:0.75rem;padding:4px 0;color:var(--text-secondary)"><span class="badge ${a.severity}" style="margin-right:6px">${a.severity}</span>${a.description}</div>`).join('')}
    </div>
    <div style="margin-top:16px">
      <div style="font-weight:700;margin-bottom:8px">📊 Trust Score</div>
      <div class="trust-gauge" style="flex-direction:row;gap:16px;justify-content:flex-start">
        <div class="gauge-circle" style="width:70px;height:70px;font-size:1.3rem">${r.trust?.score || 0}</div>
        <div><div class="gauge-grade" style="font-size:1.2rem">${r.trust?.grade || '—'}</div><div class="gauge-label">Trust Grade</div></div>
      </div>
    </div>
    <div style="margin-top:16px">
      <div style="font-weight:700;margin-bottom:8px">🔗 Blockchain Seal</div>
      <div style="font-size:0.75rem;color:var(--text-secondary)">
        <span class="badge sealed"><span class="status-icon status-pass" aria-label="Pass">✓</span> Sealed</span> Block #${r.blockchain?.block_index || '—'}<br>
        <span style="font-family:'JetBrains Mono';font-size:0.68rem;color:var(--text-muted)">Hash: ${shortHash(r.blockchain?.data_hash)}</span>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════
function renderProducts() {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;gap:12px">
      <input class="input" style="max-width:300px" placeholder="Search products..." oninput="searchProducts(this.value)">
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="exportProductsCSV()" title="Export CSV">📊 Export CSV</button>
        <button class="btn btn-primary" onclick="showAddProduct()">+ Add Product</button>
      </div>
    </div>
    <div class="product-grid" id="product-grid">
      ${State.products.length ? State.products.map(p => `
        <div class="product-card" onclick="showProductDetail('${p.id}')">
          <div class="product-name">${p.name}</div>
          <div class="product-sku">${p.sku}</div>
          <div class="product-meta">
            <span class="product-category">${p.category || 'General'}</span>
            <div class="trust-gauge" style="flex-direction:row;gap:8px">
              <span style="font-family:'JetBrains Mono';font-weight:800;color:${scoreColor(p.trust_score)}">${Math.round(p.trust_score)}</span>
              <span style="font-size:0.65rem;color:var(--text-muted)">Trust</span>
            </div>
          </div>
          <div style="margin-top:8px;font-size:0.7rem;color:var(--text-muted)">
            ${p.manufacturer ? '🏭 ' + p.manufacturer : ''} ${p.origin_country ? '🌍 ' + p.origin_country : ''}
          </div>
          <div style="margin-top:6px"><span class="badge ${p.status === 'active' ? 'valid' : 'warning'}">${p.status}</span></div>
        </div>
      `).join('') : '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📦</div><div class="empty-text">No products yet</div></div>'}
    </div>
  `;
}

function showAddProduct() {
  State.modal = `
    <div class="modal">
      <div class="modal-title">📦 Register New Product</div>
      <div class="input-group"><label>Product Name *</label><input class="input" id="np-name" placeholder="e.g. Premium Coffee – Reserve Edition"></div>
      <div class="input-group"><label>SKU *</label><input class="input" id="np-sku" placeholder="e.g. COFFEE-PR-001"></div>
      <div class="input-group"><label>Category</label><input class="input" id="np-cat" placeholder="e.g. F&B, Electronics"></div>
      <div class="input-group"><label>Manufacturer</label><input class="input" id="np-mfr" placeholder="e.g. Highland Coffee Co."></div>
      <div class="input-group"><label>Batch Number</label><input class="input" id="np-batch" placeholder="e.g. BATCH-2026-001"></div>
      <div class="input-group"><label>Origin Country</label><input class="input" id="np-origin" placeholder="e.g. Vietnam"></div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-primary" onclick="addProduct()" style="flex:1">Register & Generate QR</button>
        <button class="btn" onclick="State.modal=null;render()">Cancel</button>
      </div>
    </div>
  `;
  render();
}

async function addProduct() {
  try {
    const res = await API.post('/products', {
      name: document.getElementById('np-name').value,
      sku: document.getElementById('np-sku').value,
      category: document.getElementById('np-cat').value,
      manufacturer: document.getElementById('np-mfr').value,
      batch_number: document.getElementById('np-batch').value,
      origin_country: document.getElementById('np-origin').value
    });
    State.modal = null;
    showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Product registered! QR code generated.', 'success');
    navigate('products');
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function showProductDetail(id) {
  try {
    const detail = await API.get(`/products/${id}`);
    const p = detail.product;
    const qr = detail.qr_codes?.[0];
    State.modal = `
      <div class="modal" style="max-width:600px">
        <div class="modal-title">${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;font-size:0.82rem">
          <div><span style="color:var(--text-muted)">SKU:</span> <span style="font-family:'JetBrains Mono'">${p.sku}</span></div>
          <div><span style="color:var(--text-muted)">Status:</span> <span class="badge ${p.status === 'active' ? 'valid' : 'warning'}">${p.status}</span></div>
          <div><span style="color:var(--text-muted)">Category:</span> ${p.category || '—'}</div>
          <div><span style="color:var(--text-muted)">Manufacturer:</span> ${p.manufacturer || '—'}</div>
          <div><span style="color:var(--text-muted)">Origin:</span> ${p.origin_country || '—'}</div>
          <div><span style="color:var(--text-muted)">Trust Score:</span> <span style="font-weight:800;color:${scoreColor(p.trust_score)}">${Math.round(p.trust_score)}</span></div>
        </div>
        ${qr?.qr_image_base64 ? `<div style="text-align:center;margin:16px 0"><img src="${qr.qr_image_base64}" alt="Product QR code" style="width:180px;border-radius:12px;border:2px solid var(--border)"></div>` : ''}
        ${qr ? `<div style="font-size:0.7rem;font-family:'JetBrains Mono';color:var(--text-muted);text-align:center;word-break:break-all">${qr.qr_data}</div>` : ''}
        <button class="btn" onclick="State.modal=null;render()" style="margin-top:16px;width:100%">Close</button>
      </div>
    `;
    render();
  } catch (e) { showToast('Failed to load product', 'error'); }
}

async function searchProducts(q) {
  try {
    const res = await API.get(`/products?search=${encodeURIComponent(q)}`);
    State.products = res.products || [];
    const grid = document.getElementById('product-grid');
    if (grid) grid.innerHTML = renderProducts().match(/<div class="product-grid"[^>]*>([\s\S]*?)<\/div>\s*$/)?.[1] || '';
  } catch (e) { }
}

// ═══════════════════════════════════════════════════════════════
// SCAN HISTORY
// ═══════════════════════════════════════════════════════════════
function renderScans() {
  return `
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-title">🔍 All Scan Events</div>
        <button class="btn btn-sm" onclick="exportScansCSV()">📊 Export CSV</button>
      </div>
      <div class="table-container">
        <table>
          <tr><th>Product</th><th>Result</th><th>Fraud %</th><th>Trust</th><th>City</th><th>Response</th><th>Time</th></tr>
          ${(State.scanHistory || []).map(s => `
            <tr>
              <td style="font-weight:600;color:var(--text-primary)">${s.product_name || '—'}</td>
              <td><span class="badge ${s.result}">${s.result}</span></td>
              <td style="font-family:'JetBrains Mono';font-size:0.75rem;color:${s.fraud_score > 0.5 ? 'var(--rose)' : 'var(--emerald)'}">${(s.fraud_score * 100).toFixed(0)}%</td>
              <td style="font-family:'JetBrains Mono';font-size:0.75rem;color:${scoreColor(s.trust_score)}">${Math.round(s.trust_score)}</td>
              <td style="font-size:0.75rem">${s.geo_city || '—'}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${s.response_time_ms}ms</td>
              <td class="event-time">${timeAgo(s.scanned_at)}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// FRAUD CENTER
// ═══════════════════════════════════════════════════════════════
function renderFraud() {
  return `
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
      <div class="stat-card rose"><div class="stat-icon"><span class="status-dot red"></span></div><div class="stat-value">${State.fraudAlerts.filter(a => a.severity === 'critical').length}</div><div class="stat-label">Critical</div></div>
      <div class="stat-card amber"><div class="stat-icon"><span class="status-dot amber"></span></div><div class="stat-value">${State.fraudAlerts.filter(a => a.severity === 'high').length}</div><div class="stat-label">High</div></div>
      <div class="stat-card violet"><div class="stat-icon">🟣</div><div class="stat-value">${State.fraudAlerts.filter(a => a.severity === 'medium').length}</div><div class="stat-label">Medium</div></div>
      <div class="stat-card cyan"><div class="stat-icon"><span class="status-dot blue"></span></div><div class="stat-value">${State.fraudAlerts.filter(a => a.severity === 'low').length}</div><div class="stat-label">Low</div></div>
    </div>
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-title">🚨 Active Fraud Alerts</div>
        <button class="btn btn-sm" onclick="exportFraudCSV()">📊 Export CSV</button>
      </div>
      <div class="table-container">
        <table>
          <tr><th>Severity</th><th>Type</th><th>Product</th><th>Description</th><th>Time</th></tr>
          ${(State.fraudAlerts || []).map(a => `
            <tr>
              <td><span class="badge ${a.severity}">${a.severity}</span></td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${a.alert_type}</td>
              <td style="font-weight:600">${a.product_name || '—'}</td>
              <td style="font-size:0.78rem;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.description}</td>
              <td class="event-time">${timeAgo(a.created_at)}</td>
            </tr>
          `).join('')}
        </table>
      </div>
      ${!State.fraudAlerts.length ? '<div class="empty-state"><div class="empty-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span></div><div class="empty-text">No active fraud alerts</div></div>' : ''}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// BLOCKCHAIN
// ═══════════════════════════════════════════════════════════════
function renderBlockchain() {
  const b = State.blockchain;
  if (!b) return '<div class="loading"><div class="spinner"></div></div>';

  return `
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card emerald">
        <div class="stat-icon">🔗</div>
        <div class="stat-value">${b.stats?.total_seals || 0}</div>
        <div class="stat-label">Total Blocks</div>
      </div>
      <div class="stat-card ${b.stats?.chain_integrity?.valid ? 'emerald' : 'rose'}">
        <div class="stat-icon">${b.stats?.chain_integrity?.valid ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '<span class="status-icon status-fail" aria-label="Fail">✗</span>'}</div>
        <div class="stat-value">${b.stats?.chain_integrity?.valid ? 'VALID' : 'BROKEN'}</div>
        <div class="stat-label">Chain Integrity</div>
      </div>
      <div class="stat-card violet">
        <div class="stat-icon">🌳</div>
        <div class="stat-value">${shortHash(b.stats?.latest_merkle_root)}</div>
        <div class="stat-label" style="font-size:0.6rem">Latest Merkle Root</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><div class="card-title">⛓ Chain Visualization</div></div>
      <div style="overflow-x:auto;padding:10px 0;display:flex;align-items:center;flex-wrap:wrap">
        ${(b.recent_seals || []).slice(0, 10).reverse().map((s, i) => `
          ${i > 0 ? '<span class="chain-arrow">→</span>' : ''}
          <div class="chain-block">
            <div class="block-index">Block #${s.block_index}</div>
            <div class="block-hash">🔑 ${shortHash(s.data_hash)}</div>
            <div style="font-size:0.65rem;color:var(--text-muted);margin-top:4px">${s.event_type}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">📜 Recent Seals</div></div>
      <div class="table-container">
        <table>
          <tr><th>Block</th><th>Event</th><th>Data Hash</th><th>Prev Hash</th><th>Merkle Root</th><th>Time</th></tr>
          ${(b.recent_seals || []).map(s => `
            <tr>
              <td style="font-family:'JetBrains Mono';font-weight:700;color:var(--cyan)">#${s.block_index}</td>
              <td>${s.event_type}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.7rem">${shortHash(s.data_hash)}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.7rem">${shortHash(s.prev_hash)}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.7rem">${shortHash(s.merkle_root)}</td>
              <td class="event-time">${timeAgo(s.sealed_at)}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════
function renderEvents() {
  return `
    <div class="card">
      <div class="card-header">
        <div class="card-title">📡 Real-Time Event Stream</div>
        <span style="font-size:0.7rem;color:var(--text-muted)">${State.events.length} events captured</span>
      </div>
      <div class="event-feed" style="max-height:600px" id="event-feed">${renderEventFeed()}</div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// SCM DASHBOARD
// ═══════════════════════════════════════════════════════════════
function renderSCMDashboard() {
  const d = State.scmDashboard;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading supply chain data...</span></div>';

  return `
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">📦</div><div class="stat-value">${d.total_batches}</div><div class="stat-label">Batches</div></div>
      <div class="stat-card violet"><div class="stat-icon">🔗</div><div class="stat-value">${d.total_events}</div><div class="stat-label">SCM Events</div></div>
      <div class="stat-card emerald"><div class="stat-icon">🤝</div><div class="stat-value">${d.total_partners}</div><div class="stat-label">Partners</div></div>
      <div class="stat-card amber"><div class="stat-icon">🚚</div><div class="stat-value">${d.active_shipments}</div><div class="stat-label">Active Shipments</div></div>
      <div class="stat-card ${d.open_leaks > 0 ? 'rose' : 'emerald'}"><div class="stat-icon">🔍</div><div class="stat-value">${d.open_leaks}</div><div class="stat-label">Open Leaks</div></div>
      <div class="stat-card ${d.sla_violations > 0 ? 'amber' : 'emerald'}"><div class="stat-icon"><span class="status-icon status-warn" aria-label="Warning">!</span></div><div class="stat-value">${d.sla_violations}</div><div class="stat-label">SLA Violations</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">📊 Events by Type</div></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${(d.events_by_type || []).map(e => `
            <div class="factor-bar-container">
              <div class="factor-bar-label"><span><span class="badge valid">${e.event_type}</span></span><span>${e.count}</span></div>
              <div class="factor-bar"><div class="fill" style="width:${Math.min(100, e.count / Math.max(...d.events_by_type.map(x => x.count)) * 100)}%;background:var(--cyan)"></div></div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">📡 Recent SCM Events</div></div>
        <div class="table-container">
          <table>
            <tr><th>Type</th><th>Product</th><th>Partner</th></tr>
            ${(d.recent_events || []).slice(0, 8).map(e => `
              <tr>
                <td><span class="badge valid">${e.event_type}</span></td>
                <td style="font-size:0.78rem">${e.product_name || '—'}</td>
                <td style="font-size:0.78rem">${e.partner_name || '—'}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📈 SCM Health</div></div>
      <div class="scm-health">
        <div class="scm-health-item">
          <div class="scm-health-value" style="color:var(--emerald)">${d.avg_partner_trust}</div>
          <div class="scm-health-label">Avg Partner Trust</div>
        </div>
        <div class="scm-health-item">
          <div class="scm-health-value" style="color:var(--cyan)">${d.total_shipments}</div>
          <div class="scm-health-label">Total Shipments</div>
        </div>
        <div class="scm-health-item">
          <div class="scm-health-value" style="color:${d.open_leaks > 5 ? 'var(--rose)' : 'var(--emerald)'}">${d.open_leaks > 0 ? '<span class="status-icon status-warn" aria-label="Warning">!</span>' : '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>'}</div>
          <div class="scm-health-label">${d.open_leaks > 0 ? 'Leaks Detected' : 'No Leaks'}</div>
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// SCM INVENTORY
// ═══════════════════════════════════════════════════════════════
function renderSCMInventory() {
  const inv = State.scmInventory;
  const fc = State.scmForecast;
  if (!inv) return '<div class="loading"><div class="spinner"></div></div>';
  const items = inv.inventory || [];

  return `
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card cyan"><div class="stat-icon">📋</div><div class="stat-value">${items.length}</div><div class="stat-label">Inventory Records</div></div>
      <div class="stat-card emerald"><div class="stat-icon">📦</div><div class="stat-value">${items.reduce((s, i) => s + i.quantity, 0)}</div><div class="stat-label">Total Units</div></div>
      <div class="stat-card ${fc?.alert ? 'amber' : 'emerald'}"><div class="stat-icon">${fc?.alert ? '<span class="status-icon status-warn" aria-label="Warning">!</span>' : '📈'}</div><div class="stat-value">${fc?.trend || 'stable'}</div><div class="stat-label">Forecast Trend</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">📦 Current Stock</div></div>
        <div class="table-container">
          <table>
            <tr><th>Product</th><th>Location</th><th>Qty</th><th>Min</th><th>Max</th><th>Status</th></tr>
            ${items.map(i => {
    const status = i.quantity <= i.min_stock ? 'low' : i.quantity >= i.max_stock ? 'high' : 'ok';
    return `
              <tr>
                <td style="font-weight:600">${i.product_name || i.sku || '—'}</td>
                <td style="font-size:0.78rem">${i.location || '—'}</td>
                <td style="font-family:'JetBrains Mono';font-weight:700;color:${status === 'low' ? 'var(--rose)' : status === 'high' ? 'var(--amber)' : 'var(--emerald)'}">${i.quantity}</td>
                <td style="font-family:'JetBrains Mono';font-size:0.72rem">${i.min_stock}</td>
                <td style="font-family:'JetBrains Mono';font-size:0.72rem">${i.max_stock}</td>
                <td><span class="badge ${status === 'low' ? 'suspicious' : status === 'high' ? 'warning' : 'valid'}">${status === 'low' ? 'Understock' : status === 'high' ? 'Overstock' : 'Normal'}</span></td>
              </tr>
            `}).join('')}
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">🤖 AI Forecast</div></div>
        ${fc ? `
          <div class="forecast-panel">
            <div class="forecast-row">
              <span>Trend: <strong style="color:var(--cyan)">${fc.trend}</strong></span>
              <span>Confidence: <strong>${Math.round((fc.confidence || 0) * 100)}%</strong></span>
            </div>
            ${fc.alert ? `<div class="forecast-alert"><span class="status-icon status-warn" aria-label="Warning">!</span> ${fc.alert.message} (${fc.alert.severity})</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${(fc.forecast || []).map(f => `
              <div class="factor-bar-container">
                <div class="factor-bar-label"><span>Day ${f.period}</span><span style="font-family:'JetBrains Mono'">${f.predicted} units</span></div>
                <div class="factor-bar"><div class="fill" style="width:${Math.min(100, f.predicted / Math.max(...(fc.forecast || []).map(x => x.upper || 1)) * 100)}%;background:var(--cyan)"></div></div>
              </div>
            `).join('')}
          </div>
        ` : '<div class="empty-state"><div class="empty-text">Insufficient data for forecast</div></div>'}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// SCM LOGISTICS
// ═══════════════════════════════════════════════════════════════
function renderSCMLogistics() {
  const ships = State.scmShipments;
  const sla = State.scmSlaViolations;
  const opt = State.scmOptimization;
  if (!ships) return '<div class="loading"><div class="spinner"></div></div>';
  const list = ships.shipments || [];
  const violations = sla?.violations || [];

  return `
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card cyan"><div class="stat-icon">🚚</div><div class="stat-value">${list.length}</div><div class="stat-label">Shipments</div></div>
      <div class="stat-card emerald"><div class="stat-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span></div><div class="stat-value">${list.filter(s => s.status === 'delivered').length}</div><div class="stat-label">Delivered</div></div>
      <div class="stat-card amber"><div class="stat-icon">🚛</div><div class="stat-value">${list.filter(s => s.status === 'in_transit').length}</div><div class="stat-label">In Transit</div></div>
      <div class="stat-card ${violations.length > 0 ? 'rose' : 'emerald'}"><div class="stat-icon"><span class="status-icon status-warn" aria-label="Warning">!</span></div><div class="stat-value">${violations.length}</div><div class="stat-label">SLA Breaches</div></div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><div class="card-title">🚚 Active Shipments</div></div>
      <div class="table-container">
        <table>
          <tr><th>Tracking</th><th>From</th><th>To</th><th>Carrier</th><th>Status</th><th>ETA</th></tr>
          ${list.map(s => `
            <tr>
              <td class="shipment-tracking">${s.tracking_number || '—'}</td>
              <td style="font-size:0.78rem">${s.from_name || '—'}</td>
              <td style="font-size:0.78rem">${s.to_name || '—'}</td>
              <td style="font-size:0.78rem">${s.carrier || '—'}</td>
              <td><span class="badge ${s.status === 'delivered' ? 'valid' : s.status === 'in_transit' ? 'warning' : 'suspicious'}">${s.status}</span></td>
              <td class="shipment-eta">${s.estimated_delivery ? timeAgo(s.estimated_delivery) : '—'}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title"><span class="status-icon status-warn" aria-label="Warning">!</span> SLA Violations</div></div>
        ${violations.length ? `
          <div class="table-container">
            <table>
              <tr><th>Partner</th><th>Type</th><th>Actual</th><th>Threshold</th><th>Penalty</th></tr>
              ${violations.map(v => `
                <tr>
                  <td style="font-weight:600">${v.partner_name || '—'}</td>
                  <td><span class="badge warning">${v.violation_type}</span></td>
                  <td style="font-family:'JetBrains Mono';color:var(--rose)">${Math.round(v.actual_value)}h</td>
                  <td style="font-family:'JetBrains Mono'">${v.threshold_value}h</td>
                  <td style="font-family:'JetBrains Mono';color:var(--amber)">$${v.penalty_amount}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        ` : '<div class="empty-state"><div class="empty-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span></div><div class="empty-text">No SLA violations</div></div>'}
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">🤖 AI Optimization</div></div>
         ${opt ? `
          <div class="ai-panel">
            <div class="ai-panel-title">🧠 Delay Prediction</div>
            <div class="ai-panel-grid">
              <div>Predicted Delay: <strong style="color:${opt.delay_prediction?.risk === 'high' ? 'var(--rose)' : 'var(--emerald)'}">${opt.delay_prediction?.predicted_delay_hours || 0}h</strong></div>
              <div>Risk: <span class="badge ${opt.delay_prediction?.risk === 'high' ? 'suspicious' : opt.delay_prediction?.risk === 'medium' ? 'warning' : 'valid'}">${opt.delay_prediction?.risk || 'low'}</span></div>
              <div>Confidence: ${Math.round((opt.delay_prediction?.confidence || 0) * 100)}%</div>
              <div>Samples: ${opt.delay_prediction?.samples || 0}</div>
            </div>
          </div>
          <div class="ai-panel">
            <div class="ai-panel-title">📊 Bottleneck Detection</div>
            <div class="ai-panel-grid">
              <div>Network Health: <span class="badge ${opt.bottlenecks?.health === 'healthy' ? 'valid' : opt.bottlenecks?.health === 'warning' ? 'warning' : 'suspicious'}">${opt.bottlenecks?.health || 'unknown'}</span></div>
              <div>Bottlenecks: <strong>${opt.bottlenecks?.bottleneck_count || 0}</strong> / ${opt.bottlenecks?.total_nodes || 0} nodes</div>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// SCM PARTNERS
// ═══════════════════════════════════════════════════════════════
function renderSCMPartners() {
  const partners = State.scmPartners || [];

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div style="font-size:0.82rem;color:var(--text-muted)">${partners.length} partners onboarded</div>
      <div style="display:flex;gap:10px">
        <button class="btn" onclick="syncConnectors()">🔄 Sync Connectors</button>
        <button class="btn" onclick="checkConnectorStatus()">🔌 Connector Status</button>
      </div>
    </div>

    <div class="product-grid">
      ${partners.map((p, i) => `
        <div class="partner-card scm-animate" data-type="${(p.type || '').toLowerCase()}" onclick="showPartnerDetail('${p.id}')">
          <div class="partner-header">
            <div>
              <div class="partner-name">${p.name}</div>
              <div class="partner-type">${p.type} • ${p.country || '—'}</div>
            </div>
            <span class="badge ${p.kyc_status === 'verified' ? 'valid' : p.kyc_status === 'pending' ? 'warning' : 'suspicious'}">${p.kyc_status === 'verified' ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> KYC' : p.kyc_status === 'pending' ? '⏳ Pending' : '<span class="status-icon status-fail" aria-label="Fail">✗</span> Failed'}</span>
          </div>
          <div class="partner-meta">
            <div class="partner-trust">
              <span class="partner-trust-score" style="color:${scoreColor(p.trust_score)}">${p.trust_score}</span>
              <span class="partner-trust-label">Trust</span>
            </div>
            <span class="badge ${p.risk_level === 'low' ? 'valid' : p.risk_level === 'medium' ? 'warning' : 'suspicious'}">${p.risk_level || '—'} risk</span>
          </div>
          <div class="partner-email">${p.contact_email || ''}</div>
        </div>
      `).join('')}
    </div>
  `;
}

async function showPartnerDetail(id) {
  try {
    const detail = await API.get(`/scm/partners/${id}`);
    const p = detail.partner;
    const r = detail.risk;
    State.modal = `
      <div class="modal" style="max-width:600px">
        <div class="modal-title">${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;font-size:0.82rem">
          <div><span style="color:var(--text-muted)">Type:</span> ${p.type}</div>
          <div><span style="color:var(--text-muted)">KYC:</span> <span class="badge ${p.kyc_status === 'verified' ? 'valid' : 'warning'}">${p.kyc_status}</span></div>
          <div><span style="color:var(--text-muted)">Country:</span> ${p.country} / ${p.region || '—'}</div>
          <div><span style="color:var(--text-muted)">Trust:</span> <span style="font-weight:800;color:${scoreColor(p.trust_score)}">${p.trust_score}</span></div>
          <div><span style="color:var(--text-muted)">Risk Grade:</span> <span style="font-weight:700">${r?.grade || '—'}</span></div>
          <div><span style="color:var(--text-muted)">Risk Level:</span> <span class="badge ${r?.risk_level === 'low' ? 'valid' : 'warning'}">${r?.risk_level || '—'}</span></div>
        </div>
        <div style="font-weight:700;margin-bottom:6px">Risk Factors</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.78rem;margin-bottom:16px">
          ${Object.entries(r?.factors || {}).map(([k, v]) => `<div style="color:var(--text-muted)">${k}:</div><div>${v}</div>`).join('')}
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" onclick="verifyPartner('${p.id}')" style="flex:1">🔍 Run KYC Verification</button>
          <button class="btn" onclick="State.modal=null;render()">Close</button>
        </div>
      </div>
    `;
    render();
  } catch (e) { showToast('Failed to load partner', 'error'); }
}

async function verifyPartner(id) {
  try {
    const res = await API.post(`/scm/partners/${id}/verify`);
    showToast(`KYC: ${res.badge}`, res.kyc_status === 'verified' ? 'success' : 'error');
    State.modal = null;
    navigate('scm-partners');
  } catch (e) { showToast('Verification failed: ' + e.message, 'error'); }
}

async function syncConnectors() {
  try {
    const res = await API.post('/scm/partners/connectors/sync', { connector_type: 'SAP' });
    showToast(`<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Synced ${res.total_synced} records (${res.total_errors} errors) — Health: ${res.health}`, 'success');
  } catch (e) { showToast('Sync failed: ' + e.message, 'error'); }
}

async function checkConnectorStatus() {
  try {
    const res = await API.get('/scm/partners/connectors/status');
    State.modal = `
      <div class="modal">
        <div class="modal-title">🔌 Connector Status</div>
        <div style="margin-bottom:12px"><span class="badge ${res.overall_health === 'healthy' ? 'valid' : 'warning'}">Overall: ${res.overall_health}</span> • ${res.total_synced_today} synced today</div>
        ${(res.connectors || []).map(c => `
          <div class="connector-card">
            <div class="connector-header">
              <span class="connector-name">${c.name}</span>
              <span class="badge valid">${c.status}</span>
            </div>
            <div class="connector-detail">Entities: ${c.entities.join(', ')} • Last sync: ${timeAgo(c.last_sync)}</div>
          </div>
        `).join('')}
        <button class="btn" onclick="State.modal=null;render()" style="margin-top:12px;width:100%">Close</button>
      </div>
    `;
    render();
  } catch (e) { showToast('Failed to check connectors', 'error'); }
}

// ═══════════════════════════════════════════════════════════════
// SCM LEAK MONITOR
// ═══════════════════════════════════════════════════════════════
function renderSCMLeaks() {
  const stats = State.scmLeaks;
  if (!stats) return '<div class="loading"><div class="spinner"></div></div>';

  return `
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card rose"><div class="stat-icon">🔍</div><div class="stat-value">${stats.open}</div><div class="stat-label">Open Leaks</div></div>
      <div class="stat-card emerald"><div class="stat-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span></div><div class="stat-value">${stats.resolved}</div><div class="stat-label">Resolved</div></div>
      <div class="stat-card cyan"><div class="stat-icon">📊</div><div class="stat-value">${stats.total}</div><div class="stat-label">Total Alerts</div></div>
    </div>

    <div style="margin-bottom:20px">
      <button class="leak-scan-btn" onclick="runLeakScan()">🔍 Run Marketplace Scan</button>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">🛒 By Platform</div></div>
        ${(stats.by_platform || []).length ? `
          <div style="display:flex;flex-direction:column;gap:8px">
            ${(stats.by_platform || []).map(p => `
              <div class="factor-bar-container leak-platform-bar">
                <div class="factor-bar-label"><span>${p.platform}</span><span>${p.count} alerts (risk: ${Math.round((p.avg_risk || 0) * 100)}%)</span></div>
                <div class="factor-bar"><div class="fill" style="width:${Math.min(100, p.count / Math.max(...(stats.by_platform || []).map(x => x.count)) * 100)}%"></div></div>
              </div>
            `).join('')}
          </div>
        ` : '<div class="empty-state"><div class="empty-text">No leaks detected</div></div>'}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">📦 Top Leaked Products</div></div>
        ${(stats.top_products || []).length ? `
          <div class="table-container">
            <table>
              <tr><th>Product</th><th>Leaks</th><th>Avg Risk</th></tr>
              ${(stats.top_products || []).map(p => `
                <tr>
                  <td style="font-weight:600">${p.product_name || '—'}</td>
                  <td style="font-family:'JetBrains Mono'">${p.leak_count}</td>
                  <td style="font-family:'JetBrains Mono';color:var(--rose)">${Math.round((p.avg_risk || 0) * 100)}%</td>
                </tr>
              `).join('')}
            </table>
          </div>
        ` : '<div class="empty-state"><div class="empty-text">No product leaks</div></div>'}
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🏢 Distributor Risk</div></div>
      ${(stats.distributor_risk || []).length ? `
        <div class="table-container">
          <table>
            <tr><th>Distributor</th><th>Leak Count</th><th>Avg Risk</th></tr>
            ${(stats.distributor_risk || []).map(d => `
              <tr>
                <td style="font-weight:600">${d.name || '—'}</td>
                <td style="font-family:'JetBrains Mono'">${d.leak_count}</td>
                <td style="font-family:'JetBrains Mono';color:${(d.avg_risk || 0) > 0.7 ? 'var(--rose)' : 'var(--amber)'}">${Math.round((d.avg_risk || 0) * 100)}%</td>
              </tr>
            `).join('')}
          </table>
        </div>
      ` : '<div class="empty-state"><div class="empty-text">No distributor risk data</div></div>'}
    </div>
  `;
}

async function runLeakScan() {
  try {
    showToast('🔍 Scanning marketplaces...', 'info');
    const res = await API.post('/scm/leaks/scan', {});
    showToast(`Found ${res.leaks_found} leaks across ${res.platforms_scanned.join(', ')}`, res.leaks_found > 0 ? 'error' : 'success');
    navigate('scm-leaks');
  } catch (e) { showToast('Scan failed: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════════
// SCM TRUSTGRAPH
// ═══════════════════════════════════════════════════════════════
function renderSCMTrustGraph() {
  const g = State.scmGraph;
  if (!g) return '<div class="loading"><div class="spinner"></div></div>';

  const nodes = g.nodes || [];
  const toxic = nodes.filter(n => n.is_toxic);

  return `
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card cyan"><div class="stat-icon">🕸️</div><div class="stat-value">${g.total_nodes}</div><div class="stat-label">Nodes</div></div>
      <div class="stat-card violet"><div class="stat-icon">🔗</div><div class="stat-value">${g.total_edges}</div><div class="stat-label">Edges</div></div>
      <div class="stat-card ${g.network_health === 'healthy' ? 'emerald' : 'rose'}"><div class="stat-icon">${g.network_health === 'healthy' ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '<span class="status-icon status-warn" aria-label="Warning">!</span>'}</div><div class="stat-value">${g.network_health}</div><div class="stat-label">Network Health</div></div>
      <div class="stat-card ${toxic.length > 0 ? 'rose' : 'emerald'}"><div class="stat-icon">☠️</div><div class="stat-value">${g.toxic_count}</div><div class="stat-label">Toxic Nodes</div></div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><div class="card-title">📊 Risk Distribution</div></div>
      <div class="risk-pills">
        ${Object.entries(g.risk_distribution || {}).map(([level, count]) => `
          <div class="risk-pill ${level}">
            <div class="risk-pill-value">${count}</div>
            <div class="risk-pill-label">${level}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">🕸️ Network Nodes (PageRank Analysis)</div></div>
      <div class="table-container">
        <table>
          <tr><th>Node</th><th>Type</th><th>PageRank</th><th>Centrality</th><th>Trust</th><th>Alerts</th><th>Toxicity</th><th>Risk</th></tr>
          ${nodes.slice(0, 20).map(n => `
            <tr class="${n.is_toxic ? 'toxic-node' : ''}">
              <td style="font-weight:600">${n.name || n.id?.substring(0, 8)}</td>
              <td><span class="badge ${(n.type || '').toLowerCase()}">${n.type}</span></td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${n.pagerank}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${n.centrality}</td>
              <td class="stock-qty" style="color:${scoreColor(n.trust_score)}">${n.trust_score}</td>
              <td style="font-family:'JetBrains Mono';color:${n.alert_count > 0 ? 'var(--rose)' : 'var(--text-muted)'}">${n.alert_count}</td>
              <td style="font-family:'JetBrains Mono';font-weight:700;color:${n.toxicity_score > 0.5 ? 'var(--rose)' : n.toxicity_score > 0.3 ? 'var(--amber)' : 'var(--emerald)'}">${n.toxicity_score}</td>
              <td><span class="badge ${n.risk_level === 'critical' ? 'suspicious' : n.risk_level === 'high' ? 'warning' : 'valid'}">${n.risk_level}</span></td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// KYC BUSINESS
// ═══════════════════════════════════════════════════════════════
function renderKYC() {
  const d = State.kycData;
  if (!d) return '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Loading KYC data…</div></div>';
  const s = d.stats;

  return `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${s.total_businesses}</div><div class="stat-label">Total Businesses</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--emerald)">${s.verified}</div><div class="stat-label">Verified</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--amber)">${s.pending}</div><div class="stat-label">Pending</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--rose)">${s.high_risk}</div><div class="stat-label">High Risk</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--rose)">${s.pending_sanctions}</div><div class="stat-label">Sanction Hits</div></div>
      <div class="stat-card"><div class="stat-value">${s.verification_rate}%</div><div class="stat-label">Verification Rate</div></div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">🏢 Registered Businesses</div>
        <button class="btn btn-primary" onclick="showKycVerify()">+ Verify Business</button>
      </div>
      <div class="table-container">
        <table>
          <tr><th>Business</th><th>Reg #</th><th>Country</th><th>Industry</th><th>Risk</th><th>Status</th><th>Checks</th><th>Sanctions</th><th>Actions</th></tr>
          ${d.businesses.map(b => `
            <tr>
              <td style="font-weight:600">${b.name}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${b.registration_number || '—'}</td>
              <td>${b.country}</td>
              <td>${b.industry}</td>
              <td><span class="badge ${b.risk_level === 'low' ? 'valid' : b.risk_level === 'high' || b.risk_level === 'critical' ? 'suspicious' : 'warning'}">${b.risk_level}</span></td>
              <td><span class="badge ${b.verification_status === 'verified' ? 'valid' : b.verification_status === 'rejected' ? 'suspicious' : 'warning'}">${b.verification_status}</span></td>
              <td style="text-align:center">${b.check_count || 0}</td>
              <td style="text-align:center;color:${b.pending_sanctions > 0 ? 'var(--rose)' : 'var(--text-muted)'}">${b.pending_sanctions || 0}</td>
              <td>
                ${b.verification_status === 'pending' ? `
                  <button class="btn btn-sm" onclick="kycApprove('${b.id}')"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Approve</button>
                  <button class="btn btn-sm" onclick="kycReject('${b.id}')" style="margin-left:4px"><span class="status-icon status-fail" aria-label="Fail">✗</span> Reject</button>
                ` : '—'}
              </td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>
  `;
}

async function showKycVerify() {
  State.modal = {
    title: '🏢 Verify New Business',
    body: `
      <div class="form-group"><label>Business Name*</label><input type="text" id="kyc-name" class="form-input" placeholder="Company name"></div>
      <div class="form-group"><label>Registration Number</label><input type="text" id="kyc-reg" class="form-input" placeholder="e.g. VN-0401-2019"></div>
      <div class="form-row">
        <div class="form-group"><label>Country</label><input type="text" id="kyc-country" class="form-input" placeholder="Country"></div>
        <div class="form-group"><label>Industry</label><input type="text" id="kyc-industry" class="form-input" placeholder="Industry"></div>
      </div>
      <div class="form-group"><label>Contact Email</label><input type="text" id="kyc-email" class="form-input" placeholder="email@company.com"></div>
    `,
    action: 'submitKycVerify()',
    actionLabel: 'Run Verification'
  };
  render();
}

async function submitKycVerify() {
  const name = document.getElementById('kyc-name')?.value;
  if (!name) return showToast('Business name required', 'error');
  try {
    const res = await API.post('/kyc/verify', {
      name,
      registration_number: document.getElementById('kyc-reg')?.value,
      country: document.getElementById('kyc-country')?.value,
      industry: document.getElementById('kyc-industry')?.value,
      contact_email: document.getElementById('kyc-email')?.value
    });
    showToast(`KYC submitted – Risk: ${res.risk_level}, Score: ${res.avg_score}`, 'success');
    State.modal = null;
    navigate('kyc');
  } catch (e) { showToast(e.message || 'KYC failed', 'error'); }
}

async function kycApprove(id) {
  try {
    await API.post(`/kyc/businesses/${id}/approve`);
    showToast('Business approved', 'success');
    navigate('kyc');
  } catch (e) { showToast('Approve failed', 'error'); }
}

async function kycReject(id) {
  try {
    await API.post(`/kyc/businesses/${id}/reject`);
    showToast('Business rejected', 'info');
    navigate('kyc');
  } catch (e) { showToast('Reject failed', 'error'); }
}

async function kycSanctionCheck(id) {
  try {
    const res = await API.post('/kyc/sanction-check', { business_id: id });
    showToast(res.clean ? 'No sanctions found <span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : `<span class="status-icon status-warn" aria-label="Warning">!</span> ${res.hits.length} sanction hit(s)`, res.clean ? 'success' : 'warning');
    navigate('kyc');
  } catch (e) { showToast('Sanction check failed', 'error'); }
}

// ═══════════════════════════════════════════════════════════════
// EVIDENCE VAULT
// ═══════════════════════════════════════════════════════════════
function renderEvidence() {
  const d = State.evidenceData;
  if (!d) return '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Loading Evidence Vault…</div></div>';
  const s = d.stats;

  const formatSize = (bytes) => {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  };

  return `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${s.total_items}</div><div class="stat-label">Total Evidence</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--emerald)">${s.anchored}</div><div class="stat-label">Anchored</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--cyan)">${s.verified}</div><div class="stat-label">Verified</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--rose)">${s.tampered}</div><div class="stat-label">Tampered</div></div>
      <div class="stat-card"><div class="stat-value">${s.total_size_mb} MB</div><div class="stat-label">Storage Used</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--emerald)">${s.integrity_rate}%</div><div class="stat-label">Integrity Rate</div></div>
    </div>

    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-title">🔒 Evidence Items</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm" onclick="exportEvidenceCSV()">📊 Export CSV</button>
          <button class="btn btn-primary" onclick="showUploadEvidence()">+ Upload Evidence</button>
        </div>
      </div>
      <div class="table-container">
        <table>
          <tr><th>Title</th><th>Description</th><th>Type</th><th>Size</th><th>SHA-256</th><th>Status</th><th>Uploaded</th><th>Actions</th></tr>
          ${d.items.map(e => `
            <tr>
              <td style="font-weight:600">${e.title}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.description}</td>
              <td><span class="badge">${e.file_type?.split('/')[1] || 'file'}</span></td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${formatSize(e.file_size)}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.68rem;color:var(--cyan)">${e.sha256_hash?.substring(0, 12)}…</td>
              <td><span class="badge ${e.verification_status === 'anchored' || e.verification_status === 'verified' ? 'valid' : 'suspicious'}">${e.verification_status}</span></td>
              <td style="font-size:0.75rem;color:var(--text-muted)">${timeAgo(e.created_at)}</td>
              <td>
                <button class="btn btn-sm" onclick="verifyEvidence('${e.id}')">🔍 Verify</button>
                <button class="btn btn-sm" onclick="exportEvidence('${e.id}')" style="margin-left:4px">📄 Export</button>
                <button class="btn btn-sm" onclick="downloadForensicReport('${e.id}')" style="margin-left:4px">📋 Forensic</button>
              </td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>
  `;
}

async function showUploadEvidence() {
  State.modal = {
    title: '🔒 Upload Evidence',
    body: `
      <div class="form-group"><label>Title*</label><input type="text" id="ev-title" class="form-input" placeholder="Evidence title"></div>
      <div class="form-group"><label>Description</label><textarea id="ev-desc" class="form-input" rows="3" placeholder="Description"></textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Entity Type</label><input type="text" id="ev-etype" class="form-input" placeholder="product, shipment…"></div>
        <div class="form-group"><label>Entity ID</label><input type="text" id="ev-eid" class="form-input" placeholder="Related entity ID"></div>
      </div>
    `,
    action: 'submitEvidence()',
    actionLabel: 'Upload & Anchor'
  };
  render();
}

async function submitEvidence() {
  const title = document.getElementById('ev-title')?.value;
  if (!title) return showToast('Title required', 'error');
  try {
    const res = await API.post('/evidence/upload', {
      title,
      description: document.getElementById('ev-desc')?.value,
      entity_type: document.getElementById('ev-etype')?.value,
      entity_id: document.getElementById('ev-eid')?.value
    });
    showToast(`Evidence anchored – Block #${res.block_index}`, 'success');
    State.modal = null;
    navigate('evidence');
  } catch (e) { showToast(e.message || 'Upload failed', 'error'); }
}

async function verifyEvidence(id) {
  try {
    const res = await API.get(`/evidence/${id}/verify`);
    showToast(`Integrity: ${res.integrity} | Block #${res.block_index}`, res.integrity === 'verified' ? 'success' : 'warning');
    navigate('evidence');
  } catch (e) { showToast('Verify failed', 'error'); }
}

async function exportEvidence(id) {
  try {
    const report = await API.get(`/evidence/${id}/export`);
    // Open report in new window
    const w = window.open('', '_blank');
    w.document.write(`<pre style="font-family:monospace;white-space:pre-wrap">${JSON.stringify(report, null, 2)}</pre>`);
    w.document.title = `Forensic Report – ${report.evidence?.title || id}`;
  } catch (e) { showToast('Export failed', 'error'); }
}

// ═══════════════════════════════════════════════════════════════
// STAKEHOLDER TRUST
// ═══════════════════════════════════════════════════════════════
function renderStakeholder() {
  const d = State.stakeholderData;
  if (!d) return '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Loading Trust data…</div></div>';
  const db = d.dashboard;

  const starBar = (score, maxCount) => {
    const pct = maxCount > 0 ? (score / maxCount) * 100 : 0;
    return `<div style="display:flex;align-items:center;gap:8px">
      <span style="width:10px;font-size:0.75rem">${score}</span>
      <div style="flex:1;height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:var(--amber);border-radius:4px"></div>
      </div>
    </div>`;
  };
  const maxDist = Math.max(...Object.values(db.ratings.distribution || {}), 1);

  return `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value" style="color:var(--amber)">⭐ ${db.ratings.average}</div><div class="stat-label">${db.ratings.total} Ratings</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--emerald)">${db.certifications.active}</div><div class="stat-label">Active Certs</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--rose)">${db.certifications.expired}</div><div class="stat-label">Expired Certs</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--emerald)">${db.compliance.rate}%</div><div class="stat-label">Compliance Rate</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--rose)">${db.compliance.non_compliant}</div><div class="stat-label">Non-Compliant</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 2fr;gap:var(--gap)">
      <div class="card">
        <div class="card-header"><div class="card-title">⭐ Rating Distribution</div></div>
        <div style="padding:0 var(--gap) var(--gap);display:flex;flex-direction:column;gap:6px">
          ${[5, 4, 3, 2, 1].map(i => `
            <div style="display:flex;align-items:center;gap:8px">
              <span style="width:14px;font-size:0.8rem;color:var(--amber)">${'★'.repeat(i)}</span>
              ${starBar(db.ratings.distribution?.[i] || 0, maxDist)}
              <span style="font-size:0.72rem;color:var(--text-muted);width:20px">${db.ratings.distribution?.[i] || 0}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">📜 Certifications</div></div>
        <div class="table-container">
          <table>
            <tr><th>Certification</th><th>Issuing Body</th><th>Cert #</th><th>Issued</th><th>Expires</th><th>Status</th></tr>
            ${d.certifications.map(c => `
              <tr>
                <td style="font-weight:600">${c.cert_name}</td>
                <td>${c.cert_body}</td>
                <td style="font-family:'JetBrains Mono';font-size:0.72rem">${c.cert_number}</td>
                <td style="font-size:0.75rem">${c.issued_date || '—'}</td>
                <td style="font-size:0.75rem">${c.expiry_date || '—'}</td>
                <td><span class="badge ${c.status === 'active' ? 'valid' : 'suspicious'}">${c.status}</span></td>
              </tr>
            `).join('')}
          </table>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">📋 Compliance Records</div></div>
      <div class="table-container">
        <table>
          <tr><th>Framework</th><th>Requirement</th><th>Status</th><th>Next Review</th></tr>
          ${d.compliance.map(r => `
            <tr>
              <td style="font-weight:600">${r.framework}</td>
              <td>${r.requirement}</td>
              <td><span class="badge ${r.status === 'compliant' ? 'valid' : 'suspicious'}">${r.status}</span></td>
              <td style="font-size:0.75rem;color:var(--text-muted)">${r.next_review || '—'}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// BILLING & PRICING
// ═══════════════════════════════════════════════════════════════
function renderBilling() {
  const d = State.billingData;
  if (!d) return '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Loading Billing…</div></div>';

  const plan = d.plan;
  const usage = d.usage;
  const planColors = { free: 'var(--text-muted)', starter: 'var(--cyan)', pro: 'var(--violet)', enterprise: 'var(--amber)' };
  const planIcons = { free: '🆓', starter: '🚀', pro: '⚡', enterprise: '🏢' };

  const usageBar = (used, limit, label) => {
    const isUnlimited = limit === '∞' || limit < 0;
    const pct = isUnlimited ? 5 : Math.min((used / limit) * 100, 100);
    const color = pct > 90 ? 'var(--rose)' : pct > 70 ? 'var(--amber)' : 'var(--emerald)';
    return `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:0.8rem;font-weight:600">${label}</span>
          <span style="font-size:0.75rem;color:var(--text-muted)">${typeof used === 'number' ? used.toLocaleString() : used} / ${isUnlimited ? '∞' : (typeof limit === 'number' ? limit.toLocaleString() : limit)}</span>
        </div>
        <div style="height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;transition:width 0.3s"></div>
        </div>
      </div>
    `;
  };

  return `
    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:var(--gap);margin-bottom:var(--gap)">
      ${Object.entries(d.available).map(([key, p]) => `
        <div class="card" style="border:${plan?.plan_name === key ? '2px solid ' + planColors[key] : '1px solid var(--border)'};cursor:pointer;position:relative" onclick="${plan?.plan_name !== key && State.user?.role === 'admin' ? `upgradePlan('${key}')` : ''}">
          ${plan?.plan_name === key ? '<div style="position:absolute;top:8px;right:8px;font-size:0.65rem;background:var(--emerald);color:#000;padding:2px 8px;border-radius:99px;font-weight:700">CURRENT</div>' : ''}
          <div style="padding:var(--gap);text-align:center">
            <div style="font-size:2rem">${planIcons[key]}</div>
            <div style="font-size:1.1rem;font-weight:700;color:${planColors[key]};margin:8px 0">${p.name}</div>
            <div style="font-size:1.5rem;font-weight:800">$${p.price}<span style="font-size:0.75rem;font-weight:400;color:var(--text-muted)">/mo</span></div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:12px;text-align:left">
              <div>📱 ${p.scan_limit < 0 ? 'Unlimited' : p.scan_limit.toLocaleString()} scans</div>
              <div>🔌 ${p.api_limit < 0 ? 'Unlimited' : p.api_limit.toLocaleString()} API calls</div>
              <div>💾 ${p.storage_mb < 0 ? 'Unlimited' : p.storage_mb.toLocaleString()} MB storage</div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--gap)">
      <div class="card">
        <div class="card-header"><div class="card-title">📊 Current Usage (${d.period})</div></div>
        <div style="padding:0 var(--gap) var(--gap)">
          ${usage ? `
            ${usageBar(usage.scans.used, usage.scans.limit, '📱 Scans')}
            ${usageBar(usage.api_calls.used, usage.api_calls.limit, '🔌 API Calls')}
            ${usageBar(usage.storage_mb.used, usage.storage_mb.limit, '💾 Storage (MB)')}
          ` : '<div class="empty-state">No usage data</div>'}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">🧾 Invoice History</div></div>
        <div class="table-container">
          <table>
            <tr><th>Plan</th><th>Amount</th><th>Status</th><th>Period</th></tr>
            ${d.invoices.map(inv => `
              <tr>
                <td style="font-weight:600;text-transform:capitalize">${inv.plan_name}</td>
                <td style="font-family:'JetBrains Mono'">$${inv.amount}</td>
                <td><span class="badge valid">${inv.status}</span></td>
                <td style="font-size:0.72rem;color:var(--text-muted)">${inv.period_start?.substring(0, 7) || '—'}</td>
              </tr>
            `).join('')}
            ${d.invoices.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No invoices</td></tr>' : ''}
          </table>
        </div>
      </div>
    </div>
  `;
}

async function upgradePlan(plan) {
  if (!confirm(`Upgrade to ${plan}?`)) return;
  try {
    const res = await API.post('/billing/upgrade', { plan_name: plan });
    showToast(`Upgraded to ${plan} – $${res.amount}/mo`, 'success');
    navigate('billing');
  } catch (e) { showToast(e.message || 'Upgrade failed', 'error'); }
}

// ═══════════════════════════════════════════════════════════════
// PRICING PAGE
// ═══════════════════════════════════════════════════════════════

function renderPricingPage() {
  const d = State.pricingData;
  if (!d) return '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Loading Pricing…</div></div>';

  const isAnnual = State.pricingAnnual || false;
  const plans = d.plans;
  const planOrder = ['free', 'starter', 'pro', 'business', 'enterprise'];
  const planColors = { free: '#6b7280', starter: '#06b6d4', pro: '#8b5cf6', business: '#f59e0b', enterprise: '#ef4444' };
  const planIcons = { free: '🆓', starter: '🚀', pro: '⚡', business: '🏢', enterprise: '👑' };

  const toggleBilling = () => {
    State.pricingAnnual = !State.pricingAnnual;
    render();
  };
  window._toggleBilling = toggleBilling;

  const formatLimit = (v) => v === -1 ? '∞' : (typeof v === 'number' ? v.toLocaleString() : v);
  const currentPlan = State.billingData?.plan?.plan_name || 'free';

  return `
    <div style="max-width:1200px;margin:0 auto">
      <!-- Header -->
      <div style="text-align:center;margin-bottom:40px">
        <h2 style="font-size:2rem;font-weight:800;background:linear-gradient(135deg, var(--cyan), var(--violet));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px">
          Simple, Transparent Pricing
        </h2>
        <p style="color:var(--text-muted);font-size:1rem;max-width:600px;margin:0 auto">
          Start free, scale as you grow. Usage-based add-ons so you only pay for what you use.
        </p>

        <!-- Billing Toggle -->
        <div style="display:inline-flex;align-items:center;gap:12px;margin-top:24px;padding:6px;background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border)">
          <button onclick="_toggleBilling()" style="padding:8px 20px;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-size:0.85rem;
            background:${!isAnnual ? 'var(--cyan)' : 'transparent'};
            color:${!isAnnual ? '#000' : 'var(--text-muted)'}">
            Monthly
          </button>
          <button onclick="_toggleBilling()" style="padding:8px 20px;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-size:0.85rem;position:relative;
            background:${isAnnual ? 'var(--cyan)' : 'transparent'};
            color:${isAnnual ? '#000' : 'var(--text-muted)'}">
            Annual
            <span style="position:absolute;top:-8px;right:-12px;background:var(--emerald);color:#000;font-size:0.6rem;padding:2px 6px;border-radius:99px;font-weight:700">-20%</span>
          </button>
        </div>
      </div>

      <!-- Plan Cards -->
      <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:16px;margin-bottom:40px">
        ${planOrder.map(slug => {
    const p = plans[slug];
    if (!p) return '';
    const price = p.price_monthly;
    const annualPrice = p.price_annual;
    const isPopular = p.badge === 'POPULAR';
    const isCurrent = slug === currentPlan;
    const isEnterprise = slug === 'enterprise';
    const displayPrice = isEnterprise ? null : (isAnnual ? Math.round((annualPrice || 0) / 12) : price);

    return `
            <div class="card" style="position:relative;border:${isPopular ? '2px solid var(--violet)' : isCurrent ? '2px solid var(--emerald)' : '1px solid var(--border)'};
              ${isPopular ? 'transform:scale(1.03);box-shadow:0 8px 32px rgba(139,92,246,0.2)' : ''};transition:transform 0.2s,box-shadow 0.2s"
              onmouseenter="this.style.transform='scale(1.05)'" onmouseleave="this.style.transform='${isPopular ? 'scale(1.03)' : 'scale(1)'}'"
            >
              ${isPopular ? '<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--violet);color:#fff;font-size:0.65rem;padding:4px 14px;border-radius:99px;font-weight:700;letter-spacing:0.5px">MOST POPULAR</div>' : ''}
              ${isCurrent ? '<div style="position:absolute;top:8px;right:8px;background:var(--emerald);color:#000;font-size:0.6rem;padding:2px 8px;border-radius:99px;font-weight:700">CURRENT</div>' : ''}

              <div style="padding:24px;text-align:center">
                <div style="font-size:2.5rem;margin-bottom:8px">${planIcons[slug]}</div>
                <div style="font-size:1.1rem;font-weight:700;color:${planColors[slug]}">${p.name}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin:4px 0 16px;min-height:32px">${p.tagline}</div>

                <div style="margin:16px 0">
                  ${isEnterprise
        ? '<div style="font-size:1.8rem;font-weight:800">Custom</div><div style="font-size:0.75rem;color:var(--text-muted)">Contact sales</div>'
        : `<div style="font-size:2.2rem;font-weight:800">$${displayPrice}<span style="font-size:0.75rem;font-weight:400;color:var(--text-muted)">/mo</span></div>
                       ${isAnnual && price ? '<div style="font-size:0.7rem;color:var(--emerald)">Save $' + ((price * 12) - annualPrice) + '/year</div>' : ''}`
      }
                </div>

                <!-- Key Limits -->
                <div style="text-align:left;font-size:0.72rem;margin:16px 0;padding:12px;background:var(--bg-secondary);border-radius:8px">
                  <div style="margin-bottom:6px">📱 <strong>${formatLimit(p.limits.scans)}</strong> scans/mo</div>
                  <div style="margin-bottom:6px">🔌 <strong>${formatLimit(p.limits.api_calls)}</strong> API calls</div>
                  <div style="margin-bottom:6px">💾 <strong>${formatLimit(p.limits.storage_mb)}</strong> MB storage</div>
                  <div style="margin-bottom:6px">🎖️ <strong>${formatLimit(p.limits.nft_mints)}</strong> NFT mints</div>
                  <div>🌿 <strong>${formatLimit(p.limits.carbon_calcs)}</strong> carbon calcs</div>
                </div>

                ${isCurrent
        ? '<button disabled style="width:100%;padding:10px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-muted);border-radius:8px;font-weight:600">Current Plan</button>'
        : isEnterprise
          ? '<button onclick="requestEnterpriseQuote()" style="width:100%;padding:10px;border:none;background:linear-gradient(135deg, #ef4444, #dc2626);color:#fff;border-radius:8px;cursor:pointer;font-weight:600">Contact Sales</button>'
          : `<button onclick="upgradePlan('${slug}')" style="width:100%;padding:10px;border:none;background:${planColors[slug]};color:#000;border-radius:8px;cursor:pointer;font-weight:700">
                        ${planOrder.indexOf(slug) > planOrder.indexOf(currentPlan) ? 'Upgrade' : 'Switch'}
                      </button>`
      }
              </div>
            </div>
          `;
  }).join('')}
      </div>

      <!-- Usage-Based Add-ons Section -->
      <div class="card" style="margin-bottom:24px;padding:24px">
        <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px">
          <span>📊</span> Usage-Based Add-ons
          <span style="font-size:0.7rem;color:var(--text-muted);font-weight:400">Pay only for what you use beyond your plan</span>
        </h3>
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:16px">
          ${Object.entries(d.usage_pricing).map(([key, up]) => {
    const icon = key === 'scans' ? '📱' : key === 'nft_mints' ? '🎖️' : key === 'carbon_calcs' ? '🌿' : '🔌';
    return `
              <div style="padding:16px;background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border)">
                <div style="font-size:1.5rem;margin-bottom:8px">${icon}</div>
                <div style="font-weight:700;font-size:0.85rem;margin-bottom:4px">${up.name}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px">Per ${up.unit} overage</div>
                <div style="font-size:0.72rem">
                  ${up.tiers.map(t => `
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                      <span style="color:var(--text-muted)">${(t.up_to == null || t.up_to === Infinity) ? 'Volume' : 'First ' + t.up_to.toLocaleString()}</span>
                      <span style="font-weight:700;color:var(--emerald)">$${t.price}/${up.unit}</span>
                    </div>
                  `).join('')}
                  ${up.bundle ? `<div style="margin-top:8px;padding:8px;background:rgba(0,210,255,0.1);border-radius:6px;text-align:center"><strong>Bundle:</strong> ${up.bundle.size} for $${up.bundle.price}</div>` : ''}
                </div>
              </div>
            `;
  }).join('')}
        </div>
      </div>

      <!-- Feature Comparison Matrix -->
      <div class="card" style="padding:24px">
        <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:16px">📋 Feature Comparison</h3>
        <div class="table-container">
          <table>
            <tr>
              <th style="text-align:left">Feature</th>
              ${planOrder.map(slug => `<th style="color:${planColors[slug]}">${plans[slug]?.name || slug}</th>`).join('')}
            </tr>
            ${[
      ['SLA Guarantee', ...planOrder.map(s => plans[s]?.sla || '—')],
      ['Support Level', 'Community', 'Email', 'Priority', 'Dedicated', 'Dedicated+Slack'],
      ['Fraud Detection', '—', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>'],
      ['AI Anomaly Detection', '—', '—', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>'],
      ['Digital Twin', '—', '—', '—', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>'],
      ['Carbon Tracking', '—', '—', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>'],
      ['NFT Certificates', '—', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>'],
      ['Custom Branding', '—', '—', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>'],
      ['SSO / SAML', '—', '—', '—', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>'],
      ['On-Premise', '—', '—', '—', '—', '<span class="status-icon status-pass" aria-label="Pass">✓</span>'],
      ['GS1 Certified Partner', '—', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>'],
      ['SOC 2 Type II', '—', '—', '—', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>'],
      ['ISO 27001:2022', '—', '—', '—', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>'],
      ['GDPR Compliant', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>', '<span class="status-icon status-pass" aria-label="Pass">✓</span>'],
    ].map(row => `
              <tr>
                <td style="font-weight:600;font-size:0.8rem">${row[0]}</td>
                ${row.slice(1).map(v => `<td style="text-align:center;font-size:0.75rem;${v === '<span class="status-icon status-pass" aria-label="Pass">✓</span>' ? 'color:var(--emerald)' : v === '—' ? 'color:var(--text-muted)' : ''}">${v}</td>`).join('')}
              </tr>
            `).join('')}
          </table>
        </div>
      </div>

      <!-- Trust Badges Footer -->
      <div style="margin-top:24px;text-align:center;padding:24px;background:var(--bg-secondary);border-radius:16px;border:1px solid var(--border)">
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:16px;font-weight:600;letter-spacing:1px">TRUSTED BY ENTERPRISE CUSTOMERS WORLDWIDE</div>
        <div style="display:flex;justify-content:center;gap:24px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(59,130,246,0.1);border-radius:8px;border:1px solid rgba(59,130,246,0.2)">
            <span style="font-size:1.2rem">🛡️</span>
            <div><div style="font-size:0.75rem;font-weight:700;color:#3b82f6">SOC 2 Type II</div><div style="font-size:0.6rem;color:var(--text-muted)">Audited by Deloitte</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(16,185,129,0.1);border-radius:8px;border:1px solid rgba(16,185,129,0.2)">
            <span style="font-size:1.2rem">📋</span>
            <div><div style="font-size:0.75rem;font-weight:700;color:#10b981">ISO 27001:2022</div><div style="font-size:0.6rem;color:var(--text-muted)">BSI Certified</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(245,158,11,0.1);border-radius:8px;border:1px solid rgba(245,158,11,0.2)">
            <span style="font-size:1.2rem">🏅</span>
            <div><div style="font-size:0.75rem;font-weight:700;color:#f59e0b">GS1 Partner</div><div style="font-size:0.6rem;color:var(--text-muted)">EPCIS 2.0 Compliant</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(99,102,241,0.1);border-radius:8px;border:1px solid rgba(99,102,241,0.2)">
            <span style="font-size:1.2rem">🇪🇺</span>
            <div><div style="font-size:0.75rem;font-weight:700;color:#6366f1">GDPR</div><div style="font-size:0.6rem;color:var(--text-muted)">Full Compliance</div></div>
          </div>
        </div>
      </div>

    </div>
  `;
}

async function requestEnterpriseQuote() {
  const scans = prompt('Estimated monthly scans?', '500000');
  if (!scans) return;
  try {
    const res = await API.post('/billing/enterprise/request', {
      estimated_scans: parseInt(scans),
      estimated_api_calls: 1000000,
      requirements: { on_premise: confirm('Need on-premise deployment?'), custom_sla: '99.95%' },
    });
    showToast('Enterprise quote submitted! Our team will contact you within 48 hours.', 'success');
  } catch (e) { showToast(e.message || 'Quote request failed', 'error'); }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC INSIGHT DASHBOARD
// ═══════════════════════════════════════════════════════════════

function renderPublicDashboard() {
  const d = State.publicData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading public data…</span></div>';

  const s = d.stats;
  return `
    <div class="card" style="margin-bottom:24px;padding:20px;background:linear-gradient(135deg, rgba(0,210,255,0.08), rgba(168,85,247,0.08));border:1px solid rgba(0,210,255,0.15)">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:2rem">🌐</span>
        <div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary)">TrustChecker Public Transparency Dashboard</div>
          <div style="font-size:0.85rem;color:var(--text-muted)">Real-time platform statistics • No authentication required • Last updated: ${new Date(s.last_updated).toLocaleString()}</div>
        </div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card cyan">
        <div class="stat-icon">📦</div>
        <div class="stat-value">${s.total_products}</div>
        <div class="stat-label">Products Protected</div>
      </div>
      <div class="stat-card violet">
        <div class="stat-icon">📱</div>
        <div class="stat-value">${s.total_scans?.toLocaleString()}</div>
        <div class="stat-label">Scans Performed</div>
        <div class="stat-change up">↗ ${s.today_scans} today</div>
      </div>
      <div class="stat-card emerald">
        <div class="stat-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span></div>
        <div class="stat-value">${s.verification_rate}%</div>
        <div class="stat-label">Verification Rate</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-icon">🔗</div>
        <div class="stat-value">${s.blockchain_seals}</div>
        <div class="stat-label">Blockchain Seals</div>
      </div>
      <div class="stat-card cyan">
        <div class="stat-icon">📊</div>
        <div class="stat-value">${s.avg_trust_score}</div>
        <div class="stat-label">Avg Trust Score</div>
      </div>
      <div class="stat-card violet">
        <div class="stat-icon">🤝</div>
        <div class="stat-value">${s.total_partners}</div>
        <div class="stat-label">Verified Partners</div>
      </div>
      <div class="stat-card emerald">
        <div class="stat-icon">🏅</div>
        <div class="stat-value">${s.active_certifications}</div>
        <div class="stat-label">Active Certs</div>
      </div>
      <div class="stat-card rose">
        <div class="stat-icon">🚨</div>
        <div class="stat-value">${s.open_alerts}</div>
        <div class="stat-label">Active Alerts</div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:24px">
      <div class="card">
        <div class="card-header"><div class="card-title">📈 Scan Volume Trend (7 Days)</div></div>
        <div style="position:relative;height:280px;padding:10px"><canvas id="publicTrendChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">🎯 Scan Results Breakdown</div></div>
        <div style="position:relative;height:280px;padding:10px"><canvas id="publicScanChart"></canvas></div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:16px">
      <div class="card">
        <div class="card-header"><div class="card-title">🛡️ Trust Score Distribution</div></div>
        <div style="position:relative;height:280px;padding:10px"><canvas id="publicTrustChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><span class="status-icon status-warn" aria-label="Warning">!</span> Alert Severity</div></div>
        <div style="position:relative;height:280px;padding:10px"><canvas id="publicAlertChart"></canvas></div>
      </div>
    </div>

    <div class="card" style="margin-top:16px;padding:16px;text-align:center">
      <div style="color:var(--text-muted);font-size:0.85rem">
        🔓 This data is publicly accessible via <code style="background:rgba(0,210,255,0.1);padding:2px 8px;border-radius:4px;color:var(--cyan)">GET /api/public/stats</code>
        • Platform uptime: <span style="color:var(--emerald)">${s.platform_uptime}</span>
        • <a href="/api/docs/html" target="_blank" style="color:var(--cyan);text-decoration:none">View Full API Docs →</a>
      </div>
    </div>
  `;
}

function initPublicCharts() {
  const d = State.publicData;
  if (!d) return;

  // Scan Trend Line Chart
  const trends = d.trends || [];
  const trendCanvas = document.getElementById('publicTrendChart');
  if (trendCanvas && trends.length) {
    new Chart(trendCanvas, {
      type: 'line',
      data: {
        labels: trends.map(t => t.date?.substring(5)),
        datasets: [
          { label: 'Total', data: trends.map(t => t.total), borderColor: '#00d2ff', backgroundColor: 'rgba(0,210,255,0.1)', fill: true, tension: 0.4, borderWidth: 2 },
          { label: 'Valid', data: trends.map(t => t.valid), borderColor: '#00d264', backgroundColor: 'transparent', tension: 0.4, borderWidth: 2, borderDash: [5, 3] },
          { label: 'Suspicious', data: trends.map(t => t.suspicious), borderColor: '#ff6b6b', backgroundColor: 'transparent', tension: 0.4, borderWidth: 2, borderDash: [5, 3] }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#c8d6e5', padding: 12, usePointStyle: true, font: { family: 'Inter', size: 11 } } } },
        scales: {
          x: { ticks: { color: '#636e7b', font: { family: 'Inter', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#636e7b', font: { family: 'Inter', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
        }
      }
    });
  }

  // Scan Results Doughnut
  const scanResults = d.scanResults || [];
  const scanCanvas = document.getElementById('publicScanChart');
  if (scanCanvas && scanResults.length) {
    const colorMap = { valid: '#00d264', warning: '#ffa500', suspicious: '#ff6b6b', counterfeit: '#ff3366', pending: '#636e7b' };
    new Chart(scanCanvas, {
      type: 'doughnut',
      data: {
        labels: scanResults.map(r => r.result),
        datasets: [{ data: scanResults.map(r => r.count), backgroundColor: scanResults.map(r => colorMap[r.result] || '#00d2ff'), borderWidth: 0, borderRadius: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#c8d6e5', padding: 12, usePointStyle: true, font: { family: 'Inter', size: 11 } } } },
        cutout: '60%'
      }
    });
  }

  // Trust Distribution Bar
  const trustDist = d.trustDist || [];
  const trustCanvas = document.getElementById('publicTrustChart');
  if (trustCanvas && trustDist.length) {
    const barColors = ['#00d264', '#00d2ff', '#ffa500', '#ff6b6b', '#ff3366'];
    new Chart(trustCanvas, {
      type: 'bar',
      data: {
        labels: trustDist.map(t => t.bracket),
        datasets: [{ label: 'Products', data: trustDist.map(t => t.count), backgroundColor: barColors.slice(0, trustDist.length), borderWidth: 0, borderRadius: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#636e7b', font: { family: 'Inter', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true },
          y: { ticks: { color: '#c8d6e5', font: { family: 'Inter', size: 10 } }, grid: { display: false } }
        }
      }
    });
  }

  // Alert Severity Polar
  const alertSev = d.alertSev || [];
  const alertCanvas = document.getElementById('publicAlertChart');
  if (alertCanvas && alertSev.length) {
    const sevColors = { critical: '#ff3366', high: '#ffa500', medium: '#a855f7', low: '#00d2ff' };
    new Chart(alertCanvas, {
      type: 'polarArea',
      data: {
        labels: alertSev.map(a => a.severity),
        datasets: [{ data: alertSev.map(a => a.count), backgroundColor: alertSev.map(a => (sevColors[a.severity] || '#00d2ff') + '99'), borderWidth: 0 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#c8d6e5', padding: 12, usePointStyle: true, font: { family: 'Inter', size: 11 } } } },
        scales: { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.06)' } } }
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// API DOCUMENTATION
// ═══════════════════════════════════════════════════════════════

function renderApiDocs() {
  return `
    <div class="card" style="margin-bottom:16px;padding:20px;background:linear-gradient(135deg, rgba(0,210,255,0.08), rgba(168,85,247,0.08));border:1px solid rgba(0,210,255,0.15)">
      <div style="display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:2rem">📖</span>
          <div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary)">TrustChecker REST API v8.8.6</div>
            <div style="font-size:0.85rem;color:var(--text-muted)">Full endpoint reference • JWT Authentication • JSON responses</div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <a href="/api/docs" target="_blank" class="btn-action" style="text-decoration:none">📋 JSON Spec</a>
          <a href="/api/docs/html" target="_blank" class="btn-action primary" style="text-decoration:none">🔗 Open Full Docs</a>
        </div>
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden;border-radius:12px;height:calc(100vh - 240px)">
      <iframe src="/api/docs/html" style="width:100%;height:100%;border:none;background:#0a0e1a"></iframe>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// EVIDENCE FORENSIC EXPORT
// ═══════════════════════════════════════════════════════════════

async function downloadForensicReport(id) {
  try {
    const report = await API.get(`/evidence/${id}/forensic-report`);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forensic-report-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📋 Forensic report downloaded', 'success');
  } catch (err) {
    showToast('Failed to generate report: ' + err.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS (MFA, Password, Sessions)
// ═══════════════════════════════════════════════════════════════


function renderSettings() {
  return `
    <div class="settings-grid">
      <!-- MFA Section -->
      <div class="card settings-card">
        <div class="card-header"><div class="card-title">🔐 Two-Factor Authentication</div></div>
        <div class="card-body">
          <div id="mfa-status" class="mfa-status">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>

      <!-- Password Change -->
      <div class="card settings-card">
        <div class="card-header"><div class="card-title">🔑 Change Password</div></div>
        <div class="card-body">
          <div id="pw-msg" class="settings-msg" style="display:none"></div>
          <div class="input-group">
            <label>Current Password</label>
            <input class="input" id="pw-current" type="password" placeholder="Current password">
          </div>
          <div class="input-group">
            <label>New Password</label>
            <input class="input" id="pw-new" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number">
          </div>
          <div class="input-group">
            <label>Confirm New Password</label>
            <input class="input" id="pw-confirm" type="password" placeholder="Confirm new password">
          </div>
          <button class="btn btn-primary" style="margin-top:8px" onclick="changePassword()">Update Password</button>
        </div>
      </div>

      <!-- Active Sessions -->
      <div class="card settings-card" style="grid-column:1/-1">
        <div class="card-header">
          <div class="card-title">📱 Active Sessions</div>
          <button class="btn btn-sm" onclick="revokeAllSessions()">Revoke All Others</button>
        </div>
        <div class="card-body">
          <div id="sessions-list" class="sessions-list">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Load settings data after render
async function loadSettingsData() {
  try {
    const me = await API.get('/auth/me');
    const mfaEl = document.getElementById('mfa-status');
    if (mfaEl) {
      mfaEl.innerHTML = me.user.mfa_enabled ? `
        <div class="mfa-enabled">
          <div class="mfa-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span></div>
          <div class="mfa-text">MFA is <strong>enabled</strong></div>
          <div style="margin-top:12px">
            <div class="input-group">
              <label>Enter password to disable MFA</label>
              <input class="input" id="mfa-disable-pw" type="password" placeholder="Your password">
            </div>
            <button class="btn btn-sm" style="background:var(--rose);color:#fff" onclick="disableMfa()">Disable MFA</button>
          </div>
        </div>
      ` : `
        <div class="mfa-disabled">
          <div class="mfa-icon">🔓</div>
          <div class="mfa-text">MFA is <strong>not enabled</strong></div>
          <button class="btn btn-primary" style="margin-top:12px" onclick="setupMfa()">Enable MFA</button>
        </div>
      `;
    }

    const sessRes = await API.get('/auth/sessions');
    const sessList = document.getElementById('sessions-list');
    if (sessList && sessRes.sessions) {
      sessList.innerHTML = sessRes.sessions.length ? sessRes.sessions.map((s, i) => `
        <div class="session-card ${i === 0 ? 'current' : ''}">
          <div class="session-info">
            <div class="session-device">${parseUA(s.user_agent)}</div>
            <div class="session-meta">${escapeHTML(s.ip_address)} • Created ${timeAgo(s.created_at)} • Active ${timeAgo(s.last_active)}</div>
          </div>
          <div class="session-actions">
            ${i === 0 ? '<span class="badge valid">Current</span>' : `<button class="btn btn-sm" onclick="revokeSession('${escapeHTML(s.id)}')">Revoke</button>`}
          </div>
        </div>
      `).join('') : '<div class="empty-state"><div class="empty-text">No active sessions</div></div>';
    }
  } catch (e) { console.error('Settings load error:', e); }
}

function parseUA(ua) {
  if (!ua) return '🖥️ Unknown Device';
  if (ua.includes('Chrome')) return '🌐 Chrome';
  if (ua.includes('Firefox')) return '🦊 Firefox';
  if (ua.includes('Safari')) return '🧭 Safari';
  if (ua.includes('curl')) return '📟 CLI (curl)';
  return '🖥️ ' + escapeHTML(ua.substring(0, 40));
}

async function setupMfa() {
  try {
    const res = await API.post('/auth/mfa/setup');
    const mfaEl = document.getElementById('mfa-status');
    if (mfaEl) {
      mfaEl.innerHTML = `
        <div class="mfa-setup">
          <div class="mfa-text" style="margin-bottom:12px">Scan this URI with your authenticator app:</div>
          <div class="mfa-qr-uri">${escapeHTML(res.otpauth_url)}</div>
          <div style="margin-top:8px;font-size:0.72rem;color:var(--text-muted)">
            Manual entry key: <code style="color:var(--cyan)">${escapeHTML(res.secret)}</code>
          </div>
          <div class="mfa-backup" style="margin-top:12px">
            <div style="font-weight:600;margin-bottom:4px">Backup Codes (save these!):</div>
            <div class="backup-codes">${res.backup_codes.map(c => `<span class="backup-code">${escapeHTML(c)}</span>`).join('')}</div>
          </div>
          <div class="input-group" style="margin-top:12px">
            <label>Enter code from your app to verify</label>
            <input class="input mfa-code-input" id="mfa-verify-code" type="text" maxlength="6" placeholder="000000"
              oninput="if(this.value.length===6) verifyMfa()" onkeydown="if(event.key==='Enter') verifyMfa()">
          </div>
          <button class="btn btn-primary" onclick="verifyMfa()">Verify & Enable</button>
        </div>
      `;
    }
  } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}

async function verifyMfa() {
  const code = document.getElementById('mfa-verify-code')?.value;
  if (!code || code.length !== 6) return;
  try {
    await API.post('/auth/mfa/verify', { code });
    showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> MFA enabled successfully!', 'success');
    loadSettingsData();
  } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}

async function disableMfa() {
  const pw = document.getElementById('mfa-disable-pw')?.value;
  if (!pw) return showToast('Password required', 'error');
  try {
    await API.post('/auth/mfa/disable', { password: pw });
    showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> MFA disabled', 'success');
    loadSettingsData();
  } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}

async function changePassword() {
  const cur = document.getElementById('pw-current')?.value;
  const nw = document.getElementById('pw-new')?.value;
  const conf = document.getElementById('pw-confirm')?.value;
  const msg = document.getElementById('pw-msg');

  if (!cur || !nw || !conf) { msg.style.display = 'block'; msg.className = 'settings-msg error'; msg.textContent = 'All fields required'; return; }
  if (nw !== conf) { msg.style.display = 'block'; msg.className = 'settings-msg error'; msg.textContent = 'Passwords do not match'; return; }

  try {
    await API.post('/auth/password', { current_password: cur, new_password: nw });
    msg.style.display = 'block'; msg.className = 'settings-msg success'; msg.textContent = 'Password changed successfully';
    document.getElementById('pw-current').value = '';
    document.getElementById('pw-new').value = '';
    document.getElementById('pw-confirm').value = '';
  } catch (e) { msg.style.display = 'block'; msg.className = 'settings-msg error'; msg.textContent = e.message; }
}

async function revokeSession(id) {
  try {
    await API.post('/auth/revoke', { session_id: id });
    showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Session revoked', 'success');
    loadSettingsData();
  } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}

async function revokeAllSessions() {
  try {
    await API.post('/auth/revoke', {});
    showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> All other sessions revoked', 'success');
    loadSettingsData();
  } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════════
// ADMIN: USER MANAGEMENT (admin only)
// ═══════════════════════════════════════════════════════════════

function renderAdminUsers() {
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

async function loadAdminUsers() {
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
              <td style="font-weight:600">${escapeHTML(u.email)}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${escapeHTML(u.email)}</td>
              <td>
                <select class="input" style="width:120px;padding:4px 8px;font-size:0.72rem"
                  onchange="changeUserRole('${escapeHTML(u.id)}', this.value)" ${u.id === State.user.id ? 'disabled' : ''}>
                  ${['admin', 'manager', 'operator', 'viewer'].map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
              </td>
              <td>${u.mfa_enabled ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '—'}</td>
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
    showToast(`<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Role updated to ${role}`, 'success');
  } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); loadAdminUsers(); }
}

// ─── INTEGRATIONS PAGE ──────────────────────────────────────
function renderIntegrations() {
  const schema = State.integrationsSchema;
  const data = State.integrationsData || {};
  if (!schema) return `<div class="empty-state"><div class="empty-icon">🔌</div><div class="empty-text">Loading integrations...</div></div>`;

  const cards = Object.entries(schema).map(([cat, def]) => {
    const catData = data[cat] || {};
    const isEnabled = catData.enabled?.value === 'true';
    const hasAnyValue = Object.keys(catData).length > 0;
    const lastUpdate = Object.values(catData).find(v => v.updated_at)?.updated_at;

    return `
      <div class="integration-card ${isEnabled ? 'integration-active' : ''}" id="integ-${cat}">
        <div class="integration-header" onclick="toggleIntegSection('${cat}')">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:1.8rem">${def.icon}</span>
            <div>
              <div class="integration-title">${def.label}</div>
              <div class="integration-desc">${def.description}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            ${isEnabled ? '<span class="integration-status status-active">● Active</span>' : hasAnyValue ? '<span class="integration-status status-configured">● Configured</span>' : '<span class="integration-status status-inactive">○ Not configured</span>'}
            <span class="integration-chevron" id="chevron-${cat}">▶</span>
          </div>
        </div>
        <div class="integration-body" id="body-${cat}" style="display:none">
          <div class="integration-fields">
            ${def.settings.map(s => {
      const current = catData[s.key];
      const currentVal = current?.value || '';
      return `
              <div class="integration-field">
                <label class="integration-label">
                  ${s.label}
                  ${s.secret ? '<span class="secret-badge">🔒 ENCRYPTED</span>' : ''}
                </label>
                <div style="display:flex;gap:8px">
                  <input class="input integration-input" 
                    id="integ-${cat}-${s.key}"
                    type="${s.secret ? 'password' : 'text'}" 
                    placeholder="${s.placeholder}"
                    value="${currentVal}"
                    autocomplete="off"
                  >
                  ${s.secret ? `<button class="btn btn-sm" onclick="toggleIntegSecret('integ-${cat}-${s.key}')" title="Show/Hide" style="min-width:36px">👁</button>` : ''}
                </div>
                ${current?.updated_at ? `<div class="integration-meta">Last updated: ${new Date(current.updated_at).toLocaleString()} by ${current.updated_by || 'admin'}</div>` : ''}
              </div>`;
    }).join('')}
          </div>
          <div class="integration-actions">
            <button class="btn btn-primary" onclick="saveIntegration('${cat}')">💾 Save</button>
            <button class="btn btn-secondary" onclick="testIntegration('${cat}')">🔗 Test Connection</button>
            <button class="btn btn-danger" onclick="clearIntegration('${cat}')">🗑️ Clear All</button>
          </div>
          <div id="integ-test-${cat}" class="integration-test-result" style="display:none"></div>
          ${lastUpdate ? `<div class="integration-meta" style="margin-top:8px;text-align:right">Last saved: ${new Date(lastUpdate).toLocaleString()}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="integrations-container">
      <div class="card" style="margin-bottom:20px;padding:16px;background:linear-gradient(135deg, rgba(0,210,255,0.08), rgba(88,86,214,0.08))">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:2rem">🔐</span>
          <div>
            <strong>API Key Security</strong>
            <div style="font-size:0.82rem;color:var(--text-muted);margin-top:2px">
              All secret keys are encrypted with AES-256 at rest. Only admins can view/modify these settings.
              Values with 🔒 are stored securely and shown masked.
            </div>
          </div>
        </div>
      </div>
      ${cards}
    </div>`;
}

function toggleIntegSection(cat) {
  const body = document.getElementById('body-' + cat);
  const chev = document.getElementById('chevron-' + cat);
  if (body.style.display === 'none') {
    body.style.display = 'block';
    chev.textContent = '▼';
    chev.style.transform = 'rotate(0deg)';
  } else {
    body.style.display = 'none';
    chev.textContent = '▶';
  }
}

function toggleIntegSecret(inputId) {
  const inp = document.getElementById(inputId);
  if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
}

async function saveIntegration(cat) {
  try {
    const schema = State.integrationsSchema[cat];
    if (!schema) return;
    const payload = {};
    for (const s of schema.settings) {
      const inp = document.getElementById(`integ-${cat}-${s.key}`);
      if (inp) payload[s.key] = inp.value;
    }
    const result = await API.put(`/integrations/${cat}`, payload);
    showToast(`<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> ${result.message}`, 'success');
    // Reload data
    State.integrationsData = await API.get('/integrations');
    render();
    // Re-open this section
    setTimeout(() => {
      const body = document.getElementById('body-' + cat);
      const chev = document.getElementById('chevron-' + cat);
      if (body) { body.style.display = 'block'; chev.textContent = '▼'; }
    }, 100);
  } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}

async function testIntegration(cat) {
  const resultEl = document.getElementById('integ-test-' + cat);
  if (!resultEl) return;
  resultEl.style.display = 'block';
  resultEl.innerHTML = '<span style="color:var(--text-muted)">⏳ Testing connection...</span>';
  try {
    const result = await API.get(`/integrations/${cat}/test`);
    if (result.status === 'ok') {
      resultEl.innerHTML = `<span style="color:var(--success)"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> ${escapeHTML(result.message)}</span>`;
    } else if (result.status === 'disabled') {
      resultEl.innerHTML = `<span style="color:var(--warning)"><span class="status-icon status-warn" aria-label="Warning">!</span> ${escapeHTML(result.message)}</span>`;
    } else {
      resultEl.innerHTML = `<span style="color:var(--danger)"><span class="status-icon status-fail" aria-label="Fail">✗</span> ${escapeHTML(result.message)}</span>`;
    }
  } catch (e) {
    resultEl.innerHTML = `<span style="color:var(--danger)"><span class="status-icon status-fail" aria-label="Fail">✗</span> Test failed: ${escapeHTML(e.message)}</span>`;
  }
}

async function clearIntegration(cat) {
  if (!confirm(`Clear all settings for this integration? This cannot be undone.`)) return;
  try {
    await API.delete(`/integrations/${cat}`);
    showToast('🗑️ Settings cleared', 'info');
    State.integrationsData = await API.get('/integrations');
    render();
  } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════════
// EPCIS 2.0
// ═══════════════════════════════════════════════════════════════
function renderSCMEpcis() {
  const d = State.epcisData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading EPCIS data...</span></div>';
  const s = d.stats || {};
  return `
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">📡</div><div class="stat-value">${s.total_events || 0}</div><div class="stat-label">EPCIS Events</div></div>
      <div class="stat-card emerald"><div class="stat-icon">🔗</div><div class="stat-value">${s.blockchain_sealed_pct || 0}%</div><div class="stat-label">Blockchain Sealed</div></div>
      <div class="stat-card violet"><div class="stat-icon">📦</div><div class="stat-value">${s.products_tracked || 0}</div><div class="stat-label">Products Tracked</div></div>
      <div class="stat-card amber"><div class="stat-icon">🤝</div><div class="stat-value">${s.partners_tracked || 0}</div><div class="stat-label">Partners Tracked</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📋 Event Types (GS1 CBV)</div></div>
      <table class="data-table"><thead><tr><th>Internal Type</th><th>EPCIS Type</th><th>Biz Step</th><th>Count</th></tr></thead><tbody>
        ${(s.event_types || []).map(e => `<tr><td>${e.internal_type}</td><td><span class="badge">${e.epcis_type}</span></td><td>${e.cbv_biz_step}</td><td>${e.count}</td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📡 Recent EPCIS Events</div>
        <button class="btn btn-sm" onclick="exportEpcisDoc()">📄 Export Document</button>
      </div>
      <table class="data-table"><thead><tr><th>Time</th><th>EPCIS Type</th><th>Biz Step</th><th>Location</th><th>Sealed</th></tr></thead><tbody>
        ${(d.events || []).slice(0, 20).map(e => `<tr><td>${timeAgo(e.eventTime || e.created_at)}</td><td>${e.epcis_type || '—'}</td><td>${e.cbv_biz_step || '—'}</td><td>${e.readPointId || e.location || '—'}</td><td>${e.blockchain_seal_id ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '—'}</td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> GS1 Compliance</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;padding:16px">
        ${Object.entries(s.compliance || {}).map(([k, v]) => `<div style="padding:12px;background:var(--bg-tertiary);border-radius:8px"><div style="font-size:0.75rem;color:var(--text-muted)">${k.replace(/_/g, ' ')}</div><div style="font-size:1.1rem;font-weight:700;color:${v ? 'var(--emerald)' : 'var(--rose)'}">${v ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Yes' : '<span class="status-icon status-fail" aria-label="Fail">✗</span> No'}</div></div>`).join('')}
      </div>
    </div>`;
}
async function exportEpcisDoc() {
  try { const doc = await API.get('/scm/epcis/document'); downloadJSON(doc, 'epcis_document.json'); showToast('📄 EPCIS Document exported', 'success'); } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

// ═══════════════════════════════════════════════════════════════
// AI ANALYTICS
// ═══════════════════════════════════════════════════════════════
function renderSCMAI() {
  const d = State.aiData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading AI models...</span></div>';
  const f = d.forecast || {};
  const s = d.sensing || {};
  return `
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">🧠</div><div class="stat-value">${f.algorithm ? 'Active' : 'Off'}</div><div class="stat-label">Holt-Winters</div></div>
      <div class="stat-card violet"><div class="stat-icon">📈</div><div class="stat-value">${(f.forecast || []).length}</div><div class="stat-label">Forecast Periods</div></div>
      <div class="stat-card ${s.change_detected ? 'rose' : 'emerald'}"><div class="stat-icon">⚡</div><div class="stat-value">${s.change_detected ? 'Detected!' : 'Stable'}</div><div class="stat-label">Demand Shift</div></div>
      <div class="stat-card amber"><div class="stat-icon">🎯</div><div class="stat-value">${s.data_points || 0}</div><div class="stat-label">Data Points</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📈 Demand Forecast (Holt-Winters)</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm" onclick="runMonteCarlo()">🎲 Monte Carlo</button>
          <button class="btn btn-sm" onclick="runRootCause()">🔍 Root Cause</button>
          <button class="btn btn-sm" onclick="runWhatIf()">🔮 What-If</button>
        </div>
      </div>
      <div style="padding:16px">
        <div style="display:flex;gap:24px;margin-bottom:16px;flex-wrap:wrap">
          <div><span style="color:var(--text-muted);font-size:0.8rem">MAE</span><br><strong>${f.model_fit?.MAE?.toFixed(2) || '—'}</strong></div>
          <div><span style="color:var(--text-muted);font-size:0.8rem">MAPE</span><br><strong>${f.model_fit?.MAPE?.toFixed(1) || '—'}%</strong></div>
          <div><span style="color:var(--text-muted);font-size:0.8rem">Season Length</span><br><strong>${f.season_length || '—'}</strong></div>
        </div>
        <div class="mini-chart-row">
          ${(f.forecast || []).slice(0, 14).map((v, i) => {
    const h = Math.max(5, Math.min(60, v / 2));
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div style="width:20px;height:${h}px;background:var(--cyan);border-radius:4px" title="Period ${i + 1}: ${v.toFixed(1)}"></div><span style="font-size:0.6rem;color:var(--text-muted)">${i + 1}</span></div>`;
  }).join('')}
        </div>
      </div>
    </div>
    <div id="ai-result" class="card" style="margin-top:20px;display:none">
      <div class="card-header"><div class="card-title" id="ai-result-title">—</div></div>
      <pre id="ai-result-data" style="padding:16px;font-size:0.8rem;max-height:400px;overflow:auto;background:var(--bg-tertiary);border-radius:8px;color:var(--text-primary)"></pre>
    </div>`;
}
async function runMonteCarlo() {
  try { showToast('🎲 Running Monte Carlo...', 'info'); const r = await API.post('/scm/ai/monte-carlo', {}); showAIResult('🎲 Monte Carlo Risk Simulation', r); } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}
async function runRootCause() {
  try { showToast('🔍 Analyzing delays...', 'info'); const r = await API.get('/scm/ai/delay-root-cause'); showAIResult('🔍 Causal Delay Analysis', r); } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}
async function runWhatIf() {
  try { showToast('🔮 Simulating...', 'info'); const r = await API.post('/scm/ai/what-if', { type: 'partner_failure', severity: 0.3 }); showAIResult('🔮 What-If Simulation', r); } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}
function showAIResult(title, data) {
  const el = document.getElementById('ai-result'); if (el) { el.style.display = 'block'; }
  const t = document.getElementById('ai-result-title'); if (t) { t.textContent = title; }
  const d = document.getElementById('ai-result-data'); if (d) { d.textContent = JSON.stringify(data, null, 2); }
}

// ═══════════════════════════════════════════════════════════════
// RISK RADAR
// ═══════════════════════════════════════════════════════════════
function renderSCMRiskRadar() {
  const d = State.riskRadarData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Computing risk vectors...</span></div>';
  const r = d.radar || {};
  const threatColor = r.threat_level === 'critical' ? 'var(--rose)' : r.threat_level === 'high' ? 'var(--amber)' : r.threat_level === 'medium' ? 'var(--warning)' : 'var(--emerald)';
  return `
    <div class="stats-grid">
      <div class="stat-card" style="border-color:${threatColor}"><div class="stat-icon">🎯</div><div class="stat-value" style="color:${threatColor}">${r.overall_threat_index || 0}</div><div class="stat-label">Threat Index</div><div class="stat-change" style="color:${threatColor}">⬤ ${(r.threat_level || 'unknown').toUpperCase()}</div></div>
      <div class="stat-card rose"><div class="stat-icon">🚨</div><div class="stat-value">${d.alerts?.total_active || 0}</div><div class="stat-label">Active Alerts</div></div>
      <div class="stat-card amber"><div class="stat-icon">🔥</div><div class="stat-value">${(d.heatmap?.regions || []).filter(r => r.risk_level === 'hot').length}</div><div class="stat-label">Hot Zones</div></div>
      <div class="stat-card cyan"><div class="stat-icon">📊</div><div class="stat-value">8</div><div class="stat-label">Risk Vectors</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🎯 8-Vector Risk Assessment</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;padding:16px">
        ${Object.entries(r.vectors || {}).map(([key, v]) => {
    const color = v.level === 'high' ? 'var(--rose)' : v.level === 'medium' ? 'var(--amber)' : 'var(--emerald)';
    const icon = { 'partner_risk': '🤝', 'geographic_risk': '🌍', 'route_risk': '🚚', 'financial_risk': '💰', 'compliance_risk': '📜', 'cyber_risk': '🔐', 'environmental_risk': '🌱', 'supply_disruption': '⚡' }[key] || '📊';
    return `<div style="padding:16px;background:var(--bg-tertiary);border-radius:12px;border-left:4px solid ${color}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <span style="font-weight:600">${icon} ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              <span style="font-weight:700;color:${color}">${v.score}</span>
            </div>
            <div style="background:var(--bg-secondary);border-radius:4px;height:6px;overflow:hidden"><div style="width:${v.score}%;height:100%;background:${color};border-radius:4px"></div></div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:8px">${Object.entries(v.details || {}).slice(0, 3).map(([k, val]) => `${k}: ${val}`).join(' • ')}</div>
          </div>`;
  }).join('')}
      </div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🗺️ Regional Risk Heatmap</div></div>
      <table class="data-table"><thead><tr><th>Region</th><th>Heat Score</th><th>Level</th><th>Partners</th><th>Leak Alerts</th></tr></thead><tbody>
        ${(d.heatmap?.regions || []).map(r => `<tr><td style="font-weight:600">${r.region}</td><td><span style="color:${r.risk_level === 'hot' ? 'var(--rose)' : r.risk_level === 'warm' ? 'var(--amber)' : 'var(--emerald)'};font-weight:700">${r.heat_score}</span></td><td><span class="badge ${r.risk_level === 'hot' ? 'badge-red' : r.risk_level === 'warm' ? 'badge-amber' : 'badge-green'}">${r.risk_level}</span></td><td>${r.partners}</td><td>${r.leak_alerts}</td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🚨 Active Alerts by Source</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;padding:16px">
        ${Object.entries(d.alerts?.by_source || {}).map(([k, v]) => `<div style="text-align:center;padding:12px;background:var(--bg-tertiary);border-radius:8px"><div style="font-size:1.4rem;font-weight:700;color:${v > 0 ? 'var(--rose)' : 'var(--emerald)'}">${v}</div><div style="font-size:0.75rem;color:var(--text-muted)">${k}</div></div>`).join('')}
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// CARBON / ESG
// ═══════════════════════════════════════════════════════════════
function renderSCMCarbon() {
  const d = State.carbonData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading carbon data...</span></div>';
  const sc = d.scope || {};
  const rpt = d.report || {};
  return `
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">🌍</div><div class="stat-value">${sc.total_emissions_kgCO2e || 0}</div><div class="stat-label">Total kgCO₂e</div></div>
      <div class="stat-card emerald"><div class="stat-icon">📦</div><div class="stat-value">${sc.products_assessed || 0}</div><div class="stat-label">Products Assessed</div></div>
      <div class="stat-card violet"><div class="stat-icon">🎯</div><div class="stat-value">${sc.reduction_targets?.paris_aligned_2030 || 0}</div><div class="stat-label">2030 Target kgCO₂e</div></div>
      <div class="stat-card amber"><div class="stat-icon">📊</div><div class="stat-value">${rpt.overall_esg_grade || 'N/A'}</div><div class="stat-label">ESG Grade</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📊 Scope 1 / 2 / 3 Breakdown</div></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:16px">
        ${[['Scope 1 — Manufacturing', sc.scope_1, 'var(--rose)'], ['Scope 2 — Energy/Warehousing', sc.scope_2, 'var(--amber)'], ['Scope 3 — Transport', sc.scope_3, 'var(--cyan)']].map(([label, data, color]) => `
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:12px;text-align:center;border-top:3px solid ${color}">
            <div style="font-size:0.8rem;color:var(--text-muted)">${label}</div>
            <div style="font-size:1.8rem;font-weight:700;color:${color};margin:8px 0">${data?.total || 0}</div>
            <div style="font-size:0.9rem">kgCO₂e (${data?.pct || 0}%)</div>
            <div style="background:var(--bg-secondary);border-radius:4px;height:8px;margin-top:8px"><div style="width:${data?.pct || 0}%;height:100%;background:${color};border-radius:4px"></div></div>
          </div>`).join('')}
      </div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🏆 Partner ESG Leaderboard</div></div>
      <table class="data-table"><thead><tr><th>Partner</th><th>Country</th><th>ESG Score</th><th>Grade</th><th>Reliability</th><th>Violations</th></tr></thead><tbody>
        ${(d.leaderboard?.leaderboard || []).map(p => `<tr><td style="font-weight:600">${p.name}</td><td>${p.country}</td><td><strong style="color:${p.esg_score >= 80 ? 'var(--emerald)' : p.esg_score >= 60 ? 'var(--cyan)' : 'var(--rose)'}">${p.esg_score}</strong></td><td><span class="badge ${p.grade === 'A' ? 'badge-green' : p.grade === 'B' ? 'badge-cyan' : p.grade === 'C' ? 'badge-amber' : 'badge-red'}">${p.grade}</span></td><td>${p.metrics?.shipment_reliability || 'N/A'}</td><td>${p.metrics?.sla_violations || 0}</td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📋 GRI Disclosures</div></div>
      <table class="data-table"><thead><tr><th>GRI Code</th><th>Disclosure</th><th>Value</th><th>Unit</th></tr></thead><tbody>
        ${Object.entries(rpt.disclosures || {}).map(([code, d]) => `<tr><td><strong>${code}</strong></td><td>${d.title}</td><td style="font-weight:700">${d.value}</td><td>${d.unit}</td></tr>`).join('')}
      </tbody></table>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// DIGITAL TWIN
// ═══════════════════════════════════════════════════════════════
function renderSCMTwin() {
  const d = State.twinData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Building digital twin...</span></div>';
  const m = d.model || {};
  const k = d.kpis || {};
  const a = d.anomalies || {};
  const healthColor = m.health?.overall === 'healthy' ? 'var(--emerald)' : m.health?.overall === 'warning' ? 'var(--amber)' : 'var(--rose)';
  return `
    <div class="stats-grid">
      <div class="stat-card" style="border-color:${healthColor}"><div class="stat-icon">🪞</div><div class="stat-value" style="color:${healthColor}">${(m.health?.overall || 'unknown').toUpperCase()}</div><div class="stat-label">Twin Health</div></div>
      <div class="stat-card cyan"><div class="stat-icon">🔗</div><div class="stat-value">${m.topology?.nodes || 0}/${m.topology?.edges || 0}</div><div class="stat-label">Nodes / Edges</div></div>
      <div class="stat-card violet"><div class="stat-icon">📊</div><div class="stat-value">${k.overall_score || 0}%</div><div class="stat-label">KPI Score</div></div>
      <div class="stat-card ${a.total_anomalies > 0 ? 'rose' : 'emerald'}"><div class="stat-icon">⚡</div><div class="stat-value">${a.total_anomalies || 0}</div><div class="stat-label">Anomalies</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📊 KPI Dashboard</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;padding:16px">
        ${Object.entries(k.kpis || {}).map(([key, kpi]) => {
    const color = kpi.status === 'excellent' ? 'var(--emerald)' : kpi.status === 'good' || kpi.status === 'normal' || kpi.status === 'high' ? 'var(--cyan)' : 'var(--amber)';
    return `<div style="padding:16px;background:var(--bg-tertiary);border-radius:12px">
            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase">${key.replace(/_/g, ' ')}</div>
            <div style="font-size:1.6rem;font-weight:700;color:${color};margin:4px 0">${kpi.value}${kpi.unit}</div>
            <div style="font-size:0.7rem;display:flex;justify-content:space-between"><span>Benchmark: ${kpi.benchmark}${kpi.unit}</span><span style="color:${color}">${kpi.status}</span></div>
          </div>`;
  }).join('')}
      </div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🏗️ Supply Chain State</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;padding:16px">
        ${Object.entries(m.state || {}).map(([k, v]) => `<div style="text-align:center;padding:12px;background:var(--bg-tertiary);border-radius:8px"><div style="font-size:1.2rem;font-weight:700">${v}</div><div style="font-size:0.7rem;color:var(--text-muted)">${k.replace(/_/g, ' ')}</div></div>`).join('')}
      </div>
    </div>
    ${a.total_anomalies > 0 ? `<div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">⚡ Detected Anomalies</div></div>
      <table class="data-table"><thead><tr><th>Type</th><th>Severity</th><th>Entity</th><th>Message</th><th>Action</th></tr></thead><tbody>
        ${(a.anomalies || []).map(an => `<tr><td>${an.type}</td><td><span class="badge ${an.severity === 'critical' ? 'badge-red' : an.severity === 'high' ? 'badge-amber' : 'badge-cyan'}">${an.severity}</span></td><td>${an.entity_type}/${an.entity_id?.slice(0, 8) || '—'}</td><td style="font-size:0.8rem">${an.message}</td><td style="font-size:0.75rem;color:var(--text-muted)">${an.recommended_action}</td></tr>`).join('')}
      </tbody></table>
    </div>` : ''}`;
}

// ═══════════════════════════════════════════════════════════════
// SUSTAINABILITY
// ═══════════════════════════════════════════════════════════════
function renderSustainability() {
  const d = State.sustainData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading sustainability data...</span></div>';
  const s = d.stats || {};
  return `
    <div class="stats-grid">
      <div class="stat-card emerald"><div class="stat-icon">♻️</div><div class="stat-value">${s.products_assessed || 0}</div><div class="stat-label">Products Assessed</div></div>
      <div class="stat-card cyan"><div class="stat-icon">📊</div><div class="stat-value">${s.avg_score?.toFixed(1) || 0}</div><div class="stat-label">Avg Score</div></div>
      <div class="stat-card violet"><div class="stat-icon">🏅</div><div class="stat-value">${s.certifications_issued || 0}</div><div class="stat-label">Green Certs</div></div>
      <div class="stat-card amber"><div class="stat-icon">🌍</div><div class="stat-value">${s.avg_carbon_footprint?.toFixed(1) || 0}</div><div class="stat-label">Avg Carbon</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🌱 Sustainability Scores</div></div>
      <table class="data-table"><thead><tr><th>Product</th><th>Carbon</th><th>Water</th><th>Recycl.</th><th>Ethical</th><th>Overall</th><th>Grade</th></tr></thead><tbody>
        ${(d.scores || []).map(s => `<tr><td>${s.product_id?.slice(0, 8) || '—'}</td><td>${s.carbon_footprint}</td><td>${s.water_usage}</td><td>${s.recyclability}</td><td>${s.ethical_sourcing}</td><td style="font-weight:700">${s.overall_score}</td><td><span class="badge ${s.grade === 'A' ? 'badge-green' : s.grade === 'B' ? 'badge-cyan' : s.grade === 'C' ? 'badge-amber' : 'badge-red'}">${s.grade}</span></td></tr>`).join('')}
      </tbody></table>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// GDPR COMPLIANCE
// ═══════════════════════════════════════════════════════════════
function renderCompliance() {
  const d = State.complianceData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading compliance data...</span></div>';
  const s = d.stats || {};
  return `
    <div class="stats-grid">
      <div class="stat-card emerald"><div class="stat-icon">📜</div><div class="stat-value">${s.compliance_rate || 0}%</div><div class="stat-label">Compliance Rate</div></div>
      <div class="stat-card rose"><div class="stat-icon"><span class="status-icon status-warn" aria-label="Warning">!</span></div><div class="stat-value">${s.non_compliant || 0}</div><div class="stat-label">Non-Compliant</div></div>
      <div class="stat-card cyan"><div class="stat-icon">📋</div><div class="stat-value">${s.total_records || 0}</div><div class="stat-label">Total Records</div></div>
      <div class="stat-card violet"><div class="stat-icon">🗂️</div><div class="stat-value">${(d.policies || []).length}</div><div class="stat-label">Retention Policies</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📋 Compliance Records</div></div>
      <table class="data-table"><thead><tr><th>Entity</th><th>Framework</th><th>Requirement</th><th>Status</th><th>Next Review</th></tr></thead><tbody>
        ${(d.records || []).map(r => `<tr><td>${r.entity_type}/${r.entity_id?.slice(0, 8) || '—'}</td><td><strong>${r.framework}</strong></td><td>${r.requirement || '—'}</td><td><span class="badge ${r.status === 'compliant' ? 'badge-green' : 'badge-red'}">${r.status}</span></td><td>${r.next_review ? timeAgo(r.next_review) : '—'}</td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🗂️ Data Retention Policies</div></div>
      <table class="data-table"><thead><tr><th>Table</th><th>Retention</th><th>Action</th><th>Active</th><th>Last Run</th></tr></thead><tbody>
        ${(d.policies || []).map(p => `<tr><td><code>${p.table_name}</code></td><td>${p.retention_days} days</td><td>${p.action}</td><td>${p.is_active ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '<span class="status-icon status-fail" aria-label="Fail">✗</span>'}</td><td>${p.last_run ? timeAgo(p.last_run) : 'Never'}</td></tr>`).join('')}
      </tbody></table>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// ANOMALY MONITOR
// ═══════════════════════════════════════════════════════════════
function renderAnomaly() {
  const d = State.anomalyData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading anomaly data...</span></div>';
  return `
    <div class="stats-grid">
      <div class="stat-card rose"><div class="stat-icon">⚡</div><div class="stat-value">${d.total || 0}</div><div class="stat-label">Total Anomalies</div></div>
      <div class="stat-card amber"><div class="stat-icon"><span class="status-dot red"></span></div><div class="stat-value">${d.by_severity?.critical || 0}</div><div class="stat-label">Critical</div></div>
      <div class="stat-card violet"><div class="stat-icon"><span class="status-dot amber"></span></div><div class="stat-value">${d.by_severity?.high || 0}</div><div class="stat-label">High</div></div>
      <div class="stat-card emerald"><div class="stat-icon"><span class="status-dot green"></span></div><div class="stat-value">${d.by_severity?.medium || 0}</div><div class="stat-label">Medium</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">⚡ Anomaly Detections</div></div>
      <table class="data-table"><thead><tr><th>Time</th><th>Type</th><th>Severity</th><th>Source</th><th>Score</th><th>Description</th><th>Status</th></tr></thead><tbody>
        ${(d.detections || []).map(a => `<tr><td>${timeAgo(a.detected_at)}</td><td>${a.anomaly_type}</td><td><span class="badge ${a.severity === 'critical' ? 'badge-red' : a.severity === 'high' ? 'badge-amber' : 'badge-cyan'}">${a.severity}</span></td><td>${a.source_type}</td><td>${a.score?.toFixed(2) || '—'}</td><td style="font-size:0.8rem;max-width:200px;overflow:hidden;text-overflow:ellipsis">${a.description}</td><td><span class="badge ${a.status === 'open' ? 'badge-red' : 'badge-green'}">${a.status}</span></td></tr>`).join('')}
      </tbody></table>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════
function renderReports() {
  const d = State.reportsData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading reports...</span></div>';
  return `
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">📊</div><div class="stat-value">${(d.templates || []).length}</div><div class="stat-label">Report Templates</div></div>
      <div class="stat-card violet"><div class="stat-icon">📋</div><div class="stat-value">${d.formats?.length || 3}</div><div class="stat-label">Export Formats</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📊 Report Templates</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;padding:16px">
        ${(d.templates || []).map(t => `
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:12px;cursor:pointer" onclick="generateReport('${t.id}')">
            <div style="font-weight:700;margin-bottom:4px">${t.name || t.id}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px">${t.description || ''}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">${(t.sections || []).map(s => `<span class="badge">${s}</span>`).join('')}</div>
            <button class="btn btn-sm" style="margin-top:12px;width:100%">📄 Generate</button>
          </div>`).join('')}
      </div>
    </div>`;
}
async function generateReport(templateId) {
  try { showToast('📊 Generating report...', 'info'); const r = await API.get(`/reports/generate/${templateId}`); downloadJSON(r, `report_${templateId}.json`); showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Report generated', 'success'); } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════════
// NFT CERTIFICATES
// ═══════════════════════════════════════════════════════════════
function renderNFT() {
  const d = State.nftData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading NFT certificates...</span></div>';
  return `
    <div class="stats-grid">
      <div class="stat-card violet"><div class="stat-icon">🎨</div><div class="stat-value">${d.total || (d.certificates || []).length}</div><div class="stat-label">Total NFTs</div></div>
      <div class="stat-card emerald"><div class="stat-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span></div><div class="stat-value">${(d.certificates || []).filter(c => c.status === 'active').length}</div><div class="stat-label">Active</div></div>
      <div class="stat-card cyan"><div class="stat-icon">🔗</div><div class="stat-value">${(d.certificates || []).filter(c => c.blockchain_seal_id).length}</div><div class="stat-label">On-Chain</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🎨 NFT Certificate Registry</div></div>
      <table class="data-table"><thead><tr><th>Token ID</th><th>Type</th><th>Product</th><th>Owner</th><th>Status</th><th>Minted</th></tr></thead><tbody>
        ${(d.certificates || []).map(n => `<tr><td><strong>#${n.token_id || '—'}</strong></td><td>${n.certificate_type}</td><td>${n.product_id?.slice(0, 8) || '—'}</td><td>${n.owner?.slice(0, 12) || '—'}</td><td><span class="badge ${n.status === 'active' ? 'badge-green' : 'badge-red'}">${n.status}</span></td><td>${timeAgo(n.minted_at)}</td></tr>`).join('')}
      </tbody></table>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// WALLET / PAYMENT
// ═══════════════════════════════════════════════════════════════
function renderWallet() {
  const d = State.walletData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading wallet data...</span></div>';
  return `
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">💰</div><div class="stat-value">${(d.wallets || []).length}</div><div class="stat-label">Wallets</div></div>
      <div class="stat-card violet"><div class="stat-icon">💸</div><div class="stat-value">${(d.transactions || []).length}</div><div class="stat-label">Transactions</div></div>
      <div class="stat-card emerald"><div class="stat-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span></div><div class="stat-value">${(d.transactions || []).filter(t => t.status === 'completed').length}</div><div class="stat-label">Completed</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">💰 Wallets</div></div>
      <table class="data-table"><thead><tr><th>Address</th><th>Network</th><th>Balance</th><th>Status</th></tr></thead><tbody>
        ${(d.wallets || []).map(w => `<tr><td><code>${w.address?.slice(0, 16) || '—'}...</code></td><td>${w.network || 'ETH'}</td><td style="font-weight:700">${w.balance || 0} ${w.currency || 'ETH'}</td><td><span class="badge badge-green">${w.status || 'active'}</span></td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">💸 Transaction History</div></div>
      <table class="data-table"><thead><tr><th>Time</th><th>Type</th><th>Amount</th><th>From</th><th>To</th><th>Status</th></tr></thead><tbody>
        ${(d.transactions || []).map(t => `<tr><td>${timeAgo(t.created_at)}</td><td>${t.type || '—'}</td><td style="font-weight:700">${t.amount || 0} ${t.currency || 'USD'}</td><td>${t.from_address?.slice(0, 10) || '—'}</td><td>${t.to_address?.slice(0, 10) || '—'}</td><td><span class="badge ${t.status === 'completed' ? 'badge-green' : t.status === 'pending' ? 'badge-amber' : 'badge-red'}">${t.status}</span></td></tr>`).join('')}
      </tbody></table>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// BRANDING / WHITE-LABEL
// ═══════════════════════════════════════════════════════════════
function renderBranding() {
  const d = State.brandingData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading branding settings...</span></div>';
  return `
    <div class="card">
      <div class="card-header"><div class="card-title">🎨 White-Label Configuration</div></div>
      <div style="padding:20px">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px">
          <div>
            <label class="form-label">Company Name</label>
            <input class="form-input" value="${d.company_name || 'TrustChecker'}" id="brand-name" />
          </div>
          <div>
            <label class="form-label">Primary Color</label>
            <div style="display:flex;gap:8px;align-items:center"><input type="color" value="${d.primary_color || '#06b6d4'}" id="brand-color" style="width:40px;height:40px;border:none;cursor:pointer"/><code>${d.primary_color || '#06b6d4'}</code></div>
          </div>
          <div>
            <label class="form-label">Logo URL</label>
            <input class="form-input" value="${d.logo_url || ''}" placeholder="https://..." id="brand-logo" />
          </div>
          <div>
            <label class="form-label">Support Email</label>
            <input class="form-input" value="${d.support_email || ''}" placeholder="support@company.com" id="brand-email" />
          </div>
        </div>
        <div style="margin-top:20px;display:flex;gap:12px">
          <button class="btn" onclick="saveBranding()">💾 Save Branding</button>
          <button class="btn btn-secondary" onclick="resetBranding()">↩️ Reset to Default</button>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">👁️ Preview</div></div>
      <div style="padding:20px;background:var(--bg-tertiary);border-radius:8px;display:flex;align-items:center;gap:16px">
        ${d.logo_url ? `<img src="${d.logo_url}" alt="Organization logo" style="height:48px;border-radius:8px"/>` : '<div style="width:48px;height:48px;background:var(--cyan);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.4rem">🛡️</div>'}
        <div>
          <div style="font-weight:700;font-size:1.2rem">${d.company_name || 'TrustChecker'}</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">Enterprise Digital Trust Platform</div>
        </div>
      </div>
    </div>`;
}
async function saveBranding() {
  try {
    await API.put('/branding', { company_name: document.getElementById('brand-name')?.value, primary_color: document.getElementById('brand-color')?.value, logo_url: document.getElementById('brand-logo')?.value, support_email: document.getElementById('brand-email')?.value });
    showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Branding saved', 'success');
  } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}
async function resetBranding() {
  try { await API.delete('/branding'); showToast('↩️ Branding reset', 'info'); loadPageData('branding'); } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}

// ─── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  render();
  if (State.user && API.token) {
    connectWS();
    loadPageData('dashboard');
  }
});
