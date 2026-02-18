/**
 * TrustChecker – Fraud Page
 */
import { State, render } from '../core/state.js';
import { timeAgo } from '../utils/helpers.js';

export function renderPage() {
  return `
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
      <div class="stat-card rose"><div class="stat-icon">🔴</div><div class="stat-value">${State.fraudAlerts.filter(a => a.severity === 'critical').length}</div><div class="stat-label">Critical</div></div>
      <div class="stat-card amber"><div class="stat-icon">🟡</div><div class="stat-value">${State.fraudAlerts.filter(a => a.severity === 'high').length}</div><div class="stat-label">High</div></div>
      <div class="stat-card violet"><div class="stat-icon">🟣</div><div class="stat-value">${State.fraudAlerts.filter(a => a.severity === 'medium').length}</div><div class="stat-label">Medium</div></div>
      <div class="stat-card cyan"><div class="stat-icon">🔵</div><div class="stat-value">${State.fraudAlerts.filter(a => a.severity === 'low').length}</div><div class="stat-label">Low</div></div>
    </div>
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-title">🚨 Active Fraud Alerts</div>
        <button class="btn btn-sm" onclick="exportFraudCSV()">📊 Export CSV</button>
      </div>
      <div class="table-container">
        <table>
          <tr><th>Severity</th><th>Type</th><th>Product</th><th>Description</th><th>Time</th></tr>
          ${(State.fraudAlerts || []).map(a => `
            <tr>
              <td><span class="badge ${a.severity}">${a.severity}</span></td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${a.alert_type}</td>
              <td style="font-weight:600">${a.product_name || '—'}</td>
              <td style="font-size:0.78rem;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.description}</td>
              <td class="event-time">${timeAgo(a.created_at)}</td>
            </tr>
          `).join('')}
        </table>
      </div>
      ${!State.fraudAlerts.length ? '<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">No active fraud alerts</div></div>' : ''}
    </div>
  `;
}

// Window exports for onclick handlers

