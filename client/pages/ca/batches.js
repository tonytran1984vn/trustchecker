/**
 * Company Admin – Batch Management
 * ══════════════════════════════════
 * Real data from /api/scm/batches
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let batches = null, loading = false, filter = 'all', products = null;

window._caBatchFilter = (f) => { filter = f; const el = document.getElementById('batches-root'); if (el) el.innerHTML = renderContent(); };

window._caCreateBatch = () => {
  const modal = document.getElementById('create-batch-modal');
  if (modal) modal.style.display = 'flex';
  // Load products for dropdown
  if (!products) {
    API.get('/products').then(res => {
      products = Array.isArray(res) ? res : (res.products || []);
      const sel = document.getElementById('batch-product');
      if (sel && products.length) {
        sel.innerHTML = '<option value="">Select product...</option>' + products.map(p => `<option value="${p.id}">${p.name} (${p.sku})</option>`).join('');
      }
    }).catch(() => { });
  }
};

window._caCloseBatchModal = () => {
  const modal = document.getElementById('create-batch-modal');
  if (modal) modal.style.display = 'none';
};

window._caSubmitBatch = async () => {
  const batchNumber = document.getElementById('batch-number')?.value?.trim();
  const productId = document.getElementById('batch-product')?.value;
  const quantity = parseInt(document.getElementById('batch-qty')?.value) || 0;
  const facility = document.getElementById('batch-facility')?.value?.trim() || '';
  const mfgDate = document.getElementById('batch-mfg')?.value || null;
  const expDate = document.getElementById('batch-exp')?.value || null;

  if (!batchNumber) return alert('Batch number is required');
  if (!productId) return alert('Please select a product');

  try {
    await API.post('/scm/batches', {
      batch_number: batchNumber,
      product_id: productId,
      quantity,
      origin_facility: facility,
      manufactured_date: mfgDate,
      expiry_date: expDate
    });
    window._caCloseBatchModal();
    batches = null;
    loading = false;
    load();
  } catch (e) {
    alert('Failed to create batch: ' + (e.message || 'Unknown error'));
  }
};

export function renderPage() {
  return `<div id="batches-root">${renderContent()}</div>`;
}

async function load() {
  if (loading) return; loading = true;
  try {
    const res = await API.get('/scm/batches');
    batches = Array.isArray(res) ? res : (res.batches || []);
  } catch (e) { batches = []; }
  loading = false;
  setTimeout(() => { const el = document.getElementById('batches-root'); if (el) el.innerHTML = renderContent(); }, 50);
}

function renderContent() {
  if (!batches && !loading) { load(); }
  if (loading && !batches) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Batches...</div></div>`;

  const list = batches || [];
  const filtered = filter === 'all' ? list : list.filter(b => b.status === filter);
  const statuses = ['all', 'created', 'shipped', 'in_transit', 'delivered', 'recalled'];
  const counts = {};
  statuses.forEach(s => { counts[s] = s === 'all' ? list.length : list.filter(b => b.status === s).length; });

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('clipboard', 28)} Batch Management</h1>
        <div class="sa-title-actions">
          <button class="btn btn-primary btn-sm" onclick="_caCreateBatch()">+ Create Batch</button>
        </div>
      </div>

      <div class="sa-toolbar">
        <div class="sa-filters">
          ${statuses.map(f => `<button class="sa-filter-btn ${filter === f ? 'active' : ''}" style="${filter === f ? 'color:#1e293b;background:#fef3c7;border-color:#f59e0b' : 'color:#fff;background:#475569;border-color:#475569'}" onclick="_caBatchFilter('${f}')">${f === 'all' ? 'All' : f === 'in_transit' ? 'In Transit' : f.charAt(0).toUpperCase() + f.slice(1)} <span class="sa-filter-count">${counts[f] || 0}</span></button>`).join('')}
        </div>
      </div>

      <div class="sa-card">
        ${filtered.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--text-muted)">No batches found. Click "+ Create Batch" to add one.</div>' : `
        <table class="sa-table">
          <thead>
            <tr><th>Batch #</th><th>Product</th><th>Qty</th><th>Facility</th><th>Mfg Date</th><th>Status</th><th>Created</th></tr>
          </thead>
          <tbody>
            ${filtered.map(b => `
              <tr class="sa-row-clickable">
                <td><strong class="sa-code">${b.batch_number || b.batch_code || b.id?.substring(0, 8)}</strong></td>
                <td>${b.product_name || '—'}</td>
                <td class="sa-code">${(b.quantity || 0).toLocaleString()}</td>
                <td>${b.origin_facility || '—'}</td>
                <td style="color:var(--text-secondary)">${b.manufactured_date ? new Date(b.manufactured_date).toLocaleDateString('en-US') : '—'}</td>
                <td><span class="sa-status-pill sa-pill-${b.status === 'delivered' ? 'green' : b.status === 'shipped' || b.status === 'in_transit' ? 'blue' : b.status === 'created' ? 'orange' : b.status === 'recalled' ? 'red' : 'orange'}">${b.status || 'created'}</span></td>
                <td style="color:var(--text-secondary)">${b.created_at ? new Date(b.created_at).toLocaleDateString('en-US') : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`}
      </div>
    </div>

    <!-- Create Batch Modal -->
    <div id="create-batch-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center">
      <div style="background:var(--surface-primary,#fff);border-radius:12px;padding:24px;width:480px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="margin:0;color:var(--text-primary,#1e293b)">Create New Batch</h3>
          <button onclick="_caCloseBatchModal()" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--text-secondary,#94a3b8)">✕</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px">Batch Number *</label>
            <input id="batch-number" type="text" placeholder="e.g. TIK-BATCH-2026-005" style="width:100%;padding:8px 12px;border:1px solid var(--border-primary,#e2e8f0);border-radius:8px;font-size:0.85rem;box-sizing:border-box" />
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px">Product *</label>
            <select id="batch-product" style="width:100%;padding:8px 12px;border:1px solid var(--border-primary,#e2e8f0);border-radius:8px;font-size:0.85rem;box-sizing:border-box">
              <option value="">Loading products...</option>
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px">Quantity</label>
              <input id="batch-qty" type="number" placeholder="1000" style="width:100%;padding:8px 12px;border:1px solid var(--border-primary,#e2e8f0);border-radius:8px;font-size:0.85rem;box-sizing:border-box" />
            </div>
            <div>
              <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px">Origin Facility</label>
              <input id="batch-facility" type="text" placeholder="e.g. Binh Duong Factory" style="width:100%;padding:8px 12px;border:1px solid var(--border-primary,#e2e8f0);border-radius:8px;font-size:0.85rem;box-sizing:border-box" />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px">Manufactured Date</label>
              <input id="batch-mfg" type="date" style="width:100%;padding:8px 12px;border:1px solid var(--border-primary,#e2e8f0);border-radius:8px;font-size:0.85rem;box-sizing:border-box" />
            </div>
            <div>
              <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px">Expiry Date</label>
              <input id="batch-exp" type="date" style="width:100%;padding:8px 12px;border:1px solid var(--border-primary,#e2e8f0);border-radius:8px;font-size:0.85rem;box-sizing:border-box" />
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
          <button onclick="_caCloseBatchModal()" class="btn btn-sm btn-outline">Cancel</button>
          <button onclick="_caSubmitBatch()" class="btn btn-sm btn-primary">Create Batch</button>
        </div>
      </div>
    </div>
  `;
}
