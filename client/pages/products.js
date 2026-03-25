/**
 * TrustChecker – Products Page (Enhanced)
 * Product CRUD + QR code management with deletion & history.
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
        ${State.user?.role !== 'viewer' ? '<button class="btn" onclick="showDeletionHistory()" title="View QR deletion history">🗑️ Deletion Log</button>' : ''}
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
      <div class="input-group"><label>Product Name *</label><input class="input" id="np-name" placeholder="e.g. Premium Coffee – Reserve Edition"></div>
      <div class="input-group"><label>SKU *</label><input class="input" id="np-sku" placeholder="e.g. COFFEE-PR-001"></div>
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

async function addProduct() {
  try {
    const res = await API.post('/products', {
      name: document.getElementById('np-name').value,
      sku: document.getElementById('np-sku').value,
      category: document.getElementById('np-cat').value,
      manufacturer: document.getElementById('np-mfr').value,
      batch_number: document.getElementById('np-batch').value,
      origin_country: document.getElementById('np-origin').value,
      weight_kg: parseFloat(document.getElementById('np-weight').value) || 0,
      quantity: parseInt(document.getElementById('np-qty').value) || 1,
      price: parseFloat(document.getElementById('np-price').value) || 0,
    });
    State.modal = null;
    showToast('✅ Product registered! QR code generated. Carbon footprint calculated.', 'success');
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
        ${qr?.qr_image_base64 ? `<div style="text-align:center;margin:16px 0"><img src="${qr.qr_image_base64}" alt="Product QR code" style="width:180px;border-radius:12px;border:2px solid var(--border)"></div>` : ''}
        ${qr ? `<div style="font-size:0.7rem;font-family:'JetBrains Mono';color:var(--text-muted);text-align:center;word-break:break-all;margin-bottom:12px">${qr.qr_data}</div>` : ''}

        ${codes.length > 0 ? `
          <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div style="font-weight:600;font-size:0.85rem">📱 QR Codes (${codes.length})</div>
              <div style="display:flex;gap:6px">
                ${State.user?.role !== 'viewer' ? `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();showGenerateQrModal('${p.id}','${p.name}','${p.sku}')" style="font-size:0.72rem" title="Tạo QR hàng loạt">🔄 Tạo QR Batch</button>` : ''}
                <button class="btn btn-sm" onclick="exportQrCodes('${p.id}','csv')" style="font-size:0.72rem" title="Tải file CSV (Excel)">📊 CSV</button>
                <button class="btn btn-sm" onclick="exportQrCodes('${p.id}','pdf')" style="font-size:0.72rem" title="Tải file PDF (in ấn)">📄 PDF</button>
              </div>
            </div>
            <div style="max-height:200px;overflow-y:auto">
              ${codes.map(c => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.78rem">
                  <div>
                    <span style="font-family:'JetBrains Mono';font-size:0.7rem">${c.code?.substring(0, 20) || c.id?.substring(0, 12)}…</span>
                    ${c.scan_count > 0 ? `<span class="badge valid" style="margin-left:6px;font-size:0.6rem">${c.scan_count} scans</span>` : ''}
                    ${c.deleted_at ? '<span class="badge suspicious" style="margin-left:6px;font-size:0.6rem">Deleted</span>' : ''}
                  </div>
                  ${!c.deleted_at && State.user?.role !== 'viewer' ? `
                    <button class="btn btn-sm" onclick="deleteQrCode('${c.id}','${p.id}')" style="color:var(--rose);font-size:0.7rem" title="Delete QR code">🗑️</button>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <button class="btn" onclick="State.modal=null;render()" style="margin-top:16px;width:100%">Close</button>
      </div>
    `;
    render();
  } catch (e) { showToast('Failed to load product', 'error'); }
}

async function deleteQrCode(codeId, productId) {
  if (!confirm('Delete this QR code? This cannot be undone.')) return;
  try {
    await API.delete(`/products/codes/${codeId}`);
    showToast('QR code deleted', 'info');
    showProductDetail(productId); // Refresh detail
  } catch (e) { showToast(e.message || 'Delete failed — code may have been scanned', 'error'); }
}

async function showDeletionHistory() {
  try {
    const res = await API.get('/products/codes/deletion-history');
    const history = res.history || res.deletions || [];
    State.modal = `
      <div class="modal" style="max-width:700px">
        <div class="modal-title">🗑️ QR Code Deletion History</div>
        ${history.length ? `
          <div class="table-container" style="max-height:400px;overflow-y:auto">
            <table>
              <tr><th>Code</th><th>Product</th><th>Deleted By</th><th>Date</th><th>Reason</th></tr>
              ${history.map(h => `
                <tr>
                  <td style="font-family:'JetBrains Mono';font-size:0.7rem">${(h.code || h.qr_code_id || '').substring(0, 16)}…</td>
                  <td>${h.product_name || '—'}</td>
                  <td>${h.deleted_by_username || h.deleted_by || '—'}</td>
                  <td style="font-size:0.72rem;color:var(--text-muted)">${h.deleted_at ? new Date(h.deleted_at).toLocaleString() : '—'}</td>
                  <td style="font-size:0.78rem">${h.reason || '—'}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        ` : '<div style="padding:30px;text-align:center;color:var(--text-muted)">No deletions recorded</div>'}
        <button class="btn" onclick="State.modal=null;render()" style="margin-top:16px;width:100%">Close</button>
      </div>
    `;
    render();
  } catch (e) { showToast('Failed to load deletion history', 'error'); }
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
    showToast(`⏳ Đang tạo file ${format.toUpperCase()}...`, 'info');

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
    showToast(`✅ Đã tải file ${format.toUpperCase()} thành công!`, 'success');
  } catch (e) {
    showToast('❌ ' + (e.message || 'Export thất bại'), 'error');
  }
}

// ── Export all products list as CSV ──
function exportProductsCSV() {
  try {
    if (!State.products || State.products.length === 0) {
      showToast('Không có sản phẩm để xuất', 'warning');
      return;
    }
    const BOM = '\uFEFF';
    const header = ['Tên Sản Phẩm', 'SKU', 'Danh Mục', 'Nhà Sản Xuất', 'Xuất Xứ', 'Trust Score', 'Trạng Thái'];
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
    showToast('✅ Đã tải danh sách sản phẩm!', 'success');
  } catch (e) {
    showToast('❌ Export thất bại', 'error');
  }
}

// ── Generate QR Batch Modal ──
function showGenerateQrModal(productId, productName, productSku) {
  State.modal = `
    <div class="modal" style="max-width:480px">
      <div class="modal-title">🔄 Tạo QR Code Hàng Loạt</div>
      <div style="padding:12px;background:var(--border);border-radius:8px;margin-bottom:16px">
        <div style="font-size:0.82rem"><strong>${productName}</strong></div>
        <div style="font-size:0.72rem;color:var(--text-muted);font-family:'JetBrains Mono'">${productSku}</div>
      </div>
      <div class="input-group">
        <label>Số lượng mã QR *</label>
        <input class="input" id="qr-batch-qty" type="number" min="1" max="500" value="10" placeholder="1 - 500">
        <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px">Mỗi mã QR có serial number riêng, encode verification URL để phone quét được</div>
      </div>
      <div id="qr-batch-progress" style="display:none;padding:12px;background:rgba(0,210,255,0.08);border-radius:8px;margin-top:12px;text-align:center">
        <div class="spinner" style="width:24px;height:24px;margin:0 auto 8px"></div>
        <div style="font-size:0.82rem;color:var(--accent)">Đang tạo mã QR...</div>
      </div>
      <div id="qr-batch-result" style="display:none"></div>
      <div style="display:flex;gap:10px;margin-top:16px" id="qr-batch-actions">
        <button class="btn btn-primary" id="qr-batch-btn" onclick="generateQrBatch('${productId}')" style="flex:1">🔄 Tạo Mã QR</button>
        <button class="btn" onclick="State.modal=null;render()">Hủy</button>
      </div>
    </div>
  `;
  render();
}

async function generateQrBatch(productId) {
  const qtyInput = document.getElementById('qr-batch-qty');
  const quantity = parseInt(qtyInput?.value) || 10;
  if (quantity < 1 || quantity > 500) {
    showToast('Số lượng phải từ 1 đến 500', 'error');
    return;
  }

  // Show progress
  const btn = document.getElementById('qr-batch-btn');
  const progress = document.getElementById('qr-batch-progress');
  const result = document.getElementById('qr-batch-result');
  if (btn) btn.disabled = true;
  if (btn) btn.textContent = '⏳ Đang tạo...';
  if (progress) progress.style.display = 'block';

  try {
    const res = await API.post('/products/generate-code', { product_id: productId, quantity });
    const codes = res.codes || [];

    if (progress) progress.style.display = 'none';
    if (result) {
      result.style.display = 'block';
      result.innerHTML = `
        <div style="padding:16px;background:rgba(0,210,100,0.1);border-radius:8px;border:1px solid rgba(0,210,100,0.2)">
          <div style="font-size:1rem;font-weight:800;color:#00d264;margin-bottom:8px">✅ Đã tạo ${codes.length} mã QR!</div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:12px">
            Serial: #0001 → #${String(codes.length).padStart(4, '0')}<br>
            Mỗi mã encode URL → phone quét mở trang xác minh
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm" onclick="exportQrCodes('${productId}','csv')" style="flex:1">📊 Tải CSV</button>
            <button class="btn btn-sm" onclick="exportQrCodes('${productId}','pdf')" style="flex:1">📄 Tải PDF</button>
          </div>
        </div>
      `;
    }
    if (btn) { btn.textContent = '✅ Hoàn tất'; btn.disabled = true; }
    showToast(`✅ Đã tạo ${codes.length} mã QR cho sản phẩm!`, 'success');
  } catch (e) {
    if (progress) progress.style.display = 'none';
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Tạo Mã QR'; }
    showToast('❌ ' + (e.message || 'Tạo mã thất bại'), 'error');
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

