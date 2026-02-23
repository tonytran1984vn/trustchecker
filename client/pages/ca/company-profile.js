/**
 * Company Admin – Company Profile
 * ═════════════════════════════════
 * Legal name, domain, industry, country
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

export function renderPage() {
    const org = State.org || {};

    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('building', 28)} Company Profile</h1>
        <div class="sa-title-actions">
          <button class="btn btn-primary btn-sm">Save Changes</button>
        </div>
      </div>

      <div class="sa-grid-2col">
        <!-- Company Information -->
        <div class="sa-card">
          <h3>Company Information</h3>
          <div class="sa-detail-grid">
            ${field('Legal Name', org.name || 'TrustChecker Demo Corp')}
            ${field('Display Name', org.name || 'TrustChecker Demo')}
            ${field('Domain', 'trustchecker-demo.com')}
            ${field('Industry', 'Food & Beverage / Manufacturing')}
            ${field('Country', 'Vietnam 🇻🇳')}
            ${field('Registration #', 'BIZ-2024-VN-0041234')}
            ${field('Tax ID', 'VN-0312345678')}
          </div>
        </div>

        <!-- Contact & Address -->
        <div class="sa-card">
          <h3>Contact & Address</h3>
          <div class="sa-detail-grid">
            ${field('Primary Contact', 'Nguyen Van Toan')}
            ${field('Email', 'admin@trustchecker-demo.com')}
            ${field('Phone', '+84 28 3821 XXXX')}
            ${field('Address', '123 Nguyen Hue Blvd, District 1')}
            ${field('City', 'Ho Chi Minh City')}
            ${field('Postal Code', '700000')}
            ${field('Timezone', 'Asia/Ho_Chi_Minh (UTC+7)')}
          </div>
        </div>
      </div>

      <!-- Plan & Usage Summary -->
      <section class="sa-section" style="margin-top:1.5rem">
        <h2 class="sa-section-title">${icon('creditCard', 20)} Plan & Usage</h2>
        <div class="sa-metrics-row">
          <div class="sa-metric-card sa-metric-gold">
            <div class="sa-metric-icon">${icon('tag', 22)}</div>
            <div class="sa-metric-body">
              <div class="sa-metric-value">${State.plan === 'enterprise' ? 'Enterprise' : State.plan || 'Pro'}</div>
              <div class="sa-metric-label">Current Plan</div>
              <div class="sa-metric-sub">Renews Mar 2026</div>
            </div>
          </div>
          <div class="sa-metric-card sa-metric-blue">
            <div class="sa-metric-icon">${icon('users', 22)}</div>
            <div class="sa-metric-body">
              <div class="sa-metric-value">48</div>
              <div class="sa-metric-label">Active Users</div>
              <div class="sa-metric-sub">Limit: 100</div>
            </div>
          </div>
          <div class="sa-metric-card sa-metric-green">
            <div class="sa-metric-icon">${icon('products', 22)}</div>
            <div class="sa-metric-body">
              <div class="sa-metric-value">1,247</div>
              <div class="sa-metric-label">Products</div>
              <div class="sa-metric-sub">Limit: 10,000</div>
            </div>
          </div>
          <div class="sa-metric-card sa-metric-purple">
            <div class="sa-metric-icon">${icon('zap', 22)}</div>
            <div class="sa-metric-body">
              <div class="sa-metric-value">142K</div>
              <div class="sa-metric-label">API Calls (30d)</div>
              <div class="sa-metric-sub">Limit: 500K</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Branding -->
      <section class="sa-section">
        <h2 class="sa-section-title">${icon('palette', 20)} Branding</h2>
        <div class="sa-card">
          <div class="sa-detail-grid">
            ${field('App Name', State.branding?.app_name || 'TrustChecker')}
            ${field('Primary Color', State.branding?.primary_color || '#6366f1')}
            ${field('Logo', 'Default shield icon')}
            ${field('Custom Domain', 'Not configured')}
          </div>
        </div>
      </section>
    </div>
  `;
}

function field(label, value) {
    return `
    <div class="sa-detail-item">
      <span class="sa-detail-label">${label}</span>
      <span>${value}</span>
    </div>
  `;
}
