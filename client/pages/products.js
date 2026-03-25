/**
 * TrustChecker – Products Page (Enhanced)
 * Product CRUD + QR code management.
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';
import { scoreColor } from '../utils/helpers.js';
import { navigate } from '../core/router.js';

// Detect reverse-proxy prefix (e.g. /trustchecker)
const _appPrefix = (() => {
  const segs = window.location.pathname.split('/').filter(Boolean);
  return segs.length > 0 && !segs[0].includes('.') ? '/' + segs[0] : '';
})();

export function renderPage() {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;gap:12px">
      <input class="input" style="max-width:300px" placeholder="Search products..." oninput="searchProducts(this.value)">
      <div style="display:flex;gap:8px">

        <button class="btn" onclick="exportProductsCSV()" title="Export CSV">📊 Export CSV</button>
        ${State.user?.role !== 'viewer' ? '<button class="btn btn-primary" onclick="showAddProduct()">+ Add Product</button>' : ''}
      </div>
    </div>
    <div class="product-grid" id="product-grid">
      ${State.products.length ? State.products.map(p => `
        <div class="product-card" onclick="showProductDetail('${p.id}')">
          <div class="product-name">${p.name}</div>
          <div class="product-sku">${p.sku}</div>
          <div class="product-meta">
            <span class="product-category">${p.category || 'General'}</span>
            <div class="trust-gauge" style="flex-direction:row;gap:8px">
              <span style="font-family:'JetBrains Mono';font-weight:800;color:${scoreColor(p.trust_score)}">${Math.round(p.trust_score)}</span>
              <span style="font-size:0.65rem;color:var(--text-muted)">Trust</span>
            </div>
          </div>
          <div style="margin-top:8px;font-size:0.7rem;color:var(--text-muted)">
            ${p.manufacturer ? '🏭 ' + p.manufacturer : ''} ${p.origin_country ? '🌍 ' + p.origin_country : ''}
          </div>
          <div style="margin-top:6px"><span class="badge ${p.status === 'active' ? 'valid' : 'warning'}">${p.status}</span></div>
        </div>
      `).join('') : '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📦</div><div class="empty-text">No products yet</div></div>'}
    </div>
  `;
}

function showAddProduct() {
  State.modal = `
    <div class="modal">
      <div class="modal-title">📦 Register New Product</div>
      <div class="input-group"><label>Product Name *</label><input class="input" id="np-name" placeholder="e.g. Premium Coffee – Reserve Edition" oninput="window.autoSuggestSku()"></div>
      <div class="input-group"><label>SKU *</label><input class="input" id="np-sku" placeholder="e.g. COFFEE-PR-001" oninput="this.dataset.manual='true'"></div>
      <div class="input-group"><label>Category</label>
        <select class="input" id="np-cat" style="width:100%">
          <option value="">— Select Category —</option>
          <option>Coffee</option><option>Tea</option><option>Textiles</option>
          <option>Electronics</option><option>Automotive</option><option>Pharmaceutical</option>
          <option>Food & Beverage</option><option>Agriculture</option><option>Healthcare</option>
          <option>Building Materials</option><option>Cosmetics</option><option>General</option>
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div class="input-group"><label>Weight (kg) *</label><input class="input" id="np-weight" type="number" step="0.01" min="0" placeholder="e.g. 0.5"></div>
        <div class="input-group"><label>Quantity *</label><input class="input" id="np-qty" type="number" min="1" placeholder="e.g. 100" value="1"></div>
        <div class="input-group"><label>Price (USD)</label><input class="input" id="np-price" type="number" step="0.01" min="0" placeholder="e.g. 12.50"></div>
      </div>
      <div class="input-group"><label>Manufacturer</label><input class="input" id="np-mfr" placeholder="e.g. Highland Coffee Co."></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="input-group"><label>Batch Number</label><input class="input" id="np-batch" placeholder="e.g. BATCH-2026-001"></div>
        <div class="input-group"><label>Origin Country (ISO 2-letter Code) *</label><input class="input" id="np-origin" placeholder="e.g. VN, US, SG"></div>
      </div>
      <div style="padding:8px 12px;background:var(--border);border-radius:8px;font-size:0.72rem;color:var(--text-muted);margin-top:8px">
        🌿 <strong>Carbon Note:</strong> Weight & Category are used to automatically calculate carbon footprint (Scope 1/2/3).
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-primary" onclick="addProduct()" style="flex:1">Register & Generate QR</button>
        <button class="btn" onclick="State.modal=null;render()">Cancel</button>
      </div>
    </div>
  `;
  render();
}

window.autoSuggestSku = function() {
  const name = document.getElementById('np-name')?.value || '';
  const skuInput = document.getElementById('np-sku');
  if (!skuInput) return;
  
  if (!name.trim()) {
    if (!skuInput.dataset.manual) {
      skuInput.value = '';
      skuInput.style.borderColor = '';
    }
    return;
  }
  
  // Try to find exact match
  const existing = State.products.find(p => p.name.toLowerCase() === name.toLowerCase().trim());
  if (existing) {
    skuInput.value = existing.sku;
    skuInput.style.borderColor = 'var(--accent)'; // Highlight reuse
    return;
  }
  
  skuInput.style.borderColor = '';
  // Suggest new SKU
  if (!skuInput.dataset.manual) {
    const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'PRD';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    skuInput.value = `${prefix}-${randomNum}`;
  }
}

async function addProduct() {
  try {
    const rawQty = parseInt(document.getElementById('np-qty').value) || 1;
    const batchNumber = document.getElementById('np-batch').value || '';

    // 1. Create or Reuse Product
    const res = await API.post('/products/ensure', {
      name: document.getElementById('np-name').value,
      sku: document.getElementById('np-sku').value,
      category: document.getElementById('np-cat').value,
      manufacturer: document.getElementById('np-mfr').value,
      origin_country: document.getElementById('np-origin').value,
      weight_kg: parseFloat(document.getElementById('np-weight').value) || 0,
      price: parseFloat(document.getElementById('np-price').value) || 0,
    });
    
    // 2. Generate QR Codes
    let qrMessage = '';
    if (rawQty > 0) {
      const qrRes = await API.post('/products/generate-code', {
        product_id: res.product_id,
        quantity: rawQty,
        batch_id: batchNumber
      });
      qrMessage = qrRes.async ? `Processing ${rawQty} codes in background.` : `Generated ${qrRes.codes?.length || rawQty} codes.`;
    }

    State.modal = null;
    showToast(`✅ ${res.reused ? 'Existing product reused' : 'Product registered'}! ${qrMessage}`, 'success');
    navigate('products');
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function showProductDetail(id) {
  try {
    const detail = await API.get(`/products/${id}`);
    const p = detail.product;
    const codes = detail.qr_codes || [];
    const qr = codes[0];
    State.modal = `
      <div class="modal" style="max-width:650px">
        <div class="modal-title">${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;font-size:0.82rem">
          <div><span style="color:var(--text-muted)">SKU:</span> <span style="font-family:'JetBrains Mono'">${p.sku}</span></div>
          <div><span style="color:var(--text-muted)">Status:</span> <span class="badge ${p.status === 'active' ? 'valid' : 'warning'}">${p.status}</span></div>
          <div><span style="color:var(--text-muted)">Category:</span> ${p.category || '—'}</div>
          <div><span style="color:var(--text-muted)">Manufacturer:</span> ${p.manufacturer || '—'}</div>
          <div><span style="color:var(--text-muted)">Origin:</span> ${p.origin_country || '—'}</div>
          <div><span style="color:var(--text-muted)">Trust Score:</span> <span style="font-weight:800;color:${scoreColor(p.trust_score)}">${Math.round(p.trust_score)}</span></div>
        </div>
        <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div style="font-weight:700;font-size:0.88rem;display:flex;align-items:center;gap:6px">
              📱 QR Codes <span style="font-size:0.72rem;font-weight:500;color:var(--text-muted)">(${codes.length})</span>
            </div>
            <div style="display:flex;gap:6px">
              ${State.user?.role !== 'viewer' ? `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();showGenerateQrModal('${p.id}','${p.name}','${p.sku}')" style="font-size:0.72rem;border-radius:6px" title="Generate QR batch">🔄 Generate QR Batch</button>` : ''}
              ${codes.length > 0 ? `
                <button class="btn btn-sm" onclick="exportQrCodes('${p.id}','csv')" style="font-size:0.72rem;border-radius:6px" title="CSV">📊 CSV</button>
                <button class="btn btn-sm" onclick="exportQrCodes('${p.id}','pdf')" style="font-size:0.72rem;border-radius:6px" title="PDF">📄 PDF</button>
              ` : ''}
            </div>
          </div>
          ${codes.length > 0 ? `
            <div style="max-height:340px;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;padding:4px">
              ${codes.map((c, i) => {
                const isScanned = (c.scan_count || 0) > 0;
                return `
                <div style="text-align:center;padding:8px 4px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);transition:all .2s ease;cursor:pointer" onmouseover="this.style.borderColor='var(--cyan)';this.style.boxShadow='0 2px 12px rgba(0,240,255,0.1)'" onmouseout="this.style.borderColor='var(--border)';this.style.boxShadow=''" onclick="navigator.clipboard.writeText('${c.qr_data || c.code || c.id}').then(()=>showToast('Verification link copied!','success'))" title="Click to copy verification link">
                  ${c.image_key
                    ? `<img src="${_appPrefix}/qr/${c.image_key}" alt="QR #${i+1}" style="width:64px;height:64px;border-radius:6px;margin-bottom:4px" loading="lazy">`
                    : `<div style="width:64px;height:64px;margin:0 auto 4px;background:var(--bg-input);border-radius:6px;display:flex;align-items:center;justify-content:center;border:1px dashed var(--border)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></div>`}
                  <div style="display:flex;align-items:center;justify-content:center;gap:4px;margin-top:2px">
                    <span style="width:6px;height:6px;border-radius:50%;background:${isScanned ? 'var(--emerald)' : 'var(--border-hover)'};display:inline-block;${isScanned ? 'box-shadow:0 0 4px var(--emerald-glow)' : ''}"></span>
                    <span style="font-size:0.58rem;color:${isScanned ? 'var(--emerald)' : 'var(--text-muted)'};font-weight:${isScanned ? '600' : '500'}">${isScanned ? c.scan_count + ' scan' + (c.scan_count > 1 ? 's' : '') : 'Pending'}</span>
                  </div>
                  <div style="font-size:0.52rem;color:var(--text-muted);font-family:'JetBrains Mono',monospace;margin-top:1px">#${i+1}</div>
                </div>`;
              }).join('')}
            </div>
          ` : `
            <div style="padding:28px;text-align:center;color:var(--text-muted);font-size:0.82rem;background:var(--bg-input);border-radius:8px;border:1px dashed var(--border)">
              <div style="font-size:1.8rem;margin-bottom:6px;opacity:0.5">📱</div>
              Click "Generate QR Batch" to create verification codes for this product.
            </div>
          `}
        </div>

        <button class="btn" onclick="State.modal=null;render()" style="margin-top:16px;width:100%">Close</button>
      </div>
    `;
    render();
  } catch (e) { showToast('Failed to load product', 'error'); }
}



async function searchProducts(q) {
  try {
    const res = await API.get(`/products?search=${encodeURIComponent(q)}`);
    State.products = res.products || [];
    const grid = document.getElementById('product-grid');
    if (grid) grid.innerHTML = renderPage().match(/<div class="product-grid"[^>]*>([\s\S]*?)<\/div>\s*$/)?.[1] || '';
  } catch (e) { }
}

// ── Export QR codes for a specific product (CSV or PDF) ──
async function exportQrCodes(productId, format) {
  try {
    showToast(`⏳ Generating ${format.toUpperCase()} file...`, 'info');

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
    showToast(`✅ ${format.toUpperCase()} file downloaded successfully!`, 'success');
  } catch (e) {
    showToast('❌ ' + (e.message || 'Export failed'), 'error');
  }
}

// ── Export all products list as CSV ──
function exportProductsCSV() {
  try {
    if (!State.products || State.products.length === 0) {
      showToast('No products to export', 'warning');
      return;
    }
    const BOM = '\uFEFF';
    const header = ['Product Name', 'SKU', 'Category', 'Manufacturer', 'Origin', 'Trust Score', 'Status'];
    const rows = State.products.map(p => [
      `"${p.name || ''}"`,
      `"${p.sku || ''}"`,
      `"${p.category || ''}"`,
      `"${p.manufacturer || ''}"`,
      `"${p.origin_country || ''}"`,
      Math.round(p.trust_score || 0),
      p.status || 'active'
    ]);
    const csv = BOM + header.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TrustChecker_Products_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ Product list downloaded!', 'success');
  } catch (e) {
    showToast('❌ Export failed', 'error');
  }
}

// ── Generate QR Batch Modal ──
function showGenerateQrModal(productId, productName, productSku) {
  State.modal = `
    <div class="modal" style="max-width:500px">
      <div class="modal-title">🔄 Bulk QR Code Generation</div>
      <div style="padding:12px;background:var(--border);border-radius:8px;margin-bottom:16px">
        <div style="font-size:0.82rem"><strong>${productName}</strong></div>
        <div style="font-size:0.72rem;color:var(--text-muted);font-family:'JetBrains Mono'">${productSku}</div>
      </div>
      <div class="input-group" style="margin-bottom:12px">
        <label>Number of QR codes *</label>
        <input class="input" id="qr-batch-qty" type="number" min="1" max="100000" value="10" placeholder="1 - 100,000">
        <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px">
          ≤ 500: instant &nbsp;|&nbsp; > 500: background job
        </div>
      </div>
      <div class="input-group">
        <label>Batch ID / Number (Optional)</label>
        <input class="input" id="qr-batch-id-additional" type="text" placeholder="e.g. BATCH-2026-X1" style="font-family:'JetBrains Mono'">
      </div>
      <div id="qr-batch-progress" style="display:none"></div>
      <div id="qr-batch-result" style="display:none"></div>
      <div style="display:flex;gap:10px;margin-top:16px" id="qr-batch-actions">
        <button class="btn btn-primary" id="qr-batch-btn" onclick="generateQrBatch('${productId}')" style="flex:1">🔄 Generate QR Codes</button>
        <button class="btn" onclick="if(window._qrPollTimer)clearInterval(window._qrPollTimer);State.modal=null;render()">Cancel</button>
      </div>
    </div>
  `;
  render();
}

async function generateQrBatch(productId) {
  const qtyInput = document.getElementById('qr-batch-qty');
  const batchInput = document.getElementById('qr-batch-id-additional');
  const quantity = parseInt(qtyInput?.value) || 10;
  const batch_id = batchInput?.value.trim() || undefined;

  if (quantity < 1 || quantity > 100000) {
    showToast('Quantity must be between 1 and 100,000', 'error');
    return;
  }

  const btn = document.getElementById('qr-batch-btn');
  const progress = document.getElementById('qr-batch-progress');
  const result = document.getElementById('qr-batch-result');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating...'; }

  try {
    const res = await API.post('/products/generate-code', { product_id: productId, quantity, batch_id });

    // ── Async path: background job ──
    if (res.async && res.job_id) {
      if (progress) {
        progress.style.display = 'block';
        progress.innerHTML = `
          <div style="padding:16px;background:rgba(0,210,255,0.08);border-radius:8px;margin-top:12px">
            <div style="font-size:0.85rem;font-weight:700;color:var(--accent);margin-bottom:8px">
              ⚙️ Processing ${quantity.toLocaleString()} QR codes...
            </div>
            <div style="background:rgba(255,255,255,0.1);border-radius:4px;height:20px;overflow:hidden;margin-bottom:8px">
              <div id="qr-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,var(--accent),#00d264);transition:width 0.5s;border-radius:4px"></div>
            </div>
            <div id="qr-progress-text" style="font-size:0.75rem;color:var(--text-muted)">Waiting for worker to process...</div>
          </div>
        `;
      }
      if (btn) btn.style.display = 'none';

      // Poll every 2 seconds
      window._qrPollTimer = setInterval(async () => {
        try {
          const status = await API.get(`/products/jobs/${res.job_id}`);
          const job = status.job;
          const bar = document.getElementById('qr-progress-bar');
          const text = document.getElementById('qr-progress-text');

          if (bar) bar.style.width = `${job.progress || 0}%`;
          if (text) text.textContent = `${Math.round(job.progress || 0)}% — ${(job.generated_count || 0).toLocaleString()} / ${quantity.toLocaleString()} codes generated`;

          if (job.status === 'completed') {
            clearInterval(window._qrPollTimer);
            if (progress) progress.style.display = 'none';
            if (result) {
              result.style.display = 'block';
              result.innerHTML = `
                <div style="padding:16px;background:rgba(0,210,100,0.1);border-radius:8px;border:1px solid rgba(0,210,100,0.2)">
                  <div style="font-size:1rem;font-weight:800;color:#00d264;margin-bottom:8px">✅ Generated ${(job.generated_count || quantity).toLocaleString()} QR codes!</div>
                  <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:12px">
                    Serial: #00001 → #${String(job.generated_count || quantity).padStart(5, '0')}<br>
                    Each code encodes URL → phone scan opens verification page
                  </div>
                  <div style="display:flex;gap:8px">
                    <button class="btn btn-sm" onclick="exportQrCodes('${productId}','csv')" style="flex:1">📊 Download CSV</button>
                    <button class="btn btn-sm" onclick="exportQrCodes('${productId}','pdf')" style="flex:1">📄 Download PDF</button>
                  </div>
                </div>
              `;
            }
            showToast(`✅ Generated ${(job.generated_count || quantity).toLocaleString()} QR codes!`, 'success');
          } else if (job.status === 'failed') {
            clearInterval(window._qrPollTimer);
            if (progress) progress.style.display = 'none';
            showToast(`❌ Job failed: ${job.error_message || 'Unknown error'}`, 'error');
            if (btn) { btn.style.display = ''; btn.disabled = false; btn.textContent = '🔄 Retry'; }
          }
        } catch (_) {}
      }, 2000);

      return;
    }

    // ── Sync path: ≤ 500 codes ──
    const codes = res.codes || [];
    if (progress) progress.style.display = 'none';
    if (result) {
      result.style.display = 'block';
      result.innerHTML = `
        <div style="padding:16px;background:rgba(0,210,100,0.1);border-radius:8px;border:1px solid rgba(0,210,100,0.2)">
          <div style="font-size:1rem;font-weight:800;color:#00d264;margin-bottom:8px">✅ Generated ${codes.length} QR codes!</div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:12px">
            Serial: #0001 → #${String(codes.length).padStart(4, '0')}<br>
            Each code encodes URL → phone scan opens verification page
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm" onclick="exportQrCodes('${productId}','csv')" style="flex:1">📊 Download CSV</button>
            <button class="btn btn-sm" onclick="exportQrCodes('${productId}','pdf')" style="flex:1">📄 Download PDF</button>
          </div>
        </div>
      `;
    }
    if (btn) { btn.textContent = '✅ Complete'; btn.disabled = true; }
    showToast(`✅ Generated ${codes.length} QR codes!`, 'success');
  } catch (e) {
    if (progress) progress.style.display = 'none';
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Generate QR Codes'; }
    showToast('❌ ' + (e.message || 'Code generation failed'), 'error');
  }
}

// Window exports
window.showAddProduct = showAddProduct;
window.addProduct = addProduct;
window.showProductDetail = showProductDetail;
window.searchProducts = searchProducts;
window.deleteQrCode = deleteQrCode;
window.showDeletionHistory = showDeletionHistory;
window.exportQrCodes = exportQrCodes;
window.exportProductsCSV = exportProductsCSV;
window.showGenerateQrModal = showGenerateQrModal;
window.generateQrBatch = generateQrBatch;

