/**
 * Ops – Open Incident Cases
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
  const cases = [
    { id: 'OPS-0045', title: 'Batch B-2026-0888 contamination risk', batch: 'B-2026-0888', region: 'HCM', assigned: 'ops@company.com', sla: '2h remaining', severity: 'critical', status: 'open', created: '1h ago' },
    { id: 'OPS-0044', title: 'Quantity mismatch T-4520 (20 units)', batch: 'B-2026-0891', region: 'BKK', assigned: 'warehouse@company.com', sla: '6h remaining', severity: 'high', status: 'investigating', created: '35 min ago' },
    { id: 'OPS-0043', title: 'Duplicate QR detected — retail shelf', batch: 'B-2026-0850', region: 'PNH', assigned: 'field@company.com', sla: '12h remaining', severity: 'medium', status: 'open', created: '2h ago' },
  ];

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('alertTriangle', 28)} Open Cases</h1>
        <div class="sa-title-actions">
          <button class="btn btn-primary btn-sm" onclick="showToast('🧴 Incident ticket creation coming soon','info')">+ Create Ticket</button>
        </div>
      </div>

      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>Case ID</th><th>Title</th><th>Batch</th><th>Region</th><th>Assigned</th><th>SLA</th><th>Severity</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${cases.map(c => `
              <tr class="sa-row-clickable">
                <td><strong class="sa-code">${c.id}</strong></td>
                <td>${c.title}</td>
                <td class="sa-code">${c.batch}</td>
                <td>${c.region}</td>
                <td style="font-size:0.78rem">${c.assigned}</td>
                <td><span style="color:${c.sla.includes('2h') ? '#ef4444' : '#f59e0b'};font-weight:600;font-size:0.78rem">${c.sla}</span></td>
                <td><span class="sa-score sa-score-${c.severity === 'critical' ? 'danger' : c.severity === 'high' ? 'warning' : 'info'}">${c.severity}</span></td>
                <td><span class="sa-status-pill sa-pill-${c.status === 'open' ? 'red' : 'orange'}">${c.status}</span></td>
                <td>
                  <button class="btn btn-xs btn-outline" onclick="showToast('Viewing incident: ${inc.id}','info')">View</button>
                  <button class="btn btn-xs btn-ghost" onclick="showToast('Assign: ${inc.id} — coming soon','info')">Assign</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
