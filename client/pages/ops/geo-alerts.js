/**
 * Ops – Geo Anomaly Alerts
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const alerts = [
        { qr: 'QR-9847150', product: 'COFFEE-PRE-250', expected: 'Vietnam', actual: 'Laos', distance: '850 km / 1h', status: 'open', severity: 'high', time: '8 min ago' },
        { qr: 'QR-9845000', product: 'TEA-ORG-100', expected: 'Thailand', actual: 'Myanmar', distance: '620 km / 2h', status: 'investigating', severity: 'medium', time: '2h ago' },
        { qr: 'QR-9842200', product: 'OIL-COC-500', expected: 'Singapore', actual: 'Indonesia', distance: '340 km / 30min', status: 'false_positive', severity: 'low', time: '5h ago' },
        { qr: 'QR-9840100', product: 'SAUCE-FS-350', expected: 'Vietnam', actual: 'Cambodia (blocked)', distance: 'Blocked region', status: 'confirmed', severity: 'critical', time: '1d ago' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('globe', 28)} Geo Alerts</h1></div>

      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>QR Code</th><th>Product</th><th>Expected Region</th><th>Actual Region</th><th>Distance/Time</th><th>Severity</th><th>Status</th><th>Detected</th><th>Actions</th></tr></thead>
          <tbody>
            ${alerts.map(a => `
              <tr class="sa-row-clickable">
                <td class="sa-code">${a.qr}</td>
                <td>${a.product}</td>
                <td>${a.expected}</td>
                <td style="color:#ef4444;font-weight:600">${a.actual}</td>
                <td style="font-size:0.78rem">${a.distance}</td>
                <td><span class="sa-score sa-score-${a.severity === 'critical' ? 'danger' : a.severity === 'high' ? 'danger' : a.severity === 'medium' ? 'warning' : 'low'}">${a.severity}</span></td>
                <td><span class="sa-status-pill sa-pill-${a.status === 'open' ? 'red' : a.status === 'investigating' ? 'orange' : a.status === 'confirmed' ? 'red' : 'green'}">${a.status.replace('_', ' ')}</span></td>
                <td style="color:var(--text-secondary)">${a.time}</td>
                <td><button class="btn btn-xs btn-outline">View</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
