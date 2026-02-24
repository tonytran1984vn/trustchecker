/**
 * Company Admin – Batch Management
 * ══════════════════════════════════
 * Real data from /api/scm/batches
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let batches = null, loading = false, filter = 'all';
export function renderPage() {
  return `<div id="batches-root">${renderContent()}</div>`;
}

window._caBatchFilter = (f) => { filter = f; { const _el = document.getElementById('batches-root'); if (_el) _el.innerHTML = renderContent ? renderContent() : ''; } };

async function load() {
  if (loading) return; loading = true;
  try {
    const res = await API.get('/scm/batches');
    batches = Array.isArray(res) ? res : (res.batches || []);
  } catch (e) { batches = []; }
  loading = false;
  setTimeout(() => { const el = document.getElementById('batches-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
}

function renderContent() {
  if (!batches && !loading) { load(); }
  if (loading && !batches) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Batches...</div></div>`;

  const list = batches || [];
  const filtered = filter === 'all' ? list : list.filter(b => b.status === filter);
  const statuses = ['all', 'pending', 'in-transit', 'delivered', 'recalled'];
  const counts = {};
  statuses.forEach(s => { counts[s] = s === 'all' ? list.length : list.filter(b => b.status === s).length; });

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
          ${statuses.map(f => `<button class="sa-filter-btn ${filter === f ? 'active' : ''}" onclick="_caBatchFilter('${f}')">${f.charAt(0).toUpperCase() + f.slice(1)} <span class="sa-filter-count">${counts[f] || 0}</span></button>`).join('')}
        </div>
      </div>

      <div class="sa-card">
        ${filtered.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--text-muted)">No batches found</div>' : `
        <table class="sa-table">
          <thead>
            <tr><th>Batch ID</th><th>Product</th><th>Qty</th><th>Origin</th><th>Destination</th><th>Status</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${filtered.map(b => `
              <tr class="sa-row-clickable">
                <td><strong class="sa-code">${b.batch_code || b.id}</strong></td>
                <td>${b.product_name || b.product || '—'}</td>
                <td class="sa-code">${(b.quantity || 0).toLocaleString()}</td>
                <td>${b.origin || b.from || '—'}</td>
                <td>${b.destination || b.to || '—'}</td>
                <td><span class="sa-status-pill sa-pill-${b.status === 'delivered' ? 'green' : b.status === 'in-transit' || b.status === 'in_transit' ? 'blue' : b.status === 'pending' ? 'orange' : 'red'}">${b.status}</span></td>
                <td style="color:var(--text-secondary)">${b.created_at ? new Date(b.created_at).toLocaleDateString('en-US') : '—'}</td>
                <td>
                  <button class="btn btn-xs btn-outline">Transfer</button>
                  <button class="btn btn-xs btn-ghost">⋯</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`}
      </div>
    </div>
  `;
}
