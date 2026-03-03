/**
 * Ops – Scan Monitor (Real-time feed)
 * Reads from workspace cache (_opsMonCache.scanHistory) or direct API
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
  const cache = window._opsMonCache || {};
  const raw = cache.scanHistory?.scans || [];

  const typeMap = { validation: 'verification', first_scan: 'first_scan', verification: 'verification', activation: 'activation' };
  const scans = raw.slice(0, 20).map(s => ({
    qr: s.qr_data || s.qr_code || s.id?.slice(0, 12) || '—',
    product: s.product_name || s.sku || '—',
    location: [s.geo_city, s.geo_country].filter(Boolean).join(', ') || '—',
    device: (s.user_agent || '').includes('iPhone') ? 'iPhone' : (s.user_agent || '').includes('Android') ? 'Android' : 'Browser',
    type: s.fraud_score > 0.7 ? 'duplicate' : s.fraud_score > 0.3 ? 'geo_anomaly' : typeMap[s.scan_type] || s.scan_type || 'verification',
    time: timeAgo(s.scanned_at),
  }));

  const typeColors = { first_scan: 'green', verification: 'blue', activation: 'teal', duplicate: 'red', geo_anomaly: 'orange' };
  const typeLabels = { first_scan: 'First Scan', verification: 'Verification', activation: 'Activation', duplicate: '<span class="status-icon status-warn" aria-label="Warning">!</span> Duplicate', geo_anomaly: '<span class="status-icon status-warn" aria-label="Warning">!</span> Geo Anomaly' };

  // Aggregate metrics from data
  const total = raw.length;
  const valid = raw.filter(s => !s.fraud_score || s.fraud_score < 0.3).length;
  const anomalies = raw.filter(s => s.fraud_score && s.fraud_score >= 0.3 && s.fraud_score < 0.7).length;
  const duplicates = raw.filter(s => s.fraud_score && s.fraud_score >= 0.7).length;

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
        <div class="sa-metric-card sa-metric-blue"><div class="sa-metric-body"><div class="sa-metric-value">${total.toLocaleString()}</div><div class="sa-metric-label">Scans</div></div></div>
        <div class="sa-metric-card sa-metric-green"><div class="sa-metric-body"><div class="sa-metric-value">${valid.toLocaleString()}</div><div class="sa-metric-label">Valid</div></div></div>
        <div class="sa-metric-card sa-metric-red"><div class="sa-metric-body"><div class="sa-metric-value">${anomalies}</div><div class="sa-metric-label">Anomalies</div></div></div>
        <div class="sa-metric-card sa-metric-orange"><div class="sa-metric-body"><div class="sa-metric-value">${duplicates}</div><div class="sa-metric-label">Duplicates</div></div></div>
      </div>

      ${scans.length === 0 ? '<div class="sa-card" style="padding:2rem;text-align:center;color:var(--text-secondary)">No scan data available</div>' : `
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
                <td><span class="sa-status-pill sa-pill-${typeColors[s.type] || 'blue'}">${typeLabels[s.type] || s.type}</span></td>
                <td style="color:var(--text-secondary)">${s.time}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    </div>
  `;
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
