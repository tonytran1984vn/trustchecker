/**
 * Ops – Transfer Orders & Shipment Creation
 * Connect to POST /api/scm/shipments for carbon-tracked logistics.
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { showToast } from '../../components/toast.js';

let _shipments = [];
let _loaded = false;

async function loadShipments() {
  try {
    const res = await API.get('/scm/shipments?limit=50');
    _shipments = res.shipments || [];
  } catch (e) { _shipments = []; }
  _loaded = true;
  const el = document.getElementById('transfer-content');
  if (el) el.innerHTML = renderShipmentTable();
}

function renderShipmentTable() {
  if (!_shipments.length) return `<div style="text-align:center;padding:40px;color:var(--text-muted)">
    <div style="font-size:2rem;margin-bottom:8px">🚚</div>
    <div>No shipments yet. Create your first shipment to start tracking carbon emissions.</div>
  </div>`;

  const statusPill = s => {
    const colors = { delivered: '#10b981', in_transit: '#3b82f6', pending: '#f59e0b', cancelled: '#ef4444' };
    return `<span style="padding:2px 10px;border-radius:10px;font-size:0.68rem;font-weight:700;background:${(colors[s] || '#6b7280')}20;color:${colors[s] || '#6b7280'}">${(s || 'pending').replace('_', ' ')}</span>`;
  };

  return `<table class="sa-table">
    <thead><tr>
      <th>ID</th><th>Product</th><th>From → To</th>
      <th>Carrier</th><th>Tracking</th><th>Status</th><th>Created</th>
    </tr></thead>
    <tbody>${_shipments.map(s => `<tr class="sa-row-clickable">
      <td><strong class="sa-code">${(s.id || '').slice(0, 8)}</strong></td>
      <td>${s.product_name || s.batch_number || '—'}</td>
      <td>${s.from_name || '—'} → ${s.to_name || '—'}</td>
      <td>${s.carrier || '—'}</td>
      <td class="sa-code">${s.tracking_number || '—'}</td>
      <td>${statusPill(s.status)}</td>
      <td style="color:var(--text-secondary);font-size:0.72rem">${s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function showCreateShipment() {
  const modal = document.getElementById('shipment-modal');
  if (modal) modal.style.display = 'flex';
}

window._closeShipmentModal = function () {
  const modal = document.getElementById('shipment-modal');
  if (modal) modal.style.display = 'none';
};

window._submitShipment = async function () {
  const batch_id = document.getElementById('sh-batch').value.trim();
  const carrier = document.getElementById('sh-carrier').value.trim();
  const tracking_number = document.getElementById('sh-tracking').value.trim();
  const from_partner_id = document.getElementById('sh-from').value.trim();
  const to_partner_id = document.getElementById('sh-to').value.trim();
  const estimated_delivery = document.getElementById('sh-eta').value;

  if (!batch_id) return showToast('Batch ID is required', 'error');

  try {
    const res = await API.post('/scm/shipments', {
      batch_id, carrier, tracking_number, from_partner_id, to_partner_id, estimated_delivery
    });
    showToast(`✅ Shipment created! Tracking: ${res.tracking_number || res.id}`, 'success');
    window._closeShipmentModal();
    loadShipments();
  } catch (e) {
    showToast('❌ ' + (e.message || 'Failed to create shipment'), 'error');
  }
};

export function renderPage() {
  if (!_loaded) setTimeout(loadShipments, 100);

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('network', 28)} Transfer Orders & Shipments</h1>
        <div class="sa-title-actions">
          <button class="btn btn-primary btn-sm" onclick="document.getElementById('shipment-modal').style.display='flex'">+ Create Shipment</button>
        </div>
      </div>

      <div class="sa-card" id="transfer-content">
        <div style="text-align:center;padding:40px;color:var(--text-muted)">Loading shipments…</div>
      </div>

      <!-- Create Shipment Modal -->
      <div id="shipment-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:1000;align-items:center;justify-content:center">
        <div style="background:var(--bg-card,#1e293b);border-radius:16px;padding:24px;width:480px;max-width:90vw;border:1px solid var(--border)">
          <h3 style="margin:0 0 16px;color:var(--text-primary,#f1f5f9)">🚚 Create Shipment</h3>
          
          <div style="margin-bottom:10px">
            <label style="font-size:0.72rem;color:var(--text-muted);display:block;margin-bottom:4px">Batch ID *</label>
            <input id="sh-batch" class="input" placeholder="e.g. B-2026-0001" style="width:100%">
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
            <div>
              <label style="font-size:0.72rem;color:var(--text-muted);display:block;margin-bottom:4px">From (Partner ID)</label>
              <input id="sh-from" class="input" placeholder="e.g. HCM-01" style="width:100%">
            </div>
            <div>
              <label style="font-size:0.72rem;color:var(--text-muted);display:block;margin-bottom:4px">To (Partner ID)</label>
              <input id="sh-to" class="input" placeholder="e.g. SGN-01" style="width:100%">
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
            <div>
              <label style="font-size:0.72rem;color:var(--text-muted);display:block;margin-bottom:4px">Carrier</label>
              <select id="sh-carrier" class="input" style="width:100%">
                <option value="">— Select —</option>
                <option>DHL</option><option>FedEx</option><option>UPS</option>
                <option>Maersk</option><option>CMA CGM</option><option>VietnamPost</option>
                <option>Local Truck</option><option>Rail Freight</option><option>Air Cargo</option>
              </select>
            </div>
            <div>
              <label style="font-size:0.72rem;color:var(--text-muted);display:block;margin-bottom:4px">Tracking Number</label>
              <input id="sh-tracking" class="input" placeholder="Auto-generated if empty" style="width:100%">
            </div>
          </div>

          <div style="margin-bottom:12px">
            <label style="font-size:0.72rem;color:var(--text-muted);display:block;margin-bottom:4px">Estimated Delivery</label>
            <input id="sh-eta" class="input" type="date" style="width:100%">
          </div>

          <div style="padding:8px 12px;background:var(--border);border-radius:8px;font-size:0.72rem;color:var(--text-muted);margin-bottom:12px">
            🌿 <strong>Carbon:</strong> Shipment distance & mode are used to calculate Scope 3 Cat 4/9 transport emissions.
          </div>

          <div style="display:flex;gap:8px">
            <button onclick="window._submitShipment()" style="flex:1;padding:10px;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">Create Shipment</button>
            <button onclick="window._closeShipmentModal()" style="padding:10px 16px;background:var(--border);color:var(--text-primary,#f1f5f9);border:none;border-radius:8px;cursor:pointer">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
