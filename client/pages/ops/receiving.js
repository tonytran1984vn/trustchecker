/**
 * Ops – Receiving (Inbound Shipments) — Premium Design
 * ═════════════════════════════════════════════════════════
 * Quick Scan Terminal + Pending Inbound table with status pills
 * and action buttons matching the reference design.
 */
import { icon } from '../../core/icons.js';

const ACCENT = '#0d9488';

export function renderPage() {
  const cache = window._opsWhCache || {};
  const raw = cache.shipments?.shipments || [];

  const pending = raw.filter(s => ['pending', 'in_transit', 'arrived', 'delivered'].includes(s.status)).slice(0, 20).map(p => ({
    batch: p.batch_number || shortId(p.batch_id) || '—',
    from: p.from_name || p.from_partner_id?.slice(0, 12) || '—',
    shipment: p.tracking_number || shortId(p.id) || '—',
    carrier: p.carrier || '—',
    type: p.type || guessType(p),
    eta: p.status === 'arrived' || p.status === 'delivered' ? 'Arrived' : p.estimated_delivery ? new Date(p.estimated_delivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'In Transit',
    status: p.status,
    _raw: p,
  }));
  window._rcvPending = pending;

  const arrived = pending.filter(p => p.status === 'arrived' || p.status === 'delivered').length;
  const inTransit = pending.filter(p => p.status === 'in_transit').length;

  return `
    <div class="sa-page">

      <!-- ── Quick Scan Terminal ────────────────────────────── -->
      <div style="background:var(--card-bg);border-radius:14px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:24px 28px;margin-bottom:1.5rem;position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,${ACCENT},#06b6d4)"></div>
        <div style="display:flex;align-items:flex-start;gap:24px">
          <div style="flex:1">
            <h3 style="margin:0 0 4px;font-size:1.05rem;font-weight:600;color:var(--text-primary)">Quick Scan Terminal</h3>
            <p style="font-size:0.78rem;color:var(--text-secondary);margin:0 0 16px">Scan a barcode or enter Batch ID to process incoming shipments immediately.</p>
            <div style="display:flex;gap:12px;align-items:center">
              <div style="flex:1;position:relative">
                <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);opacity:0.4">${icon('search', 16)}</span>
                <input type="text" placeholder="Enter Batch ID (e.g., BTC-10245-A)"
                  style="width:100%;padding:12px 14px 12px 40px;border:1.5px solid var(--border-color,rgba(0,0,0,0.1));border-radius:10px;font-size:0.85rem;background:var(--card-bg);color:var(--text-primary);outline:none;transition:border-color 0.2s"
                  onfocus="this.style.borderColor='${ACCENT}'" onblur="this.style.borderColor=''" />
              </div>
              <button style="display:flex;align-items:center;gap:6px;padding:12px 24px;border:none;border-radius:10px;background:${ACCENT};color:#fff;font-size:0.85rem;font-weight:600;cursor:pointer;white-space:nowrap;transition:opacity 0.15s"
                onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'"
                onclick="if(confirm('Process this batch for receiving?')){showToast('✅ Batch processing started','success')}">
                ${icon('check', 16, '#fff')} Process
              </button>
            </div>
          </div>
          <div style="width:80px;height:80px;border:2px dashed var(--border-color,rgba(0,0,0,0.1));border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:border-color 0.2s;flex-shrink:0"
            onmouseover="this.style.borderColor='${ACCENT}'" onmouseout="this.style.borderColor=''"
            onclick="showToast('📱 Scanner connection available via mobile app — download TrustChecker Mobile from App Store','info')">
            <span style="font-size:1.2rem;margin-bottom:2px">📷</span>
            <span style="font-size:0.6rem;color:var(--text-secondary);text-align:center">Connect<br>Scanner</span>
          </div>
        </div>
      </div>

      <!-- ── Pending Inbound Shipments ─────────────────────── -->
      <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:20px 24px;margin-bottom:1.5rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="margin:0;font-size:1rem;font-weight:600;color:var(--text-primary)">Pending Inbound Shipments</h3>
          <div style="display:flex;gap:8px;align-items:center">
            ${inTransit > 0 ? `<span style="font-size:0.62rem;padding:3px 8px;border-radius:10px;background:rgba(245,158,11,0.08);color:#f59e0b;font-weight:600">${inTransit} in transit</span>` : ''}
            ${arrived > 0 ? `<span style="font-size:0.62rem;padding:3px 8px;border-radius:10px;background:rgba(34,197,94,0.08);color:#22c55e;font-weight:600">${arrived} arrived</span>` : ''}
          </div>
        </div>

        ${pending.length === 0 ? `<div style="text-align:center;padding:3rem;color:var(--text-secondary);font-size:0.82rem">No pending shipments</div>` : `
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:0.82rem">
            <thead>
              <tr style="text-align:left">
                <th style="${thStyle}">Batch ID</th>
                <th style="${thStyle}">Origin</th>
                <th style="${thStyle}">Carrier</th>
                <th style="${thStyle}">Type</th>
                <th style="${thStyle}">Status</th>
                <th style="${thStyle}text-align:right">Action</th>
              </tr>
            </thead>
            <tbody>
              ${pending.map(p => {
                const stColor = p.status === 'arrived' || p.status === 'delivered' ? '#22c55e' : p.status === 'in_transit' ? '#f59e0b' : '#3b82f6';
                const stBg = p.status === 'arrived' || p.status === 'delivered' ? 'rgba(34,197,94,0.08)' : p.status === 'in_transit' ? 'rgba(245,158,11,0.08)' : 'rgba(59,130,246,0.08)';
                const stLabel = p.status === 'arrived' ? 'Arrived' : p.status === 'delivered' ? 'Delivered' : p.status === 'in_transit' ? 'In Transit' : 'Pending';
                const typeColors = { standard: { bg: 'rgba(59,130,246,0.08)', color: '#3b82f6' }, perishable: { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b' }, hazardous: { bg: 'rgba(239,68,68,0.08)', color: '#ef4444' }, fragile: { bg: 'rgba(139,92,246,0.08)', color: '#8b5cf6' } };
                const tc = typeColors[p.type] || typeColors.standard;

                return `<tr style="transition:background 0.15s" onmouseover="this.style.background='rgba(13,148,136,0.02)'" onmouseout="this.style.background=''">
                  <td style="${tdStyle}">
                    <span style="font-weight:600;color:${ACCENT};font-size:0.82rem">${p.batch}</span>
                  </td>
                  <td style="${tdStyle}color:var(--text-primary)">${p.from}</td>
                  <td style="${tdStyle}">
                    <div style="display:flex;align-items:center;gap:6px">
                      <span style="width:20px;height:14px;background:var(--border-color,#e2e8f0);border-radius:2px;display:inline-block"></span>
                      ${p.carrier}
                    </div>
                  </td>
                  <td style="${tdStyle}">
                    <span style="font-size:0.65rem;padding:3px 8px;border-radius:6px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;background:${tc.bg};color:${tc.color}">${p.type}</span>
                  </td>
                  <td style="${tdStyle}">
                    <span style="display:inline-flex;align-items:center;gap:4px;font-size:0.7rem;font-weight:500;color:${stColor}">
                      <span style="width:6px;height:6px;border-radius:50%;background:${stColor}"></span>
                      ${stLabel}
                    </span>
                  </td>
                  <td style="${tdStyle}text-align:right">
                    ${p.status === 'arrived' ? `
                      <button style="padding:6px 16px;border:none;border-radius:8px;background:${ACCENT};color:#fff;font-size:0.72rem;font-weight:600;cursor:pointer;transition:opacity 0.15s"
                        onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'"
                        onclick="window._confirmReceipt(${pending.indexOf(p)})">Confirm Receipt</button>
                    ` : `
                      <span style="font-size:0.72rem;color:${ACCENT};font-weight:500;cursor:pointer" onclick="window._viewShipment(${pending.indexOf(p)})">Track →</span>
                    `}
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
      </div>

      <!-- ── Bottom Stats ──────────────────────────────────── -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px">
        ${bottomStat(icon('building', 20, ACCENT), 'RECEIVING QUEUE', pending.length.toString(), `${arrived} ready to process`, ACCENT,
          `<div style="margin-top:8px;height:5px;background:rgba(0,0,0,0.06);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pending.length > 0 ? Math.round(arrived/pending.length*100) : 0}%;background:${ACCENT};border-radius:3px"></div></div>`)}

        ${bottomStat(icon('check', 20, '#22c55e'), 'CONFIRMED TODAY', '0', 'No receipts today', '#22c55e', '')}

        ${bottomStat(icon('alertTriangle', 20, '#f59e0b'), 'DELAYED', pending.filter(p=>p.status==='in_transit').length.toString(),
          pending.filter(p=>p.status==='in_transit').length > 0 ? 'Monitor closely' : 'No delays', '#f59e0b', '')}
      </div>
    </div>
  `;
}

const thStyle = 'padding:10px 12px;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);border-bottom:1px solid var(--border-color,rgba(0,0,0,0.06));';
const tdStyle = 'padding:12px 12px;border-bottom:1px solid var(--border-color,rgba(0,0,0,0.04));font-size:0.82rem;';

function shortId(id) { return id ? id.slice(0, 12) : '—'; }

function guessType(p) {
  const name = (p.product_name || p.batch_number || '').toLowerCase();
  if (name.includes('perishable') || name.includes('food') || name.includes('coffee')) return 'perishable';
  if (name.includes('hazard') || name.includes('chemical')) return 'hazardous';
  if (name.includes('fragile') || name.includes('glass')) return 'fragile';
  return 'standard';
}

function bottomStat(iconHtml, label, value, sub, color, extra) {
  return `<div style="background:var(--card-bg);border-radius:12px;padding:18px 20px;border:1px solid var(--border-color,rgba(0,0,0,0.06));transition:box-shadow 0.2s"
    onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.06)'" onmouseout="this.style.boxShadow=''">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div style="width:32px;height:32px;border-radius:8px;background:${color}10;display:flex;align-items:center;justify-content:center">${iconHtml}</div>
    </div>
    <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-secondary);font-weight:600">${label}</div>
    <div style="font-size:1.5rem;font-weight:700;color:var(--text-primary);line-height:1.2">${value}</div>
    <div style="font-size:0.65rem;color:var(--text-secondary);margin-top:4px">${sub}</div>
    ${extra || ''}
  </div>`;
}

window._viewShipment = function(idx) {
  const p = window._rcvPending?.[idx];
  if (!p) return;
  const stColor = p.status === 'arrived' || p.status === 'delivered' ? '#22c55e' : p.status === 'in_transit' ? '#f59e0b' : '#3b82f6';
  const modal = document.createElement('div');
  modal.id = '_shp_detail_modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div style="background:var(--card-bg,#fff);border-radius:14px;padding:28px 24px;width:480px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.25);border:1px solid var(--border-color,#e2e8f0)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 style="margin:0;font-size:1.1rem;color:var(--text-primary)">📦 Shipment Tracking</h3>
        <button onclick="document.getElementById('_shp_detail_modal')?.remove()" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-secondary);padding:4px 8px;border-radius:6px">✕</button>
      </div>
      <div style="display:grid;gap:14px">
        <div style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:10px;background:${stColor}08;border:1px solid ${stColor}20">
          <span style="font-weight:700;font-size:0.92rem;color:#0d9488;font-family:monospace">${p.batch}</span>
          <span style="font-size:0.62rem;padding:2px 8px;border-radius:12px;font-weight:600;background:${stColor}12;color:${stColor}">${p.status === 'in_transit' ? 'In Transit' : p.status}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Origin</div>
            <div style="font-size:0.85rem;color:var(--text-primary)">${p.from}</div>
          </div>
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Carrier</div>
            <div style="font-size:0.85rem;color:var(--text-primary)">${p.carrier}</div>
          </div>
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Tracking #</div>
            <div style="font-size:0.85rem;font-family:monospace;color:var(--text-primary)">${p.shipment}</div>
          </div>
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Type</div>
            <div style="font-size:0.85rem;color:var(--text-primary)">${p.type}</div>
          </div>
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">ETA / Status</div>
            <div style="font-size:0.85rem;font-weight:600;color:${stColor}">${p.eta}</div>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px">
        <button onclick="document.getElementById('_shp_detail_modal')?.remove()" style="flex:1;padding:10px;background:var(--bg-secondary,#f1f5f9);color:var(--text-primary);border:1px solid var(--border-color,#e2e8f0);border-radius:8px;cursor:pointer;font-weight:500;font-size:0.85rem">Close</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
};

window._confirmReceipt = function(idx) {
  const p = window._rcvPending?.[idx];
  if (!p) return;
  if (confirm(`Confirm receipt of batch ${p.batch}?`)) {
    showToast(`✅ Receipt confirmed for ${p.batch}`, 'success');
  }
};
