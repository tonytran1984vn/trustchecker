/**
 * Super Admin – Data Governance
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('lock', 28)} Data Governance</h1></div>
      <div class="sa-grid-2col">
        <div class="sa-card">
          <h3>Data Retention Policy</h3>
          <div class="sa-detail-grid">
            <div class="sa-detail-item"><span class="sa-detail-label">Scan Logs</span><span>365 days</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Audit Logs</span><span>730 days (2 years)</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">User Sessions</span><span>90 days</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">API Request Logs</span><span>180 days</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Fraud Events</span><span>1095 days (3 years)</span></div>
          </div>
        </div>
        <div class="sa-card">
          <h3>Auto-Purge Configuration</h3>
          <div class="sa-detail-grid">
            <div class="sa-detail-item"><span class="sa-detail-label">Auto-Purge</span><span class="sa-mfa-on">Enabled</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Schedule</span><span>Weekly (Sunday 02:00 UTC)</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Last Run</span><span>2026-02-16 · 14.2K records purged</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Next Run</span><span>2026-02-23 02:00 UTC</span></div>
          </div>
        </div>
        <div class="sa-card">
          <h3>GDPR Deletion Queue</h3>
          <table class="sa-table sa-table-compact">
            <thead><tr><th>Request ID</th><th>Organization</th><th>Type</th><th>Submitted</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td class="sa-code">DEL-0089</td><td>FreshMart EU</td><td>User Data Erasure</td><td>2026-02-18</td><td><span class="sa-status-pill sa-pill-orange">Pending</span></td></tr>
              <tr><td class="sa-code">DEL-0088</td><td>HealthPlus Co</td><td>Account Deletion</td><td>2026-02-15</td><td><span class="sa-status-pill sa-pill-green">Completed</span></td></tr>
              <tr><td class="sa-code">DEL-0087</td><td>GreenLeaf Org</td><td>Data Export + Delete</td><td>2026-02-10</td><td><span class="sa-status-pill sa-pill-green">Completed</span></td></tr>
            </tbody>
          </table>
        </div>
        <div class="sa-card">
          <h3>Export Restrictions</h3>
          <div class="sa-detail-grid">
            <div class="sa-detail-item"><span class="sa-detail-label">Bulk Export</span><span>Admin approval required</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Cross-Border</span><span>EU → Non-EU restricted</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">PII in Exports</span><span>Auto-masked unless authorized</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
}
