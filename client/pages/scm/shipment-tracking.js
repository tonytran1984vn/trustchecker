/**
 * SCM – Shipment Tracking (Real-time Timeline)
 * Enterprise: milestone tracking, exception handling, carrier integration
 * Data loaded from DB via State.scmShipments (centrally loaded in app.js)
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
import { timeAgo } from '../../utils/helpers.js';

export function renderPage() {
  const raw = State.scmShipments;
  if (!raw) return `<div class="sa-page"><div class="sa-loading-indicator"><div class="sa-spinner"></div><p>Loading shipment data from database...</p></div></div>`;

  const list = raw.shipments || [];
  const active = list.filter(s => s.status !== 'delivered');
  const inTransit = list.filter(s => s.status === 'in_transit');
  const delivered = list.filter(s => s.status === 'delivered');
  const exceptions = list.filter(s => s.exceptions > 0 || s.status === 'customs_hold' || s.status === 'delayed');

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('network', 28)} Shipment Tracking</h1></div>
      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Active Shipments', active.length.toString(), `${list.length} total`, 'blue', 'network')}
        ${m('In Transit', inTransit.length.toString(), 'On schedule', 'green', 'zap')}
        ${m('Delivered', delivered.length.toString(), 'Completed', 'green', 'check')}
        ${m('Exceptions', exceptions.length.toString(), exceptions.length > 0 ? 'Needs attention' : 'All clear', exceptions.length > 0 ? 'red' : 'green', 'alertTriangle')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📦 Shipment Overview</h3>
        ${list.length === 0 ? '<div style="text-align:center;padding:2rem;color:var(--text-secondary)">No shipment records found</div>' : `
        <table class="sa-table"><thead><tr><th>Tracking</th><th>From</th><th>To</th><th>Carrier</th><th>Status</th><th>ETA</th></tr></thead><tbody>
          ${list.map(s => {
    const statusColor = s.status === 'delivered' ? 'green' : s.status === 'in_transit' ? 'blue' : s.status === 'customs_hold' ? 'red' : 'orange';
    return `<tr class="${s.status === 'customs_hold' || s.status === 'delayed' ? 'ops-alert-row' : ''}">
              <td><strong style="font-family:'JetBrains Mono',monospace;font-size:0.78rem">${s.tracking_number || s.id || '—'}</strong></td>
              <td style="font-size:0.78rem">${s.from_name || s.origin || '—'}</td>
              <td style="font-size:0.78rem">${s.to_name || s.destination || '—'}</td>
              <td style="font-size:0.78rem">${s.carrier || '—'}</td>
              <td><span class="sa-status-pill sa-pill-${statusColor}">${(s.status || 'pending').replace(/_/g, ' ')}</span></td>
              <td style="font-size:0.78rem">${s.estimated_delivery ? timeAgo(s.estimated_delivery) : s.eta || '—'}</td>
            </tr>`;
  }).join('')}
        </tbody></table>`}
      </div>

      ${exceptions.length > 0 ? `
      <div class="sa-card" style="margin-bottom:1.5rem;border:1px solid #ef444440">
        <h3 style="color:#ef4444">⚠️ Shipment Exceptions (${exceptions.length})</h3>
        <table class="sa-table"><thead><tr><th>Shipment</th><th>Status</th><th>Carrier</th><th>From → To</th></tr></thead><tbody>
          ${exceptions.map(s => `<tr>
            <td><strong>${s.tracking_number || s.id || '—'}</strong></td>
            <td><span class="sa-status-pill sa-pill-red">${(s.status || '').replace(/_/g, ' ')}</span></td>
            <td>${s.carrier || '—'}</td>
            <td style="font-size:0.78rem">${s.from_name || s.origin || '—'} → ${s.to_name || s.destination || '—'}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>` : ''}
    </div>
  `;
}

function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
