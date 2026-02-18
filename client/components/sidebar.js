/**
 * TrustChecker – Sidebar Component (v9.6)
 * Feature-gated navigation sidebar with SVG icons.
 */
import { State } from '../core/state.js';
import { PAGE_FEATURE_MAP, PLAN_NAMES, hasFeature, getRequiredPlanForFeature } from '../core/features.js';
import { icon } from '../core/icons.js';

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

export function renderSidebar() {
  const navItems = [
    { id: 'dashboard', icon: icon('dashboard'), label: 'Dashboard' },
    { id: 'scanner', icon: icon('scanner'), label: 'QR Scanner' },
    { id: 'products', icon: icon('products'), label: 'Products' },
    { id: 'scans', icon: icon('search'), label: 'Scan History' },
    { id: 'fraud', icon: icon('alert'), label: 'Fraud Center', badge: State.dashboardStats?.open_alerts || '' },
    { id: 'blockchain', icon: icon('blockchain'), label: 'Blockchain' },
    { id: 'kyc', icon: icon('building'), label: 'KYC Business' },
    { id: 'evidence', icon: icon('lock'), label: 'Evidence Vault' },
    { id: 'stakeholder', icon: icon('star'), label: 'Trust & Ratings' },
  ];

  const scmItems = [
    { id: 'scm-dashboard', icon: icon('factory'), label: 'Supply Chain' },
    { id: 'scm-inventory', icon: icon('clipboard'), label: 'Inventory' },
    { id: 'scm-logistics', icon: icon('truck'), label: 'Logistics' },
    { id: 'scm-partners', icon: icon('handshake'), label: 'Partners' },
    { id: 'scm-leaks', icon: icon('search'), label: 'Leak Monitor' },
    { id: 'scm-trustgraph', icon: icon('network'), label: 'TrustGraph' },
  ];

  const scmIntelItems = [
    { id: 'scm-epcis', icon: icon('satellite'), label: 'EPCIS 2.0' },
    { id: 'scm-ai', icon: icon('brain'), label: 'AI Analytics' },
    { id: 'scm-risk-radar', icon: icon('target'), label: 'Risk Radar' },
    { id: 'scm-carbon', icon: icon('leaf'), label: 'Carbon / ESG' },
    { id: 'scm-twin', icon: icon('mirror'), label: 'Digital Twin' },
  ];

  const complianceItems = [
    { id: 'sustainability', icon: icon('recycle'), label: 'Sustainability' },
    { id: 'compliance', icon: icon('scroll'), label: 'GDPR Compliance' },
    { id: 'anomaly', icon: icon('zap'), label: 'Anomaly Monitor' },
    { id: 'reports', icon: icon('barChart'), label: 'Reports' },
  ];

  const commerceItems = [
    { id: 'nft', icon: icon('palette'), label: 'NFT Certificates' },
    { id: 'wallet', icon: icon('wallet'), label: 'Wallet / Payment' },
    { id: 'branding', icon: icon('palette'), label: 'White-Label' },
  ];

  const orgName = State.org?.name || '';
  const planLabel = PLAN_NAMES[State.plan] || State.plan;
  const brandName = State.branding?.app_name || 'TrustChecker';
  const versionLabel = `v9.6.0 • ${State.plan === 'enterprise' ? 'Enterprise' : planLabel}`;

  return `
    <div class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
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
        <div class="nav-section">
          <div class="nav-section-label">Main</div>
          ${navItems.map(n => renderNavItem(n)).join('')}
        </div>
        <div class="nav-section">
          <div class="nav-section-label">Supply Chain</div>
          ${scmItems.map(n => renderNavItem(n)).join('')}
        </div>
        <div class="nav-section">
          <div class="nav-section-label">SCM Intelligence</div>
          ${scmIntelItems.map(n => renderNavItem(n)).join('')}
        </div>
        <div class="nav-section">
          <div class="nav-section-label">Compliance & Reports</div>
          ${complianceItems.map(n => renderNavItem(n)).join('')}
        </div>
        <div class="nav-section">
          <div class="nav-section-label">Commerce</div>
          ${commerceItems.map(n => renderNavItem(n)).join('')}
        </div>
        <div class="nav-section">
          <div class="nav-section-label">System</div>
          <div class="nav-item ${State.page === 'events' ? 'active' : ''}" onclick="navigate('events')">
            <span class="nav-icon">${icon('radio')}</span><span>Event Stream</span>
          </div>
          <div class="nav-item ${State.page === 'billing' ? 'active' : ''}" onclick="navigate('billing')">
            <span class="nav-icon">${icon('creditCard')}</span><span>Billing</span>
          </div>
          <div class="nav-item ${State.page === 'pricing' ? 'active' : ''}" onclick="navigate('pricing')">
            <span class="nav-icon">${icon('tag')}</span><span>Pricing</span>
          </div>
          <div class="nav-item ${State.page === 'public-dashboard' ? 'active' : ''}" onclick="navigate('public-dashboard')">
            <span class="nav-icon">${icon('globe')}</span><span>Public Insights</span>
          </div>
          <div class="nav-item ${State.page === 'api-docs' ? 'active' : ''}" onclick="navigate('api-docs')">
            <span class="nav-icon">${icon('book')}</span><span>API Docs</span>
          </div>
          <div class="nav-item ${State.page === 'settings' ? 'active' : ''}" onclick="navigate('settings')">
            <span class="nav-icon">${icon('settings')}</span><span>Settings</span>
          </div>
          ${State.user?.role === 'admin' ? `
          <div class="nav-item ${State.page === 'admin-users' ? 'active' : ''}" onclick="navigate('admin-users')">
            <span class="nav-icon">${icon('users')}</span><span>User Management</span>
          </div>
          ${renderNavItem({ id: 'integrations', icon: icon('plug'), label: 'Integrations' })}` : ''}
        </div>
      </div>
      <div class="sidebar-footer">
        <div class="user-avatar role-${State.user?.role || 'operator'}">${(State.user?.username || 'U')[0].toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${State.user?.username || 'User'}</div>
          <div class="user-role"><span class="role-badge role-${State.user?.role || 'operator'}">${State.user?.role || 'operator'}</span></div>
        </div>
        <button class="btn btn-sm" onclick="doLogout()" title="Logout" aria-label="Logout">${icon('logout', 18)}</button>
      </div>
    </div>
  `;
}
