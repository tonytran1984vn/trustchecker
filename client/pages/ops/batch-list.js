/**
 * Ops – Batch List (Lifecycle State Machine)
 * ════════════════════════════════════════════
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const batches = [
        { id: 'B-2026-0892', sku: 'COFFEE-PRE-250', qty: 500, origin: 'HCM-01', dest: '—', status: 'active', created: '2 min ago' },
        { id: 'B-2026-0891', sku: 'TEA-ORG-100', qty: 1000, origin: 'HCM-01', dest: 'BKK-02', status: 'in_transit', created: '22 min ago' },
        { id: 'B-2026-0890', sku: 'OIL-COC-500', qty: 750, origin: 'DN-01', dest: 'SGN-01', status: 'completed', created: '1h ago' },
        { id: 'B-2026-0889', sku: 'SAUCE-FS-350', qty: 200, origin: 'HCM-02', dest: 'PNH-01', status: 'received', created: '3h ago' },
        { id: 'B-2026-0888', sku: 'NOODLE-RC-400', qty: 100, origin: 'HCM-01', dest: '—', status: 'recalled', created: '1d ago' },
        { id: 'B-2026-0887', sku: 'COFFEE-PRE-250', qty: 300, origin: 'DN-01', dest: 'SGN-02', status: 'in_transit', created: '1d ago' },
    ];

    const statusColors = { active: 'green', in_transit: 'blue', received: 'teal', completed: 'green', recalled: 'red', destroyed: 'red' };

    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('products', 28)} Batch List</h1>
        <div class="sa-title-actions">
          <button class="btn btn-primary btn-sm" onclick="navigate('ops-batch-create')">+ Create Batch</button>
        </div>
      </div>

      <!-- Status Summary -->
      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        <div class="sa-metric-card sa-metric-green"><div class="sa-metric-body"><div class="sa-metric-value">12</div><div class="sa-metric-label">Active</div></div></div>
        <div class="sa-metric-card sa-metric-blue"><div class="sa-metric-body"><div class="sa-metric-value">8</div><div class="sa-metric-label">In Transit</div></div></div>
        <div class="sa-metric-card sa-metric-teal"><div class="sa-metric-body"><div class="sa-metric-value">5</div><div class="sa-metric-label">Received</div></div></div>
        <div class="sa-metric-card sa-metric-green"><div class="sa-metric-body"><div class="sa-metric-value">142</div><div class="sa-metric-label">Completed</div></div></div>
        <div class="sa-metric-card sa-metric-red"><div class="sa-metric-body"><div class="sa-metric-value">1</div><div class="sa-metric-label">Recalled</div></div></div>
      </div>

      <div class="sa-card">
        <table class="sa-table">
          <thead>
            <tr><th>Batch ID</th><th>SKU</th><th>Qty</th><th>Origin</th><th>Destination</th><th>Status</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${batches.map(b => `
              <tr class="sa-row-clickable">
                <td><strong class="sa-code">${b.id}</strong></td>
                <td class="sa-code">${b.sku}</td>
                <td>${b.qty.toLocaleString()}</td>
                <td>${b.origin}</td>
                <td>${b.dest}</td>
                <td><span class="sa-status-pill sa-pill-${statusColors[b.status] || 'blue'}">${b.status.replace('_', ' ')}</span></td>
                <td style="color:var(--text-secondary)">${b.created}</td>
                <td>
                  <button class="btn btn-xs btn-outline">View</button>
                  ${b.status === 'active' ? '<button class="btn btn-xs btn-ghost">Transfer</button>' : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
