/**
 * Ops – Mismatch Detection
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const mismatches = [
        { id: 'MM-0034', transfer: 'T-4520', type: 'Quantity', expected: '300', actual: '280', severity: 'high', status: 'open', time: '35 min ago' },
        { id: 'MM-0033', transfer: 'T-4515', type: 'Location', expected: 'SGN-01', actual: 'SGN-03', severity: 'medium', status: 'investigating', time: '4h ago' },
        { id: 'MM-0032', transfer: 'T-4510', type: 'Early Activation', expected: 'After receiving', actual: 'Scanned in transit', severity: 'high', status: 'resolved', time: '1d ago' },
        { id: 'MM-0031', transfer: 'T-4505', type: 'Quantity', expected: '500', actual: '498', severity: 'low', status: 'closed', time: '3d ago' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('alert', 28)} Mismatch Detection</h1></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        <div class="sa-metric-card sa-metric-red"><div class="sa-metric-body"><div class="sa-metric-value">1</div><div class="sa-metric-label">Open</div></div></div>
        <div class="sa-metric-card sa-metric-orange"><div class="sa-metric-body"><div class="sa-metric-value">1</div><div class="sa-metric-label">Investigating</div></div></div>
        <div class="sa-metric-card sa-metric-green"><div class="sa-metric-body"><div class="sa-metric-value">1</div><div class="sa-metric-label">Resolved</div></div></div>
        <div class="sa-metric-card sa-metric-blue"><div class="sa-metric-body"><div class="sa-metric-value">1</div><div class="sa-metric-label">Closed</div></div></div>
      </div>

      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>ID</th><th>Transfer</th><th>Type</th><th>Expected</th><th>Actual</th><th>Severity</th><th>Status</th><th>Time</th><th>Actions</th></tr></thead>
          <tbody>
            ${mismatches.map(m => `
              <tr class="sa-row-clickable">
                <td class="sa-code">${m.id}</td>
                <td class="sa-code">${m.transfer}</td>
                <td><strong>${m.type}</strong></td>
                <td>${m.expected}</td>
                <td style="color:#ef4444;font-weight:600">${m.actual}</td>
                <td><span class="sa-score sa-score-${m.severity === 'high' ? 'danger' : m.severity === 'medium' ? 'warning' : 'low'}">${m.severity}</span></td>
                <td><span class="sa-status-pill sa-pill-${m.status === 'open' ? 'red' : m.status === 'investigating' ? 'orange' : m.status === 'resolved' ? 'green' : 'blue'}">${m.status}</span></td>
                <td style="color:var(--text-secondary)">${m.time}</td>
                <td><button class="btn btn-xs btn-outline">View</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
