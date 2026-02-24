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
        <button class="btn" onclick="showDeletionHistory()" title="View QR deletion history">🗑️ Deletion Log</button>
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
    showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Product registered! QR code generated.', 'success');
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
                  ${!c.deleted_at ? `
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

// Window exports
window.showAddProduct = showAddProduct;
window.addProduct = addProduct;
window.showProductDetail = showProductDetail;
window.searchProducts = searchProducts;
window.deleteQrCode = deleteQrCode;
window.showDeletionHistory = showDeletionHistory;
window.exportQrCodes = exportQrCodes;
window.exportProductsCSV = exportProductsCSV;

