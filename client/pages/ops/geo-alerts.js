/**
 * Ops – Geo Anomaly Alerts
 * Reads from API /ops/data/geo-alerts (fraud_alerts table)
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let _alerts = null;
async function load() {
  if (_alerts) return;
  try {
    const res = await API.get('/ops/data/geo-alerts');
    _alerts = (res.alerts || []).map(a => {
      const d = typeof a.details === 'string' ? JSON.parse(a.details) : (a.details || {});
      return {
        qr: a.qr_code || d.qr || '—',
        product: a.product_name || d.product || '—',
        location: d.location || d.fromCity || [a.geo_city, a.geo_country].filter(Boolean).join(', ') || '—',
        severity: a.severity || 'medium',
        status: a.status || 'open',
        time: timeAgo(a.created_at || a.scanned_at),
      };
    });
  } catch (e) { _alerts = []; }
}
load();

export function renderPage() {
  const alerts = _alerts || [];
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('globe', 28)} Geo Anomaly Alerts${alerts.length ? ` <span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400">(${alerts.length})</span>` : ''}</h1></div>

      ${alerts.length === 0 ? '<div class="sa-card" style="padding:2rem;text-align:center;color:var(--text-secondary)">No geo alerts — all clear ✓</div>' : `
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>QR Code</th><th>Product</th><th>Location</th><th>Severity</th><th>Status</th><th>Detected</th><th>Action</th></tr></thead>
          <tbody>
            ${alerts.map(a => `
              <tr>
                <td class="sa-code">${a.qr}</td>
                <td>${a.product}</td>
                <td>${a.location}</td>
                <td><span class="sa-score sa-score-${a.severity === 'critical' ? 'danger' : a.severity === 'high' ? 'danger' : a.severity === 'medium' ? 'warning' : 'low'}">${a.severity}</span></td>
                <td><span class="sa-status-pill sa-pill-${a.status === 'open' ? 'red' : a.status === 'investigating' ? 'orange' : 'green'}">${a.status.replace('_', ' ')}</span></td>
                <td style="color:var(--text-secondary)">${a.time}</td>
                <td><button class="btn btn-xs btn-outline" onclick="showToast('🌍 Viewing geo alert: ${a.qr}','info')">View</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    </div>
  `;
}

function timeAgo(d) { if (!d) return '—'; const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`; }
