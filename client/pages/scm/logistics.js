/**
 * TrustChecker – Scm Logistics Page
 */
import { State, render } from '../../core/state.js';
import { timeAgo } from '../../utils/helpers.js';

export function renderPage() {
  const ships = State.scmShipments;
  const sla = State.scmSlaViolations;
  const opt = State.scmOptimization;
  if (!ships) return '<div class="loading"><div class="spinner"></div></div>';
  const list = ships.shipments || [];
  const violations = sla?.violations || [];

  return `
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card cyan"><div class="stat-icon">🚚</div><div class="stat-value">${list.length}</div><div class="stat-label">Shipments</div></div>
      <div class="stat-card emerald"><div class="stat-icon">✅</div><div class="stat-value">${list.filter(s => s.status === 'delivered').length}</div><div class="stat-label">Delivered</div></div>
      <div class="stat-card amber"><div class="stat-icon">🚛</div><div class="stat-value">${list.filter(s => s.status === 'in_transit').length}</div><div class="stat-label">In Transit</div></div>
      <div class="stat-card ${violations.length > 0 ? 'rose' : 'emerald'}"><div class="stat-icon">⚠️</div><div class="stat-value">${violations.length}</div><div class="stat-label">SLA Breaches</div></div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><div class="card-title">🚚 Active Shipments</div></div>
      <div class="table-container">
        <table>
          <tr><th>Tracking</th><th>From</th><th>To</th><th>Carrier</th><th>Status</th><th>ETA</th></tr>
          ${list.map(s => `
            <tr>
              <td class="shipment-tracking">${s.tracking_number || '—'}</td>
              <td style="font-size:0.78rem">${s.from_name || '—'}</td>
              <td style="font-size:0.78rem">${s.to_name || '—'}</td>
              <td style="font-size:0.78rem">${s.carrier || '—'}</td>
              <td><span class="badge ${s.status === 'delivered' ? 'valid' : s.status === 'in_transit' ? 'warning' : 'suspicious'}">${s.status}</span></td>
              <td class="shipment-eta">${s.estimated_delivery ? timeAgo(s.estimated_delivery) : '—'}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">⚠️ SLA Violations</div></div>
        ${violations.length ? `
          <div class="table-container">
            <table>
              <tr><th>Partner</th><th>Type</th><th>Actual</th><th>Threshold</th><th>Penalty</th></tr>
              ${violations.map(v => `
                <tr>
                  <td style="font-weight:600">${v.partner_name || '—'}</td>
                  <td><span class="badge warning">${v.violation_type}</span></td>
                  <td style="font-family:'JetBrains Mono';color:var(--rose)">${Math.round(v.actual_value)}h</td>
                  <td style="font-family:'JetBrains Mono'">${v.threshold_value}h</td>
                  <td style="font-family:'JetBrains Mono';color:var(--amber)">$${v.penalty_amount}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        ` : '<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">No SLA violations</div></div>'}
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">🤖 AI Optimization</div></div>
         ${opt ? `
          <div class="ai-panel">
            <div class="ai-panel-title">🧠 Delay Prediction</div>
            <div class="ai-panel-grid">
              <div>Predicted Delay: <strong style="color:${opt.delay_prediction?.risk === 'high' ? 'var(--rose)' : 'var(--emerald)'}">${opt.delay_prediction?.predicted_delay_hours || 0}h</strong></div>
              <div>Risk: <span class="badge ${opt.delay_prediction?.risk === 'high' ? 'suspicious' : opt.delay_prediction?.risk === 'medium' ? 'warning' : 'valid'}">${opt.delay_prediction?.risk || 'low'}</span></div>
              <div>Confidence: ${Math.round((opt.delay_prediction?.confidence || 0) * 100)}%</div>
              <div>Samples: ${opt.delay_prediction?.samples || 0}</div>
            </div>
          </div>
          <div class="ai-panel">
            <div class="ai-panel-title">📊 Bottleneck Detection</div>
            <div class="ai-panel-grid">
              <div>Network Health: <span class="badge ${opt.bottlenecks?.health === 'healthy' ? 'valid' : opt.bottlenecks?.health === 'warning' ? 'warning' : 'suspicious'}">${opt.bottlenecks?.health || 'unknown'}</span></div>
              <div>Bottlenecks: <strong>${opt.bottlenecks?.bottleneck_count || 0}</strong> / ${opt.bottlenecks?.total_nodes || 0} nodes</div>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Window exports for onclick handlers

