/**
 * Company Admin – Generate Codes
 * Real data from /api/qr + /api/scm/batches + /api/products
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { render } from '../../core/state.js';

let data = null, loading = false;

async function load() {
  if (loading) return; loading = true;
  try {
    const [codes, batches, products] = await Promise.all([
      API.get('/qr?limit=50').catch(() => []),
      API.get('/scm/batches?limit=20').catch(() => []),
      API.get('/products?limit=50').catch(() => ({ products: [] })),
    ]);
    data = {
      codes: Array.isArray(codes) ? codes : (codes.codes || codes.qrCodes || []),
      batches: Array.isArray(batches) ? batches : (batches.batches || []),
      products: Array.isArray(products) ? products : (products.products || []),
    };
  } catch (e) { data = { codes: [], batches: [], products: [] }; }
  loading = false;
}

export function renderPage() {
  if (!data && !loading) { load().then(() => render()); }
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Code Generator...</div></div>`;

  const codes = data?.codes || [];
  const batches = data?.batches || [];
  const products = data?.products || [];

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('zap', 28)} Generate Codes</h1></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Total Codes', String(codes.length), 'In system', 'blue', 'zap')}
        ${m('Products', String(products.length), 'Available for code gen', 'green', 'products')}
        ${m('Batches', String(batches.length), 'Available batches', 'orange', 'clipboard')}
        ${m('Engine Status', 'Ready', 'Platform-wide unique', 'green', 'shield')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>➕ New Code Generation Request</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Codes are generated using approved Format Rules only.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div>
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:0.3rem">Product *</label>
            <select class="ops-input" style="width:100%;padding:0.6rem">
              ${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
              ${products.length === 0 ? '<option>No products available</option>' : ''}
            </select>
          </div>
          <div>
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:0.3rem">Quantity *</label>
            <input class="ops-input" type="number" value="1000" style="width:100%;padding:0.6rem" />
          </div>
          <div>
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:0.3rem">Target Batch</label>
            <select class="ops-input" style="width:100%;padding:0.6rem">
              <option>Auto-create new batch</option>
              ${batches.map(b => `<option value="${b.id}">${b.batch_code || b.id?.substring(0, 12)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:0.3rem">Activation Mode</label>
            <select class="ops-input" style="width:100%;padding:0.6rem"><option>Auto-activate on print</option><option>Manual activation required</option></select>
          </div>
        </div>
        <div style="margin-top:1.25rem"><button class="btn btn-primary btn-sm">Submit for Approval</button></div>
      </div>

      <div class="sa-card">
        <h3>📋 Existing QR Codes</h3>
        ${codes.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)">No codes generated yet</div>' : `
        <table class="sa-table"><thead><tr><th>Code</th><th>Product</th><th>Batch</th><th>Status</th><th>Scans</th><th>Created</th></tr></thead><tbody>
          ${codes.slice(0, 15).map(c => `<tr>
            <td class="sa-code" style="font-size:0.72rem;color:#6366f1">${c.code || c.serial || c.id?.substring(0, 16) || '—'}</td>
            <td>${c.product_name || '—'}</td>
            <td class="sa-code">${c.batch_id?.substring(0, 12) || '—'}</td>
            <td><span class="sa-status-pill sa-pill-${c.status === 'active' || c.status === 'activated' ? 'green' : c.status === 'locked' ? 'red' : 'blue'}">${c.status || 'generated'}</span></td>
            <td style="text-align:center">${c.scan_count || 0}</td>
            <td style="color:var(--text-secondary)">${c.created_at ? new Date(c.created_at).toLocaleDateString('en-US') : '—'}</td>
          </tr>`).join('')}
        </tbody></table>`}
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
