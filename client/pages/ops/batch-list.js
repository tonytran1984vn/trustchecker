/**
 * Ops – Batch List
 * Reads from workspace cache (_opsProdCache.batches) — prefetched from /scm/batches
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
  const cache = window._opsProdCache || {};
  const raw = cache.batches?.batches || [];

  const statusColors = { created: 'blue', active: 'green', in_transit: 'orange', delivered: 'teal', quarantined: 'red', expired: 'gray' };
  const batches = raw.slice(0, 20).map(b => ({
    id: b.batch_number || b.id?.slice(0, 12) || '—',
    product: b.product_name || b.product_id?.slice(0, 12) || '—',
    qty: (b.quantity || 0).toLocaleString(),
    origin: b.origin_facility || '—',
    status: b.status || 'created',
    created: b.created_at ? new Date(b.created_at).toLocaleDateString() : '—',
  }));

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('products', 28)} Batch Registry${batches.length ? ` <span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400">(${batches.length})</span>` : ''}</h1>
        <div class="sa-title-actions">
          <button class="btn btn-primary btn-sm" onclick="window._wsSwitch('ops-production','create')">+ Create Batch</button>
        </div>
      </div>

      ${batches.length === 0 ? '<div class="sa-card" style="padding:2rem;text-align:center;color:var(--text-secondary)">No batches found. Create your first batch.</div>' : `
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>Batch ID</th><th>Product</th><th>Quantity</th><th>Origin</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            ${batches.map(b => `
              <tr>
                <td><strong class="sa-code">${b.id}</strong></td>
                <td>${b.product}</td>
                <td style="text-align:right">${b.qty}</td>
                <td style="font-size:0.78rem">${b.origin}</td>
                <td><span class="sa-status-pill sa-pill-${statusColors[b.status] || 'blue'}">${b.status.replace('_', ' ')}</span></td>
                <td style="color:var(--text-secondary)">${b.created}</td>
                <td>
                  <button class="btn btn-xs btn-outline" onclick="showToast('📦 Viewing batch ${b.id}','info')">View</button>
                  ${b.status === 'active' ? '<button class="btn btn-xs btn-ghost" onclick="navigate(\'ops-logistics\')">🚚 Transfer</button>' : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    </div>
  `;
}
