/**
 * Company Admin – Scan Analytics (Internal Intelligence per Persona)
 * Real data from /api/products + /api/scm/events + /api/anomaly
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { render } from '../../core/state.js';

let data = null, loading = false;

async function load() {
  if (loading) return; loading = true;
  try {
    const [products, scans, anomalies] = await Promise.all([
      API.get('/products?limit=1&offset=0').catch(() => ({ total: 0 })),
      API.get('/scm/events?limit=100').catch(() => ({ events: [] })),
      API.get('/anomaly?limit=100').catch(() => ({ anomalies: [] })),
    ]);
    const scanList = Array.isArray(scans) ? scans : (scans.events || []);
    const anomalyList = Array.isArray(anomalies) ? anomalies : (anomalies.anomalies || anomalies.detections || []);

    const totalScans = scanList.length;
    const duplicates = scanList.filter(s => s.is_duplicate || s.event_type === 'duplicate').length;
    const dupRate = totalScans > 0 ? ((duplicates / totalScans) * 100).toFixed(1) : '0.0';
    const firstScanRate = totalScans > 0 ? (((totalScans - duplicates) / totalScans) * 100).toFixed(1) : '100.0';
    const critAnomalies = anomalyList.filter(a => a.severity === 'critical').length;
    const highAnomalies = anomalyList.filter(a => a.severity === 'high').length;

    data = { totalScans, duplicates, dupRate, firstScanRate, anomalyCount: anomalyList.length, critAnomalies, highAnomalies, scanList, anomalyList };
  } catch (e) { data = { totalScans: 0, duplicates: 0, dupRate: '0', firstScanRate: '100', anomalyCount: 0, critAnomalies: 0, highAnomalies: 0, scanList: [], anomalyList: [] }; }
  loading = false;
}

export function renderPage() {
  if (!data && !loading) { load().then(() => render()); }
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Scan Analytics...</div></div>`;

  const d = data || {};

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('search', 28)} Scan Analytics</h1></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Total Scans', d.totalScans?.toLocaleString() || '0', 'All events tracked', 'blue', 'search')}
        ${m('First Scan Rate', d.firstScanRate + '%', parseFloat(d.firstScanRate) >= 95 ? 'On target' : 'Below 95% target', 'green', 'check')}
        ${m('Duplicate Rate', d.dupRate + '%', d.duplicates + ' duplicates detected', parseFloat(d.dupRate) > 5 ? 'orange' : 'green', 'alertTriangle')}
        ${m('Anomaly Events', String(d.anomalyCount || 0), d.critAnomalies + ' critical, ' + d.highAnomalies + ' high', d.critAnomalies > 0 ? 'red' : 'orange', 'shield')}
      </div>

      <!-- Recent Scan Events -->
      <div class="sa-card" style="margin-bottom:1.5rem;border-left:4px solid #3b82f6">
        <h3>🔍 Recent Scan Events</h3>
        ${d.scanList && d.scanList.length > 0 ? `
        <table class="sa-table"><thead><tr><th>Event Type</th><th>Product</th><th>Location</th><th>Time</th><th>Status</th></tr></thead><tbody>
          ${d.scanList.slice(0, 15).map(s => `
            <tr>
              <td><strong>${(s.event_type || s.type || 'scan').replace(/_/g, ' ')}</strong></td>
              <td>${s.product_name || s.product_id?.substring(0, 8) || '—'}</td>
              <td>${s.location || s.city || '—'}</td>
              <td style="color:var(--text-secondary)">${s.created_at ? new Date(s.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
              <td><span class="sa-status-pill sa-pill-${s.is_duplicate ? 'red' : s.event_type === 'first_scan' ? 'green' : 'blue'}">${s.is_duplicate ? 'duplicate' : s.event_type || 'scan'}</span></td>
            </tr>
          `).join('')}
        </tbody></table>` : '<div style="text-align:center;padding:30px;color:var(--text-muted)">No scan events yet</div>'}
      </div>

      <!-- Anomalies -->
      <div class="sa-card" style="border-left:4px solid #ef4444">
        <h3>🚨 Anomaly Detections</h3>
        ${d.anomalyList && d.anomalyList.length > 0 ? `
        <table class="sa-table"><thead><tr><th>Type</th><th>Severity</th><th>Description</th><th>Confidence</th><th>Time</th></tr></thead><tbody>
          ${d.anomalyList.slice(0, 10).map(a => `
            <tr>
              <td><strong>${(a.anomaly_type || a.type || '—').replace(/_/g, ' ')}</strong></td>
              <td><span class="sa-score sa-score-${a.severity === 'critical' ? 'danger' : a.severity === 'high' ? 'warning' : 'info'}">${a.severity || 'medium'}</span></td>
              <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.description || '—'}</td>
              <td class="sa-code">${a.confidence ? (a.confidence * 100).toFixed(0) + '%' : '—'}</td>
              <td style="color:var(--text-secondary)">${a.created_at ? new Date(a.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
            </tr>
          `).join('')}
        </tbody></table>` : '<div style="text-align:center;padding:30px;color:var(--text-muted)">No anomalies detected</div>'}
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
