/**
 * Company Admin – Batch Management
 * ══════════════════════════════════
 * Create, transfer, split/merge, destroy/recall batches
 */
import { icon } from '../../core/icons.js';

let filter = 'all';
window._caBatchFilter = (f) => { filter = f; window.render(); };

export function renderPage() {
    const batches = [
        { id: 'BATCH-2026-0142', product: 'Premium Coffee 250g', qty: 2400, from: 'Factory HCM-01', to: 'Warehouse DN-02', status: 'in-transit', created: '2026-02-18' },
        { id: 'BATCH-2026-0141', product: 'Green Tea Organic 100g', qty: 5000, from: 'Factory HN-02', to: 'Dist. SG-01', status: 'delivered', created: '2026-02-17' },
        { id: 'BATCH-2026-0140', product: 'Coconut Oil 500ml', qty: 1200, from: 'Warehouse DN-02', to: 'Retail BKK-03', status: 'pending', created: '2026-02-17' },
        { id: 'BATCH-2026-0139', product: 'Rice Noodle 1kg', qty: 8000, from: 'Factory HCM-01', to: 'Warehouse DN-02', status: 'delivered', created: '2026-02-16' },
        { id: 'BATCH-2026-0138', product: 'Fish Sauce 250ml', qty: 3000, from: 'Factory HCM-01', to: 'Dist. SG-01', status: 'recalled', created: '2026-02-15' },
    ];

    const filtered = filter === 'all' ? batches : batches.filter(b => b.status === filter);
    const counts = { all: batches.length, pending: 1, 'in-transit': 1, delivered: 2, recalled: 1 };

    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('clipboard', 28)} Batch Management</h1>
        <div class="sa-title-actions">
          <button class="btn btn-primary btn-sm">+ Create Batch</button>
          <button class="btn btn-outline btn-sm">Import CSV</button>
        </div>
      </div>

      <div class="sa-toolbar">
        <div class="sa-filters">
          ${['all', 'pending', 'in-transit', 'delivered', 'recalled'].map(f =>
        `<button class="sa-filter-btn ${filter === f ? 'active' : ''}" onclick="_caBatchFilter('${f}')">${f.charAt(0).toUpperCase() + f.slice(1)} <span class="sa-filter-count">${counts[f] || 0}</span></button>`
    ).join('')}
        </div>
      </div>

      <div class="sa-card">
        <table class="sa-table">
          <thead>
            <tr><th>Batch ID</th><th>Product</th><th>Qty</th><th>From</th><th>To</th><th>Status</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${filtered.map(b => `
              <tr class="sa-row-clickable">
                <td><strong class="sa-code">${b.id}</strong></td>
                <td>${b.product}</td>
                <td class="sa-code">${b.qty.toLocaleString()}</td>
                <td>${b.from}</td>
                <td>${b.to}</td>
                <td><span class="sa-status-pill sa-pill-${b.status === 'delivered' ? 'green' : b.status === 'in-transit' ? 'blue' : b.status === 'pending' ? 'orange' : 'red'}">${b.status}</span></td>
                <td style="color:var(--text-secondary)">${b.created}</td>
                <td>
                  <button class="btn btn-xs btn-outline">Transfer</button>
                  <button class="btn btn-xs btn-ghost">⋯</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
