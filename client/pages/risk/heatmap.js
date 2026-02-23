/**
 * Risk – Heatmap & Anomaly Clustering
 * Visual risk intelligence: geo heatmap, anomaly clusters, pattern detection
 */
import { icon } from '../../core/icons.js';

const GEO_RISK = [
    { region: 'Ho Chi Minh City', code: 'VN-HCM', scans: 45200, alerts: 23, riskScore: 72, trend: '↑', topIssue: 'Duplicate scan cluster (Dist. D-VN-012)' },
    { region: 'Hanoi', code: 'VN-HN', scans: 32100, alerts: 8, riskScore: 35, trend: '↓', topIssue: 'Geo mismatch: expected factory only' },
    { region: 'Bangkok', code: 'TH-BKK', scans: 18700, alerts: 15, riskScore: 65, trend: '↑', topIssue: 'Velocity spike: 300 scans/5min' },
    { region: 'Singapore', code: 'SG', scans: 12400, alerts: 2, riskScore: 12, trend: '→', topIssue: 'Normal operations' },
    { region: 'Jakarta', code: 'ID-JK', scans: 8900, alerts: 19, riskScore: 82, trend: '↑', topIssue: 'Parallel distribution leak detected' },
    { region: 'Manila', code: 'PH-MNL', scans: 6200, alerts: 4, riskScore: 28, trend: '↓', topIssue: 'Minor timing anomaly' },
    { region: 'Tokyo', code: 'JP-TK', scans: 4100, alerts: 0, riskScore: 5, trend: '→', topIssue: 'Clean' },
    { region: 'Phnom Penh', code: 'KH-PP', scans: 2800, alerts: 31, riskScore: 95, trend: '↑', topIssue: '<span class="status-icon status-warn" aria-label="Warning">!</span> CRITICAL: Counterfeit cluster detected' },
];

const ANOMALY_CLUSTERS = [
    { id: 'AC-089', type: 'Counterfeit Ring', confidence: '94%', size: '148 events', region: 'KH-PP', firstSeen: '3d ago', status: 'investigating', desc: 'Same batch ID scanned from 12 unrelated locations within 4h' },
    { id: 'AC-088', type: 'Parallel Import', confidence: '87%', size: '63 events', region: 'ID-JK', firstSeen: '5d ago', status: 'investigating', desc: 'Products appearing in unauthorized distributor channel' },
    { id: 'AC-087', type: 'Velocity Anomaly', confidence: '78%', size: '312 events', region: 'TH-BKK', firstSeen: '1d ago', status: 'new', desc: '8x normal scan rate from single IP range' },
    { id: 'AC-086', type: 'Timing Pattern', confidence: '71%', size: '89 events', region: 'VN-HCM', firstSeen: '7d ago', status: 'monitoring', desc: 'Scans exclusively at 02:00-04:00 from distributor warehouse' },
    { id: 'AC-085', type: 'Duplicate Cluster', confidence: '92%', size: '201 events', region: 'VN-HCM', firstSeen: '2d ago', status: 'escalated', desc: 'Same QR codes appearing in 3 different provinces simultaneously' },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('alertTriangle', 28)} Risk Heatmap & Anomaly Intelligence</h1></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Active Regions', GEO_RISK.length, `${GEO_RISK.filter(g => g.riskScore > 60).length} high-risk`, 'blue', 'globe')}
        ${m('Total Alerts (7d)', GEO_RISK.reduce((s, g) => s + g.alerts, 0), 'Across all regions', 'red', 'alertTriangle')}
        ${m('Anomaly Clusters', ANOMALY_CLUSTERS.length, `${ANOMALY_CLUSTERS.filter(a => a.status === 'investigating').length} under investigation`, 'orange', 'search')}
        ${m('Highest Risk', 'KH-PP: 95', '<span class="status-icon status-warn" aria-label="Warning">!</span> Counterfeit detection', 'red', 'shield')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🗺 Geographic Risk Heatmap</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Risk score weighted by alert density, scan anomalies, and confirmed fraud cases.</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.75rem;margin-bottom:1rem">
          ${GEO_RISK.map(g => {
        const bg = g.riskScore > 80 ? 'rgba(239,68,68,0.12)' : g.riskScore > 50 ? 'rgba(245,158,11,0.1)' : g.riskScore > 25 ? 'rgba(59,130,246,0.06)' : 'rgba(34,197,94,0.06)';
        const border = g.riskScore > 80 ? '#ef4444' : g.riskScore > 50 ? '#f59e0b' : g.riskScore > 25 ? '#3b82f6' : '#22c55e';
        return `<div style="background:${bg};border:1px solid ${border}30;border-left:4px solid ${border};border-radius:8px;padding:0.75rem">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <strong style="font-size:0.85rem">${g.region}</strong>
                <span style="font-size:0.72rem;color:var(--text-secondary)">${g.code}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:0.5rem">
                <div><div style="font-size:1.4rem;font-weight:800;color:${border}">${g.riskScore}</div><div style="font-size:0.65rem;color:var(--text-secondary)">Risk Score</div></div>
                <div style="text-align:right"><div style="font-size:0.85rem;font-weight:600">${g.alerts}</div><div style="font-size:0.65rem;color:var(--text-secondary)">Alerts</div></div>
                <div style="text-align:right"><div style="font-size:0.85rem">${g.trend}</div><div style="font-size:0.65rem;color:var(--text-secondary)">Trend</div></div>
              </div>
              <div style="font-size:0.68rem;color:var(--text-secondary);margin-top:0.5rem;border-top:1px solid ${border}15;padding-top:0.4rem">${g.topIssue}</div>
            </div>`;
    }).join('')}
        </div>
        <div style="display:flex;gap:1.5rem;font-size:0.72rem;color:var(--text-secondary);padding:0.5rem;border-top:1px solid var(--border)">
          <span><span style="display:inline-block;width:12px;height:12px;background:#ef4444;border-radius:3px;vertical-align:middle"></span> Critical (80+)</span>
          <span><span style="display:inline-block;width:12px;height:12px;background:#f59e0b;border-radius:3px;vertical-align:middle"></span> High (50-80)</span>
          <span><span style="display:inline-block;width:12px;height:12px;background:#3b82f6;border-radius:3px;vertical-align:middle"></span> Medium (25-50)</span>
          <span><span style="display:inline-block;width:12px;height:12px;background:#22c55e;border-radius:3px;vertical-align:middle"></span> Low (&lt;25)</span>
        </div>
      </div>

      <div class="sa-card">
        <h3>🔬 AI Anomaly Clusters</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Machine learning pattern detection groups related suspicious events into investigation clusters.</p>
        <table class="sa-table"><thead><tr><th>ID</th><th>Type</th><th>Confidence</th><th>Size</th><th>Region</th><th>Description</th><th>First Seen</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${ANOMALY_CLUSTERS.map(a => {
        const color = a.status === 'escalated' ? 'red' : a.status === 'investigating' ? 'orange' : a.status === 'new' ? 'blue' : 'green';
        return `<tr class="${a.status === 'escalated' ? 'ops-alert-row' : ''}">
              <td class="sa-code">${a.id}</td>
              <td><strong>${a.type}</strong></td>
              <td style="font-weight:700;color:${parseFloat(a.confidence) > 85 ? '#ef4444' : '#f59e0b'}">${a.confidence}</td>
              <td>${a.size}</td><td class="sa-code">${a.region}</td>
              <td style="font-size:0.78rem;max-width:280px">${a.desc}</td>
              <td>${a.firstSeen}</td>
              <td><span class="sa-status-pill sa-pill-${color}">${a.status}</span></td>
              <td><button class="btn btn-xs btn-outline">Investigate</button></td>
            </tr>`;
    }).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
