/**
 * TrustChecker – Products Page
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';
import { scoreColor } from '../utils/helpers.js';
import { navigate } from '../core/router.js';

export function renderPage() {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;gap:12px">
      <input class="input" style="max-width:300px" placeholder="Search products..." oninput="searchProducts(this.value)">
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="exportProductsCSV()" title="Export CSV">📊 Export CSV</button>
        <button class="btn btn-primary" onclick="showAddProduct()">+ Add Product</button>
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
      <div class="input-group"><label>Product Name *</label><input class="input" id="np-name" placeholder="e.g. Premium Coffee – Reserve Edition"></div>
      <div class="input-group"><label>SKU *</label><input class="input" id="np-sku" placeholder="e.g. COFFEE-PR-001"></div>
      <div class="input-group"><label>Category</label><input class="input" id="np-cat" placeholder="e.g. F&B, Electronics"></div>
      <div class="input-group"><label>Manufacturer</label><input class="input" id="np-mfr" placeholder="e.g. Highland Coffee Co."></div>
      <div class="input-group"><label>Batch Number</label><input class="input" id="np-batch" placeholder="e.g. BATCH-2026-001"></div>
      <div class="input-group"><label>Origin Country</label><input class="input" id="np-origin" placeholder="e.g. Vietnam"></div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-primary" onclick="addProduct()" style="flex:1">Register & Generate QR</button>
        <button class="btn" onclick="State.modal=null;render()">Cancel</button>
      </div>
    </div>
  `;
  render();
}
async function addProduct() {
  try {
    const res = await API.post('/products', {
      name: document.getElementById('np-name').value,
      sku: document.getElementById('np-sku').value,
      category: document.getElementById('np-cat').value,
      manufacturer: document.getElementById('np-mfr').value,
      batch_number: document.getElementById('np-batch').value,
      origin_country: document.getElementById('np-origin').value
    });
    State.modal = null;
    showToast('✅ Product registered! QR code generated.', 'success');
    navigate('products');
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}
async function showProductDetail(id) {
  try {
    const detail = await API.get(`/products/${id}`);
    const p = detail.product;
    const qr = detail.qr_codes?.[0];
    State.modal = `
      <div class="modal" style="max-width:600px">
        <div class="modal-title">${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;font-size:0.82rem">
          <div><span style="color:var(--text-muted)">SKU:</span> <span style="font-family:'JetBrains Mono'">${p.sku}</span></div>
          <div><span style="color:var(--text-muted)">Status:</span> <span class="badge ${p.status === 'active' ? 'valid' : 'warning'}">${p.status}</span></div>
          <div><span style="color:var(--text-muted)">Category:</span> ${p.category || '—'}</div>
          <div><span style="color:var(--text-muted)">Manufacturer:</span> ${p.manufacturer || '—'}</div>
          <div><span style="color:var(--text-muted)">Origin:</span> ${p.origin_country || '—'}</div>
          <div><span style="color:var(--text-muted)">Trust Score:</span> <span style="font-weight:800;color:${scoreColor(p.trust_score)}">${Math.round(p.trust_score)}</span></div>
        </div>
        ${qr?.qr_image_base64 ? `<div style="text-align:center;margin:16px 0"><img src="${qr.qr_image_base64}" style="width:180px;border-radius:12px;border:2px solid var(--border)"></div>` : ''}
        ${qr ? `<div style="font-size:0.7rem;font-family:'JetBrains Mono';color:var(--text-muted);text-align:center;word-break:break-all">${qr.qr_data}</div>` : ''}
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

// Window exports for onclick handlers
window.showAddProduct = showAddProduct;
window.addProduct = addProduct;
window.showProductDetail = showProductDetail;
window.searchProducts = searchProducts;
