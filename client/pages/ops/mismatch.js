/**
 * Ops – Mismatch Detection
 * Reads from API /ops/data/mismatch-alerts (anomaly_detections table)
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let _mismatches = null;
async function load() {
  if (_mismatches) return;
  try {
    const res = await API.get('/ops/data/mismatch-alerts');
    _mismatches = (res.mismatches || []).map(m => {
      const d = typeof m.details === 'string' ? JSON.parse(m.details) : (m.details || {});
      return {
        id: m.source_id || m.id?.slice(0, 8) || '—',
        type: (m.anomaly_type || '').replace(/_/g, ' '),
        location: d.route || d.product || '—',
        expected: d.expected || d.system || '—',
        actual: d.received || d.physical || '—',
        variance: d.variance != null ? (d.variance > 0 ? `+${d.variance}` : `${d.variance}`) : '—',
        severity: m.severity || 'medium',
        status: m.status || 'open',
        time: timeAgo(m.detected_at),
      };
    });
  } catch (e) { _mismatches = []; }
}
load();

export function renderPage() {
  const mismatches = _mismatches || [];
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('alert', 28)} Mismatch Detection${mismatches.length ? ` <span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400">(${mismatches.length})</span>` : ''}</h1></div>

      ${mismatches.length === 0 ? '<div class="sa-card" style="padding:2rem;text-align:center;color:var(--text-secondary)">No mismatch alerts — all clear ✓</div>' : `
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>ID</th><th>Type</th><th>Source</th><th>Expected</th><th>Actual</th><th>Variance</th><th>Severity</th><th>Status</th><th>Detected</th><th>Action</th></tr></thead>
          <tbody>
            ${mismatches.map(m => `
              <tr>
                <td class="sa-code">${m.id}</td>
                <td>${m.type}</td>
                <td style="font-size:0.78rem">${m.location}</td>
                <td style="text-align:right">${m.expected}</td>
                <td style="text-align:right;font-weight:600;color:#ef4444">${m.actual}</td>
                <td style="text-align:right;color:#ef4444;font-weight:600">${m.variance}</td>
                <td><span class="sa-score sa-score-${m.severity === 'high' ? 'danger' : m.severity === 'medium' ? 'warning' : 'low'}">${m.severity}</span></td>
                <td><span class="sa-status-pill sa-pill-${m.status === 'open' ? 'red' : m.status === 'investigating' ? 'orange' : m.status === 'resolved' ? 'green' : 'blue'}">${m.status}</span></td>
                <td style="color:var(--text-secondary)">${m.time}</td>
                <td><button class="btn btn-xs btn-outline" onclick="showToast('🔍 Viewing mismatch: ${m.id}','info')">View</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    </div>
  `;
}

function timeAgo(d) { if (!d) return '—'; const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`; }
