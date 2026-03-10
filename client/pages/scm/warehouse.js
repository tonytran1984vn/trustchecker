/**
 * SCM – Warehouse Management (Multi-location)
 * Data from PostgreSQL via /api/ops/data/warehouses + /api/scm/inventory/alerts
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

let _data = null;

export function renderPage() {
  if (!_data) { loadData(); return loading(); }
  const { warehouses, transfers, alerts } = _data;
  const totalCap = warehouses.reduce((s, w) => s + (w.capacity || 0), 0);
  const totalUsed = warehouses.reduce((s, w) => s + (w.used_capacity || w.used || 0), 0);
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('building', 28)} Warehouse Management</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm" onclick="navigate('ops-logistics')">+ New Transfer</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Warehouses', warehouses.length.toString(), `${warehouses.filter(w => w.status === 'operational').length} operational`, 'blue', 'building')}
        ${m('Total Capacity', totalCap.toLocaleString(), `${totalUsed.toLocaleString()} used (${totalCap > 0 ? Math.round(totalUsed / totalCap * 100) : 0}%)`, 'green', 'products')}
        ${m('Active Transfers', transfers.filter(t => t.status !== 'delivered').length.toString(), `${transfers.length} total`, 'blue', 'network')}
        ${m('Low Stock Alerts', alerts.length.toString(), `${alerts.filter(a => a.severity === 'critical').length} critical`, 'red', 'alertTriangle')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🏭 Warehouse Network</h3>
        ${warehouses.length === 0 ? '<div style="text-align:center;padding:2rem;color:var(--text-secondary)">No warehouses configured</div>' : `
        <table class="sa-table"><thead><tr><th>ID</th><th>Warehouse</th><th>Region</th><th>Capacity</th><th>Used</th><th>Utilization</th><th>SKUs</th><th>Temp</th><th>Inbound</th><th>Outbound</th><th>Status</th></tr></thead><tbody>
          ${warehouses.map(w => {
    const pct = totalCap > 0 && w.capacity > 0 ? Math.round((w.used_capacity || w.used || 0) / w.capacity * 100) : 0;
    const color = pct > 90 ? 'red' : pct > 75 ? 'orange' : 'green';
    return `<tr class="${pct > 90 ? 'ops-alert-row' : ''}">
              <td class="sa-code">${w.id || w.warehouse_id || '—'}</td><td><strong>${w.name || '—'}</strong></td><td>${w.region || '—'}</td>
              <td style="text-align:right">${(w.capacity || 0).toLocaleString()}</td>
              <td style="text-align:right">${(w.used_capacity || w.used || 0).toLocaleString()}</td>
              <td>
                <div style="display:flex;align-items:center;gap:0.5rem">
                  <div style="flex:1;height:6px;background:var(--border);border-radius:3px"><div style="height:100%;width:${pct}%;background:${color === 'red' ? '#ef4444' : color === 'orange' ? '#f59e0b' : '#22c55e'};border-radius:3px"></div></div>
                  <span style="font-weight:600;font-size:0.78rem;color:${color === 'red' ? '#ef4444' : color === 'orange' ? '#f59e0b' : '#22c55e'}">${pct}%</span>
                </div>
              </td>
              <td style="text-align:center">${w.skus || 0}</td><td class="sa-code">${w.temp || '—'}</td>
              <td style="text-align:center;color:#3b82f6">${w.inbound || 0}</td>
              <td style="text-align:center;color:#f59e0b">${w.outbound || 0}</td>
              <td><span class="sa-status-pill sa-pill-${(w.status || 'operational') === 'operational' ? 'green' : 'orange'}">${(w.status || 'operational').replace('_', ' ')}</span></td>
            </tr>`;
  }).join('')}
        </tbody></table>`}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
        <div class="sa-card">
          <h3>🔄 Inter-Warehouse Transfers</h3>
          ${transfers.length === 0 ? '<div style="text-align:center;padding:2rem;color:var(--text-secondary)">No active transfers</div>' : `
          <table class="sa-table"><thead><tr><th>ID</th><th>Route</th><th>Product</th><th>Qty</th><th>Carrier</th><th>ETA</th><th>Status</th></tr></thead><tbody>
            ${transfers.map(t => `<tr>
              <td class="sa-code">${t.id || t.tracking_number || '—'}</td>
              <td style="font-size:0.72rem">${t.from_name || t.from_location || t.from || '?'} → ${t.to_name || t.to_location || t.to || '?'}</td>
              <td style="font-size:0.82rem">${t.product_name || t.product || '—'}</td>
              <td>${t.quantity || t.qty || '—'}</td><td style="font-size:0.78rem">${t.carrier || '—'}</td>
              <td class="sa-code" style="font-size:0.78rem">${t.estimated_delivery || t.eta || '—'}</td>
              <td><span class="sa-status-pill sa-pill-${t.status === 'delivered' ? 'green' : t.status === 'in_transit' ? 'orange' : 'blue'}">${(t.status || 'pending').replace('_', ' ')}</span></td>
            </tr>`).join('')}
          </tbody></table>`}
        </div>
        <div class="sa-card">
          <h3><span class="status-icon status-warn" aria-label="Warning">!</span> Low Stock Alerts</h3>
          ${alerts.length === 0 ? '<div style="text-align:center;padding:2rem;color:var(--text-secondary)">No stock alerts — all levels healthy</div>' : `
          <table class="sa-table"><thead><tr><th>SKU</th><th>Product</th><th>Location</th><th>Current</th><th>Min Stock</th><th>Severity</th></tr></thead><tbody>
            ${alerts.map(a => `<tr class="${a.severity === 'critical' ? 'ops-alert-row' : ''}">
              <td class="sa-code" style="font-size:0.72rem">${a.sku || a.product_id?.slice(0, 12) || '—'}</td><td><strong>${a.product_name || '—'}</strong></td>
              <td>${a.location || a.partner_name || '—'}</td>
              <td style="font-weight:700;color:${a.severity === 'critical' ? '#ef4444' : '#f59e0b'}">${a.quantity ?? a.current ?? 0}</td>
              <td>${a.min_stock || a.reorderPoint || '—'}</td>
              <td><span class="sa-status-pill sa-pill-${a.severity === 'critical' ? 'red' : 'orange'}">${a.severity || 'warning'}</span></td>
            </tr>`).join('')}
          </tbody></table>`}
        </div>
      </div>
    </div>`;
}

async function loadData() {
  try {
    const [whRes, shipRes, alertRes] = await Promise.all([
      api.get('/ops/data/warehouses').catch(() => ({ warehouses: [] })),
      api.get('/scm/shipments').catch(() => ({ shipments: [] })),
      api.get('/scm/inventory/alerts').catch(() => ({ understock: [], overstock: [] }))
    ]);
    _data = {
      warehouses: whRes.warehouses || [],
      transfers: (shipRes.shipments || []).slice(0, 10),
      alerts: [...(alertRes.understock || []), ...(alertRes.overstock || [])].slice(0, 10)
    };
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
  } catch (e) { console.error('[Warehouse]', e); }
}

function loading() {
  return `<div class="sa-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading warehouse data...</div></div></div>`;
}

function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }

window._refreshWarehouse = () => { _data = null; const el = document.getElementById('main-content'); if (el) el.innerHTML = renderPage(); };
