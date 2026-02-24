/**
 * Company Admin – Code Batch Assignment
 * Real data from /api/scm/batches + /api/products
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let data = null, loading = false;

async function load() {
  if (loading) return; loading = true;
  try {
    const [batchRes, prodRes] = await Promise.all([
      API.get('/scm/batches?limit=50').catch(() => []),
      API.get('/products?limit=50').catch(() => ({ products: [] })),
    ]);
    const products = Array.isArray(prodRes) ? prodRes : (prodRes.products || []);
    data = {
      batches: Array.isArray(batchRes) ? batchRes : (batchRes.batches || []),
      totalProducts: products.length,
    };
  } catch (e) { data = { batches: [], totalProducts: 0 }; }
  loading = false;
  setTimeout(() => { const el = document.getElementById('code-batch-assign-root'); if (el) el.innerHTML = renderContent(); }, 50);
}

function renderContent() {
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Batch Assignments...</div></div>`;
  if (!data) { data = { batches: [], totalProducts: 0 }; }

  const batches = data?.batches || [];
  const complete = batches.filter(b => b.status === 'delivered' || b.status === 'complete').length;
  const pending = batches.filter(b => b.status === 'pending' || b.status === 'in_transit').length;

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('clipboard', 28)} Batch Assignment</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Assign Codes to Batch</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Total Batches', String(batches.length), 'In system', 'blue', 'clipboard')}
        ${m('Complete', String(complete), 'Fully assigned', 'green', 'check')}
        ${m('Pending', String(pending), 'Codes to assign', 'orange', 'clock')}
        ${m('Products', String(data?.totalProducts || 0), 'In system', 'blue', 'zap')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📦 Batch ↔ Code Assignments</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Each code is bound to a batch with full metadata before activation.</p>
        ${batches.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--text-muted)">No batches found. Create a batch in Supply Chain to start assigning codes.</div>' : `
        <table class="sa-table"><thead><tr><th>Batch</th><th>Product</th><th>Qty</th><th>Origin</th><th>Destination</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>
          ${batches.map(b => `<tr class="${b.status === 'pending' ? 'ops-alert-row' : ''}">
            <td class="sa-code">${b.batch_code || b.id?.substring(0, 12) || '—'}</td>
            <td><strong>${b.product_name || '—'}</strong></td>
            <td style="text-align:right">${(b.quantity || 0).toLocaleString()}</td>
            <td>${b.origin || '—'}</td>
            <td>${b.destination || '—'}</td>
            <td><span class="sa-status-pill sa-pill-${b.status === 'delivered' || b.status === 'complete' ? 'green' : b.status === 'pending' ? 'orange' : 'blue'}">${(b.status || 'pending').replace(/_/g, ' ')}</span></td>
            <td style="color:var(--text-secondary)">${b.created_at ? new Date(b.created_at).toLocaleDateString('en-US') : '—'}</td>
            <td><button class="btn btn-xs btn-outline">${b.status === 'pending' ? 'Assign' : 'Reassign'}</button></td>
          </tr>`).join('')}
        </tbody></table>`}
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }

export function renderPage() {
  if (!data && !loading) load();
  return `<div id="code-batch-assign-root">${renderContent()}</div>`;
}
