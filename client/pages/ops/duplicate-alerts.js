/**
 * Ops – Duplicate QR Alerts
 * Reads from workspace cache or API /ops/data/duplicate-alerts
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let _alerts = null;
async function load() {
  if (_alerts) return;
  try {
    const res = await API.get('/ops/data/duplicate-alerts');
    _alerts = (res.alerts || []).map(a => ({
      qr: a.source_id || '—',
      product: tryDetail(a.details, 'product') || '—',
      locations: tryDetail(a.details, 'locations') || tryDetail(a.details, 'location') || '—',
      severity: a.severity || 'medium',
      status: a.status || 'open',
      time: timeAgo(a.detected_at),
    }));
  } catch (e) { _alerts = []; }
}
load();

function tryDetail(d, key) {
  if (!d) return null;
  const obj = typeof d === 'string' ? JSON.parse(d) : d;
  const v = obj[key];
  return Array.isArray(v) ? v.join(', ') : v;
}

export function renderPage() {
  const alerts = _alerts || [];
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('shield', 28)} Duplicate QR Alerts${alerts.length ? ` <span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400">(${alerts.length})</span>` : ''}</h1></div>

      ${alerts.length === 0 ? '<div class="sa-card" style="padding:2rem;text-align:center;color:var(--text-secondary)">No duplicate alerts — all clear ✓</div>' : `
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>QR Code</th><th>Product</th><th>Locations</th><th>Severity</th><th>Status</th><th>Detected</th><th>Action</th></tr></thead>
          <tbody>
            ${alerts.map(a => `
              <tr>
                <td class="sa-code">${a.qr}</td>
                <td>${a.product}</td>
                <td style="font-size:0.78rem">${a.locations}</td>
                <td><span class="sa-score sa-score-${a.severity === 'critical' ? 'danger' : a.severity === 'high' ? 'danger' : a.severity === 'medium' ? 'warning' : 'low'}">${a.severity}</span></td>
                <td><span class="sa-status-pill sa-pill-${a.status === 'open' ? 'red' : a.status === 'investigating' ? 'orange' : a.status === 'confirmed' ? 'red' : 'green'}">${a.status.replace('_', ' ')}</span></td>
                <td style="color:var(--text-secondary)">${a.time}</td>
                <td><button class="btn btn-xs btn-outline" onclick="showToast('🔍 Investigating duplicate: ${a.qr}','info')">Investigate</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    </div>
  `;
}

function timeAgo(d) { if (!d) return '—'; const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`; }
