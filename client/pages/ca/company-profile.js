/**
 * Company Admin – Company Profile
 * ═════════════════════════════════
 * Real data from /api/org + /api/org/members + /api/products
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { State } from '../../core/state.js';

let data = null, loading = false;

async function load() {
  if (loading) return; loading = true;
  try {
    const [org, members, products] = await Promise.all([
      API.get('/org'),
      API.get('/org/members').catch(() => ({ members: [], total: 0 })),
      API.get('/products?limit=1&offset=0').catch(() => ({ total: 0 })),
    ]);
    data = { org, members: members.members || [], memberCount: members.total || 0, productCount: products.total || 0 };
  } catch (e) { data = { org: {}, members: [], memberCount: 0, productCount: 0 }; }
  loading = false;
  setTimeout(() => { const el = document.getElementById('company-profile-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
}

function renderContent() {
  if (!data && !loading) { load(); }
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Company Profile...</div></div>`;

  const o = data?.org || {};
  const settings = typeof o.settings === 'string' ? JSON.parse(o.settings || '{}') : (o.settings || {});

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
            ${field('Legal Name', o.name || '—')}
            ${field('Slug', o.slug || '—')}
            ${field('Plan', (o.plan || 'free').charAt(0).toUpperCase() + (o.plan || 'free').slice(1))}
            ${field('Status', o.status || 'active')}
            ${field('Industry', settings.industry || 'Not set')}
            ${field('Country', settings.country || 'Not set')}
            ${field('Created', o.created_at ? new Date(o.created_at).toLocaleDateString('en-US') : '—')}
          </div>
        </div>

        <!-- Contact & Address -->
        <div class="sa-card">
          <h3>Contact & Address</h3>
          <div class="sa-detail-grid">
            ${field('Primary Contact', settings.contact_name || '—')}
            ${field('Email', settings.contact_email || '—')}
            ${field('Phone', settings.phone || '—')}
            ${field('Address', settings.address || '—')}
            ${field('City', settings.city || '—')}
            ${field('Timezone', settings.timezone || 'UTC')}
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
              <div class="sa-metric-value">${(o.plan || 'free').charAt(0).toUpperCase() + (o.plan || 'free').slice(1)}</div>
              <div class="sa-metric-label">Current Plan</div>
            </div>
          </div>
          <div class="sa-metric-card sa-metric-blue">
            <div class="sa-metric-icon">${icon('users', 22)}</div>
            <div class="sa-metric-body">
              <div class="sa-metric-value">${data?.memberCount || 0}</div>
              <div class="sa-metric-label">Team Members</div>
            </div>
          </div>
          <div class="sa-metric-card sa-metric-green">
            <div class="sa-metric-icon">${icon('products', 22)}</div>
            <div class="sa-metric-body">
              <div class="sa-metric-value">${(data?.productCount || 0).toLocaleString()}</div>
              <div class="sa-metric-label">Products</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Branding -->
      <section class="sa-section">
        <h2 class="sa-section-title">${icon('palette', 20)} Branding</h2>
        <div class="sa-card">
          <div class="sa-detail-grid">
            ${field('App Name', State.branding?.app_name || o.name || 'TrustChecker')}
            ${field('Primary Color', State.branding?.primary_color || '#6366f1')}
            ${field('Logo', 'Default shield icon')}
            ${field('Custom Domain', settings.custom_domain || 'Not configured')}
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

export function renderPage() {
  return `<div id="company-profile-root">${renderContent()}</div>`;
}
