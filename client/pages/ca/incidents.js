/**
 * Company Admin – Incident Management (Tenant Scope)
 * ════════════════════════════════════════════════════
 * Create, assign, add evidence, close incidents — company only
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const incidents = [
        { id: 'INC-2026-034', title: 'Duplicate QR detected on retail shelf', severity: 'high', assignee: 'Nguyen Van A', status: 'investigating', created: '2h ago' },
        { id: 'INC-2026-033', title: 'Suspicious scan pattern — Batch 0138', severity: 'critical', assignee: 'Le Thi B', status: 'open', created: '5h ago' },
        { id: 'INC-2026-032', title: 'Geo anomaly: scan from restricted region', severity: 'medium', assignee: 'Tran Van C', status: 'investigating', created: '1d ago' },
        { id: 'INC-2026-031', title: 'Customer complaint — product mismatch', severity: 'low', assignee: 'Pham Thi D', status: 'resolved', created: '2d ago' },
        { id: 'INC-2026-030', title: 'API rate limit breach from partner', severity: 'medium', assignee: 'Nguyen Van E', status: 'closed', created: '3d ago' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('alertTriangle', 28)} Incident Management</h1>
        <div class="sa-title-actions">
          <button class="btn btn-primary btn-sm">+ Create Incident</button>
        </div>
      </div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        <div class="sa-metric-card sa-metric-red"><div class="sa-metric-body"><div class="sa-metric-value">2</div><div class="sa-metric-label">Open</div></div></div>
        <div class="sa-metric-card sa-metric-orange"><div class="sa-metric-body"><div class="sa-metric-value">1</div><div class="sa-metric-label">Investigating</div></div></div>
        <div class="sa-metric-card sa-metric-green"><div class="sa-metric-body"><div class="sa-metric-value">1</div><div class="sa-metric-label">Resolved</div></div></div>
        <div class="sa-metric-card sa-metric-blue"><div class="sa-metric-body"><div class="sa-metric-value">1</div><div class="sa-metric-label">Closed</div></div></div>
      </div>

      <div class="sa-card">
        <table class="sa-table">
          <thead>
            <tr><th>ID</th><th>Title</th><th>Severity</th><th>Assignee</th><th>Status</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${incidents.map(i => `
              <tr class="sa-row-clickable">
                <td><strong class="sa-code">${i.id}</strong></td>
                <td>${i.title}</td>
                <td><span class="sa-score sa-score-${i.severity === 'critical' ? 'danger' : i.severity === 'high' ? 'warning' : i.severity === 'medium' ? 'info' : 'low'}">${i.severity}</span></td>
                <td>${i.assignee}</td>
                <td><span class="sa-status-pill sa-pill-${i.status === 'open' ? 'red' : i.status === 'investigating' ? 'orange' : i.status === 'resolved' ? 'green' : 'blue'}">${i.status}</span></td>
                <td style="color:var(--text-secondary)">${i.created}</td>
                <td>
                  <button class="btn btn-xs btn-outline">View</button>
                  <button class="btn btn-xs btn-ghost">⋯</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
