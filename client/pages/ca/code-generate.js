/**
 * Company Admin – Generate Codes
 * Real generation via POST /api/qr/generate + list from /api/qr
 * Includes: export CSV/PDF after generation + generation history
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

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
    const qrCodes = await API.get('/qr/dashboard-stats').catch(() => ({}));

    // Load generation history: recently generated QR codes grouped by product
    let genHistory = [];
    try {
      const prodList = Array.isArray(prodRes) ? prodRes : (prodRes.products || []);
      // Fetch recent QR codes for history
      const historyPromises = prodList.slice(0, 10).map(async p => {
        try {
          const r = await API.get(`/products/${p.id}/codes`);
          return { product: p, total_codes: r.total_codes || 0, codes: (r.codes || []).slice(0, 5) };
        } catch { return null; }
      });
      genHistory = (await Promise.all(historyPromises)).filter(h => h && h.total_codes > 0);
    } catch { }

    data = {
      codes,
      batches: Array.isArray(batchRes) ? batchRes : (batchRes.batches || []),
      products: Array.isArray(prodRes) ? prodRes : (prodRes.products || []),
      stats: qrCodes,
      genHistory,
    };
  } catch (e) { data = { codes: [], batches: [], products: [], stats: {}, genHistory: [] }; }
  loading = false;
  setTimeout(() => { const el = document.getElementById('code-generate-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
}

export function renderPage() {
  return `<div id="code-generate-root">${renderContent()}</div>`;
}

window._caGenSubmit = async () => {
  if (generating) return;
  const productSelect = document.getElementById('gen-product');
  const qtyInput = document.getElementById('gen-qty');
  const batchSelect = document.getElementById('gen-batch');

  if (!productSelect || !productSelect.value) { alert('Please select a product'); return; }

  generating = true; genResult = null; { const _el = document.getElementById('code-generate-root'); if (_el) _el.innerHTML = renderContent ? renderContent() : ''; }

  try {
    const res = await API.post('/qr/generate', {
      product_id: productSelect.value,
      quantity: parseInt(qtyInput?.value) || 10,
      batch_id: batchSelect?.value || null,
    });
    genResult = res;
    // Store the product_id for export
    genResult._product_id = productSelect.value;
    data = null; // force reload
  } catch (e) {
    genResult = { success: false, error: e.message || 'Generation failed' };
  }
  generating = false;
  load();
};

// ── Export QR codes for a product (CSV or PDF download) ──
window._caExportCodes = async (productId, format) => {
  try {
    const el = document.getElementById('export-status');
    if (el) el.textContent = `⏳ Đang tạo file ${format.toUpperCase()}...`;

    // Use the same API base and token as the API client
    const apiBase = window.API ? window.API.base : (window.location.origin + '/api');
    const token = window.API ? window.API.token : sessionStorage.getItem('tc_token');

    const response = await fetch(`${apiBase}/products/${productId}/codes/export?format=${format}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Export failed');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const disposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
    a.download = filenameMatch ? filenameMatch[1] : `QR_codes.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (el) el.textContent = `✅ Đã tải file ${format.toUpperCase()} thành công!`;
  } catch (e) {
    const el = document.getElementById('export-status');
    if (el) el.textContent = '❌ ' + (e.message || 'Export thất bại');
  }
};

function renderContent() {
  if (!data && !loading) { load(); }
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Code Generator...</div></div>`;

  const codes = data?.codes || [];
  const batches = data?.batches || [];
  const products = data?.products || [];
  const stats = data?.stats || {};
  const genHistory = data?.genHistory || [];

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
          </div>
          <div style="margin-top:0.75rem;display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
            <span style="font-size:0.78rem;font-weight:600;color:var(--text-secondary)">📥 Xuất để in:</span>
            <button class="btn btn-sm" onclick="_caExportCodes('${genResult._product_id || genResult.product?.id || ''}','csv')" style="font-size:0.75rem;padding:0.35rem 0.75rem">📊 Tải CSV (Excel)</button>
            <button class="btn btn-sm" onclick="_caExportCodes('${genResult._product_id || genResult.product?.id || ''}','pdf')" style="font-size:0.75rem;padding:0.35rem 0.75rem">📄 Tải PDF (In ấn)</button>
            <span id="export-status" style="font-size:0.72rem;color:var(--text-secondary)"></span>
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
            <input id="gen-qty" class="ops-input" type="number" placeholder="10" min="1" max="10000" style="width:100%;padding:0.6rem" onfocus="this.select()" />
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

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📦 Code Generation History</h3>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:0.75rem">Products with generated QR codes. Click Export to download for printing.</p>
        ${genHistory.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)">No codes generated yet — generate codes above to see history</div>' : `
        <table class="sa-table"><thead><tr><th>Product</th><th>SKU</th><th>Total Codes</th><th>Recent Codes</th><th>Export</th></tr></thead><tbody>
          ${genHistory.map(h => `<tr>
            <td><strong>${h.product.name}</strong></td>
            <td class="sa-code" style="font-size:0.72rem">${h.product.sku || '—'}</td>
            <td style="font-weight:700;text-align:center">${h.total_codes}</td>
            <td style="font-size:0.68rem;max-width:250px;overflow:hidden;text-overflow:ellipsis">${h.codes.map(c => c.code).join(', ')}</td>
            <td style="white-space:nowrap">
              <button class="btn btn-sm" onclick="_caExportCodes('${h.product.id}','csv')" style="font-size:0.68rem;padding:0.2rem 0.4rem" title="Download CSV">📊</button>
              <button class="btn btn-sm" onclick="_caExportCodes('${h.product.id}','pdf')" style="font-size:0.68rem;padding:0.2rem 0.4rem" title="Download PDF">📄</button>
            </td>
          </tr>`).join('')}
        </tbody></table>`}
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
