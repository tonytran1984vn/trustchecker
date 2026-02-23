/**
 * Super Admin – Access Logs (Cross-Tenant & Impersonation)
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('scroll', 28)} Access Logs</h1></div>
      <div class="sa-card">
        <h3>Cross-Tenant Access & Impersonation Log</h3>
        <table class="sa-table">
          <thead>
            <tr><th>Time</th><th>Platform User</th><th>Action</th><th>Target Tenant</th><th>Reason</th><th>Duration</th><th>IP</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Today 09:14</td>
              <td><strong>Sarah Ops</strong></td>
              <td><span class="sa-status-pill sa-pill-orange">Impersonation</span></td>
              <td>FreshMart EU</td>
              <td>Support ticket #4521 — user can't upload product</td>
              <td>12 min</td>
              <td class="sa-code">10.0.1.42</td>
            </tr>
            <tr>
              <td>Yesterday 15:30</td>
              <td><strong>Tony Tran</strong></td>
              <td><span class="sa-status-pill sa-pill-blue">View Data</span></td>
              <td>CryptoMall Ltd</td>
              <td>Fraud investigation FRD-9978</td>
              <td>25 min</td>
              <td class="sa-code">171.251.239.74</td>
            </tr>
            <tr>
              <td>3d ago</td>
              <td><strong>Sarah Ops</strong></td>
              <td><span class="sa-status-pill sa-pill-orange">Impersonation</span></td>
              <td>HealthPlus Co</td>
              <td>Billing adjustment — plan migration</td>
              <td>8 min</td>
              <td class="sa-code">10.0.1.42</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="sa-card" style="margin-top:1rem">
        <h3>Cross-Tenant Access Policy</h3>
        <div class="sa-detail-grid">
          <div class="sa-detail-item"><span class="sa-detail-label">Reason Required</span><span class="sa-mfa-on">Mandatory</span></div>
          <div class="sa-detail-item"><span class="sa-detail-label">Time Limit</span><span>30 minutes per session</span></div>
          <div class="sa-detail-item"><span class="sa-detail-label">Auto-Log</span><span class="sa-mfa-on">All actions recorded</span></div>
          <div class="sa-detail-item"><span class="sa-detail-label">Notification</span><span>Tenant Admin notified on entry/exit</span></div>
        </div>
      </div>
    </div>
  `;
}
