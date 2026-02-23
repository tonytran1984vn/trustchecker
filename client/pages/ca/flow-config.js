/**
 * Company Admin – Flow Configuration
 * ════════════════════════════════════
 * Real data from /api/scm/supply/routes + /api/scm/supply/channel-rules
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { render } from '../../core/state.js';

let data = null, loading = false;

async function load() {
  if (loading) return; loading = true;
  try {
    const [routes, rules] = await Promise.all([
      API.get('/scm/supply/routes').catch(() => ({ routes: [] })),
      API.get('/scm/supply/channel-rules').catch(() => ({ rules: [] })),
    ]);
    data = {
      routes: Array.isArray(routes) ? routes : (routes.routes || []),
      rules: Array.isArray(rules) ? rules : (rules.rules || []),
    };
  } catch (e) { data = { routes: [], rules: [] }; }
  loading = false;
}

export function renderPage() {
  if (!data && !loading) { load().then(() => render()); }
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Flow Configuration...</div></div>`;

  const routes = data?.routes || [];
  const rules = data?.rules || [];

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('network', 28)} Flow Configuration</h1>
        <div class="sa-title-actions">
          <button class="btn btn-primary btn-sm">+ Create Flow</button>
        </div>
      </div>

      <div class="sa-grid-2col">
        <!-- Active Flows from DB -->
        <div class="sa-card">
          <h3>Active Supply Routes</h3>
          ${routes.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)">No routes configured</div>' : `
          <div class="sa-spike-list">
            ${routes.map(r => flowItem(
    r.name || (r.origin + ' → ' + r.destination),
    r.origin + ' → ' + r.destination,
    r.hop_count || r.nodes || 2,
    r.status || 'active'
  )).join('')}
          </div>`}
        </div>

        <!-- Channel Rules from DB -->
        <div class="sa-card">
          <h3>Channel Rules</h3>
          ${rules.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)">No rules configured</div>' : `
          <div class="sa-threshold-list">
            ${rules.map(r => ruleItem(
    r.rule_name || r.name || '—',
    r.description || r.condition || '—',
    r.is_active !== false
  )).join('')}
          </div>`}
        </div>
      </div>

      <!-- Shipment Validation Rules -->
      <section class="sa-section" style="margin-top:1.5rem">
        <h2 class="sa-section-title">${icon('shield', 20)} Route Integrity</h2>
        <div class="sa-card">
          <div class="sa-metrics-row">
            <div class="sa-metric-card sa-metric-green"><div class="sa-metric-body"><div class="sa-metric-value">${routes.length}</div><div class="sa-metric-label">Routes</div></div></div>
            <div class="sa-metric-card sa-metric-blue"><div class="sa-metric-body"><div class="sa-metric-value">${rules.length}</div><div class="sa-metric-label">Channel Rules</div></div></div>
            <div class="sa-metric-card sa-metric-orange"><div class="sa-metric-body"><div class="sa-metric-value">${rules.filter(r => r.is_active !== false).length}</div><div class="sa-metric-label">Active Rules</div></div></div>
          </div>
        </div>
      </section>
    </div>
  `;
}

function flowItem(name, path, hops, status) {
  return `
    <div class="sa-spike-item sa-spike-${status === 'active' ? 'info' : 'warning'}">
      <div class="sa-spike-header">
        <strong>${name}</strong>
        <span class="sa-status-pill sa-pill-${status === 'active' ? 'green' : 'orange'}">${status}</span>
      </div>
      <div class="sa-spike-detail">${path} · ${hops} hops</div>
    </div>
  `;
}

function ruleItem(name, desc, enabled) {
  return `
    <div class="sa-threshold-item">
      <div class="sa-threshold-header">
        <strong>${name}</strong>
        <span class="sa-status-pill sa-pill-${enabled ? 'green' : 'red'}">${enabled ? 'Enabled' : 'Disabled'}</span>
      </div>
      <div class="sa-threshold-desc">${desc}</div>
    </div>
  `;
}
