/**
 * TrustChecker – Page Header Component
 */
import { State } from '../core/state.js';
import { icon } from '../core/icons.js';

export function renderPageHeader() {
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
    'pricing': ['Pricing', 'Choose the best plan for your business'],
  };
  // SA pages render their own headers — global header shows nothing for them
  const [title, sub] = titles[State.page] || ['', ''];

  const unread = State.notifications.filter(n => !n.read).length;
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  return `
    <a href="#main-content" class="skip-link" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden">Skip to main content</a>
    <header class="page-header" role="banner" aria-label="Page header">
      <div>
        <h1 class="page-title" style="font-size:inherit;margin:0">${title}</h1>
        <div class="page-subtitle">${sub}</div>
      </div>
      <div class="header-actions" role="toolbar" aria-label="Header actions">
        <div style="position:relative;margin-right:4px">
          <select id="locale-switcher" onchange="setLocale(this.value)" aria-label="Language" style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:0.72rem;cursor:pointer">
            <option value="en" ${(localStorage.getItem('tc_locale') || 'en') === 'en' ? 'selected' : ''}>EN</option>
            <option value="vi" ${localStorage.getItem('tc_locale') === 'vi' ? 'selected' : ''}>VI</option>
          </select>
        </div>
        <button class="header-icon-btn" id="theme-toggle-btn" onclick="window.__toggleTheme()" title="Toggle light/dark mode" aria-label="Toggle theme" style="font-size:1.1rem">
          ${isLight ? '☀️' : '🌙'}
        </button>
        <button class="header-icon-btn" onclick="toggleSearch()" title="Search" aria-label="Search">
          ${icon('search', 18)}
        </button>
        <div style="position:relative">
          <button class="header-icon-btn" onclick="toggleNotifications()" title="Notifications" aria-label="Notifications${unread > 0 ? `, ${unread} unread` : ''}">
            ${icon('bell', 18)}
            <span class="notif-count" id="notif-badge" style="display:${unread > 0 ? 'flex' : 'none'}" aria-live="polite">${unread > 9 ? '9+' : unread}</span>
          </button>
          <div class="dropdown-panel" id="notif-panel" style="display:none" role="region" aria-label="Notifications"></div>
        </div>
        <span class="status-dot green" aria-hidden="true"></span>
        <span style="font-size:0.75rem;color:var(--text-muted)">System Online</span>
      </div>
    </header>
    <div class="dropdown-panel search-panel" id="search-panel" style="display:none;position:fixed;top:60px;left:50%;transform:translateX(-50%);width:560px;z-index:var(--z-modal, 50)" role="search" aria-label="Global search">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border)">
        <input class="form-input" id="global-search-input" placeholder="Search products, scans, evidence…" oninput="globalSearch(this.value)" style="width:100%;background:var(--surface)" aria-label="Search input">
      </div>
      <div id="search-results" role="listbox" aria-label="Search results"><div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.82rem">Type to search…</div></div>
    </div>
  `;
}
