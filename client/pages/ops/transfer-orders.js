/**
 * Ops – Transfer Orders
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const orders = [
        { id: 'T-4521', batch: 'B-2026-0892', from: 'HCM-01', to: 'SGN-01', qty: 200, shipment: 'SH-2026-1102', status: 'delivered', created: '8 min ago' },
        { id: 'T-4520', batch: 'B-2026-0891', from: 'HCM-01', to: 'BKK-02', qty: 1000, shipment: 'SH-2026-1101', status: 'in_transit', created: '22 min ago' },
        { id: 'T-4519', batch: 'B-2026-0889', from: 'HCM-02', to: 'PNH-01', qty: 200, shipment: 'SH-2026-1100', status: 'in_transit', created: '3h ago' },
        { id: 'T-4518', batch: 'B-2026-0887', from: 'DN-01', to: 'SGN-02', qty: 300, shipment: 'SH-2026-1099', status: 'pending', created: '1d ago' },
        { id: 'T-4517', batch: 'B-2026-0885', from: 'HCM-01', to: 'HN-01', qty: 500, shipment: 'SH-2026-1098', status: 'delivered', created: '2d ago' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('network', 28)} Transfer Orders</h1>
        <div class="sa-title-actions">
          <button class="btn btn-primary btn-sm">+ Create Transfer</button>
        </div>
      </div>

      <div class="sa-card">
        <table class="sa-table">
          <thead>
            <tr><th>Transfer ID</th><th>Batch</th><th>From</th><th>To</th><th>Qty</th><th>Shipment</th><th>Status</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr class="sa-row-clickable">
                <td><strong class="sa-code">${o.id}</strong></td>
                <td class="sa-code">${o.batch}</td>
                <td>${o.from}</td>
                <td>${o.to}</td>
                <td>${o.qty}</td>
                <td class="sa-code">${o.shipment}</td>
                <td><span class="sa-status-pill sa-pill-${o.status === 'delivered' ? 'green' : o.status === 'in_transit' ? 'blue' : 'orange'}">${o.status.replace('_', ' ')}</span></td>
                <td style="color:var(--text-secondary)">${o.created}</td>
                <td><button class="btn btn-xs btn-outline">Track</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
