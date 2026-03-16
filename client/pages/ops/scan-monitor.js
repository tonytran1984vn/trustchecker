/**
 * Ops – Scan Monitor (Premium Design)
 * ═════════════════════════════════════
 * Live scan feed with stats cards and clean scan table.
 */
import { icon } from '../../core/icons.js';

const ACCENT = '#0d9488';

export function renderPage() {
  const cache = window._opsMonCache || {};
  const raw = cache.scanHistory?.scans || [];

  const scans = raw.slice(0, 25).map(s => ({
    qr: s.qr_data || s.qr_code || shortId(s.id),
    product: s.product_name || s.sku || '—',
    location: [s.geo_city, s.geo_country].filter(Boolean).join(', ') || '—',
    device: (s.user_agent || '').includes('iPhone') ? 'iPhone' : (s.user_agent || '').includes('Android') ? 'Android' : 'Browser',
    type: s.fraud_score > 0.7 ? 'duplicate' : s.fraud_score > 0.3 ? 'anomaly' : s.scan_type || 'verification',
    time: timeAgo(s.scanned_at),
    rawTime: s.scanned_at,
  }));

  const total = raw.length;
  const valid = raw.filter(s => !s.fraud_score || s.fraud_score < 0.3).length;
  const anomalies = raw.filter(s => s.fraud_score >= 0.3 && s.fraud_score < 0.7).length;
  const duplicates = raw.filter(s => s.fraud_score >= 0.7).length;
  const validPct = total > 0 ? Math.round(valid / total * 100) : 0;

  const typeStyle = {
    verification: { c: '#3b82f6', bg: 'rgba(59,130,246,0.08)', label: 'Verified' },
    first_scan:   { c: '#22c55e', bg: 'rgba(34,197,94,0.08)',  label: 'First Scan' },
    activation:   { c: ACCENT,    bg: 'rgba(13,148,136,0.08)', label: 'Activated' },
    duplicate:    { c: '#ef4444', bg: 'rgba(239,68,68,0.08)',  label: '⚠ Duplicate' },
    anomaly:      { c: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: '⚠ Anomaly' },
  };

  return `
    <div class="sa-page">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
        <div style="display:flex;align-items:center;gap:10px">
          <h2 style="margin:0;font-size:1.1rem;font-weight:600">Scan Monitor</h2>
          <span style="display:flex;align-items:center;gap:5px;font-size:0.72rem;color:#22c55e;font-weight:600">
            <span style="width:7px;height:7px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite"></span>LIVE
          </span>
        </div>
      </div>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:1.5rem">
        ${scanStat(icon('search', 20, '#3b82f6'), 'Total Scans', total.toLocaleString(), '#3b82f6', '')}
        ${scanStat(icon('check', 20, '#22c55e'), 'Valid', valid.toLocaleString(), '#22c55e', `${validPct}% rate`)}
        ${scanStat(icon('alertTriangle', 20, '#f59e0b'), 'Anomalies', anomalies.toString(), '#f59e0b', anomalies > 0 ? 'Review needed' : '')}
        ${scanStat(icon('x', 20, '#ef4444'), 'Duplicates', duplicates.toString(), '#ef4444', duplicates > 0 ? 'Investigate' : '')}
      </div>

      <!-- Scan Table -->
      <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:20px 24px">
        <h3 style="margin:0 0 16px;font-size:0.95rem;font-weight:600">Recent Scans</h3>
        ${scans.length === 0 ? `<div style="text-align:center;padding:3rem;color:var(--text-secondary)">No scan data available</div>` : `
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:0.82rem">
            <thead><tr>
              <th style="${th}">QR Code</th><th style="${th}">Product</th><th style="${th}">Location</th>
              <th style="${th}">Device</th><th style="${th}">Type</th><th style="${th}">Time</th>
            </tr></thead>
            <tbody>
              ${scans.map(s => {
                const ts = typeStyle[s.type] || typeStyle.verification;
                const isAlert = s.type === 'duplicate' || s.type === 'anomaly';
                return `<tr style="transition:background 0.15s;${isAlert ? `background:${ts.bg}` : ''}" onmouseover="this.style.background='${isAlert ? ts.bg : 'rgba(13,148,136,0.02)'}'" onmouseout="this.style.background='${isAlert ? ts.bg : ''}'">
                  <td style="${td}"><span style="font-family:monospace;font-size:0.78rem;color:var(--text-primary)">${s.qr}</span></td>
                  <td style="${td}">${s.product}</td>
                  <td style="${td}font-size:0.78rem;color:var(--text-secondary)">${s.location}</td>
                  <td style="${td}font-size:0.78rem">${s.device}</td>
                  <td style="${td}"><span style="font-size:0.65rem;padding:3px 8px;border-radius:12px;font-weight:600;background:${ts.bg};color:${ts.c}">${ts.label}</span></td>
                  <td style="${td}font-size:0.75rem;color:var(--text-secondary)">${s.time}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
      </div>
    </div>
  `;
}

const th = 'padding:10px 12px;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);border-bottom:1px solid var(--border-color,rgba(0,0,0,0.06));text-align:left;';
const td = 'padding:12px 12px;border-bottom:1px solid var(--border-color,rgba(0,0,0,0.04));';
function shortId(id) { return id ? id.slice(0, 10) : '—'; }
function timeAgo(d) { if (!d) return '—'; const m = Math.floor((Date.now()-new Date(d).getTime())/60000); if (m < 1) return 'Just now'; if (m < 60) return `${m}m ago`; const h = Math.floor(m/60); if (h < 24) return `${h}h ago`; return `${Math.floor(h/24)}d ago`; }
function scanStat(iconHtml, label, value, color, sub) {
  return `<div style="background:var(--card-bg);border-radius:12px;padding:16px 20px;border:1px solid var(--border-color,rgba(0,0,0,0.06))">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div style="width:32px;height:32px;border-radius:8px;background:${color}10;display:flex;align-items:center;justify-content:center">${iconHtml}</div>
    </div>
    <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-secondary);font-weight:600">${label}</div>
    <div style="font-size:1.5rem;font-weight:700;color:var(--text-primary);line-height:1.2">${value}</div>
    ${sub ? `<div style="font-size:0.65rem;color:${color};margin-top:4px;font-weight:500">${sub}</div>` : ''}
  </div>`;
}
