/**
 * Ops – Duplicate QR Alerts
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const alerts = [
        { qr: 'QR-9847231', product: 'COFFEE-PRE-250', locations: 'HCM, VN → Phnom Penh, KH', gap: '2 min', status: 'open', severity: 'high', time: '2 min ago' },
        { qr: 'QR-9845102', product: 'TEA-ORG-100', locations: 'Bangkok, TH → Bangkok, TH (diff device)', gap: '30s', status: 'investigating', severity: 'medium', time: '1h ago' },
        { qr: 'QR-9843080', product: 'SAUCE-FS-350', locations: 'Da Nang, VN → Hanoi, VN', gap: '5 min', status: 'false_positive', severity: 'low', time: '3h ago' },
        { qr: 'QR-9841050', product: 'OIL-COC-500', locations: 'SGN-01 shelf → SGN-02 shelf', gap: '10 min', status: 'confirmed', severity: 'high', time: '1d ago' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('shield', 28)} Duplicate Alerts</h1></div>

      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>QR Code</th><th>Product</th><th>Scan Locations</th><th>Time Gap</th><th>Severity</th><th>Status</th><th>Detected</th><th>Actions</th></tr></thead>
          <tbody>
            ${alerts.map(a => `
              <tr class="sa-row-clickable">
                <td class="sa-code">${a.qr}</td>
                <td>${a.product}</td>
                <td style="font-size:0.78rem">${a.locations}</td>
                <td class="sa-code">${a.gap}</td>
                <td><span class="sa-score sa-score-${a.severity === 'high' ? 'danger' : a.severity === 'medium' ? 'warning' : 'low'}">${a.severity}</span></td>
                <td><span class="sa-status-pill sa-pill-${a.status === 'open' ? 'red' : a.status === 'investigating' ? 'orange' : a.status === 'confirmed' ? 'red' : 'green'}">${a.status.replace('_', ' ')}</span></td>
                <td style="color:var(--text-secondary)">${a.time}</td>
                <td><button class="btn btn-xs btn-outline">Investigate</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
