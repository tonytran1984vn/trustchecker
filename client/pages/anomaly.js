/**
 * TrustChecker – Anomaly Page
 */
import { State, render } from '../core/state.js';
import { timeAgo } from '../utils/helpers.js';

export function renderPage() {
  const d = State.anomalyData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading anomaly data...</span></div>';
  return `
    <div class="stats-grid">
      <div class="stat-card rose"><div class="stat-icon">⚡</div><div class="stat-value">${d.total || 0}</div><div class="stat-label">Total Anomalies</div></div>
      <div class="stat-card amber"><div class="stat-icon">🔴</div><div class="stat-value">${d.by_severity?.critical || 0}</div><div class="stat-label">Critical</div></div>
      <div class="stat-card violet"><div class="stat-icon">🟡</div><div class="stat-value">${d.by_severity?.high || 0}</div><div class="stat-label">High</div></div>
      <div class="stat-card emerald"><div class="stat-icon">🟢</div><div class="stat-value">${d.by_severity?.medium || 0}</div><div class="stat-label">Medium</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">⚡ Anomaly Detections</div></div>
      <table class="data-table"><thead><tr><th>Time</th><th>Type</th><th>Severity</th><th>Source</th><th>Score</th><th>Description</th><th>Status</th></tr></thead><tbody>
        ${(d.detections || []).map(a => `<tr><td>${timeAgo(a.detected_at)}</td><td>${a.anomaly_type}</td><td><span class="badge ${a.severity === 'critical' ? 'badge-red' : a.severity === 'high' ? 'badge-amber' : 'badge-cyan'}">${a.severity}</span></td><td>${a.source_type}</td><td>${a.score?.toFixed(2) || '—'}</td><td style="font-size:0.8rem;max-width:200px;overflow:hidden;text-overflow:ellipsis">${a.description}</td><td><span class="badge ${a.status === 'open' ? 'badge-red' : 'badge-green'}">${a.status}</span></td></tr>`).join('')}
      </tbody></table>
    </div>`;
}

// Window exports for onclick handlers

