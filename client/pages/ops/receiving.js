/**
 * Ops – Receiving (Confirm receipt + scan validation)
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const pending = [
        { id: 'T-4521', batch: 'B-2026-0892', from: 'HCM-01', expected: 200, shipment: 'SH-2026-1102', eta: 'Arrived' },
        { id: 'T-4519', batch: 'B-2026-0889', from: 'HCM-02', expected: 200, shipment: 'SH-2026-1100', eta: '2h' },
        { id: 'T-4518', batch: 'B-2026-0887', from: 'DN-01', expected: 300, shipment: 'SH-2026-1099', eta: 'Tomorrow' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('check', 28)} Receiving</h1></div>

      <div class="sa-card" style="margin-bottom:1.5rem;border:1px solid rgba(34,197,94,0.15)">
        <h3>${icon('search', 16)} Quick Scan Receiving</h3>
        <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem">Scan batch QR code to auto-populate receiving form</p>
        <div style="display:flex;gap:1rem;align-items:flex-end">
          <div class="ops-field" style="flex:1"><label class="ops-label">Scan / Enter Batch ID</label><input class="ops-input" placeholder="Scan QR or type batch ID" /></div>
          <button class="btn btn-primary btn-sm" style="height:38px">Scan</button>
        </div>
      </div>

      <section class="sa-section">
        <h2 class="sa-section-title">Pending Receiving</h2>
        <div class="sa-card">
          <table class="sa-table">
            <thead><tr><th>Transfer</th><th>Batch</th><th>From</th><th>Expected Qty</th><th>Shipment</th><th>ETA</th><th>Actions</th></tr></thead>
            <tbody>
              ${pending.map(p => `
                <tr>
                  <td class="sa-code">${p.id}</td>
                  <td class="sa-code">${p.batch}</td>
                  <td>${p.from}</td>
                  <td>${p.expected}</td>
                  <td class="sa-code">${p.shipment}</td>
                  <td><span class="sa-status-pill sa-pill-${p.eta === 'Arrived' ? 'green' : 'blue'}">${p.eta}</span></td>
                  <td>
                    <button class="btn btn-xs btn-primary">${p.eta === 'Arrived' ? 'Confirm Receipt' : 'Preview'}</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}
