/**
 * Company Admin – Company Profile
 * ═════════════════════════════════
 * Real data from /api/org + /api/org/members + /api/products
 * Editable fields with Save Changes functionality
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { State } from '../../core/state.js';
import { showToast } from '../../components/toast.js';

let data = null, loading = false;

async function load() {
  if (loading) return; loading = true;
  try {
    if (window._caSetReady) { try { await window._caSetReady; } catch { } }
    const sc = window._caSetCache;
    let org, members, products;
    if (sc?.org && sc?.members && sc?.productCount && sc._loadedAt && !data) {
      org = sc.org; members = sc.members; products = sc.productCount;
    } else {
      [org, members, products] = await Promise.all([
        API.get('/org'),
        API.get('/org/members').catch(() => ({ members: [], total: 0 })),
        API.get('/products?limit=1&offset=0').catch(() => ({ total: 0 })),
      ]);
    }
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
          <button class="btn btn-primary btn-sm" onclick="window.__saveCompanyProfile()">Save Changes</button>
        </div>
      </div>

      <div class="sa-grid-2col">
        <!-- Company Information -->
        <div class="sa-card">
          <h3>Company Information</h3>
          <div class="sa-detail-grid">
            ${editField('name', 'Legal Name', o.name || '')}
            ${field('Slug', o.slug || '—')}
            ${field('Plan', (o.plan || 'free').charAt(0).toUpperCase() + (o.plan || 'free').slice(1))}
            ${field('Status', o.status || 'active')}
            ${editField('industry', 'Industry', settings.industry || '', 'settings')}
            ${editField('country', 'Country', settings.country || '', 'settings')}
            ${field('Created', o.created_at ? new Date(o.created_at).toLocaleDateString('en-US') : '—')}
          </div>
        </div>

        <!-- Contact & Address -->
        <div class="sa-card">
          <h3>Contact & Address</h3>
          <div class="sa-detail-grid">
            ${editField('contact_name', 'Primary Contact', settings.contact_name || '', 'settings')}
            ${editField('contact_email', 'Email', settings.contact_email || '', 'settings')}
            ${editField('phone', 'Phone', settings.phone || '', 'settings')}
            ${editField('address', 'Address', settings.address || '', 'settings')}
            ${editField('city', 'City', settings.city || '', 'settings')}
            ${editField('timezone', 'Timezone', settings.timezone || 'UTC', 'settings')}
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
            ${editField('app_name', 'App Name', settings.app_name || o.name || 'TrustChecker', 'settings')}
            ${editField('primary_color', 'Primary Color', settings.primary_color || '#6366f1', 'settings')}
            ${field('Logo', 'Default shield icon')}
            ${editField('custom_domain', 'Custom Domain', settings.custom_domain || '', 'settings')}
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
      <span>${value || '—'}</span>
    </div>
  `;
}

function editField(key, label, value, group) {
  const dataAttr = group ? `data-group="${group}"` : '';
  return `
    <div class="sa-detail-item">
      <span class="sa-detail-label">${label}</span>
      <input class="input cp-edit-field" data-key="${key}" ${dataAttr}
        value="${(value || '').replace(/"/g, '&quot;')}"
        placeholder="${label}"
        style="text-align:right;border:1px solid transparent;padding:4px 8px;border-radius:6px;font-size:0.82rem;background:transparent;width:200px;transition:all 0.2s"
        onfocus="this.style.borderColor='var(--primary)';this.style.background='var(--surface)'"
        onblur="this.style.borderColor='transparent';this.style.background='transparent'">
    </div>
  `;
}

// Save handler
window.__saveCompanyProfile = async function () {
  const fields = document.querySelectorAll('.cp-edit-field');
  const name = null;
  const settings = {};

  let orgName = null;
  fields.forEach(f => {
    const key = f.dataset.key;
    const group = f.dataset.group;
    const val = f.value.trim();
    if (group === 'settings') {
      settings[key] = val;
    } else if (key === 'name') {
      orgName = val;
    }
  });

  const body = {};
  if (orgName) body.name = orgName;

  // Merge with existing settings to avoid losing data
  const existing = data?.org?.settings || {};
  const merged = typeof existing === 'string' ? JSON.parse(existing) : { ...existing };
  Object.assign(merged, settings);
  body.settings = merged;

  try {
    await API.put('/org', body);
    showToast('✓ Company profile saved', 'success');
    // Reload to reflect changes
    data = null;
    load();
  } catch (e) {
    showToast('✗ Failed to save: ' + (e.message || 'Unknown error'), 'error');
  }
};

export function renderPage() {
  return `<div id="company-profile-root">${renderContent()}</div>`;
}
