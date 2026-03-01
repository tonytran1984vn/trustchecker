/**
 * CA – Supply Route Engine
 * Real data from /api/scm/supply/routes + /api/scm/supply/channel-rules + /api/scm/supply/route-breaches
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let data = null, loading = false;

async function load() {
  if (loading) return; loading = true;
  try {
    if (window._caRiskReady) { try { await window._caRiskReady; } catch { } }
    const rc = window._caRiskCache;
    let routes, rules, breaches;
    if (rc?.supplyRoutes && rc?.channelRules && rc?.routeBreaches && rc._loadedAt && !data) {
      routes = rc.supplyRoutes; rules = rc.channelRules; breaches = rc.routeBreaches;
    } else {
      [routes, rules, breaches] = await Promise.all([
        API.get('/scm/supply/routes').catch(() => []),
        API.get('/scm/supply/channel-rules').catch(() => []),
        API.get('/scm/supply/route-breaches').catch(() => []),
      ]);
    }
    data = {
      routes: Array.isArray(routes) ? routes : (routes.routes || []),
      rules: Array.isArray(rules) ? rules : (rules.rules || []),
      breaches: Array.isArray(breaches) ? breaches : (breaches.breaches || []),
    };
  } catch (e) { data = { routes: [], rules: [], breaches: [] }; }
  loading = false;
  setTimeout(() => { const el = document.getElementById('supply-route-engine-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
}

function timeAgo(d) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), dd = Math.floor(h / 24);
  if (m < 60) return m + 'm ago'; if (h < 24) return h + 'h ago'; return dd + 'd ago';
}

function renderContent() {
  if (!data && !loading) { load(); }
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Supply Route Engine...</div></div>`;

  const routes = data?.routes || [];
  const rules = data?.rules || [];
  const breaches = data?.breaches || [];

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('network', 28)} Supply Route Engine</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Create Route</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Active Routes', String(routes.length), routes.length + ' products mapped', 'blue', 'network')}
        ${m('Channel Rules', String(rules.length), 'Active enforcement rules', 'orange', 'target')}
        ${m('Route Breaches', String(breaches.length), 'Detected violations', 'red', 'alertTriangle')}
        ${m('Engine Status', 'Active', 'Real-time monitoring', 'green', 'shield')}
      </div>

      <!-- SUPPLY ROUTES -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🗺 Supply Route Map</h3>
        ${routes.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)">No routes defined</div>' : routes.map(r => `
          <div style="padding:0.75rem;border-bottom:1px solid var(--border)">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div><span class="sa-code" style="color:#6366f1;font-weight:600">${r.id?.substring(0, 8) || '—'}</span> <strong>${r.name || (r.origin + ' → ' + r.destination)}</strong></div>
              <span class="sa-status-pill sa-pill-${r.status === 'active' ? 'green' : 'orange'}">${r.status || 'active'}</span>
            </div>
            <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:0.3rem">${r.origin || '—'} → ${r.destination || '—'}</div>
          </div>
        `).join('')}
      </div>

      <!-- CHANNEL RULES + BREACHES -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">
        <div class="sa-card">
          <h3>🛡 Channel Rules</h3>
          ${rules.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)">No rules</div>' : `
          <table class="sa-table"><thead><tr><th>Rule</th><th>Condition</th><th>Status</th></tr></thead><tbody>
            ${rules.map(c => `<tr>
              <td><strong>${c.rule_name || c.name || '—'}</strong></td>
              <td style="font-size:0.72rem">${c.condition || c.description || '—'}</td>
              <td><span class="sa-status-pill sa-pill-${c.is_active !== false ? 'green' : 'red'}">${c.is_active !== false ? 'active' : 'disabled'}</span></td>
            </tr>`).join('')}
          </tbody></table>`}
        </div>

        <div class="sa-card" style="border-left:4px solid #ef4444">
          <h3>🚨 Recent Breaches</h3>
          ${breaches.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)">No breaches — clean</div>' : `
          <table class="sa-table"><thead><tr><th>Route</th><th>Location</th><th>Severity</th><th>Time</th></tr></thead><tbody>
            ${breaches.slice(0, 10).map(b => `<tr class="ops-alert-row">
              <td>${b.route_name || b.route_id?.substring(0, 8) || '—'}</td>
              <td style="color:#ef4444"><strong>${b.detected_location || b.location || '—'}</strong></td>
              <td><span class="sa-status-pill sa-pill-${b.severity === 'critical' ? 'red' : 'orange'}">${b.severity || 'high'}</span></td>
              <td style="font-size:0.72rem">${timeAgo(b.created_at)}</td>
            </tr>`).join('')}
          </tbody></table>`}
        </div>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }

export function renderPage() {
  return `<div id="supply-route-engine-root">${renderContent()}</div>`;
}
