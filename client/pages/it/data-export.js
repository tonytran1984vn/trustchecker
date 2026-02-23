/**
 * IT – Data Export Control
 */
import { icon } from '../../core/icons.js';
export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('scroll', 28)} Data Export</h1></div>
      <div class="sa-card" style="margin-bottom:1rem">
        <h3>Export Permissions</h3>
        <table class="sa-table"><thead><tr><th>Data Type</th><th>Roles Allowed</th><th>Requires Approval</th><th>Max Records</th></tr></thead><tbody>
          <tr><td><strong>Scan Events</strong></td><td>admin, risk_officer, compliance_officer</td><td>No</td><td>50,000</td></tr>
          <tr><td><strong>User PII</strong></td><td>admin, compliance_officer</td><td>Yes (Compliance)</td><td>1,000</td></tr>
          <tr><td><strong>Fraud Events</strong></td><td>risk_officer, compliance_officer</td><td>No</td><td>10,000</td></tr>
          <tr><td><strong>Audit Logs</strong></td><td>compliance_officer</td><td>No</td><td>Unlimited</td></tr>
        </tbody></table>
      </div>
      <div class="sa-card">
        <h3>Scheduled Exports</h3>
        <table class="sa-table"><thead><tr><th>Name</th><th>Data</th><th>Schedule</th><th>Destination</th><th>Status</th></tr></thead><tbody>
          <tr><td><strong>Daily Scan Report</strong></td><td>Scan summary</td><td>Daily 6:00 AM</td><td>SFTP → reports.company.com</td><td><span class="sa-status-pill sa-pill-green">active</span></td></tr>
          <tr><td><strong>Weekly Fraud Digest</strong></td><td>Fraud events</td><td>Monday 8:00 AM</td><td>Email → risk@company.com</td><td><span class="sa-status-pill sa-pill-green">active</span></td></tr>
        </tbody></table>
        <button class="btn btn-sm btn-ghost" style="margin-top:0.75rem">+ Create Schedule</button>
      </div>
    </div>`;
}
