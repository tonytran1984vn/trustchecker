/**
 * Company Admin – Supply Chain Nodes
 * ═══════════════════════════════════
 * Factory, Warehouse, Distributor, Retailer management
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const nodes = [
        { name: 'Factory HCM-01', type: 'Factory', location: 'Ho Chi Minh City, VN', status: 'active', products: 342, lastSync: '2 min ago' },
        { name: 'Warehouse DN-02', type: 'Warehouse', location: 'Da Nang, VN', status: 'active', products: 1204, lastSync: '5 min ago' },
        { name: 'Dist. SG-01', type: 'Distributor', location: 'Singapore', status: 'active', products: 867, lastSync: '12 min ago' },
        { name: 'Retail BKK-03', type: 'Retailer', location: 'Bangkok, TH', status: 'warning', products: 156, lastSync: '1h ago' },
        { name: 'Factory HN-02', type: 'Factory', location: 'Hanoi, VN', status: 'active', products: 521, lastSync: '8 min ago' },
        { name: 'Warehouse SG-01', type: 'Warehouse', location: 'Singapore', status: 'offline', products: 0, lastSync: '3d ago' },
    ];

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
          <button class="sa-filter-btn active">All <span class="sa-filter-count">${nodes.length}</span></button>
          <button class="sa-filter-btn">Factory</button>
          <button class="sa-filter-btn">Warehouse</button>
          <button class="sa-filter-btn">Distributor</button>
          <button class="sa-filter-btn">Retailer</button>
        </div>
        <input class="sa-search-input" placeholder="Search nodes..." />
      </div>

      <div class="sa-card">
        <table class="sa-table">
          <thead>
            <tr>
              <th>Node Name</th>
              <th>Type</th>
              <th>Location</th>
              <th>Products</th>
              <th>Status</th>
              <th>Last Sync</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${nodes.map(n => `
              <tr class="sa-row-clickable">
                <td><strong>${n.name}</strong></td>
                <td><span class="sa-plan-badge sa-plan-${n.type === 'Factory' ? 'enterprise' : n.type === 'Warehouse' ? 'pro' : n.type === 'Distributor' ? 'core' : 'free'}">${n.type}</span></td>
                <td>${n.location}</td>
                <td class="sa-code">${n.products.toLocaleString()}</td>
                <td><span class="sa-status-pill sa-pill-${n.status === 'active' ? 'green' : n.status === 'warning' ? 'orange' : 'red'}">${n.status}</span></td>
                <td style="color:var(--text-secondary)">${n.lastSync}</td>
                <td>
                  <button class="btn btn-xs btn-outline">View</button>
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
