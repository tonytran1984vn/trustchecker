/**
 * SCM – Procurement & Purchase Order Management
 * Enterprise: PO lifecycle, supplier bids, contract terms, spend analytics
 * Data source: PostgreSQL via /api/ops/data/purchase-orders
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { State, render } from '../../core/state.js';

// Contracts remain as reference data (not frequently changing)
const CONTRACTS = [
  { id: 'MC-2025-012', supplier: 'Golden Beans Co.', type: 'Master Supply', start: '2025-01-01', end: '2026-12-31', value: '$1.2M/year', terms: 'NET-30, FOB HCM', status: 'active', renewal: '90d notice' },
  { id: 'MC-2025-008', supplier: 'Ceylon Leaf Ltd', type: 'Master Supply', start: '2025-06-01', end: '2026-05-31', value: '$680K/year', terms: 'LC, CIF SGP', status: 'active', renewal: '60d notice' },
  { id: 'MC-2025-015', supplier: 'NZ Manuka Inc', type: 'Exclusive', start: '2025-09-01', end: '2027-08-31', value: '$900K/year', terms: 'TT, DDP', status: 'active', renewal: 'Auto-renew' },
];

const SPEND_BY_CATEGORY = [
  { category: 'Raw Materials (Coffee)', spend: '$294,000', pct: '33.8%', suppliers: 2, trend: '↑ +12%' },
  { category: 'Raw Materials (Tea)', spend: '$170,000', pct: '19.6%', suppliers: 1, trend: '→ stable' },
  { category: 'Raw Materials (Honey)', spend: '$225,000', pct: '25.9%', suppliers: 1, trend: '↑ +8%' },
  { category: 'Packaging', spend: '$180,000', pct: '20.7%', suppliers: 3, trend: '↓ -5%' },
];

export function renderPage() {
  const orders = State._poOrders || [];
  const pending = orders.filter(p => p.status === 'pending_approval').length;
  const totalSpend = orders.reduce((s, p) => s + (p.total_amount || 0), 0);

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('clipboard', 28)} Procurement</h1><div class="sa-title-actions"><button style="padding:6px 16px;border:none;border-radius:8px;background:#0d9488;color:#fff;font-size:0.78rem;font-weight:600;cursor:pointer" onclick="window._showNewPOModal()">+ New Purchase Order</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Active POs', orders.length.toString(), `${pending} pending approval`, 'blue', 'clipboard')}
        ${m('MTD Spend', '$' + Math.round(totalSpend / 1000) + 'K', 'from DB', 'green', 'creditCard')}
        ${m('On-Time Delivery', '94.2%', 'Target: >95%', 'orange', 'clock')}
        ${m('Active Contracts', CONTRACTS.length.toString(), '$2.78M annual value', 'green', 'scroll')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📋 Purchase Orders</h3>
        <table class="sa-table"><thead><tr><th>PO #</th><th>Supplier</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Delivery</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${orders.map((p, _poIdx) => {
    const color = p.status === 'delivered' ? 'green' : p.status === 'approved' ? 'blue' : p.status === 'in_transit' ? 'orange' : 'red';
    const qty = typeof p.quantity === 'number' ? p.quantity.toLocaleString() + ' ' + (p.unit || 'pcs') : (p.qty || '—');
    const price = typeof p.unit_price === 'number' ? '$' + p.unit_price.toFixed(2) + '/' + (p.unit || 'pcs') : (p.unitPrice || '—');
    const total = typeof p.total_amount === 'number' ? '$' + p.total_amount.toLocaleString() : (p.total || '—');
    const delivery = p.delivery_date ? new Date(p.delivery_date).toISOString().split('T')[0] : (p.delivery || '—');
    const poNum = p.po_number || p.id;
    return `<tr class="${p.status === 'pending_approval' ? 'ops-alert-row' : ''}">
              <td class="sa-code" style="font-weight:600">${poNum}</td>
              <td><strong>${p.supplier}</strong></td>
              <td style="font-size:0.82rem">${p.product}</td>
              <td style="text-align:right">${qty}</td>
              <td class="sa-code" style="font-size:0.78rem">${price}</td>
              <td style="font-weight:700">${total}</td>
              <td class="sa-code" style="font-size:0.78rem">${delivery}</td>
              <td style="font-size:0.72rem">${p.payment_terms || p.payment || ''}</td>
              <td><span class="sa-status-pill sa-pill-${color}">${(p.status || '').replace(/_/g, ' ')}</span></td>
              <td>${p.status === 'pending_approval' ? `<button style="padding:3px 10px;border:none;border-radius:6px;background:#0d9488;color:#fff;font-size:0.72rem;font-weight:600;cursor:pointer" onclick="window._approvePO('${p.id}')">Approve</button>` : `<button class="btn btn-xs btn-ghost" onclick="window._viewPO(${_poIdx})">View</button>`}</td>
            </tr>`;
  }).join('')}
        </tbody></table>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
        <div class="sa-card">
          <h3>📑 Active Contracts</h3>
          <table class="sa-table"><thead><tr><th>Contract</th><th>Supplier</th><th>Type</th><th>Value</th><th>Terms</th><th>End</th><th>Renewal</th></tr></thead><tbody>
            ${CONTRACTS.map(c => `<tr>
              <td class="sa-code">${c.id}</td><td><strong>${c.supplier}</strong></td><td>${c.type}</td>
              <td style="font-weight:600">${c.value}</td><td style="font-size:0.72rem">${c.terms}</td>
              <td class="sa-code" style="font-size:0.78rem">${c.end}</td><td style="font-size:0.72rem">${c.renewal}</td>
            </tr>`).join('')}
          </tbody></table>
        </div>
        <div class="sa-card">
          <h3>💰 Spend by Category</h3>
          <table class="sa-table"><thead><tr><th>Category</th><th>Spend</th><th>% Total</th><th>Suppliers</th><th>Trend</th></tr></thead><tbody>
            ${SPEND_BY_CATEGORY.map(s => `<tr>
              <td><strong>${s.category}</strong></td><td style="font-weight:700">${s.spend}</td>
              <td>${s.pct}</td><td style="text-align:center">${s.suppliers}</td>
              <td style="color:${s.trend.includes('↑') ? '#f59e0b' : s.trend.includes('↓') ? '#22c55e' : 'var(--text-secondary)'}">${s.trend}</td>
            </tr>`).join('')}
          </tbody></table>
        </div>
      </div>
    </div>
    
    <!-- New PO Modal -->
    <div id="po-modal" style="display:none;position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.45);align-items:center;justify-content:center">
      <div style="background:var(--card-bg, #fff);border-radius:14px;padding:28px 24px;width:500px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.25);border:1px solid var(--border, #e2e8f0)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <h3 style="margin:0;color:var(--text-primary, #1e293b);font-size:1.1rem">📋 New Purchase Order</h3>
          <button onclick="window._closePOModal()" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-muted, #94a3b8);padding:4px 8px;border-radius:6px" title="Close">✕</button>
        </div>
        <div style="display:grid;gap:12px">
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary, #64748b);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Supplier *</label>
            <select id="po-supplier" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem">
              <option value="">— Select supplier —</option>
              ${(State._supplierList || []).map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary, #64748b);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Product *</label>
            <select id="po-product" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem">
              <option value="">— Select product —</option>
              ${(State._productList || []).map(p => `<option value="${p}">${p}</option>`).join('')}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <div>
              <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary, #64748b);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Quantity</label>
              <input id="po-qty" type="number" placeholder="0" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem;box-sizing:border-box">
            </div>
            <div>
              <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary, #64748b);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Unit</label>
              <select id="po-unit" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem">
                <option value="kg">kg</option><option value="pcs">pcs</option><option value="liters">liters</option><option value="tons">tons</option><option value="boxes">boxes</option>
              </select>
            </div>
            <div>
              <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary, #64748b);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Unit Price ($)</label>
              <input id="po-price" type="number" step="0.01" placeholder="0.00" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem;box-sizing:border-box">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div>
              <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary, #64748b);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Delivery Date</label>
              <input id="po-delivery" type="date" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem;box-sizing:border-box">
            </div>
            <div>
              <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary, #64748b);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Payment Terms</label>
              <select id="po-payment" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem">
                <option value="NET-30">NET-30</option><option value="NET-45">NET-45</option><option value="NET-60">NET-60</option><option value="LC">Letter of Credit</option><option value="TT">Telegraphic Transfer</option>
              </select>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button onclick="window._submitNewPO()" style="flex:1;padding:11px;background:#0d9488;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.9rem;transition:background 0.2s" onmouseover="this.style.background='#0f766e'" onmouseout="this.style.background='#0d9488'">Create PO</button>
          <button onclick="window._closePOModal()" style="flex:0.6;padding:11px;background:var(--bg-secondary, #f1f5f9);color:var(--text-primary, #1e293b);border:1px solid var(--border, #e2e8f0);border-radius:8px;cursor:pointer;font-weight:500;font-size:0.9rem;transition:background 0.2s" onmouseover="this.style.background='var(--border, #e2e8f0)'" onmouseout="this.style.background='var(--bg-secondary, #f1f5f9)'">Cancel</button>
        </div>
      </div>
    </div>`;
}

function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }

// Load PO data from API
async function loadPOData() {
  try {
    const res = await API.get('/ops/data/purchase-orders');
    State._poOrders = res.orders || [];
    render();
  } catch (e) { console.warn('[procurement] API fallback', e); }
}

// Load supplier & product lists for dropdown
async function loadDropdownData() {
  try {
    // Suppliers from partner/scoring API
    if (!State._supplierList) {
      const sr = await API.get('/ops/data/supplier-scoring');
      const suppliers = (sr.suppliers || []).map(s => s.name || s.company_name || s.supplier).filter(Boolean);
      // Also include suppliers from contracts
      const contractSuppliers = ['Golden Beans Co.', 'Ceylon Leaf Ltd', 'NZ Manuka Inc'];
      const all = [...new Set([...suppliers, ...contractSuppliers])].sort();
      State._supplierList = all;
    }
    // Products from existing POs + common product list
    if (!State._productList) {
      const orders = State._poOrders || [];
      const fromPO = orders.map(o => o.product).filter(Boolean);
      const common = ['Arabica Coffee Beans', 'Robusta Coffee Beans', 'Ceylon Black Tea', 'Green Tea Leaves', 'Manuka Honey', 'Packaging Materials', 'Labels & Stickers', 'Organic Fertilizer'];
      const all = [...new Set([...fromPO, ...common])].sort();
      State._productList = all;
    }
  } catch (e) { console.warn('[procurement] dropdown load', e); }
}

// Modal handlers
window._showNewPOModal = async () => {
  await loadDropdownData();
  render(); // re-render to populate dropdowns
  setTimeout(() => { document.getElementById('po-modal').style.display = 'flex'; }, 50);
};

window._closePOModal = () => { document.getElementById('po-modal').style.display = 'none'; };

window._submitNewPO = async () => {
  try {
    const data = {
      supplier: document.getElementById('po-supplier').value,
      product: document.getElementById('po-product').value,
      quantity: parseInt(document.getElementById('po-qty').value) || 0,
      unit: document.getElementById('po-unit').value || 'kg',
      unitPrice: parseFloat(document.getElementById('po-price').value) || 0,
      deliveryDate: document.getElementById('po-delivery').value || null,
      paymentTerms: document.getElementById('po-payment').value,
    };
    if (!data.supplier || !data.product) { showToast('Please select both Supplier and Product', 'warning'); return; }
    if (!data.quantity || data.quantity <= 0) { showToast('Quantity must be greater than 0', 'warning'); return; }
    if (!data.unitPrice || data.unitPrice <= 0) { showToast('Unit price must be greater than 0', 'warning'); return; }
    await API.post('/ops/data/purchase-orders', data);
    window._closePOModal();
    showToast('✅ Purchase Order created successfully', 'success');
    loadPOData();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
};

window._approvePO = async (id) => {
  try {
    await API.post(`/ops/data/purchase-orders/${id}/approve`);
    showToast('✅ Purchase Order approved', 'success');
    loadPOData();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
};

// Auto-load when page renders
if (!State._poOrders) loadPOData();

window._viewPO = function(idx) {
  const p = (State._poOrders || [])[idx];
  if (!p) return;
  const poNum = p.po_number || p.id;
  const qty = typeof p.quantity === 'number' ? p.quantity.toLocaleString() + ' ' + (p.unit || 'pcs') : (p.qty || '—');
  const price = typeof p.unit_price === 'number' ? '$' + p.unit_price.toFixed(2) + '/' + (p.unit || 'pcs') : (p.unitPrice || '—');
  const total = typeof p.total_amount === 'number' ? '$' + p.total_amount.toLocaleString() : (p.total || '—');
  const delivery = p.delivery_date ? new Date(p.delivery_date).toISOString().split('T')[0] : (p.delivery || '—');
  const stColor = p.status === 'delivered' ? '#22c55e' : p.status === 'approved' ? '#3b82f6' : p.status === 'in_transit' ? '#f59e0b' : '#ef4444';
  const modal = document.createElement('div');
  modal.id = '_po_detail_modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div style="background:var(--card-bg,#fff);border-radius:14px;padding:28px 24px;width:520px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.25);border:1px solid var(--border-color,#e2e8f0)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 style="margin:0;font-size:1.1rem;color:var(--text-primary)">📋 Purchase Order Detail</h3>
        <button onclick="document.getElementById('_po_detail_modal')?.remove()" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-secondary);padding:4px 8px;border-radius:6px">✕</button>
      </div>
      <div style="display:grid;gap:14px">
        <div style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:10px;background:${stColor}08;border:1px solid ${stColor}20">
          <span style="font-weight:700;font-size:0.92rem;color:var(--text-primary);font-family:monospace">${poNum}</span>
          <span style="font-size:0.62rem;padding:2px 8px;border-radius:12px;font-weight:600;background:${stColor}12;color:${stColor}">${(p.status || '').replace(/_/g, ' ')}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Supplier</div>
            <div style="font-size:0.92rem;font-weight:600;color:var(--text-primary)">${p.supplier}</div>
          </div>
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Product</div>
            <div style="font-size:0.85rem;color:var(--text-primary)">${p.product}</div>
          </div>
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Quantity</div>
            <div style="font-size:0.85rem;color:var(--text-primary)">${qty}</div>
          </div>
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Unit Price</div>
            <div style="font-size:0.85rem;font-family:monospace;color:var(--text-primary)">${price}</div>
          </div>
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Total Amount</div>
            <div style="font-size:1rem;font-weight:700;color:var(--text-primary)">${total}</div>
          </div>
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Delivery Date</div>
            <div style="font-size:0.85rem;color:var(--text-primary)">${delivery}</div>
          </div>
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Payment Terms</div>
            <div style="font-size:0.85rem;color:var(--text-primary)">${p.payment_terms || p.payment || '—'}</div>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px">
        <button onclick="document.getElementById('_po_detail_modal')?.remove()" style="flex:1;padding:10px;background:var(--bg-secondary,#f1f5f9);color:var(--text-primary);border:1px solid var(--border-color,#e2e8f0);border-radius:8px;cursor:pointer;font-weight:500;font-size:0.85rem">Close</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
};
