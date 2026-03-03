/**
 * Ops – Receiving (Inbound Shipments)
 * Reads from workspace cache (_opsWhCache.shipments) — prefetched from /scm/shipments
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
  const cache = window._opsWhCache || {};
  const raw = cache.shipments?.shipments || [];

  // Filter for inbound/pending shipments
  const pending = raw.filter(s => ['pending', 'in_transit', 'arrived', 'delivered'].includes(s.status)).slice(0, 20).map(p => ({
    batch: p.batch_number || p.batch_id?.slice(0, 12) || '—',
    from: p.from_name || p.from_partner_id?.slice(0, 8) || '—',
    shipment: p.tracking_number || p.id?.slice(0, 12) || '—',
    carrier: p.carrier || '—',
    eta: p.status === 'arrived' || p.status === 'delivered' ? 'Arrived' : p.estimated_delivery ? new Date(p.estimated_delivery).toLocaleDateString() : 'In Transit',
    status: p.status,
  }));

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('check', 28)} Receiving${pending.length ? ` <span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400">(${pending.length})</span>` : ''}</h1>
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3 style="margin:0 0 0.6rem">Quick Scan</h3>
        <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem">Scan batch QR code to auto-populate receiving form</p>
        <div style="display:flex;gap:1rem;align-items:flex-end">
          <div class="ops-field" style="flex:1"><label class="ops-label">Scan / Enter Batch ID</label><input class="ops-input" placeholder="Scan QR or type batch ID" /></div>
          <button class="btn btn-primary btn-sm" style="height:38px" onclick="showToast('📱 Scanning batch QR code…','info')">Scan</button>
        </div>
      </div>

      ${pending.length === 0 ? '<div class="sa-card" style="padding:2rem;text-align:center;color:var(--text-secondary)">No pending shipments</div>' : `
      <div class="sa-card">
        <h3 style="margin:0 0 1rem">Pending Inbound</h3>
        <table class="sa-table">
          <thead><tr><th>Batch</th><th>From</th><th>Carrier</th><th>Shipment</th><th>ETA</th><th>Action</th></tr></thead>
          <tbody>
            ${pending.map(p => `
              <tr>
                <td class="sa-code">${p.batch}</td>
                <td>${p.from}</td>
                <td>${p.carrier}</td>
                <td class="sa-code">${p.shipment}</td>
                <td><span class="sa-status-pill sa-pill-${p.eta === 'Arrived' ? 'green' : 'blue'}">${p.eta}</span></td>
                <td>
                  <button class="btn btn-xs btn-primary" onclick="showToast('${p.eta === 'Arrived' ? '✅ Receipt confirmed for ' + p.batch : '👁️ Previewing ' + p.batch}','${p.eta === 'Arrived' ? 'success' : 'info'}')">${p.eta === 'Arrived' ? 'Confirm Receipt' : 'Preview'}</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    </div>
  `;
}
