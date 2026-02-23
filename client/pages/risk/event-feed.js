/**
 * Risk – Event Feed (Full fraud log with device/IP)
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const events = [
        { id: 'FE-9847', type: 'duplicate', qr: 'QR-9847231', product: 'COFFEE-PRE-250', region: 'BKK→PNH', device: 'iPhone 15 / iOS 18', ip: '103.5.xx.xx', score: 82, time: '2 min ago' },
        { id: 'FE-9846', type: 'geo_anomaly', qr: 'QR-9847150', product: 'COFFEE-PRE-250', region: 'VN→Laos', device: 'Android 14', ip: '115.84.xx.xx', score: 71, time: '8 min ago' },
        { id: 'FE-9845', type: 'velocity', qr: 'QR-9845102', product: 'TEA-ORG-100', region: 'Bangkok', device: 'Android 13', ip: '103.5.xx.xx', score: 65, time: '1h ago' },
        { id: 'FE-9844', type: 'duplicate', qr: 'QR-9841050', product: 'OIL-COC-500', region: 'SGN-01→SGN-02', device: 'iPhone 14', ip: '171.252.xx.xx', score: 88, time: '3h ago' },
        { id: 'FE-9843', type: 'behavioral', qr: 'QR-9840500', product: 'SAUCE-FS-350', region: 'HCM', device: 'Android 12 (rooted)', ip: '14.161.xx.xx', score: 91, time: '5h ago' },
        { id: 'FE-9842', type: 'geo_anomaly', qr: 'QR-9840100', product: 'SAUCE-FS-350', region: 'VN→Cambodia', device: 'Android 13', ip: '27.109.xx.xx', score: 76, time: '1d ago' },
    ];

    const typeLabels = { duplicate: '🔄 Duplicate', geo_anomaly: '🌍 Geo Anomaly', velocity: '⚡ Velocity', behavioral: '🧠 Behavioral' };
    const typeColors = { duplicate: 'orange', geo_anomaly: 'red', velocity: 'blue', behavioral: 'red' };

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('scroll', 28)} Event Feed</h1></div>

      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>ID</th><th>Type</th><th>QR Code</th><th>Product</th><th>Region</th><th>Device</th><th>IP</th><th>Risk Score</th><th>Time</th></tr></thead>
          <tbody>
            ${events.map(e => `
              <tr class="sa-row-clickable">
                <td class="sa-code">${e.id}</td>
                <td><span class="sa-status-pill sa-pill-${typeColors[e.type]}">${typeLabels[e.type]}</span></td>
                <td class="sa-code">${e.qr}</td>
                <td>${e.product}</td>
                <td>${e.region}</td>
                <td style="font-size:0.72rem">${e.device}</td>
                <td class="sa-code" style="font-size:0.72rem">${e.ip}</td>
                <td><span class="sa-score sa-score-${e.score >= 80 ? 'danger' : e.score >= 50 ? 'warning' : 'low'}">${e.score}</span></td>
                <td style="color:var(--text-secondary)">${e.time}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
