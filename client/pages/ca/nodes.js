/**
 * Company Admin – Supply Chain Nodes
 * ═══════════════════════════════════
 * Extracts unique nodes from supply routes chain data
 * API: GET /api/scm/supply/routes, POST /api/scm/supply/routes
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let nodes = null, loading = false, filter = 'all';

window._caNodeFilter = (f) => {
  filter = f;
  const el = document.getElementById('nodes-root');
  if (el) el.innerHTML = renderContent();
};

window._caAddNode = () => {
  const modal = document.getElementById('add-node-modal');
  if (modal) modal.style.display = 'flex';
};

window._caCloseNodeModal = () => {
  const modal = document.getElementById('add-node-modal');
  if (modal) modal.style.display = 'none';
};

window._caSubmitNode = async () => {
  const name = document.getElementById('node-name')?.value?.trim();
  const type = document.getElementById('node-type')?.value;
  const location = document.getElementById('node-location')?.value?.trim();
  if (!name) return alert('Node name is required');

  try {
    const routeName = `${name} Node Route`;
    await API.post('/scm/supply/routes', {
      name: routeName,
      chain: [{ type: type || 'checkpoint', location: location || name, node_name: name }],
      products: [],
      status: 'active'
    });
    // Reload
    nodes = null;
    loading = false;
    window._caCloseNodeModal();
    load();
  } catch (e) {
    alert('Failed to add node: ' + (e.message || 'Unknown error'));
  }
};

async function load() {
  if (loading) return; loading = true;
  try {
    const res = await API.get('/scm/supply/routes');
    const routes = Array.isArray(res) ? res : (res.routes || []);
    const nodeMap = {};

    routes.forEach(r => {
      // Parse chain - extract all nodes from chain array
      const chain = Array.isArray(r.chain) ? r.chain : [];
      chain.forEach((node, idx) => {
        const nodeName = node.node_name || node.name || node.location || `${r.name} - Stop ${idx + 1}`;
        if (!nodeMap[nodeName]) {
          nodeMap[nodeName] = {
            name: nodeName,
            type: guessType(node.type || nodeName),
            location: node.location || node.city || '—',
            status: r.status || 'active',
            products: 0,
            routeName: r.name,
            lastSync: r.updated_at || r.created_at
          };
        }
      });

      // Also extract from route-level node fields
      if (r.node_name || r.origin || r.destination) {
        if (r.origin && !nodeMap[r.origin]) {
          nodeMap[r.origin] = { name: r.origin, type: guessType(r.origin), location: r.origin, status: 'active', products: 0, routeName: r.name, lastSync: r.updated_at || r.created_at };
        }
        if (r.destination && !nodeMap[r.destination]) {
          nodeMap[r.destination] = { name: r.destination, type: guessType(r.destination), location: r.destination, status: 'active', products: 0, routeName: r.name, lastSync: r.updated_at || r.created_at };
        }
      }

      // Count products per route
      const prods = Array.isArray(r.products) ? r.products : [];
      chain.forEach(node => {
        const key = node.node_name || node.name || node.location;
        if (key && nodeMap[key]) nodeMap[key].products += prods.length;
      });
    });

    nodes = Object.values(nodeMap);
  } catch (e) { nodes = []; }
  loading = false;
  setTimeout(() => {
    const el = document.getElementById('nodes-root');
    if (el) el.innerHTML = renderContent();
  }, 50);
}

function guessType(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('factory') || n.includes('plant') || n.includes('manufacturer')) return 'Factory';
  if (n.includes('warehouse') || n.includes('wh') || n.includes('storage')) return 'Warehouse';
  if (n.includes('dist') || n.includes('hub') || n.includes('port')) return 'Distributor';
  if (n.includes('retail') || n.includes('store') || n.includes('shop')) return 'Retailer';
  if (n.includes('farm') || n.includes('dalat') || n.includes('mekong')) return 'Farm';
  if (n.includes('checkpoint') || n.includes('customs') || n.includes('zone')) return 'Checkpoint';
  return 'Node';
}

function timeAgo(d) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), dd = Math.floor(h / 24);
  if (m < 2) return 'Just now'; if (m < 60) return m + ' min ago'; if (h < 24) return h + 'h ago'; return dd + 'd ago';
}

function typeIcon(type) {
  const icons = { Factory: '🏭', Warehouse: '📦', Distributor: '🚛', Retailer: '🏪', Farm: '🌿', Checkpoint: '🔍' };
  return icons[type] || '📍';
}

function renderContent() {
  if (loading && !nodes) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Supply Chain Nodes...</div></div>`;

  const list = nodes || [];
  const types = ['all', ...new Set(list.map(n => n.type || 'Node'))];
  const filtered = filter === 'all' ? list : list.filter(n => n.type === filter);

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('factory', 28)} Supply Chain Nodes</h1>
        <div class="sa-title-actions">
          <button class="btn btn-primary btn-sm" onclick="_caAddNode()">+ Add Node</button>
        </div>
      </div>

      <div class="sa-toolbar">
        <div class="sa-filters">
          ${types.map(t => `<button class="sa-filter-btn ${filter === t ? 'active' : ''}" style="${filter === t ? 'color:#1e293b;background:#fef3c7;border-color:#f59e0b' : 'color:#fff;background:#475569;border-color:#475569'}" onclick="_caNodeFilter('${t}')">${t === 'all' ? 'All' : t} <span class="sa-filter-count">${t === 'all' ? list.length : list.filter(n => n.type === t).length}</span></button>`).join('')}
        </div>
        <input class="sa-search-input" placeholder="Search nodes..." oninput="window._caNodeSearch && window._caNodeSearch(this.value)" />
      </div>

      <div class="sa-card">
        ${filtered.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--text-muted)">No nodes found. Click "+ Add Node" to create your first supply chain node.</div>' : `
        <table class="sa-table">
          <thead>
            <tr>
              <th>Node Name</th><th>Type</th><th>Location</th><th>Route</th><th>Products</th><th>Status</th><th>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(n => `
              <tr class="sa-row-clickable">
                <td><strong>${typeIcon(n.type)} ${n.name}</strong></td>
                <td><span class="sa-plan-badge sa-plan-${n.type === 'Factory' ? 'enterprise' : n.type === 'Warehouse' ? 'pro' : n.type === 'Distributor' ? 'core' : n.type === 'Farm' ? 'core' : 'free'}">${n.type}</span></td>
                <td>${n.location}</td>
                <td style="color:var(--text-secondary);font-size:0.78rem">${n.routeName || '—'}</td>
                <td class="sa-code">${(n.products || 0).toLocaleString()}</td>
                <td><span class="sa-status-pill sa-pill-${n.status === 'active' ? 'green' : n.status === 'warning' ? 'orange' : 'red'}">${n.status}</span></td>
                <td style="color:var(--text-secondary)">${timeAgo(n.lastSync)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`}
      </div>
    </div>

    <!-- Add Node Modal -->
    <div id="add-node-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center">
      <div style="background:var(--surface-primary,#fff);border-radius:12px;padding:24px;width:420px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="margin:0;color:var(--text-primary,#1e293b)">Add Supply Chain Node</h3>
          <button onclick="_caCloseNodeModal()" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--text-secondary,#94a3b8)">✕</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px">Node Name *</label>
            <input id="node-name" type="text" placeholder="e.g. Hanoi Distribution Center" style="width:100%;padding:8px 12px;border:1px solid var(--border-primary,#e2e8f0);border-radius:8px;font-size:0.85rem;box-sizing:border-box" />
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px">Node Type</label>
            <select id="node-type" style="width:100%;padding:8px 12px;border:1px solid var(--border-primary,#e2e8f0);border-radius:8px;font-size:0.85rem;box-sizing:border-box">
              <option value="checkpoint">Checkpoint</option>
              <option value="factory">Factory</option>
              <option value="warehouse">Warehouse</option>
              <option value="distributor">Distributor</option>
              <option value="retailer">Retailer</option>
              <option value="farm">Farm / Source</option>
            </select>
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px">Location</label>
            <input id="node-location" type="text" placeholder="e.g. Hanoi, Vietnam" style="width:100%;padding:8px 12px;border:1px solid var(--border-primary,#e2e8f0);border-radius:8px;font-size:0.85rem;box-sizing:border-box" />
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
          <button onclick="_caCloseNodeModal()" class="btn btn-sm btn-outline">Cancel</button>
          <button onclick="_caSubmitNode()" class="btn btn-sm btn-primary">Create Node</button>
        </div>
      </div>
    </div>
  `;
}

export function renderPage() {
  if (!nodes && !loading) load();
  return `<div id="nodes-root">${renderContent()}</div>`;
}
