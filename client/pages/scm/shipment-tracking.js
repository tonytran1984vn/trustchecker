/**
 * SCM – Shipment Tracking (Real-time Timeline)
 * Enterprise: milestone tracking, exception handling, carrier integration
 */
import { icon } from '../../core/icons.js';

const SHIPMENTS = [
    { id: 'SHP-2026-0291', po: 'PO-2026-0451', from: 'Golden Beans (VN)', to: 'WH-HCM-01', product: 'Arabica Raw 50T', carrier: 'Kerry Logistics', status: 'in_transit', progress: 65, eta: '2026-03-05', milestones: ['Picked up (Feb 19)', 'Customs cleared (Feb 20)', 'In transit to port', 'ETA: Mar 5'], exceptions: 0 },
    { id: 'SHP-2026-0290', po: 'PO-2026-0450', from: 'Ceylon Leaf (LK)', to: 'WH-SG-01', product: 'Green Tea 20T', carrier: 'DHL Global', status: 'customs_hold', progress: 40, eta: '2026-03-12', milestones: ['Picked up (Feb 16)', 'Port departure (Feb 18)', '<span class="status-icon status-warn" aria-label="Warning">!</span> Customs hold (Feb 20)'], exceptions: 1 },
    { id: 'SHP-2026-0289', po: 'PO-2026-0448', from: 'Pacific Pack (TH)', to: 'WH-HCM-01', product: 'Gift Box 100K pcs', carrier: 'Ninja Van', status: 'delivered', progress: 100, eta: '2026-02-28', milestones: ['Picked up (Feb 15)', 'Arrived WH (Feb 18)', 'QC passed (Feb 19)', '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Received'], exceptions: 0 },
    { id: 'SHP-2026-0288', po: 'PO-2026-0449', from: 'NZ Manuka (NZ)', to: 'WH-SG-01', product: 'Manuka UMF15+ 5T', carrier: 'Maersk Line', status: 'pending', progress: 0, eta: '2026-03-20', milestones: ['Awaiting pickup'], exceptions: 0 },
];

const EXCEPTIONS = [
    { shipment: 'SHP-2026-0290', type: 'Customs Hold', severity: 'High', detail: 'Documentation discrepancy — phytosanitary certificate mismatch', action: 'Supplier providing corrected cert (ETA: 24h)', impact: '+2 days delay' },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('network', 28)} Shipment Tracking</h1></div>
      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Active Shipments', SHIPMENTS.filter(s => s.status !== 'delivered').length.toString(), `${SHIPMENTS.length} total`, 'blue', 'network')}
        ${m('In Transit', SHIPMENTS.filter(s => s.status === 'in_transit').length.toString(), 'On schedule', 'green', 'zap')}
        ${m('Exceptions', EXCEPTIONS.length.toString(), '1 customs hold', 'red', 'alertTriangle')}
        ${m('On-Time Rate', '94.2%', 'Target: >95%', 'orange', 'clock')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📦 Shipment Overview</h3>
        <table class="sa-table"><thead><tr><th>Shipment</th><th>PO</th><th>Route</th><th>Product</th><th>Carrier</th><th>Progress</th><th>ETA</th><th>Exceptions</th><th>Status</th></tr></thead><tbody>
          ${SHIPMENTS.map(s => {
        const color = s.status === 'delivered' ? '#22c55e' : s.status === 'customs_hold' ? '#ef4444' : s.status === 'in_transit' ? '#3b82f6' : '#94a3b8';
        return `<tr class="${s.exceptions > 0 ? 'ops-alert-row' : ''}">
              <td class="sa-code" style="font-weight:600">${s.id}</td>
              <td class="sa-code" style="font-size:0.72rem">${s.po}</td>
              <td style="font-size:0.72rem">${s.from} → ${s.to}</td>
              <td style="font-size:0.82rem">${s.product}</td>
              <td style="font-size:0.78rem">${s.carrier}</td>
              <td style="min-width:120px">
                <div style="display:flex;align-items:center;gap:0.5rem">
                  <div style="flex:1;height:6px;background:var(--border);border-radius:3px"><div style="height:100%;width:${s.progress}%;background:${color};border-radius:3px"></div></div>
                  <span style="font-size:0.72rem;font-weight:600">${s.progress}%</span>
                </div>
              </td>
              <td class="sa-code" style="font-size:0.78rem">${s.eta}</td>
              <td style="text-align:center;color:${s.exceptions > 0 ? '#ef4444' : '#22c55e'}">${s.exceptions > 0 ? '<span class="status-icon status-warn" aria-label="Warning">!</span> ' + s.exceptions : '<span class="status-icon status-pass" aria-label="Pass">✓</span>'}</td>
              <td><span class="sa-status-pill" style="background:${color}12;color:${color};border:1px solid ${color}25">${s.status.replace('_', ' ')}</span></td>
            </tr>`;
    }).join('')}
        </tbody></table>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
        <div class="sa-card">
          <h3>🔄 Milestone Timeline</h3>
          ${SHIPMENTS.filter(s => s.status !== 'pending').map(s => `
            <div style="margin-bottom:0.75rem;padding:0.6rem;background:rgba(99,102,241,0.03);border-radius:6px">
              <div style="font-weight:700;font-size:0.82rem;margin-bottom:0.3rem">${s.id} — ${s.product}</div>
              ${s.milestones.map((ms, i) => `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.15rem 0;font-size:0.72rem">
                <span style="width:8px;height:8px;border-radius:50%;background:${ms.includes('<span class="status-icon status-warn" aria-label="Warning">!</span>') ? '#ef4444' : ms.includes('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>') ? '#22c55e' : '#3b82f6'};flex-shrink:0"></span>
                <span>${ms}</span>
              </div>`).join('')}
            </div>
          `).join('')}
        </div>
        <div class="sa-card">
          <h3><span class="status-icon status-warn" aria-label="Warning">!</span> Active Exceptions</h3>
          ${EXCEPTIONS.length ? EXCEPTIONS.map(e => `
            <div style="padding:0.75rem;background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.1);border-radius:8px;margin-bottom:0.5rem">
              <div style="display:flex;justify-content:space-between"><strong>${e.shipment}</strong><span class="sa-status-pill sa-pill-red">${e.severity}</span></div>
              <div style="font-size:0.82rem;font-weight:600;margin:0.3rem 0">${e.type}</div>
              <div style="font-size:0.75rem;color:var(--text-secondary)">${e.detail}</div>
              <div style="font-size:0.72rem;margin-top:0.3rem;color:#6366f1">→ ${e.action}</div>
              <div style="font-size:0.72rem;color:#ef4444;margin-top:0.2rem">Impact: ${e.impact}</div>
            </div>
          `).join('') : '<div style="text-align:center;color:var(--text-secondary)"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> No exceptions</div>'}
        </div>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
