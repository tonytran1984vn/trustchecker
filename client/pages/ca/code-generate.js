/**
 * Company Admin – Generate Codes
 * Real generation via POST /api/qr/generate + list from /api/qr
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { render } from '../../core/state.js';

let data = null, loading = false, generating = false, genResult = null;

async function load() {
  if (loading) return; loading = true;
  try {
    const [qrRes, batchRes, prodRes] = await Promise.all([
      API.get('/qr/scan-history?limit=50').catch(() => ({ scans: [] })),
      API.get('/scm/batches?limit=20').catch(() => []),
      API.get('/products?limit=50').catch(() => ({ products: [] })),
    ]);
    const codes = qrRes.scans || [];
    // Also try getting existing QR codes from DB
    const qrCodes = await API.get('/qr/dashboard-stats').catch(() => ({}));
    data = {
      codes,
      batches: Array.isArray(batchRes) ? batchRes : (batchRes.batches || []),
      products: Array.isArray(prodRes) ? prodRes : (prodRes.products || []),
      stats: qrCodes,
    };
  } catch (e) { data = { codes: [], batches: [], products: [], stats: {} }; }
  loading = false;
}

window._caGenSubmit = async () => {
  if (generating) return;
  const productSelect = document.getElementById('gen-product');
  const qtyInput = document.getElementById('gen-qty');
  const batchSelect = document.getElementById('gen-batch');

  if (!productSelect || !productSelect.value) { alert('Please select a product'); return; }

  generating = true; genResult = null; render();

  try {
    const res = await API.post('/qr/generate', {
      product_id: productSelect.value,
      quantity: parseInt(qtyInput?.value) || 10,
      batch_id: batchSelect?.value || null,
    });
    genResult = res;
    data = null; // force reload
  } catch (e) {
    genResult = { success: false, error: e.message || 'Generation failed' };
  }
  generating = false;
  load().then(() => render());
};

export function renderPage() {
  if (!data && !loading) { load().then(() => render()); }
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Code Generator...</div></div>`;

  const codes = data?.codes || [];
  const batches = data?.batches || [];
  const products = data?.products || [];
  const stats = data?.stats || {};

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('zap', 28)} Generate Codes</h1></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Total Products', String(stats.total_products || products.length), 'Available for code gen', 'blue', 'search')}
        ${m('Total Scans', String(stats.total_scans || 0), 'All-time scans', 'green', 'check')}
        ${m('Today Scans', String(stats.today_scans || 0), 'Scanned today', 'orange', 'zap')}
        ${m('Blockchain Seals', String(stats.total_blockchain_seals || 0), 'Verification proofs', 'green', 'shield')}
      </div>

      ${genResult ? `
        <div class="sa-card" style="margin-bottom:1rem;border-left:4px solid ${genResult.success ? '#22c55e' : '#ef4444'}">
          <div style="display:flex;align-items:center;gap:0.75rem">
            <span style="font-size:1.5rem">${genResult.success ? '✅' : '❌'}</span>
            <div>
              <strong style="color:${genResult.success ? '#22c55e' : '#ef4444'}">${genResult.success ? genResult.message : 'Generation Failed'}</strong>
              ${genResult.success ? `<div style="font-size:0.78rem;color:var(--text-secondary);margin-top:0.3rem">${genResult.count} codes created for ${genResult.product?.name || 'product'}</div>` :
        `<div style="font-size:0.78rem;color:#ef4444">${genResult.error || 'Unknown error'}</div>`}
            </div>
          </div>
          ${genResult.success && genResult.codes?.length > 0 ? `
          <div style="margin-top:0.75rem;max-height:200px;overflow-y:auto;background:rgba(99,102,241,0.03);border-radius:6px;padding:0.75rem">
            <div style="font-size:0.72rem;font-weight:600;margin-bottom:0.5rem">Generated Codes (${genResult.codes.length}):</div>
            <div style="display:flex;flex-wrap:wrap;gap:0.3rem">
              ${genResult.codes.slice(0, 50).map(c => `<span class="sa-code" style="font-size:0.68rem;background:rgba(99,102,241,0.08);padding:0.2rem 0.5rem;border-radius:4px">${c.code}</span>`).join('')}
              ${genResult.codes.length > 50 ? `<span style="font-size:0.68rem;color:var(--text-secondary)">... and ${genResult.codes.length - 50} more</span>` : ''}
            </div>
          </div>` : ''}
        </div>` : ''}

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>➕ New Code Generation</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Select a product and quantity to generate unique QR codes. Codes are instantly written to the database and ready for validation.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div>
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:0.3rem">Product *</label>
            <select id="gen-product" class="ops-input" style="width:100%;padding:0.6rem">
              <option value="">-- Select Product --</option>
              ${products.map(p => `<option value="${p.id}">${p.name}${p.sku ? ' (' + p.sku + ')' : ''}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:0.3rem">Quantity *</label>
            <input id="gen-qty" class="ops-input" type="number" value="10" min="1" max="10000" style="width:100%;padding:0.6rem" />
          </div>
          <div>
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:0.3rem">Target Batch (optional)</label>
            <select id="gen-batch" class="ops-input" style="width:100%;padding:0.6rem">
              <option value="">None</option>
              ${batches.map(b => `<option value="${b.id}">${b.batch_code || b.id?.substring(0, 12)}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;align-items:flex-end">
            <button class="btn btn-primary btn-sm" onclick="_caGenSubmit()" ${generating ? 'disabled' : ''} style="width:100%;padding:0.7rem;font-size:0.85rem;font-weight:700">
              ${generating ? '⏳ Generating...' : '⚡ Generate QR Codes'}
            </button>
          </div>
        </div>
      </div>

      <div class="sa-card">
        <h3>📋 Recent Scan Activity</h3>
        ${codes.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)">No scan events yet — generate codes above and scan them to see activity here</div>' : `
        <table class="sa-table"><thead><tr><th>Product</th><th>Result</th><th>Fraud Score</th><th>Trust Score</th><th>Scanned</th></tr></thead><tbody>
          ${codes.slice(0, 15).map(c => `<tr>
            <td><strong>${c.product_name || c.product_sku || '—'}</strong></td>
            <td><span class="sa-status-pill sa-pill-${c.result === 'valid' ? 'green' : c.result === 'counterfeit' ? 'red' : 'orange'}">${c.result || '—'}</span></td>
            <td style="font-weight:700;color:${(c.fraud_score || 0) > 0.5 ? '#ef4444' : '#22c55e'}">${c.fraud_score != null ? (c.fraud_score * 100).toFixed(0) + '%' : '—'}</td>
            <td class="sa-code">${c.trust_score || '—'}</td>
            <td style="color:var(--text-secondary)">${c.scanned_at ? new Date(c.scanned_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
          </tr>`).join('')}
        </tbody></table>`}
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
