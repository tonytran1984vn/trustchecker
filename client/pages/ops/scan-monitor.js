/**
 * Ops – Scan Monitor (Real-time feed)
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const scans = [
        { qr: 'QR-9847231', product: 'COFFEE-PRE-250', location: 'HCM, Vietnam', device: 'iPhone 15', type: 'first_scan', time: '12s ago' },
        { qr: 'QR-9847220', product: 'TEA-ORG-100', location: 'Bangkok, Thailand', device: 'Android', type: 'verification', time: '45s ago' },
        { qr: 'QR-9847190', product: 'OIL-COC-500', location: 'Singapore', device: 'iPhone 14', type: 'first_scan', time: '1 min ago' },
        { qr: 'QR-9847231', product: 'COFFEE-PRE-250', location: 'Phnom Penh, Cambodia', device: 'Android', type: 'duplicate', time: '2 min ago' },
        { qr: 'QR-9847180', product: 'SAUCE-FS-350', location: 'Da Nang, Vietnam', device: 'Tablet', type: 'verification', time: '3 min ago' },
        { qr: 'QR-9847170', product: 'NOODLE-RC-400', location: 'Hanoi, Vietnam', device: 'iPhone 13', type: 'activation', time: '5 min ago' },
        { qr: 'QR-9847150', product: 'COFFEE-PRE-250', location: 'Vientiane, Laos', device: 'Android', type: 'geo_anomaly', time: '8 min ago' },
        { qr: 'QR-9847140', product: 'TEA-ORG-100', location: 'HCM, Vietnam', device: 'iPhone 15', type: 'verification', time: '10 min ago' },
    ];

    const typeColors = { first_scan: 'green', verification: 'blue', activation: 'teal', duplicate: 'red', geo_anomaly: 'orange' };
    const typeLabels = { first_scan: 'First Scan', verification: 'Verification', activation: 'Activation', duplicate: '<span class="status-icon status-warn" aria-label="Warning">!</span> Duplicate', geo_anomaly: '<span class="status-icon status-warn" aria-label="Warning">!</span> Geo Anomaly' };

    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('search', 28)} Scan Monitor</h1>
        <div class="sa-title-actions">
          <span class="ops-live-dot"></span>
          <span style="font-size:0.75rem;color:#22c55e;font-weight:600">LIVE FEED</span>
        </div>
      </div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        <div class="sa-metric-card sa-metric-blue"><div class="sa-metric-body"><div class="sa-metric-value">4,712</div><div class="sa-metric-label">Scans Today</div></div></div>
        <div class="sa-metric-card sa-metric-green"><div class="sa-metric-body"><div class="sa-metric-value">3,891</div><div class="sa-metric-label">Valid</div></div></div>
        <div class="sa-metric-card sa-metric-red"><div class="sa-metric-body"><div class="sa-metric-value">12</div><div class="sa-metric-label">Anomalies</div></div></div>
        <div class="sa-metric-card sa-metric-orange"><div class="sa-metric-body"><div class="sa-metric-value">2</div><div class="sa-metric-label">Duplicates</div></div></div>
      </div>

      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>QR Code</th><th>Product</th><th>Location</th><th>Device</th><th>Type</th><th>Time</th></tr></thead>
          <tbody>
            ${scans.map(s => `
              <tr class="${s.type === 'duplicate' || s.type === 'geo_anomaly' ? 'ops-alert-row' : ''}">
                <td class="sa-code">${s.qr}</td>
                <td>${s.product}</td>
                <td>${s.location}</td>
                <td style="font-size:0.78rem">${s.device}</td>
                <td><span class="sa-status-pill sa-pill-${typeColors[s.type]}">${typeLabels[s.type]}</span></td>
                <td style="color:var(--text-secondary)">${s.time}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
