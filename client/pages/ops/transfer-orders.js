/**
 * Ops – Transfer Orders & Shipments (Premium Design)
 * ═══════════════════════════════════════════════════
 * Clean shipment table with stats, status pills, and create modal.
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { showToast } from '../../components/toast.js';

const ACCENT = '#0d9488';
let _shipments = [];
let _loaded = false;

async function loadShipments() {
  const cache = window._opsWhCache || window._opsLogCache || {};
  if (cache.shipments?.shipments?.length) {
    _shipments = cache.shipments.shipments;
    _loaded = true;
    if (typeof window.render === 'function') window.render();
    return;
  }
  try {
    const res = await API.get('/scm/shipments?limit=50');
    _shipments = res.shipments || [];
  } catch (e) { _shipments = []; }
  _loaded = true;
  if (typeof window.render === 'function') window.render();
}

export function renderPage() {
  if (!_loaded) setTimeout(loadShipments, 100);

  const delivered = _shipments.filter(s => s.status === 'delivered').length;
  const inTransit = _shipments.filter(s => s.status === 'in_transit').length;
  const pending = _shipments.filter(s => s.status === 'pending').length;

  const stStyle = {
    delivered:  { c: '#22c55e', bg: 'rgba(34,197,94,0.08)',  label: 'Delivered' },
    in_transit: { c: '#3b82f6', bg: 'rgba(59,130,246,0.08)', label: 'In Transit' },
    pending:    { c: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'Pending' },
    cancelled:  { c: '#ef4444', bg: 'rgba(239,68,68,0.08)',  label: 'Cancelled' },
  };

  return `
    <div class="sa-page">
      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:1.5rem">
        ${tStat(icon('network', 20, ACCENT), 'Total Shipments', _shipments.length, ACCENT)}
        ${tStat(icon('check', 20, '#22c55e'), 'Delivered', delivered, '#22c55e')}
        ${tStat(icon('clock', 20, '#3b82f6'), 'In Transit', inTransit, '#3b82f6')}
        ${tStat(icon('alertTriangle', 20, '#f59e0b'), 'Pending', pending, '#f59e0b')}
      </div>

      <!-- Table -->
      <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:20px 24px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="margin:0;font-size:1rem;font-weight:600">Transfer Orders</h3>
          <button style="padding:6px 16px;border:none;border-radius:8px;background:#0d9488;color:#fff;font-size:0.78rem;font-weight:600;cursor:pointer" onclick="document.getElementById('shipment-modal').style.display='flex'">+ Create Shipment</button>
        </div>

        ${!_loaded ? `<div style="text-align:center;padding:3rem;color:var(--text-secondary)"><div class="sa-spinner" style="margin:0 auto 12px"></div>Loading…</div>` :
          _shipments.length === 0 ? `<div style="text-align:center;padding:3rem;color:var(--text-secondary)">
            <div style="font-size:2rem;margin-bottom:8px;opacity:0.5">🚚</div>
            <div>No shipments yet. Create your first shipment.</div>
          </div>` : `
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:0.82rem">
            <thead><tr>
              <th style="${th}">Product</th><th style="${th}">Route</th>
              <th style="${th}">Carrier</th><th style="${th}">Tracking</th>
              <th style="${th}">Status</th><th style="${th}">Date</th>
            </tr></thead>
            <tbody>
              ${_shipments.map(s => {
                const st = stStyle[s.status] || stStyle.pending;
                return `<tr style="transition:background 0.15s" onmouseover="this.style.background='rgba(13,148,136,0.02)'" onmouseout="this.style.background=''">
                  <td style="${td}"><span style="font-weight:600;color:var(--text-primary)">${s.product_name || s.batch_number || '—'}</span></td>
                  <td style="${td}">
                    <span style="font-size:0.78rem">${s.from_name || '—'}</span>
                    <span style="color:var(--text-secondary);margin:0 4px">→</span>
                    <span style="font-size:0.78rem">${s.to_name || '—'}</span>
                  </td>
                  <td style="${td}font-size:0.78rem">${s.carrier || '—'}</td>
                  <td style="${td}"><span style="font-family:monospace;font-size:0.72rem;color:var(--text-secondary)">${s.tracking_number || '—'}</span></td>
                  <td style="${td}">
                    <span style="display:inline-flex;align-items:center;gap:4px;font-size:0.65rem;padding:3px 10px;border-radius:20px;font-weight:600;background:${st.bg};color:${st.c}">
                      <span style="width:5px;height:5px;border-radius:50%;background:currentColor"></span>${st.label}
                    </span>
                  </td>
                  <td style="${td}font-size:0.72rem;color:var(--text-secondary)">${s.created_at ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
      </div>

      <!-- Create Shipment Modal -->
      <div id="shipment-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;backdrop-filter:blur(4px)">
        <div style="background:var(--card-bg,#fff);border-radius:16px;padding:28px;width:500px;max-width:90vw;border:1px solid var(--border-color,rgba(0,0,0,0.06));box-shadow:0 20px 60px rgba(0,0,0,0.15)">
          <h3 style="margin:0 0 20px;font-size:1.05rem;font-weight:600;color:var(--text-primary)">🚚 Create Shipment</h3>

          ${modalField('Batch ID *', 'sh-batch', 'e.g. B-2026-0001')}

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            ${modalField('From (Partner ID)', 'sh-from', 'e.g. HCM-01', true)}
            ${modalField('To (Partner ID)', 'sh-to', 'e.g. SGN-01', true)}
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="font-size:0.72rem;color:var(--text-secondary);display:block;margin-bottom:4px">Carrier</label>
              <select id="sh-carrier" style="width:100%;padding:9px 12px;border:1px solid var(--border-color,rgba(0,0,0,0.1));border-radius:8px;font-size:0.82rem;background:var(--card-bg);color:var(--text-primary)">
                <option value="">— Select —</option>
                <option>DHL</option><option>FedEx</option><option>UPS</option>
                <option>Maersk</option><option>CMA CGM</option><option>VietnamPost</option>
                <option>Local Truck</option><option>Rail Freight</option><option>Air Cargo</option>
              </select>
            </div>
            ${modalField('Tracking Number', 'sh-tracking', 'Auto-generated if empty', true)}
          </div>

          ${modalField('Estimated Delivery', 'sh-eta', '', false, 'date')}

          <div style="padding:10px 14px;background:rgba(13,148,136,0.04);border-radius:8px;font-size:0.72rem;color:var(--text-secondary);margin:16px 0;border:1px solid rgba(13,148,136,0.1)">
            🌿 <strong>Carbon:</strong> Shipment distance & mode are used to calculate Scope 3 Cat 4/9 transport emissions.
          </div>

          <div style="display:flex;gap:10px">
            <button onclick="window._submitShipment()" style="flex:1;padding:11px;background:${ACCENT};color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:0.85rem;transition:opacity 0.15s"
              onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">Create Shipment</button>
            <button onclick="window._closeShipmentModal()" style="padding:11px 20px;background:var(--border-color,rgba(0,0,0,0.05));color:var(--text-primary);border:none;border-radius:10px;cursor:pointer;font-size:0.85rem">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

const th = 'padding:10px 12px;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);border-bottom:1px solid var(--border-color,rgba(0,0,0,0.06));text-align:left;';
const td = 'padding:12px 12px;border-bottom:1px solid var(--border-color,rgba(0,0,0,0.04));';

function tStat(iconHtml, label, value, color) {
  return `<div style="background:var(--card-bg);border-radius:12px;padding:16px 20px;border:1px solid var(--border-color,rgba(0,0,0,0.06))">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div style="width:32px;height:32px;border-radius:8px;background:${color}10;display:flex;align-items:center;justify-content:center">${iconHtml}</div>
    </div>
    <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-secondary);font-weight:600">${label}</div>
    <div style="font-size:1.5rem;font-weight:700;color:${color};line-height:1.2">${value}</div>
  </div>`;
}

function modalField(label, id, placeholder, noMargin, type) {
  return `<div${noMargin ? '' : ' style="margin-bottom:12px"'}>
    <label style="font-size:0.72rem;color:var(--text-secondary);display:block;margin-bottom:4px">${label}</label>
    <input id="${id}" ${type ? `type="${type}"` : ''} placeholder="${placeholder}" style="width:100%;padding:9px 12px;border:1px solid var(--border-color,rgba(0,0,0,0.1));border-radius:8px;font-size:0.82rem;background:var(--card-bg);color:var(--text-primary);outline:none" />
  </div>`;
}

window._closeShipmentModal = function () {
  const modal = document.getElementById('shipment-modal');
  if (modal) modal.style.display = 'none';
};

window._submitShipment = async function () {
  const batch_id = document.getElementById('sh-batch')?.value?.trim();
  const carrier = document.getElementById('sh-carrier')?.value?.trim();
  const tracking_number = document.getElementById('sh-tracking')?.value?.trim();
  const from_partner_id = document.getElementById('sh-from')?.value?.trim();
  const to_partner_id = document.getElementById('sh-to')?.value?.trim();
  const estimated_delivery = document.getElementById('sh-eta')?.value;
  if (!batch_id) return showToast('Batch ID is required', 'error');
  try {
    const res = await API.post('/scm/shipments', { batch_id, carrier, tracking_number, from_partner_id, to_partner_id, estimated_delivery });
    showToast(`✅ Shipment created! Tracking: ${res.tracking_number || res.id}`, 'success');
    window._closeShipmentModal();
    _loaded = false;
    loadShipments();
  } catch (e) {
    showToast('❌ ' + (e.message || 'Failed to create shipment'), 'error');
  }
};
