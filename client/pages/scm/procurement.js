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
      <div class="sa-page-title"><h1>${icon('clipboard', 28)} Procurement</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm" onclick="window._showNewPOModal()">+ New Purchase Order</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Active POs', orders.length.toString(), `${pending} pending approval`, 'blue', 'clipboard')}
        ${m('MTD Spend', '$' + Math.round(totalSpend / 1000) + 'K', 'from DB', 'green', 'creditCard')}
        ${m('On-Time Delivery', '94.2%', 'Target: >95%', 'orange', 'clock')}
        ${m('Active Contracts', CONTRACTS.length.toString(), '$2.78M annual value', 'green', 'scroll')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📋 Purchase Orders</h3>
        <table class="sa-table"><thead><tr><th>PO #</th><th>Supplier</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Delivery</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${orders.map(p => {
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
              <td>${p.status === 'pending_approval' ? `<button class="btn btn-xs btn-primary" onclick="window._approvePO('${p.id}')">Approve</button>` : `<button class="btn btn-xs btn-ghost" onclick="showToast('PO ${poNum}: ${p.product}','info')">View</button>`}</td>
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
    <div id="po-modal" style="display:none;position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.5);align-items:center;justify-content:center">
      <div style="background:var(--card-bg,#1e293b);border-radius:12px;padding:24px;width:480px;max-width:90vw">
        <h3 style="margin:0 0 16px;color:var(--text-primary,#f1f5f9)">+ New Purchase Order</h3>
        <div style="display:grid;gap:10px">
          <input id="po-supplier" class="input" placeholder="Supplier name" style="padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text-primary)">
          <input id="po-product" class="input" placeholder="Product" style="padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text-primary)">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <input id="po-qty" class="input" type="number" placeholder="Qty" style="padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text-primary)">
            <input id="po-unit" class="input" placeholder="Unit (kg, pcs)" value="kg" style="padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text-primary)">
            <input id="po-price" class="input" type="number" step="0.01" placeholder="Unit price ($)" style="padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text-primary)">
          </div>
          <input id="po-delivery" class="input" type="date" style="padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text-primary)">
          <select id="po-payment" style="padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text-primary)">
            <option value="NET-30">NET-30</option><option value="NET-45">NET-45</option><option value="NET-60">NET-60</option><option value="LC">Letter of Credit</option><option value="TT">Telegraphic Transfer</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;margin-top:16px">
          <button onclick="window._submitNewPO()" style="flex:1;padding:10px;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">Create PO</button>
          <button onclick="document.getElementById('po-modal').style.display='none'" style="padding:10px 16px;background:var(--border);color:var(--text-primary,#f1f5f9);border:none;border-radius:8px;cursor:pointer">Cancel</button>
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

// Modal handlers
window._showNewPOModal = () => { document.getElementById('po-modal').style.display = 'flex'; };

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
    if (!data.supplier || !data.product) { showToast('Supplier and Product are required', 'warning'); return; }
    await API.post('/ops/data/purchase-orders', data);
    document.getElementById('po-modal').style.display = 'none';
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
