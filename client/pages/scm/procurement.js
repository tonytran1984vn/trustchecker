/**
 * SCM – Procurement & Purchase Order Management
 * Enterprise: PO lifecycle, supplier bids, contract terms, spend analytics
 */
import { icon } from '../../core/icons.js';

const PO_LIST = [
    { id: 'PO-2026-0451', supplier: 'Golden Beans Co. (VN)', product: 'Arabica Coffee Raw', qty: '50,000 kg', unitPrice: '$4.20/kg', total: '$210,000', delivery: '2026-03-05', status: 'approved', payment: 'NET-30', contract: 'MC-2025-012' },
    { id: 'PO-2026-0450', supplier: 'Ceylon Leaf Ltd (LK)', product: 'Organic Green Tea', qty: '20,000 kg', unitPrice: '$8.50/kg', total: '$170,000', delivery: '2026-03-12', status: 'in_transit', payment: 'LC', contract: 'MC-2025-008' },
    { id: 'PO-2026-0449', supplier: 'NZ Manuka Inc (NZ)', product: 'Manuka Honey UMF15+', qty: '5,000 kg', unitPrice: '$45.00/kg', total: '$225,000', delivery: '2026-03-20', status: 'pending_approval', payment: 'TT', contract: 'MC-2025-015' },
    { id: 'PO-2026-0448', supplier: 'Pacific Pack (TH)', product: 'Premium Gift Box', qty: '100,000 pcs', unitPrice: '$1.80/pc', total: '$180,000', delivery: '2026-02-28', status: 'delivered', payment: 'NET-45', contract: 'MC-2025-020' },
    { id: 'PO-2026-0445', supplier: 'Golden Beans Co. (VN)', product: 'Robusta Coffee Raw', qty: '30,000 kg', unitPrice: '$2.80/kg', total: '$84,000', delivery: '2026-02-25', status: 'delivered', payment: 'NET-30', contract: 'MC-2025-012' },
];

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
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('clipboard', 28)} Procurement</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ New Purchase Order</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Active POs', '12', '3 pending approval', 'blue', 'clipboard')}
        ${m('MTD Spend', '$869K', '+8% vs plan', 'green', 'creditCard')}
        ${m('On-Time Delivery', '94.2%', 'Target: >95%', 'orange', 'clock')}
        ${m('Active Contracts', CONTRACTS.length.toString(), '$2.78M annual value', 'green', 'scroll')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📋 Purchase Orders</h3>
        <table class="sa-table"><thead><tr><th>PO #</th><th>Supplier</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Delivery</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${PO_LIST.map(p => {
        const color = p.status === 'delivered' ? 'green' : p.status === 'approved' ? 'blue' : p.status === 'in_transit' ? 'orange' : 'red';
        return `<tr class="${p.status === 'pending_approval' ? 'ops-alert-row' : ''}">
              <td class="sa-code" style="font-weight:600">${p.id}</td>
              <td><strong>${p.supplier}</strong></td>
              <td style="font-size:0.82rem">${p.product}</td>
              <td style="text-align:right">${p.qty}</td>
              <td class="sa-code" style="font-size:0.78rem">${p.unitPrice}</td>
              <td style="font-weight:700">${p.total}</td>
              <td class="sa-code" style="font-size:0.78rem">${p.delivery}</td>
              <td style="font-size:0.72rem">${p.payment}</td>
              <td><span class="sa-status-pill sa-pill-${color}">${p.status.replace('_', ' ')}</span></td>
              <td>${p.status === 'pending_approval' ? '<button class="btn btn-xs btn-primary">Approve</button>' : '<button class="btn btn-xs btn-ghost">View</button>'}</td>
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
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
