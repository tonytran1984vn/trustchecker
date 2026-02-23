/**
 * Super Admin – Incident Center
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('alert', 28)} Incident Center</h1></div>
      <div class="sa-grid-2col">
        <div class="sa-card">
          <h3>Active Incidents</h3>
          ${incident('INC-2041', 'Queue Backlog Spike', 'warning', '45 min ago', 'RabbitMQ queue depth exceeded 300 threshold. Auto-scaling triggered.')}
          <div class="sa-empty-state" style="margin-top:1rem">No critical incidents active</div>
        </div>
        <div class="sa-card">
          <h3>SLA Breach Alerts</h3>
          <div class="sa-detail-grid">
            <div class="sa-detail-item"><span class="sa-detail-label">Active Breaches</span><span>0</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">30d SLA Score</span><span class="sa-score sa-score-low" style="color:var(--accent-green)">99.97%</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Target</span><span>99.95%</span></div>
          </div>
        </div>
        <div class="sa-card">
          <h3>Recent Outage History</h3>
          <table class="sa-table sa-table-compact">
            <thead><tr><th>Date</th><th>Service</th><th>Duration</th><th>Impact</th></tr></thead>
            <tbody>
              <tr><td>2026-02-10</td><td>QR Engine</td><td>3 min</td><td>Partial — scan delays</td></tr>
              <tr><td>2026-01-28</td><td>Auth Service</td><td>8 min</td><td>Full — login unavailable</td></tr>
              <tr><td>2026-01-15</td><td>DB Cluster</td><td>2 min</td><td>Minimal — failover</td></tr>
            </tbody>
          </table>
        </div>
        <div class="sa-card">
          <h3>Maintenance Windows</h3>
          <table class="sa-table sa-table-compact">
            <thead><tr><th>Scheduled</th><th>Service</th><th>Type</th><th>Duration</th></tr></thead>
            <tbody>
              <tr><td>2026-02-22 03:00 UTC</td><td>DB Cluster</td><td>Upgrade</td><td>~30 min</td></tr>
              <tr><td>2026-03-01 02:00 UTC</td><td>Full Platform</td><td>Security Patch</td><td>~15 min</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function incident(id, title, severity, time, desc) {
    return `
    <div class="sa-incident sa-incident-${severity}">
      <div class="sa-incident-header">
        <span class="sa-code">${id}</span>
        <span class="sa-status-pill sa-pill-${severity === 'critical' ? 'red' : 'orange'}">${severity}</span>
      </div>
      <div class="sa-incident-title">${title}</div>
      <div class="sa-incident-desc">${desc}</div>
      <div class="sa-incident-time">${time}</div>
    </div>
  `;
}
