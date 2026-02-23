/**
 * Company Admin – Supply Chain Nodes
 * ═══════════════════════════════════
 * Real data from /api/scm/supply/routes
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { render } from '../../core/state.js';

let nodes = null, loading = false, filter = 'all';
window._caNodeFilter = (f) => { filter = f; render(); };

async function load() {
  if (loading) return; loading = true;
  try {
    const res = await API.get('/scm/supply/routes');
    const routes = Array.isArray(res) ? res : (res.routes || []);
    // Build unique nodes from route origins and destinations
    const nodeMap = {};
    routes.forEach(r => {
      if (r.origin && !nodeMap[r.origin]) nodeMap[r.origin] = { name: r.origin, type: guessType(r.origin), location: r.origin_location || '—', status: 'active', products: 0, lastSync: r.updated_at || r.created_at };
      if (r.destination && !nodeMap[r.destination]) nodeMap[r.destination] = { name: r.destination, type: guessType(r.destination), location: r.destination_location || '—', status: 'active', products: 0, lastSync: r.updated_at || r.created_at };
      // Alternatively, if raw routes have node-level data, use that
      if (r.node_name || r.name) {
        const n = r.node_name || r.name;
        nodeMap[n] = { name: n, type: r.type || r.node_type || guessType(n), location: r.location || '—', status: r.status || 'active', products: r.products || r.product_count || 0, lastSync: r.updated_at || r.created_at };
      }
    });
    nodes = Object.values(nodeMap);
    if (nodes.length === 0) nodes = routes; // fallback: use routes as-is
  } catch (e) { nodes = []; }
  loading = false;
}

function guessType(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('factory') || n.includes('plant')) return 'Factory';
  if (n.includes('warehouse') || n.includes('wh')) return 'Warehouse';
  if (n.includes('dist')) return 'Distributor';
  if (n.includes('retail') || n.includes('store')) return 'Retailer';
  return 'Node';
}

function timeAgo(d) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), dd = Math.floor(h / 24);
  if (m < 2) return 'Just now'; if (m < 60) return m + ' min ago'; if (h < 24) return h + 'h ago'; return dd + 'd ago';
}

export function renderPage() {
  if (!nodes && !loading) { load().then(() => render()); }
  if (loading && !nodes) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Supply Chain Nodes...</div></div>`;

  const list = nodes || [];
  const types = ['all', ...new Set(list.map(n => n.type || 'Node'))];
  const filtered = filter === 'all' ? list : list.filter(n => n.type === filter);

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('factory', 28)} Supply Chain Nodes</h1>
        <div class="sa-title-actions">
          <button class="btn btn-primary btn-sm" onclick="alert('Add Node form coming soon')">+ Add Node</button>
        </div>
      </div>

      <div class="sa-toolbar">
        <div class="sa-filters">
          ${types.map(t => `<button class="sa-filter-btn ${filter === t ? 'active' : ''}" onclick="_caNodeFilter('${t}')">${t === 'all' ? 'All' : t} <span class="sa-filter-count">${t === 'all' ? list.length : list.filter(n => n.type === t).length}</span></button>`).join('')}
        </div>
        <input class="sa-search-input" placeholder="Search nodes..." />
      </div>

      <div class="sa-card">
        ${filtered.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--text-muted)">No nodes found</div>' : `
        <table class="sa-table">
          <thead>
            <tr>
              <th>Node Name</th><th>Type</th><th>Location</th><th>Products</th><th>Status</th><th>Last Activity</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(n => `
              <tr class="sa-row-clickable">
                <td><strong>${n.name}</strong></td>
                <td><span class="sa-plan-badge sa-plan-${n.type === 'Factory' ? 'enterprise' : n.type === 'Warehouse' ? 'pro' : n.type === 'Distributor' ? 'core' : 'free'}">${n.type}</span></td>
                <td>${n.location}</td>
                <td class="sa-code">${(n.products || 0).toLocaleString()}</td>
                <td><span class="sa-status-pill sa-pill-${n.status === 'active' ? 'green' : n.status === 'warning' ? 'orange' : 'red'}">${n.status}</span></td>
                <td style="color:var(--text-secondary)">${timeAgo(n.lastSync)}</td>
                <td>
                  <button class="btn btn-xs btn-outline">View</button>
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
