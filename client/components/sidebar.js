/**
 * TrustChecker – Sidebar Component (v10 Enterprise)
 * ═══════════════════════════════════════════════════
 * Triple-mode sidebar:
 *   super_admin → Platform Governance (8 domains, Control Plane)
 *   executive   → Executive Mode (5 items, Decision Intelligence)
 *   all others  → Business Plane (6 domains, Company Operations)
 */
import { State } from '../core/state.js';
import { PAGE_FEATURE_MAP, PLAN_NAMES, hasFeature, getRequiredPlanForFeature } from '../core/features.js';
import { icon } from '../core/icons.js';
import '../components/account-settings.js';

// ═══════════════════════════════════════════════════════════════
// ROLE-BASED VISIBILITY CONFIG (Tenant Roles)
// ═══════════════════════════════════════════════════════════════

const ROLE_VISIBILITY = {
  // Full tenant access — Company Admin / Org Owner sees all 6 domains
  org_owner: null,
  admin: null,
  company_admin: null,

  // Executive — handled by dedicated sidebar
  // executive: → renderExecutiveSidebar()

  // Ops Manager — handled by dedicated sidebar
  // ops_manager: → renderOpsSidebar()

  // Risk — handled by dedicated sidebar
  // risk_officer: → renderRiskSidebar()

  // Compliance — handled by dedicated sidebar
  // compliance_officer: → renderComplianceSidebar()

  // IT / Developer — handled by dedicated sidebar
  // developer: → renderITSidebar()

  // Manager — Operations + some SCM
  manager: {
    domains: ['command-center', 'operations'],
    items: [
      'dashboard',
      'ca-nodes', 'ca-batches',
      'products', 'scans',
    ],
  },

  // GGC Member — ESG, Governance, Carbon, Lineage
  ggc_member: {
    domains: ['command-center', 'operations', 'corporate-governance', 'risk-protection'],
    items: [
      'dashboard',
      'ca-nodes', 'ca-batches', 'ca-traceability',
      'fraud',
    ],
    extraItems: [
      { id: 'green-finance', domain: 'corporate-governance', icon: icon('globe'), label: 'Green Finance' },
      { id: 'scm-carbon', domain: 'corporate-governance', icon: icon('globe'), label: 'Carbon Accounting' },
      { id: 'scm-carbon-credit', domain: 'corporate-governance', icon: icon('tag'), label: 'Carbon Passport' },
    ],
  },

  // Risk Committee — Risk models, Lineage, Fraud, Evidence
  risk_committee: {
    domains: ['command-center', 'risk-protection', 'operations'],
    items: [
      'dashboard',
      'fraud', 'ca-incidents', 'ca-risk-rules',
      'ca-nodes', 'ca-batches', 'ca-traceability',
    ],
    extraItems: [
      { id: 'hardening', domain: 'risk-protection', icon: icon('shield'), label: 'Risk Models' },
      { id: 'mrmf', domain: 'risk-protection', icon: icon('target'), label: 'MRMF' },
      { id: 'ercm', domain: 'risk-protection', icon: icon('workflow'), label: 'ERCM' },
      { id: 'risk-graph', domain: 'risk-protection', icon: icon('network'), label: 'Risk Graph' },
      { id: 'risk-intelligence', domain: 'risk-protection', icon: icon('brain'), label: 'Risk Intelligence' },
    ],
  },

  // IVU Validator — Model Validation, Lineage, Evidence, Bias
  ivu_validator: {
    domains: ['command-center', 'risk-protection'],
    items: [
      'dashboard',
      'fraud',
    ],
    extraItems: [
      { id: 'mrmf', domain: 'risk-protection', icon: icon('target'), label: 'MRMF' },
      { id: 'hardening', domain: 'risk-protection', icon: icon('shield'), label: 'Risk Models' },
      { id: 'risk-intelligence', domain: 'risk-protection', icon: icon('brain'), label: 'Risk Intelligence' },
    ],
  },

  // SCM Analyst — Products, Supply Chain, Scans, Reports
  scm_analyst: {
    domains: ['command-center', 'operations', 'corporate-governance', 'risk-protection'],
    items: [
      'dashboard',
      'ca-nodes', 'ca-batches', 'ca-traceability',
      'products', 'scans',
      'fraud', 'ca-scan-analytics',
    ],
    extraItems: [
      { id: 'scm-carbon', domain: 'corporate-governance', icon: icon('globe'), label: 'Carbon Accounting' },
      { id: 'reports', domain: 'risk-protection', icon: icon('scroll'), label: 'Reports' },
    ],
  },

  // Blockchain Operator — Evidence, Anchor, Seal, DID
  blockchain_operator: {
    domains: ['command-center', 'operations'],
    items: [
      'dashboard',
      'products', 'scans',
    ],
    extraItems: [
      { id: 'identity', domain: 'operations', icon: icon('shield'), label: 'DID / VC' },
      { id: 'blockchain', domain: 'operations', icon: icon('lock'), label: 'Blockchain' },
      { id: 'blockchain-explorer', domain: 'operations', icon: icon('search'), label: 'Explorer' },
      { id: 'evidence', domain: 'operations', icon: icon('check'), label: 'Evidence' },
    ],
  },

  // Carbon Officer — Carbon Data, Emission, Credit, ESG
  carbon_officer: {
    domains: ['command-center', 'corporate-governance'],
    items: [
      'dashboard',
      'ca-nodes', 'ca-batches',
    ],
    extraItems: [
      { id: 'scm-carbon', domain: 'corporate-governance', icon: icon('globe'), label: 'Carbon Accounting' },
      { id: 'scm-carbon-credit', domain: 'corporate-governance', icon: icon('tag'), label: 'Carbon Passport' },
      { id: 'green-finance', domain: 'corporate-governance', icon: icon('globe'), label: 'Green Finance Layer' },
      { id: 'carbon-registry', domain: 'corporate-governance', icon: icon('scroll'), label: 'Carbon Registry' },
    ],
  },

  // Auditor → Internal Audit (CIE v2.1 — forensic access)
  auditor: {
    domains: ['command-center', 'risk-protection', 'corporate-governance'],
    items: [
      'dashboard',
      'fraud',
    ],
    extraItems: [
      { id: 'audit-view', domain: 'risk-protection', icon: icon('scroll'), label: 'Audit Logs' },
      { id: 'compliance', domain: 'risk-protection', icon: icon('shield'), label: 'Compliance' },
      { id: 'reports', domain: 'risk-protection', icon: icon('scroll'), label: 'Reports' },
      { id: 'compliance-regtech', domain: 'risk-protection', icon: icon('globe'), label: 'RegTech' },
      { id: 'scm-carbon-credit', domain: 'corporate-governance', icon: icon('tag'), label: 'Carbon Passport' },
    ],
  },

  // Board Observer (CIE v2.1 — read-only strategic oversight)
  board_observer: {
    domains: ['command-center', 'corporate-governance'],
    items: ['dashboard'],
    extraItems: [
      { id: 'scm-carbon-credit', domain: 'corporate-governance', icon: icon('tag'), label: 'Carbon Passport' },
      { id: 'governance', domain: 'corporate-governance', icon: icon('shield'), label: 'Governance' },
    ],
  },

  // Data Steward (CIE v2.1 — validate data quality before CIP)
  data_steward: {
    domains: ['command-center', 'corporate-governance'],
    items: ['dashboard'],
    extraItems: [
      { id: 'scm-carbon', domain: 'corporate-governance', icon: icon('globe'), label: 'Carbon Accounting' },
      { id: 'scm-carbon-credit', domain: 'corporate-governance', icon: icon('tag'), label: 'Carbon Passport' },
    ],
  },

  // Legal Counsel (CIE v2.1 — sealed CIP + liability view)
  legal_counsel: {
    domains: ['command-center', 'corporate-governance'],
    items: ['dashboard'],
    extraItems: [
      { id: 'scm-carbon-credit', domain: 'corporate-governance', icon: icon('tag'), label: 'Carbon Passport' },
      { id: 'governance', domain: 'corporate-governance', icon: icon('shield'), label: 'Governance' },
    ],
  },

  // Supplier Contributor (CIE v2.5 — scoped external input)
  supplier_contributor: {
    domains: ['command-center', 'corporate-governance'],
    items: ['dashboard'],
    extraItems: [
      { id: 'scm-carbon-credit', domain: 'corporate-governance', icon: icon('tag'), label: 'Carbon Passport' },
    ],
  },

  // ESG Reporting Manager (CIE v2.5 — ESG reports + investor disclosure)
  esg_reporting_manager: {
    domains: ['command-center', 'corporate-governance'],
    items: ['dashboard'],
    extraItems: [
      { id: 'scm-carbon', domain: 'corporate-governance', icon: icon('globe'), label: 'Carbon Accounting' },
      { id: 'scm-carbon-credit', domain: 'corporate-governance', icon: icon('tag'), label: 'Carbon Passport' },
      { id: 'green-finance', domain: 'corporate-governance', icon: icon('globe'), label: 'Green Finance Layer' },
    ],
  },

  // External Auditor (CIE v2.5 — time-bound snapshot)
  external_auditor: {
    domains: ['command-center', 'corporate-governance'],
    items: ['dashboard'],
    extraItems: [
      { id: 'scm-carbon-credit', domain: 'corporate-governance', icon: icon('tag'), label: 'Carbon Passport' },
    ],
  },

  // Financial Institution Viewer (CIE v3.0 — NDA-bound, scoped)
  financial_viewer: {
    domains: ['command-center', 'corporate-governance'],
    items: ['dashboard'],
    extraItems: [
      { id: 'scm-carbon-credit', domain: 'corporate-governance', icon: icon('tag'), label: 'Carbon Passport' },
    ],
  },

  // Public Verifier (CIE v3.0 — QR/hash verification)
  public_verifier: {
    domains: ['command-center', 'corporate-governance'],
    items: ['dashboard'],
    extraItems: [
      { id: 'scm-carbon-credit', domain: 'corporate-governance', icon: icon('tag'), label: 'Carbon Passport' },
    ],
  },

  // Disclosure Officer (CIE v3.0 — CSRD/ESRS sign-off)
  disclosure_officer: {
    domains: ['command-center', 'corporate-governance'],
    items: ['dashboard'],
    extraItems: [
      { id: 'scm-carbon-credit', domain: 'corporate-governance', icon: icon('tag'), label: 'Carbon Passport' },
      { id: 'scm-carbon', domain: 'corporate-governance', icon: icon('globe'), label: 'Carbon Accounting' },
      { id: 'green-finance', domain: 'corporate-governance', icon: icon('globe'), label: 'Green Finance Layer' },
    ],
  },

  // Default operator — minimal
  operator: {
    domains: ['command-center', 'operations'],
    items: ['dashboard', 'products', 'scans'],
  },

  // Viewer — same as operator
  viewer: {
    domains: ['command-center', 'operations'],
    items: ['dashboard', 'products', 'scans'],
  },
};

// ═══════════════════════════════════════════════════════════════
// SUPER ADMIN — PLATFORM GOVERNANCE DOMAINS
// ═══════════════════════════════════════════════════════════════

// ── Fortune 100 Workspace Model: 6 flat nav items ─────────────
const SUPERADMIN_NAV = [
  { id: 'control-tower', icon: icon('dashboard'), label: 'Overview' },
  { id: 'sa-risk', icon: icon('alert'), label: 'Risk' },
  { id: 'sa-integrity', icon: icon('key'), label: 'Integrity' },
  { id: 'sa-governance', icon: icon('shield'), label: 'Governance' },
  { id: 'sa-financial', icon: icon('barChart'), label: 'Financial' },
  { id: 'sa-operations', icon: icon('server'), label: 'Operations' },
  { id: 'sa-carbon', icon: icon('globe'), label: 'Carbon / CIE' },
];

// ── Company Admin: Flat nav (matching SA style) ────────────────
const COMPANY_ADMIN_NAV = [
  { id: 'dashboard', icon: icon('dashboard'), label: 'Dashboard' },
  { id: 'ca-kpi-overview', icon: icon('barChart'), label: 'KPI Overview' },
  { id: 'ca-operations', icon: icon('products'), label: 'Operations' },
  { id: 'ca-risk', icon: icon('alert'), label: 'Risk' },
  { id: 'ca-identity', icon: icon('key'), label: 'Identity' },
  { id: 'ca-governance', icon: icon('shield'), label: 'Governance' },
  { id: 'ca-reports', icon: icon('clipboard'), label: 'Reports & Export' },
  { id: 'ca-audit-dashboard', icon: icon('search'), label: 'Audit Dashboard' },
  { id: 'ca-settings', icon: icon('settings'), label: 'Settings' },
  { id: 'ca-notifications', icon: icon('bell'), label: 'Notifications' },
];

// ═══════════════════════════════════════════════════════════════
// COMPANY ADMIN — FORTUNE 100 ENTERPRISE LAYOUT (IA v3.0)
// Structure: Control & Accountability — 6 Institutional Domains
// Carbon = Governance Amplifier (distributed across domains)
// ═══════════════════════════════════════════════════════════════

const DOMAIN_ITEMS = {
  'command-center': [
    { id: 'dashboard', icon: icon('dashboard'), label: 'Executive Dashboard' },
    { id: 'ca-kpi-overview', icon: icon('barChart'), label: 'KPI Overview' },
  ],
  'operations': [
    { id: 'products', icon: icon('products'), label: 'Products' },
    { id: 'ca-batches', icon: icon('clipboard'), label: 'Batch Management' },
    { id: 'ca-nodes', icon: icon('factory'), label: 'Supply Network' },
    { id: 'ca-traceability', icon: icon('search'), label: 'Traceability Map' },
    { id: 'scans', icon: icon('check'), label: 'Verification Logs' },
    { id: 'scm-carbon', icon: icon('globe'), label: 'Carbon Accounting' },
  ],
  'risk-protection': [
    { id: 'fraud', icon: icon('alert'), label: 'Fraud Monitoring' },
    { id: 'ca-incidents', icon: icon('alertTriangle'), label: 'Incidents' },
    { id: 'ca-risk-rules', icon: icon('target'), label: 'Risk Rules' },
    { id: 'ca-scan-analytics', icon: icon('search'), label: 'Scan Analytics' },
    { id: 'ca-supply-route-engine', icon: icon('network'), label: 'Supply Risk Index' },
  ],
  'identity-code': [
    { id: 'ca-code-lifecycle', icon: icon('workflow'), label: 'Code Lifecycle' },
    { id: 'ca-code-generate', icon: icon('zap'), label: 'Code Allocation' },
    { id: 'ca-code-audit-log', icon: icon('scroll'), label: 'Audit Trail' },
    { id: 'ca-duplicate-classification', icon: icon('target'), label: 'Duplicate Intelligence' },
    { id: 'ca-code-format-rules', icon: icon('settings'), label: 'Format Rules' },
  ],
  'corporate-governance': [
    { id: 'admin-users', icon: icon('users'), label: 'Users' },
    { id: 'role-manager', icon: icon('shield'), label: 'Roles & Access Matrix' },
    { id: 'ca-access-logs', icon: icon('scroll'), label: 'Access Logs' },
    { id: 'ca-audit-dashboard', icon: icon('search'), label: 'Audit Dashboard' },
    { id: 'ca-reports', icon: icon('clipboard'), label: 'Reports & Export' },
    { id: 'scm-carbon-credit', icon: icon('tag'), label: 'Carbon Passport' },
    { id: 'green-finance', icon: icon('globe'), label: 'Green Finance' },
  ],
  'corporate-settings': [
    { id: 'ca-company-profile', icon: icon('building'), label: 'Company Profile' },
    { id: 'settings', icon: icon('lock'), label: 'Security' },
    { id: 'ca-notifications', icon: icon('bell'), label: 'Notifications' },
    { id: 'ca-integrations', icon: icon('plug'), label: 'API & Integrations' },
    { id: 'billing', icon: icon('creditCard'), label: 'Billing & Quota' },
  ],
};

const DOMAIN_LABELS = {
  'command-center': 'Enterprise Command Center',
  'operations': 'Operations & Supply Integrity',
  'risk-protection': 'Risk & Protection Office',
  'identity-code': 'Identity & Code Governance',
  'corporate-governance': 'Corporate Governance',
  'corporate-settings': 'Settings & Integration',
};

// ─── Collapse state management ──────────────────────────────
function getCollapsedState() {
  try {
    return JSON.parse(localStorage.getItem('tc_nav_collapsed') || '{}');
  } catch { return {}; }
}

function isCollapsed(domain) {
  const state = getCollapsedState();
  // SA uses flat nav — no collapse needed for SA
  if (isSuperAdmin()) return false;
  const items = getVisibleItemsForDomain(domain);
  if (items && items.some(n => n.id === State.page)) return false;
  return state[domain] === true;
}

function toggleNavSection(domain) {
  const state = getCollapsedState();
  state[domain] = !state[domain];
  localStorage.setItem('tc_nav_collapsed', JSON.stringify(state));
  const sidebarEl = document.querySelector('.sidebar');
  if (sidebarEl) sidebarEl.outerHTML = renderSidebar();
}

// ─── Role helpers (Multi-Role RBAC) ─────────────────────────
const ROLE_LABELS = {
  super_admin: 'Platform Control',
  platform_security: 'Security Officer',
  data_gov_officer: 'Data Governance',
  org_owner: 'Org Owner',
  company_admin: 'Company Admin',
  security_officer: 'Security Officer',
  executive: 'Executive',
  ops_manager: 'Ops Control',
  risk_officer: 'Risk Control',
  compliance_officer: 'Compliance',
  developer: 'IT Admin',
  admin: 'Business Admin',
  manager: 'Manager',
  operator: 'Operator',
  viewer: 'Viewer',
  ggc_member: 'GGC Member',
  risk_committee: 'Risk Committee',
  ivu_validator: 'IVU Validator',
  scm_analyst: 'SCM Analyst',
  blockchain_operator: 'Blockchain Ops',
  carbon_officer: 'Carbon Officer',
  auditor: 'Auditor',
};

const ROLE_THEMES = {
  super_admin: { color: '#f59e0b', icon: 'shield' },
  platform_security: { color: '#dc2626', icon: 'lock' },
  data_gov_officer: { color: '#7c3aed', icon: 'scroll' },
  org_owner: { color: '#8b5cf6', icon: 'shield' },
  company_admin: { color: '#3b82f6', icon: 'users' },
  security_officer: { color: '#ef4444', icon: 'lock' },
  executive: { color: '#6366f1', icon: 'dashboard' },
  ops_manager: { color: '#14b8a6', icon: 'workflow' },
  risk_officer: { color: '#ef4444', icon: 'alertTriangle' },
  compliance_officer: { color: '#a855f7', icon: 'scroll' },
  developer: { color: '#06b6d4', icon: 'settings' },
  admin: { color: '#3b82f6', icon: 'users' },
  ggc_member: { color: '#22c55e', icon: 'globe' },
  risk_committee: { color: '#f97316', icon: 'target' },
  ivu_validator: { color: '#0ea5e9', icon: 'check' },
  scm_analyst: { color: '#8b5cf6', icon: 'search' },
  blockchain_operator: { color: '#64748b', icon: 'lock' },
  carbon_officer: { color: '#059669', icon: 'globe' },
  auditor: { color: '#d97706', icon: 'scroll' },
};

function getUserRole() {
  return State.user?.active_role || State.user?.role || 'operator';
}

function getUserRoles() {
  if (State.user?.roles && State.user.roles.length > 0) return State.user.roles;
  return [getUserRole()];
}

function switchRole(role) {
  if (!State.user) return;
  State.user.active_role = role;
  sessionStorage.setItem('tc_active_role', role);
  const stored = localStorage.getItem('tc_user');
  if (stored) {
    try {
      const u = JSON.parse(stored);
      u.active_role = role;
      localStorage.setItem('tc_user', JSON.stringify(u));
    } catch (e) { }
  }
  const defaultPages = {
    super_admin: 'control-tower',
    platform_security: 'control-tower',
    data_gov_officer: 'compliance-dashboard',
    executive: 'exec-overview',
    ops_manager: 'ops-production',
    risk_officer: 'risk-dashboard',
    compliance_officer: 'compliance-dashboard',
    developer: 'it-authentication',
    ggc_member: 'green-finance',
    risk_committee: 'hardening',
    ivu_validator: 'mrmf',
    scm_analyst: 'dashboard',
    blockchain_operator: 'identity',
    carbon_officer: 'carbon-workspace',
    auditor: 'audit-view',
  };
  const dest = defaultPages[role] || 'dashboard';
  if (typeof navigate === 'function') navigate(dest);
  refreshSidebar();
}

function renderRoleSwitcher() {
  const roles = getUserRoles();
  if (roles.length <= 1) return '';
  const current = getUserRole();
  const label = ROLE_LABELS[current] || current;
  const theme = ROLE_THEMES[current] || { color: '#64748b' };
  const options = roles.filter(r => r !== current).map(r => {
    const rl = ROLE_LABELS[r] || r;
    const rt = ROLE_THEMES[r] || { color: '#64748b' };
    return `<div class="role-switch-option" onclick="event.stopPropagation();switchRole('${r}')" style="border-left:3px solid ${rt.color}">
      <span class="role-switch-dot" style="background:${rt.color}"></span>
      <span>${rl}</span>
    </div>`;
  }).join('');
  return `
    <div class="role-switcher" onclick="this.classList.toggle('open')">
      <div class="role-switcher-current" style="border-left:3px solid ${theme.color}">
        <span class="role-switch-dot" style="background:${theme.color}"></span>
        <span>${label}</span>
        <span class="role-switcher-arrow">▾</span>
      </div>
      <div class="role-switcher-dropdown">
        ${options}
      </div>
    </div>
  `;
}

function isSuperAdmin() {
  return getUserRole() === 'super_admin';
}

function isExecutive() {
  return getUserRole() === 'executive';
}

function isOps() {
  return getUserRole() === 'ops_manager';
}

function isRisk() {
  return getUserRole() === 'risk_officer';
}

function isCompliance() {
  return getUserRole() === 'compliance_officer';
}

function isIT() {
  return getUserRole() === 'developer';
}

function isCarbon() {
  return getUserRole() === 'carbon_officer';
}

function getRoleConfig() {
  const role = getUserRole();
  if (role === 'super_admin' || role === 'executive' || role === 'ops_manager' || role === 'risk_officer' || role === 'compliance_officer' || role === 'developer' || role === 'org_owner' || role === 'security_officer' || role === 'carbon_officer') return null;
  const config = ROLE_VISIBILITY[role];
  if (config === undefined) return ROLE_VISIBILITY.operator;
  return config;
}

function isDomainVisible(domain) {
  const config = getRoleConfig();
  if (config === null) return true;
  return config.domains.includes(domain);
}

function isItemVisible(itemId) {
  const config = getRoleConfig();
  if (config === null) return true;
  if (!config.items) return true;
  return config.items.includes(itemId);
}

// Map menu item IDs to required feature flag keys
const ITEM_FLAG_MAP = {
  'scm-twin': 'digital_twin',
  'scm-carbon': 'carbon_tracking',
  'scm-carbon-credit': 'carbon_tracking',
  'carbon-registry': 'carbon_tracking',
  'green-finance': 'carbon_tracking',
  'nft': 'nft_certificates',
  'nft-gallery': 'nft_certificates',
  'nft-history': 'nft_certificates',
  'scm-demand': 'demand_sensing',
  'gri-reports': 'gri_reports',
  'sso-settings': 'sso_saml',
  'webhooks': 'webhook_events',
  'ai-engine': 'ai_anomaly',
};

function isFeatureEnabled(itemId) {
  const requiredFlag = ITEM_FLAG_MAP[itemId];
  if (!requiredFlag) return true; // no flag requirement = always visible
  const flags = State.featureFlags || {};
  return flags[requiredFlag] !== false; // default to true if not set
}

function getVisibleItemsForDomain(domain) {
  const items = DOMAIN_ITEMS[domain];
  if (!items) return [];
  const config = getRoleConfig();
  if (config === null) return items.filter(n => isFeatureEnabled(n.id));

  let visible = items.filter(n => isItemVisible(n.id) && isFeatureEnabled(n.id));
  if (config.extraItems) {
    const extras = config.extraItems.filter(e => e.domain === domain && isFeatureEnabled(e.id));
    visible = [...visible, ...extras];
  }
  return visible;
}

// ─── Nav item renderer ──────────────────────────────────────
export function renderNavItem(n) {
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
        <span class="nav-lock-icon">${icon('lock', 14)}</span>
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

// ─── Domain section renderer ────────────────────────────────
function renderDomainSection(domain, label, items) {
  if (!isDomainVisible(domain)) return '';
  const visibleItems = items || getVisibleItemsForDomain(domain);
  if (visibleItems.length === 0) return '';

  const collapsed = isCollapsed(domain);
  return `
    <div class="nav-section ${collapsed ? 'collapsed' : ''}" data-domain="${domain}">
      <div class="nav-section-label" onclick="toggleNavSection('${domain}')">
        <span class="nav-domain-dot"></span>
        <span class="nav-section-text">${label}</span>
        <span class="nav-chevron">▸</span>
      </div>
      <div class="nav-section-items">
        ${visibleItems.map(n => renderNavItem(n)).join('')}
      </div>
    </div>
  `;
}

// ─── (Admin items folded into organization + settings domains) ──

// ═══════════════════════════════════════════════════════════════
// EXECUTIVE SIDEBAR (CEO Decision Intelligence)
// ═══════════════════════════════════════════════════════════════

const EXECUTIVE_ITEMS = [
  { id: 'exec-overview', icon: icon('target'), label: 'Capital Command' },
  { id: 'exec-alerts', icon: icon('bell'), label: 'Intelligence Alerts' },
  { id: 'exec-risk-intel', icon: icon('alertTriangle'), label: 'Capital Exposure' },
  { id: 'exec-trends', icon: icon('barChart'), label: 'Risk Trends' },
  { id: 'exec-heatmap', icon: icon('globe'), label: 'Risk Heatmap' },
  { id: 'exec-scm-summary', icon: icon('truck'), label: 'Supply Chain Capital' },
  { id: 'exec-carbon-summary', icon: icon('leaf'), label: 'Carbon Capital' },
  { id: 'exec-performance', icon: icon('star'), label: 'Enterprise Value' },
  { id: 'exec-allocation-engine', icon: icon('target'), label: 'Capital Allocator' },
  { id: 'exec-market', icon: icon('zap'), label: 'Decisions' },
  { id: 'exec-roi', icon: icon('creditCard'), label: 'Platform ROI' },
  { id: 'exec-trust-report', icon: icon('shield'), label: 'Trust Report' },
  { id: 'exec-reports', icon: icon('scroll'), label: 'Board Reports' },
];

function renderExecutiveSidebar() {
  const brandName = State.branding?.app_name || 'TrustChecker';
  const orgName = State.org?.name || '';

  const navItems = EXECUTIVE_ITEMS.map(n => {
    const activeClass = State.page === n.id ? 'active' : '';
    return `
      <div class="nav-item ${activeClass}" onclick="navigate('${n.id}')">
        <span class="nav-icon">${n.icon}</span>
        <span>${n.label}</span>
      </div>
    `;
  }).join('');

  return `
    <nav class="sidebar sidebar-exec" role="navigation" aria-label="Executive navigation">
      <div class="sidebar-header">
        <div class="sidebar-logo" onclick="goHome()" style="cursor:pointer" title="Go to dashboard">
          <div class="logo-icon exec-logo-icon">${icon('star', 22)}</div>
          <div>
            <div class="logo-text">${brandName}</div>
            <div class="logo-version exec-badge">Executive</div>
          </div>
        </div>
        ${orgName ? `<div class="sidebar-org" title="${orgName}">
          <span style="font-size:11px;color:rgba(148,163,184,0.8)">${icon('building', 12)} ${orgName}</span>
        </div>` : ''}
      </div>
      <div class="sidebar-nav">
        <div class="nav-section" data-domain="exec">
          <div class="nav-section-items">
            ${navItems}
          </div>
        </div>
      </div>
      <div class="sidebar-footer">
        <div class="user-avatar role-executive">${(State.user?.email || 'C')[0].toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${State.user?.email || 'CEO'}</div>
          <div class="user-role"><span class="role-badge role-executive">executive</span></div>
        </div>
        <button class="btn btn-sm" onclick="window._openAcctSettings && window._openAcctSettings()" title="Account Settings" aria-label="Settings" style="margin-right:2px;font-size:1.1rem;padding:4px 8px">⚙</button>
        <button class="btn btn-sm" onclick="doLogout()" title="Logout" aria-label="Logout">${icon('logout', 18)}</button>
      </div>
    </nav>
  `;
}

// ═══════════════════════════════════════════════════════════════
// OPS SIDEBAR (Operational Control Layer — Workspace Pattern)
// ═══════════════════════════════════════════════════════════════

const OPS_NAV = [
  { id: 'ops-production', icon: icon('factory'), label: 'Production' },
  { id: 'ops-erp', icon: icon('network'), label: 'ERP & Supply' },
  { id: 'ops-logistics', icon: icon('truck'), label: 'Logistics' },
  { id: 'ops-monitoring', icon: icon('search'), label: 'Monitoring' },
  { id: 'ops-incidents', icon: icon('alertTriangle'), label: 'Incidents' },
];

function renderOpsSidebar() {
  const brandName = State.branding?.app_name || 'TrustChecker';
  const orgName = State.org?.name || '';

  const navItems = OPS_NAV.map(n => renderNavItem(n)).join('');

  return `
    <nav class="sidebar sidebar-ops" role="navigation" aria-label="Operations navigation">
      <div class="sidebar-header">
        <div class="sidebar-logo" onclick="goHome()" style="cursor:pointer" title="Go to dashboard">
          <div class="logo-icon ops-logo-icon">${icon('zap', 22)}</div>
          <div>
            <div class="logo-text">${brandName}</div>
            <div class="logo-version ops-badge">Ops Control</div>
          </div>
        </div>
        ${orgName ? `<div class="sidebar-org" title="${orgName}">
          <span style="font-size:11px;color:rgba(148,163,184,0.8)">${icon('building', 12)} ${orgName}</span>
        </div>` : ''}
      </div>
      <div class="sidebar-nav">
        ${navItems}
      </div>
      <div class="sidebar-footer">
        <div class="user-avatar role-ops_manager">${(State.user?.email || 'O')[0].toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${State.user?.email || 'Ops Manager'}</div>
          <div class="user-role"><span class="role-badge role-ops_manager">ops_manager</span></div>
        </div>
        <button class="btn btn-sm" onclick="window._openAcctSettings && window._openAcctSettings()" title="Account Settings" aria-label="Settings" style="margin-right:2px;font-size:1.1rem;padding:4px 8px">⚙</button>
        <button class="btn btn-sm" onclick="doLogout()" title="Logout" aria-label="Logout">${icon('logout', 18)}</button>
      </div>
    </nav>
  `;
}

// ═══════════════════════════════════════════════════════════════
// RISK SIDEBAR (Risk Governance Layer)
// ═══════════════════════════════════════════════════════════════

const RISK_DOMAINS = {
  'risk-dashboard': [
    { id: 'risk-dashboard', icon: icon('dashboard'), label: 'Risk Dashboard' },
  ],
  'fraud-intelligence': [
    { id: 'risk-event-feed', icon: icon('scroll'), label: 'Event Feed' },
    { id: 'risk-advanced-filter', icon: icon('search'), label: 'Advanced Filter' },
    { id: 'risk-high-risk', icon: icon('alertTriangle'), label: 'High Risk Events' },
  ],
  'risk-rules': [
    { id: 'risk-duplicate-rules', icon: icon('shield'), label: 'Duplicate Rules' },
    { id: 'risk-geo-rules', icon: icon('globe'), label: 'Geo Rules' },
    { id: 'risk-velocity-rules', icon: icon('zap'), label: 'Velocity Rules' },
    { id: 'risk-auto-response', icon: icon('settings'), label: 'Auto Response' },
  ],
  'cases': [
    { id: 'risk-cases-open', icon: icon('alertTriangle'), label: 'Open Cases' },
    { id: 'risk-cases-escalated', icon: icon('alert'), label: 'Escalated' },
    { id: 'risk-cases-closed', icon: icon('check'), label: 'Closed' },
  ],
  'analytics': [
    { id: 'risk-pattern-clusters', icon: icon('workflow'), label: 'Pattern Clusters' },
    { id: 'risk-distributor-risk', icon: icon('network'), label: 'Distributor Risk' },
    { id: 'risk-sku-risk', icon: icon('products'), label: 'SKU Risk Ranking' },
    { id: 'risk-heatmap', icon: icon('globe'), label: 'Risk Heatmap' },
  ],
  'risk-reports': [
    { id: 'risk-reports', icon: icon('scroll'), label: 'Reports' },
  ],
  'risk-engine': [
    { id: 'risk-scoring-engine', icon: icon('target'), label: 'Scoring Engine' },
    { id: 'risk-decision-engine', icon: icon('zap'), label: 'Decision Engine' },
    { id: 'risk-case-workflow', icon: icon('workflow'), label: 'Case Workflow' },
    { id: 'risk-model-governance', icon: icon('settings'), label: 'Model Governance' },
    { id: 'risk-forensic', icon: icon('search'), label: 'Forensic Investigation' },
  ],
};

const RISK_DOMAIN_LABELS = {
  'risk-dashboard': 'Dashboard',
  'fraud-intelligence': '🚨 Fraud Intelligence',
  'risk-rules': '⚙ Risk Rules',
  'cases': '🗂 Cases',
  'analytics': '📈 Analytics',
  'risk-reports': '📜 Reports',
  'risk-engine': '🧠 Risk Engine',
};

function renderRiskSidebar() {
  const brandName = State.branding?.app_name || 'TrustChecker';
  const orgName = State.org?.name || '';

  const domainSections = Object.keys(RISK_DOMAINS).map(domain => {
    const items = RISK_DOMAINS[domain];
    const label = RISK_DOMAIN_LABELS[domain];

    if (domain === 'risk-dashboard' || domain === 'risk-reports') {
      return `
        <div class="nav-section" data-domain="${domain}">
          <div class="nav-section-items">
            ${items.map(n => {
        const activeClass = State.page === n.id ? 'active' : '';
        return `<div class="nav-item ${activeClass}" onclick="navigate('${n.id}')">
                <span class="nav-icon">${n.icon}</span><span>${n.label}</span>
              </div>`;
      }).join('')}
          </div>
        </div>
      `;
    }

    const collapsed = isCollapsed(domain);
    return `
      <div class="nav-section ${collapsed ? 'collapsed' : ''}" data-domain="${domain}">
        <div class="nav-section-label" onclick="toggleNavSection('${domain}')">
          <span class="nav-domain-dot risk-dot"></span>
          <span class="nav-section-text">${label}</span>
          <span class="nav-chevron">▸</span>
        </div>
        <div class="nav-section-items">
          ${items.map(n => {
      const activeClass = State.page === n.id ? 'active' : '';
      return `<div class="nav-item ${activeClass}" onclick="navigate('${n.id}')">
              <span class="nav-icon">${n.icon}</span><span>${n.label}</span>
            </div>`;
    }).join('')}
        </div>
      </div>
    `;
  }).join('');

  return `
    <nav class="sidebar sidebar-risk" role="navigation" aria-label="Risk navigation">
      <div class="sidebar-header">
        <div class="sidebar-logo" onclick="goHome()" style="cursor:pointer" title="Go to dashboard">
          <div class="logo-icon risk-logo-icon">${icon('shield', 22)}</div>
          <div>
            <div class="logo-text">${brandName}</div>
            <div class="logo-version risk-badge">Risk Control</div>
          </div>
        </div>
        ${orgName ? `<div class="sidebar-org" title="${orgName}">
          <span style="font-size:11px;color:rgba(148,163,184,0.8)">${icon('building', 12)} ${orgName}</span>
        </div>` : ''}
      </div>
      <div class="sidebar-nav">
        ${domainSections}
      </div>
      <div class="sidebar-footer">
        <div class="user-avatar role-risk_officer">${(State.user?.email || 'R')[0].toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${State.user?.email || 'Risk Officer'}</div>
          <div class="user-role"><span class="role-badge role-risk_officer">${getUserRole()}</span></div>
        </div>
        <button class="btn btn-sm" onclick="window._openAcctSettings && window._openAcctSettings()" title="Account Settings" aria-label="Settings" style="margin-right:2px;font-size:1.1rem;padding:4px 8px">⚙</button>
        <button class="btn btn-sm" onclick="doLogout()" title="Logout" aria-label="Logout">${icon('logout', 18)}</button>
      </div>
    </nav>
  `;
}

// ═══════════════════════════════════════════════════════════════
// COMPLIANCE SIDEBAR (Governance & Audit Layer)
// ═══════════════════════════════════════════════════════════════

const COMPLIANCE_DOMAINS = {
  'compliance-dashboard': [
    { id: 'compliance-dashboard', icon: icon('dashboard'), label: 'Compliance Dashboard' },
  ],
  'audit-trail': [
    { id: 'compliance-user-activity', icon: icon('users'), label: 'User Activity' },
    { id: 'compliance-system-changes', icon: icon('settings'), label: 'System Changes' },
    { id: 'compliance-data-export', icon: icon('scroll'), label: 'Data Export' },
    { id: 'compliance-privileged-access', icon: icon('shield'), label: 'Privileged Access' },
  ],
  'policies': [
    { id: 'compliance-access-policy', icon: icon('lock'), label: 'Access Policy' },
    { id: 'compliance-risk-policy', icon: icon('alertTriangle'), label: 'Risk Policy' },
    { id: 'compliance-workflow-control', icon: icon('workflow'), label: 'Workflow Control' },
    { id: 'compliance-violation-log', icon: icon('alert'), label: 'Violation Log' },
  ],
  'data-governance': [
    { id: 'compliance-retention', icon: icon('clock'), label: 'Retention' },
    { id: 'compliance-data-access-review', icon: icon('search'), label: 'Data Access Review' },
    { id: 'compliance-privacy-requests', icon: icon('users'), label: 'Privacy Requests' },
  ],
  'reports': [
    { id: 'compliance-audit-report', icon: icon('scroll'), label: 'Audit Report' },
    { id: 'compliance-investigation-summary', icon: icon('search'), label: 'Investigation Summary' },
    { id: 'compliance-regulatory-export', icon: icon('globe'), label: 'Regulatory Export' },
  ],
  'legal-hold': [
    { id: 'compliance-legal-hold', icon: icon('lock'), label: 'Legal Hold' },
    { id: 'compliance-sod-matrix', icon: icon('shield'), label: 'SoD Matrix' },
    { id: 'compliance-immutable-audit', icon: icon('scroll'), label: 'Immutable Audit' },
    { id: 'compliance-data-governance', icon: icon('globe'), label: 'Data Governance' },
  ],
};

const COMPLIANCE_DOMAIN_LABELS = {
  'compliance-dashboard': 'Dashboard',
  'audit-trail': '📜 Audit Trail',
  'policies': '📘 Policies',
  'data-governance': '🗄 Data Governance',
  'reports': '📑 Reports',
  'legal-hold': '⚖ Legal Hold',
};

function renderComplianceSidebar() {
  const brandName = State.branding?.app_name || 'TrustChecker';
  const orgName = State.org?.name || '';

  const domainSections = Object.keys(COMPLIANCE_DOMAINS).map(domain => {
    const items = COMPLIANCE_DOMAINS[domain];
    const label = COMPLIANCE_DOMAIN_LABELS[domain];

    if (domain === 'compliance-dashboard' || domain === 'legal-hold') {
      return `
        <div class="nav-section" data-domain="${domain}">
          <div class="nav-section-items">
            ${items.map(n => {
        const activeClass = State.page === n.id ? 'active' : '';
        return `<div class="nav-item ${activeClass}" onclick="navigate('${n.id}')">
                <span class="nav-icon">${n.icon}</span><span>${n.label}</span>
              </div>`;
      }).join('')}
          </div>
        </div>
      `;
    }

    const collapsed = isCollapsed(domain);
    return `
      <div class="nav-section ${collapsed ? 'collapsed' : ''}" data-domain="${domain}">
        <div class="nav-section-label" onclick="toggleNavSection('${domain}')">
          <span class="nav-domain-dot compliance-dot"></span>
          <span class="nav-section-text">${label}</span>
          <span class="nav-chevron">▸</span>
        </div>
        <div class="nav-section-items">
          ${items.map(n => {
      const activeClass = State.page === n.id ? 'active' : '';
      return `<div class="nav-item ${activeClass}" onclick="navigate('${n.id}')">
              <span class="nav-icon">${n.icon}</span><span>${n.label}</span>
            </div>`;
    }).join('')}
        </div>
      </div>
    `;
  }).join('');

  return `
    <nav class="sidebar sidebar-compliance" role="navigation" aria-label="Compliance navigation">
      <div class="sidebar-header">
        <div class="sidebar-logo" onclick="goHome()" style="cursor:pointer" title="Go to dashboard">
          <div class="logo-icon compliance-logo-icon">${icon('scroll', 22)}</div>
          <div>
            <div class="logo-text">${brandName}</div>
            <div class="logo-version compliance-badge">Compliance</div>
          </div>
        </div>
        ${orgName ? `<div class="sidebar-org" title="${orgName}">
          <span style="font-size:11px;color:rgba(148,163,184,0.8)">${icon('building', 12)} ${orgName}</span>
        </div>` : ''}
      </div>
      <div class="sidebar-nav">
        ${domainSections}
      </div>
      <div class="sidebar-footer">
        <div class="user-avatar role-compliance_officer">${(State.user?.email || 'C')[0].toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${State.user?.email || 'Compliance Officer'}</div>
          <div class="user-role"><span class="role-badge role-compliance_officer">compliance_officer</span></div>
        </div>
        <button class="btn btn-sm" onclick="window._openAcctSettings && window._openAcctSettings()" title="Account Settings" aria-label="Settings" style="margin-right:2px;font-size:1.1rem;padding:4px 8px">⚙</button>
        <button class="btn btn-sm" onclick="doLogout()" title="Logout" aria-label="Logout">${icon('logout', 18)}</button>
      </div>
    </nav>
  `;
}

// ═══════════════════════════════════════════════════════════════
// IT SIDEBAR (Technical Administration Layer)
// ═══════════════════════════════════════════════════════════════

const IT_DOMAINS = {
  'security': [
    { id: 'it-authentication', icon: icon('lock'), label: 'Authentication' },
    { id: 'it-network', icon: icon('globe'), label: 'Network' },
    { id: 'it-api-security', icon: icon('shield'), label: 'API Security' },
    { id: 'it-conditional-access', icon: icon('users'), label: 'Conditional Access' },
  ],
  'identity': [
    { id: 'it-sso', icon: icon('users'), label: 'SSO' },
    { id: 'it-domain', icon: icon('globe'), label: 'Domain' },
    { id: 'it-provisioning', icon: icon('workflow'), label: 'Provisioning' },
  ],
  'integrations': [
    { id: 'it-erp', icon: icon('network'), label: 'ERP' },
    { id: 'it-webhooks', icon: icon('zap'), label: 'Webhooks' },
    { id: 'it-integration-logs', icon: icon('scroll'), label: 'Logs' },
    { id: 'it-integration-hub', icon: icon('dashboard'), label: 'Integration Hub' },
    { id: 'it-integration-resilience', icon: icon('shield'), label: 'Resilience' },
  ],
  'api-mgmt': [
    { id: 'it-api-keys', icon: icon('lock'), label: 'Keys' },
    { id: 'it-oauth-clients', icon: icon('users'), label: 'OAuth Clients' },
    { id: 'it-api-usage', icon: icon('dashboard'), label: 'Usage' },
  ],
  'monitoring': [
    { id: 'it-api-health', icon: icon('check'), label: 'API Health' },
    { id: 'it-sync-status', icon: icon('workflow'), label: 'Sync Status' },
    { id: 'it-error-log', icon: icon('alertTriangle'), label: 'Errors' },
    { id: 'it-sla-monitoring', icon: icon('dashboard'), label: 'SLA Monitor' },
  ],
  'data-env': [
    { id: 'it-data-export', icon: icon('scroll'), label: 'Export' },
    { id: 'it-backup', icon: icon('clock'), label: 'Backup' },
    { id: 'it-sandbox', icon: icon('settings'), label: 'Sandbox' },
    { id: 'it-evidence-verify', icon: icon('shield'), label: 'Evidence Verify' },
    { id: 'it-anchor-config', icon: icon('lock'), label: 'Anchor Config' },
    { id: 'it-governance-dashboard', icon: icon('target'), label: 'Governance' },
  ],
};

const IT_DOMAIN_LABELS = {
  'security': '🔐 Security',
  'identity': '👥 Identity & Access',
  'integrations': '🔗 Integrations',
  'api-mgmt': '🧪 API Management',
  'monitoring': '📊 Monitoring',
  'data-env': '🗄 Data & Environment',
};

function renderITSidebar() {
  const brandName = State.branding?.app_name || 'TrustChecker';
  const orgName = State.org?.name || '';

  const domainSections = Object.keys(IT_DOMAINS).map(domain => {
    const items = IT_DOMAINS[domain];
    const label = IT_DOMAIN_LABELS[domain];
    const collapsed = isCollapsed(domain);

    return `
      <div class="nav-section ${collapsed ? 'collapsed' : ''}" data-domain="${domain}">
        <div class="nav-section-label" onclick="toggleNavSection('${domain}')">
          <span class="nav-domain-dot it-dot"></span>
          <span class="nav-section-text">${label}</span>
          <span class="nav-chevron">▸</span>
        </div>
        <div class="nav-section-items">
          ${items.map(n => {
      const activeClass = State.page === n.id ? 'active' : '';
      return `<div class="nav-item ${activeClass}" onclick="navigate('${n.id}')">
              <span class="nav-icon">${n.icon}</span><span>${n.label}</span>
            </div>`;
    }).join('')}
        </div>
      </div>
    `;
  }).join('');

  return `
    <nav class="sidebar sidebar-it" role="navigation" aria-label="IT navigation">
      <div class="sidebar-header">
        <div class="sidebar-logo" onclick="goHome()" style="cursor:pointer" title="Go to dashboard">
          <div class="logo-icon it-logo-icon">${icon('settings', 22)}</div>
          <div>
            <div class="logo-text">${brandName}</div>
            <div class="logo-version it-badge">IT Admin</div>
          </div>
        </div>
        ${orgName ? `<div class="sidebar-org" title="${orgName}">
          <span style="font-size:11px;color:rgba(148,163,184,0.8)">${icon('building', 12)} ${orgName}</span>
        </div>` : ''}
      </div>
      <div class="sidebar-nav">
        ${domainSections}
      </div>
      <div class="sidebar-footer">
        <div class="user-avatar role-developer">${(State.user?.email || 'D')[0].toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${State.user?.email || 'IT Admin'}</div>
          <div class="user-role"><span class="role-badge role-developer">developer</span></div>
        </div>
        <button class="btn btn-sm" onclick="window._openAcctSettings && window._openAcctSettings()" title="Account Settings" aria-label="Settings" style="margin-right:2px;font-size:1.1rem;padding:4px 8px">⚙</button>
        <button class="btn btn-sm" onclick="doLogout()" title="Logout" aria-label="Logout">${icon('logout', 18)}</button>
      </div>
    </nav>
  `;
}

// ═══════════════════════════════════════════════════════════════
// SUPER ADMIN SIDEBAR (Platform Governance)
// ═══════════════════════════════════════════════════════════════

function renderSuperAdminSidebar() {
  const brandName = State.branding?.app_name || 'TrustChecker';
  const role = getUserRole();

  // Fortune 100: 6 flat nav items — zero sub-items, zero scroll
  const navItems = SUPERADMIN_NAV.map(n => renderNavItem(n)).join('');

  return `
    <nav class="sidebar sidebar-sa" role="navigation" aria-label="Platform navigation">
      <div class="sidebar-header">
        <div class="sidebar-logo" onclick="goHome()" style="cursor:pointer" title="Go to dashboard">
          <div class="logo-icon sa-logo-icon">${icon('shield', 22)}</div>
          <div>
            <div class="logo-text">${brandName}</div>
            <div class="logo-version sa-badge">Platform Control</div>
          </div>
        </div>
      </div>
      <div class="sidebar-nav">
        ${navItems}
      </div>
      <div class="sidebar-footer">
        <div class="user-avatar role-${role}">${(State.user?.email || 'S')[0].toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${State.user?.email || 'Super Admin'}</div>
          <div class="user-role"><span class="role-badge role-super_admin">super_admin</span></div>
        </div>
        <button class="btn btn-sm" onclick="window._openAcctSettings && window._openAcctSettings()" title="Account Settings" aria-label="Settings" style="margin-right:2px;font-size:1.1rem;padding:4px 8px">⚙</button>
        <button class="btn btn-sm" onclick="doLogout()" title="Logout" aria-label="Logout">${icon('logout', 18)}</button>
      </div>
    </nav>
  `;
}

// ═══════════════════════════════════════════════════════════════
// CARBON SIDEBAR (Carbon Officer Workspace)
// ═══════════════════════════════════════════════════════════════

function renderCarbonSidebar() {
  const brandName = State.branding?.app_name || 'TrustChecker';
  const orgName = State.org?.name || '';
  const versionLabel = `v10.0 • Carbon`;

  const carbonNav = [
    { id: 'carbon-workspace', icon: icon('grid', 16), label: 'Carbon Overview', hash: 'dashboard' },
    { id: 'carbon-workspace', icon: icon('factory', 16), label: 'Emission Tracker', hash: 'emissions' },
    { id: 'carbon-workspace', icon: icon('tag', 16), label: 'Credit Lifecycle', hash: 'credits' },
    { id: 'carbon-workspace', icon: icon('scroll', 16), label: 'Carbon Passports', hash: 'passport' },
    { id: 'carbon-workspace', icon: icon('shield', 16), label: 'ESG & Compliance', hash: 'compliance' },
    { id: 'carbon-workspace', icon: icon('barChart', 16), label: 'Industry Benchmark', hash: 'benchmark' },
    { id: 'carbon-workspace', icon: icon('zap', 16), label: 'Action Items', hash: 'actions' },
  ];

  const navHtml = carbonNav.map(n => {
    const currentTab = window._activeCarbonTab || 'dashboard';
    const active = State.page === n.id && n.hash === currentTab;
    return `
      <div class="nav-item ${active ? 'active' : ''}" data-carbon-tab="${n.hash}"
        onclick="document.querySelectorAll('[data-carbon-tab]').forEach(e=>e.classList.remove('active'));this.classList.add('active');window._activeCarbonTab='${n.hash}';window._carbonOfficerTab&&window._carbonOfficerTab('${n.hash}')"
        style="cursor:pointer">
        <span class="nav-icon">${n.icon}</span>
        <span>${n.label}</span>
      </div>`;
  }).join('');

  return `
    <nav class="sidebar sidebar-ca" role="navigation" aria-label="Carbon navigation"
      style="--sidebar-accent:#059669">
      <div class="sidebar-header">
        <div class="sidebar-logo" onclick="window._carbonOfficerTab&&window._carbonOfficerTab('dashboard');document.querySelectorAll('[data-carbon-tab]').forEach(e=>e.classList.remove('active'));document.querySelector('[data-carbon-tab=dashboard]')?.classList.add('active')" style="cursor:pointer">
          <div class="logo-icon" style="background:#059669;color:#fff;border-radius:8px;padding:4px">${icon('globe', 22)}</div>
          <div>
            <div class="logo-text">${brandName}</div>
            <div class="logo-version">${versionLabel}</div>
          </div>
        </div>
        ${orgName ? `<div class="sidebar-org"><span style="font-size:11px;color:var(--text-secondary)">${icon('building', 12)} ${orgName}</span></div>` : ''}
      </div>
      <div class="sidebar-nav">
        <div class="nav-section">
          <div class="nav-section-label" style="color:#059669">🌱 CARBON GOVERNANCE</div>
          ${navHtml}
        </div>
      </div>
      <div class="sidebar-footer">
        <div class="user-avatar" style="background:#059669;color:#fff">${(State.user?.email || 'C')[0].toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${State.user?.email || 'User'}</div>
          <div class="user-role"><span class="role-badge" style="background:#05966915;color:#059669;border:1px solid #05966940">carbon_officer</span></div>
        </div>
        <button class="btn btn-sm" onclick="window._openAcctSettings && window._openAcctSettings()" title="Account Settings" aria-label="Settings" style="margin-right:2px;font-size:1.1rem;padding:4px 8px">⚙</button>
        <button class="btn btn-sm" onclick="doLogout()" title="Logout" aria-label="Logout">${icon('logout', 18)}</button>
      </div>
    </nav>
  `;
}

// ═══════════════════════════════════════════════════════════════
// TENANT SIDEBAR (Company Admin, ops, risk, etc.)
// ═══════════════════════════════════════════════════════════════

function isCompanyAdmin() {
  const role = getUserRole();
  return role === 'company_admin' || role === 'admin';
}

function isOrgOwner() {
  return getUserRole() === 'org_owner';
}

function renderOrgOwnerSidebar() {
  const brandName = State.branding?.app_name || 'TrustChecker';
  const orgName = State.org?.name || '';
  const versionLabel = `v10.0 • Governance`;

  const ownerNav = [
    { id: 'owner-governance', icon: icon('grid', 16), label: 'Governance Overview', hash: 'dashboard' },
    { id: 'owner-governance', icon: icon('alertTriangle', 16), label: 'Risk & Activity', hash: 'risk' },
    { id: 'owner-governance', icon: icon('users', 16), label: 'Team & People', hash: 'team' },
    { id: 'owner-governance', icon: icon('eye', 16), label: 'Privilege & Access', hash: 'privilege' },
    { id: 'owner-governance', icon: icon('scroll', 16), label: 'Compliance & Legal', hash: 'compliance' },
    { id: 'owner-governance', icon: icon('shield', 16), label: 'Ownership & Authority', hash: 'authority' },
    { id: 'owner-governance', icon: icon('creditCard', 16), label: 'Financial & Plan', hash: 'financial' },
    { id: 'owner-governance', icon: icon('zap', 16), label: 'Emergency Controls', hash: 'emergency' },
  ];

  const navHtml = ownerNav.map((n, i) => {
    const currentTab = window._activeOwnerTab || 'dashboard';
    const active = State.page === n.id && n.hash === currentTab;
    return `
      <div class="nav-item ${active ? 'active' : ''}" data-owner-tab="${n.hash}"
        onclick="document.querySelectorAll('[data-owner-tab]').forEach(e=>e.classList.remove('active'));this.classList.add('active');window._activeOwnerTab='${n.hash}';window._ownerTab&&window._ownerTab('${n.hash}')"
        style="cursor:pointer">
        <span class="nav-icon">${n.icon}</span>
        <span>${n.label}</span>
      </div>`;
  }).join('');

  return `
    <nav class="sidebar sidebar-ca" role="navigation" aria-label="Governance navigation"
      style="--sidebar-accent:#8b5cf6">
      <div class="sidebar-header">
        <div class="sidebar-logo" onclick="window._ownerTab&&window._ownerTab('dashboard');document.querySelectorAll('[data-owner-tab]').forEach(e=>e.classList.remove('active'));document.querySelector('[data-owner-tab=dashboard]')?.classList.add('active')" style="cursor:pointer">
          <div class="logo-icon" style="background:#8b5cf6;color:#fff;border-radius:8px;padding:4px">${icon('shield', 22)}</div>
          <div>
            <div class="logo-text">${brandName}</div>
            <div class="logo-version">${versionLabel}</div>
          </div>
        </div>
        ${orgName ? `<div class="sidebar-org"><span style="font-size:11px;color:var(--text-secondary)">${icon('building', 12)} ${orgName}</span></div>` : ''}
      </div>
      <div class="sidebar-nav">
        <div class="nav-section">
          <div class="nav-section-label" style="color:#8b5cf6">👑 GOVERNANCE AUTHORITY</div>
          ${navHtml}
        </div>
      </div>
      <div class="sidebar-footer">
        <div class="user-avatar" style="background:#8b5cf6;color:#fff">${(State.user?.email || 'O')[0].toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${State.user?.email || 'User'}</div>
          <div class="user-role"><span class="role-badge" style="background:#8b5cf615;color:#8b5cf6;border:1px solid #8b5cf640">org_owner</span></div>
        </div>
        <button class="btn btn-sm" onclick="window._openAcctSettings && window._openAcctSettings()" title="Account Settings" aria-label="Settings" style="margin-right:2px;font-size:1.1rem;padding:4px 8px">⚙</button>
        <button class="btn btn-sm" onclick="doLogout()" title="Logout" aria-label="Logout">${icon('logout', 18)}</button>
      </div>
    </nav>
  `;
}

function renderCompanyAdminSidebar() {
  const brandName = State.branding?.app_name || 'TrustChecker';
  const role = getUserRole();

  // Flat nav items — matching SA style
  const navItems = COMPANY_ADMIN_NAV.map(n => renderNavItem(n)).join('');

  return `
    <nav class="sidebar sidebar-ca" role="navigation" aria-label="Company navigation">
      <div class="sidebar-header">
        <div class="sidebar-logo" onclick="goHome()" style="cursor:pointer" title="Go to dashboard">
          <div class="logo-icon ca-logo-icon">${icon('shield', 22)}</div>
          <div>
            <div class="logo-text">${brandName}</div>
            <div class="logo-version ca-badge">Company Admin</div>
          </div>
        </div>
      </div>
      <div class="sidebar-nav">
        ${navItems}
      </div>
      <div class="sidebar-footer">
        <div class="user-avatar role-${role}">${(State.user?.email || State.user?.username || 'U')[0].toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${State.user?.email || State.user?.username || 'User'}</div>
          <div class="user-role"><span class="role-badge role-${role}">${role}</span></div>
        </div>
        <button class="btn btn-sm" onclick="window._openAcctSettings && window._openAcctSettings()" title="Account Settings" aria-label="Settings" style="margin-right:2px;font-size:1.1rem;padding:4px 8px">⚙</button>
        <button class="btn btn-sm" onclick="doLogout()" title="Logout" aria-label="Logout">${icon('logout', 18)}</button>
      </div>
    </nav>
  `;
}

function renderTenantSidebar() {
  // Org Owner → dedicated governance sidebar
  if (isOrgOwner()) return renderOrgOwnerSidebar();
  // Company Admin / Admin → flat nav (matching SA style)
  if (isCompanyAdmin()) return renderCompanyAdminSidebar();

  const orgName = State.org?.name || '';
  const planLabel = PLAN_NAMES[State.plan] || State.plan;
  const brandName = State.branding?.app_name || 'TrustChecker';
  const versionLabel = `v10.0 • ${State.plan === 'enterprise' ? 'Enterprise' : planLabel}`;
  const role = getUserRole();

  // Inject fraud badge into risk items
  const riskItems = getVisibleItemsForDomain('risk-monitoring').map(n => {
    if (n.id === 'fraud' && State.dashboardStats?.open_alerts) {
      return { ...n, badge: State.dashboardStats.open_alerts };
    }
    return n;
  });

  // Build 6 domain sections
  const domains = Object.keys(DOMAIN_ITEMS);
  const domainSections = domains.map(domain => {
    const label = DOMAIN_LABELS[domain] || domain;

    // Overview has no collapsible header — single landing item
    if (domain === 'overview') {
      const items = getVisibleItemsForDomain('overview');
      if (items.length === 0) return '';
      return `
        <div class="nav-section" data-domain="overview">
          <div class="nav-section-items">
            ${items.map(n => renderNavItem(n)).join('')}
          </div>
        </div>
      `;
    }

    // Use risk items with badge for risk-monitoring
    const items = domain === 'risk-monitoring' ? riskItems : undefined;
    return renderDomainSection(domain, label, items);
  }).join('');

  return `
    <nav class="sidebar" role="navigation" aria-label="Main navigation">
      <div class="sidebar-header">
        <div class="sidebar-logo" onclick="goHome()" style="cursor:pointer" title="Go to dashboard">
          <div class="logo-icon">${icon('shield', 22)}</div>
          <div>
            <div class="logo-text">${brandName}</div>
            <div class="logo-version">${versionLabel}</div>
          </div>
        </div>
        ${orgName ? `<div class="sidebar-org" title="Organization: ${orgName}">
          <span style="font-size:11px;color:var(--text-secondary)">${icon('building', 12)} ${orgName}</span>
        </div>` : ''}
      </div>
      <div class="sidebar-nav">
        ${domainSections}
      </div>
      <div class="sidebar-footer">
        <div class="user-avatar role-${role}">${(State.user?.email || State.user?.username || 'U')[0].toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${State.user?.email || State.user?.username || 'User'}</div>
          <div class="user-role"><span class="role-badge role-${role}">${role}</span></div>
        </div>
        <button class="btn btn-sm" onclick="window._openAcctSettings && window._openAcctSettings()" title="Account Settings" aria-label="Settings" style="margin-right:2px;font-size:1.1rem;padding:4px 8px">⚙</button>
        <button class="btn btn-sm" onclick="doLogout()" title="Logout" aria-label="Logout">${icon('logout', 18)}</button>
      </div>
    </nav>
  `;
}

// ═══════════════════════════════════════════════════════════════
// MAIN RENDER — routes to correct sidebar based on role
// ═══════════════════════════════════════════════════════════════

export function renderSidebar() {
  let html;
  if (isSuperAdmin()) html = renderSuperAdminSidebar();
  else if (isOrgOwner()) html = renderOrgOwnerSidebar();
  else if (isExecutive()) html = renderExecutiveSidebar();
  else if (isOps()) html = renderOpsSidebar();
  else if (isRisk()) html = renderRiskSidebar();
  else if (isCompliance()) html = renderComplianceSidebar();
  else if (isIT()) html = renderITSidebar();
  else if (isCarbon()) html = renderCarbonSidebar();
  else html = renderTenantSidebar();

  // Inject role switcher after sidebar-header (if multi-role)
  const switcher = renderRoleSwitcher();
  if (switcher) {
    html = html.replace('</div>\n      <div class="sidebar-nav">', `</div>\n      ${switcher}\n      <div class="sidebar-nav">`);
  }
  return html;
}

// ─── Go Home — navigate to role's default dashboard ─────────
function goHome() {
  const defaultPages = {
    super_admin: 'dashboard',
    platform_security: 'control-tower',
    data_gov_officer: 'compliance-dashboard',
    executive: 'exec-overview',
    ops_manager: 'ops-production',
    risk_officer: 'risk-dashboard',
    compliance_officer: 'compliance-dashboard',
    developer: 'it-authentication',
    ggc_member: 'green-finance',
    org_owner: 'owner-governance',
    company_admin: 'dashboard',
    security_officer: 'ca-governance',
    risk_committee: 'hardening',
    ivu_validator: 'mrmf',
    scm_analyst: 'dashboard',
    blockchain_operator: 'identity',
    carbon_officer: 'carbon-workspace',
    auditor: 'audit-view',
  };
  const role = State.user?.active_role || State.user?.role || 'admin';
  const dest = defaultPages[role] || 'dashboard';
  if (typeof navigate === 'function') navigate(dest);
}

// ─── Window exports ─────────────────────────────────────────
window.toggleNavSection = toggleNavSection;
window.switchRole = switchRole;
window.goHome = goHome;
