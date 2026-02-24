/**
 * Company Admin – Code Format Rules
 * Real data from /api/scm/code-gov + /api/products
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let data = null, loading = false;

async function load() {
  if (loading) return; loading = true;
  try {
    const [govRes, prodRes] = await Promise.all([
      API.get('/scm/code-gov/generation-limits').catch(() => ({})),
      API.get('/products?limit=1').catch(() => ({ products: [] })),
    ]);
    const rules = govRes.limits ? [govRes] : (Array.isArray(govRes) ? govRes : []);
    const products = Array.isArray(prodRes) ? prodRes : (prodRes.products || []);
    data = { rules, totalProducts: products.length };
  } catch (e) { data = { rules: [], totalProducts: 0 }; }
  loading = false;
  setTimeout(() => {
    const el = document.getElementById('code-format-root');
    if (el) el.innerHTML = renderContent();
  }, 50);
}

function renderContent() {
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Format Rules...</div></div>`;
  if (!data) { data = { rules: [], totalProducts: 0 }; }

  const rules = data?.rules || [];

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('settings', 28)} Code Format Rules</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Create Format Rule</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Active Formats', String(rules.length), 'Format definitions', 'blue', 'settings')}
        ${m('Products', String(data?.totalProducts || 0), 'In system', 'green', 'zap')}
        ${m('Engine Status', 'Active', 'Validation enforced', 'green', 'shield')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📐 Format Definitions</h3>
        ${rules.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--text-muted)">No format rules defined yet. Code governance rules can be configured here.</div>' : `
        <table class="sa-table"><thead><tr><th>Name</th><th>Pattern</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>
          ${rules.map(f => `<tr>
            <td><strong>${f.name || f.rule_name || '—'}</strong></td>
            <td class="sa-code" style="font-size:0.72rem">${f.pattern || f.description || '—'}</td>
            <td><span class="sa-status-pill sa-pill-${f.status === 'active' ? 'green' : 'orange'}">${f.status || 'active'}</span></td>
            <td style="color:var(--text-secondary)">${f.created_at ? new Date(f.created_at).toLocaleDateString('en-US') : '—'}</td>
            <td><button class="btn btn-xs btn-outline">Edit</button></td>
          </tr>`).join('')}
        </tbody></table>`}
      </div>

      <div class="sa-card">
        <h3>🛡 Validation & Enforcement Rules</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">System-enforced rules that prevent code integrity violations.</p>
        <table class="sa-table"><thead><tr><th>Rule</th><th>Description</th><th>Enforcement</th><th>Scope</th></tr></thead><tbody>
          ${[
      ['Uniqueness Check', 'Every code must be globally unique', 'HARD BLOCK', 'Platform-wide'],
      ['Pattern Compliance', 'Code must match format rule pattern', 'HARD BLOCK', 'Per format rule'],
      ['Check Digit Validation', 'Check digit verified on every scan', 'HARD BLOCK', 'Every scan event'],
      ['Prefix Reservation', 'Brand prefix reserved per tenant', 'HARD BLOCK', 'Platform-wide'],
      ['Expiry Enforcement', 'Expired codes return "expired" on scan', 'SOFT (log)', 'Per code'],
      ['Re-scan Throttle', 'Codes exceeding limit trigger velocity alert', 'SOFT (flag)', 'Per code'],
    ].map(([rule, desc, enforcement, scope]) => `<tr>
            <td><strong>${rule}</strong></td>
            <td style="font-size:0.82rem">${desc}</td>
            <td><span class="sa-status-pill sa-pill-${enforcement.includes('HARD') ? 'red' : 'orange'}">${enforcement}</span></td>
            <td style="font-size:0.78rem">${scope}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}

export function renderPage() {
  if (!data && !loading) load();
  return `<div id="code-format-root">${renderContent()}</div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
