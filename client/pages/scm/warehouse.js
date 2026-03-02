/**
 * SCM – Warehouse Management (Multi-location)
 * Enterprise: stock levels, inter-warehouse transfers, location tracking, picking/packing
 */
import { icon } from '../../core/icons.js';

const WAREHOUSES = [
  { id: 'WH-HCM-01', name: 'Ho Chi Minh DC', region: 'VN-South', capacity: 50000, used: 38500, utilization: '77%', skus: 45, temp: '22°C', status: 'operational', inbound: 3, outbound: 8 },
  { id: 'WH-HN-02', name: 'Hanoi Warehouse', region: 'VN-North', capacity: 30000, used: 24200, utilization: '80.7%', skus: 38, temp: '20°C', status: 'operational', inbound: 2, outbound: 5 },
  { id: 'WH-SG-01', name: 'Singapore Hub', region: 'APAC', capacity: 80000, used: 52000, utilization: '65%', skus: 52, temp: '18°C', status: 'operational', inbound: 5, outbound: 12 },
  { id: 'WH-BKK-01', name: 'Bangkok DC', region: 'Thailand', capacity: 20000, used: 18400, utilization: '92%', skus: 28, temp: '24°C', status: 'near_capacity', inbound: 1, outbound: 3 },
];

const TRANSFERS = [
  { id: 'TRF-2026-089', from: 'WH-SG-01', to: 'WH-BKK-01', product: 'Coffee Blend (Arabica)', qty: '5,000 units', status: 'in_transit', eta: '2026-02-21', carrier: 'DHL Express' },
  { id: 'TRF-2026-088', from: 'WH-HCM-01', to: 'WH-SG-01', product: 'Organic Tea 200g', qty: '3,000 units', status: 'delivered', eta: '2026-02-18', carrier: 'Kerry Logistics' },
  { id: 'TRF-2026-087', from: 'WH-SG-01', to: 'WH-HN-02', product: 'Manuka Honey Gift Set', qty: '1,200 units', status: 'pending_pickup', eta: '2026-02-23', carrier: 'Ninja Van' },
];

const LOW_STOCK_ALERTS = [
  { sku: 'ACME-CFE-001', product: 'Premium Coffee Blend', warehouse: 'WH-BKK-01', current: 450, reorderPoint: 500, safetyStock: 200, daysOfSupply: 3, status: 'critical' },
  { sku: 'ACME-TEA-003', product: 'Organic Green Tea', warehouse: 'WH-HN-02', current: 820, reorderPoint: 800, safetyStock: 400, daysOfSupply: 7, status: 'warning' },
  { sku: 'ACME-HNY-002', product: 'Manuka Honey UMF10+', warehouse: 'WH-SG-01', current: 180, reorderPoint: 300, safetyStock: 100, daysOfSupply: 5, status: 'critical' },
];

export function renderPage() {
  const totalCap = WAREHOUSES.reduce((s, w) => s + w.capacity, 0);
  const totalUsed = WAREHOUSES.reduce((s, w) => s + w.used, 0);
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('building', 28)} Warehouse Management</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm" onclick="showToast('Navigate to Logistics → Transfer Orders to create a new transfer','info');navigate('ops-logistics')">+ New Transfer</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Warehouses', WAREHOUSES.length.toString(), `${WAREHOUSES.filter(w => w.status === 'operational').length} operational`, 'blue', 'building')}
        ${m('Total Capacity', totalCap.toLocaleString(), `${totalUsed.toLocaleString()} used (${Math.round(totalUsed / totalCap * 100)}%)`, 'green', 'products')}
        ${m('Active Transfers', TRANSFERS.filter(t => t.status !== 'delivered').length.toString(), `${TRANSFERS.length} total this week`, 'blue', 'network')}
        ${m('Low Stock Alerts', LOW_STOCK_ALERTS.length.toString(), `${LOW_STOCK_ALERTS.filter(a => a.status === 'critical').length} critical`, 'red', 'alertTriangle')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🏭 Warehouse Network</h3>
        <table class="sa-table"><thead><tr><th>ID</th><th>Warehouse</th><th>Region</th><th>Capacity</th><th>Used</th><th>Utilization</th><th>SKUs</th><th>Temp</th><th>Inbound</th><th>Outbound</th><th>Status</th></tr></thead><tbody>
          ${WAREHOUSES.map(w => {
    const pct = parseInt(w.utilization);
    const color = pct > 90 ? 'red' : pct > 75 ? 'orange' : 'green';
    return `<tr class="${w.status === 'near_capacity' ? 'ops-alert-row' : ''}">
              <td class="sa-code">${w.id}</td><td><strong>${w.name}</strong></td><td>${w.region}</td>
              <td style="text-align:right">${w.capacity.toLocaleString()}</td>
              <td style="text-align:right">${w.used.toLocaleString()}</td>
              <td>
                <div style="display:flex;align-items:center;gap:0.5rem">
                  <div style="flex:1;height:6px;background:var(--border);border-radius:3px"><div style="height:100%;width:${pct}%;background:${color === 'red' ? '#ef4444' : color === 'orange' ? '#f59e0b' : '#22c55e'};border-radius:3px"></div></div>
                  <span style="font-weight:600;font-size:0.78rem;color:${color === 'red' ? '#ef4444' : color === 'orange' ? '#f59e0b' : '#22c55e'}">${w.utilization}</span>
                </div>
              </td>
              <td style="text-align:center">${w.skus}</td><td class="sa-code">${w.temp}</td>
              <td style="text-align:center;color:#3b82f6">${w.inbound}</td>
              <td style="text-align:center;color:#f59e0b">${w.outbound}</td>
              <td><span class="sa-status-pill sa-pill-${w.status === 'operational' ? 'green' : 'orange'}">${w.status.replace('_', ' ')}</span></td>
            </tr>`;
  }).join('')}
        </tbody></table>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
        <div class="sa-card">
          <h3>🔄 Inter-Warehouse Transfers</h3>
          <table class="sa-table"><thead><tr><th>ID</th><th>Route</th><th>Product</th><th>Qty</th><th>Carrier</th><th>ETA</th><th>Status</th></tr></thead><tbody>
            ${TRANSFERS.map(t => `<tr>
              <td class="sa-code">${t.id}</td>
              <td style="font-size:0.72rem">${t.from} → ${t.to}</td>
              <td style="font-size:0.82rem">${t.product}</td>
              <td>${t.qty}</td><td style="font-size:0.78rem">${t.carrier}</td>
              <td class="sa-code" style="font-size:0.78rem">${t.eta}</td>
              <td><span class="sa-status-pill sa-pill-${t.status === 'delivered' ? 'green' : t.status === 'in_transit' ? 'orange' : 'blue'}">${t.status.replace('_', ' ')}</span></td>
            </tr>`).join('')}
          </tbody></table>
        </div>
        <div class="sa-card">
          <h3><span class="status-icon status-warn" aria-label="Warning">!</span> Low Stock Alerts</h3>
          <table class="sa-table"><thead><tr><th>SKU</th><th>Product</th><th>Warehouse</th><th>Current</th><th>Reorder</th><th>Days</th><th>Status</th></tr></thead><tbody>
            ${LOW_STOCK_ALERTS.map(a => `<tr class="${a.status === 'critical' ? 'ops-alert-row' : ''}">
              <td class="sa-code" style="font-size:0.72rem">${a.sku}</td><td><strong>${a.product}</strong></td>
              <td>${a.warehouse}</td>
              <td style="font-weight:700;color:${a.status === 'critical' ? '#ef4444' : '#f59e0b'}">${a.current}</td>
              <td>${a.reorderPoint}</td>
              <td style="font-weight:700;color:${a.daysOfSupply < 5 ? '#ef4444' : '#f59e0b'}">${a.daysOfSupply}d</td>
              <td><span class="sa-status-pill sa-pill-${a.status === 'critical' ? 'red' : 'orange'}">${a.status}</span></td>
            </tr>`).join('')}
          </tbody></table>
        </div>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
