/**
 * Company Admin – Risk Rules (Tenant Scope)
 * ═══════════════════════════════════════════
 * Duplicate threshold, geo restriction, velocity threshold
 * NO global AI model access
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('target', 28)} Risk Rules</h1>
        <span style="font-size:0.75rem;color:var(--text-secondary);background:rgba(255,255,255,0.04);padding:4px 10px;border-radius:6px">Tenant Scope Only</span>
      </div>

      <div class="sa-grid-2col">
        <!-- Duplicate Detection -->
        <div class="sa-card">
          <h3>${icon('alert', 16)} Duplicate Detection</h3>
          <div class="sa-threshold-list">
            ${thresholdItem('Duplicate QR Threshold', 'Alert when same QR scanned from different locations within', '30 minutes', 'active')}
            ${thresholdItem('Serial Reuse Detection', 'Flag products with reused serial numbers', 'Immediate', 'active')}
            ${thresholdItem('Batch Duplication', 'Detect duplicate batch IDs in system', 'On creation', 'active')}
          </div>
        </div>

        <!-- Geo Restrictions -->
        <div class="sa-card">
          <h3>${icon('globe', 16)} Geographic Restrictions</h3>
          <div class="sa-threshold-list">
            ${thresholdItem('Allowed Regions', 'Scans only accepted from configured countries', 'VN, SG, TH, JP', 'active')}
            ${thresholdItem('Geo Anomaly Distance', 'Flag if consecutive scans > distance apart', '500 km / 1 hour', 'active')}
            ${thresholdItem('Blocked Countries', 'Reject scans from sanctioned regions', '3 countries', 'active')}
          </div>
        </div>
      </div>

      <!-- Velocity Rules -->
      <section class="sa-section" style="margin-top:1.5rem">
        <h2 class="sa-section-title">${icon('zap', 20)} Velocity Rules</h2>
        <div class="sa-card">
          <div class="sa-threshold-list">
            ${thresholdItem('Scan Velocity', 'Max scans per QR code per time window', '10 scans / hour', 'active')}
            ${thresholdItem('API Rate Limit', 'Max API calls per partner per minute', '100 req/min', 'active')}
            ${thresholdItem('Batch Transfer Rate', 'Max transfers per node per day', '50 transfers/day', 'warning')}
            ${thresholdItem('Login Attempt Limit', 'Lock account after failed attempts', '5 attempts / 15 min', 'active')}
          </div>
        </div>
      </section>

      <!-- Custom Rules -->
      <section class="sa-section">
        <h2 class="sa-section-title">${icon('settings', 20)} Custom Rules</h2>
        <div class="sa-card">
          <table class="sa-table">
            <thead>
              <tr><th>Rule Name</th><th>Condition</th><th>Action</th><th>Priority</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Night Scan Alert</strong></td>
                <td>Scan between 00:00–05:00 local time</td>
                <td>Flag + Notify</td>
                <td><span class="sa-score sa-score-warning">Medium</span></td>
                <td><span class="sa-status-pill sa-pill-green">active</span></td>
              </tr>
              <tr>
                <td><strong>High Value Product</strong></td>
                <td>Product value > $100 USD</td>
                <td>Require double-scan</td>
                <td><span class="sa-score sa-score-danger">High</span></td>
                <td><span class="sa-status-pill sa-pill-green">active</span></td>
              </tr>
              <tr>
                <td><strong>New Device Alert</strong></td>
                <td>First scan from unknown device</td>
                <td>Log + Flag</td>
                <td><span class="sa-score sa-score-info">Low</span></td>
                <td><span class="sa-status-pill sa-pill-orange">draft</span></td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top:1rem;text-align:right">
            <button class="btn btn-primary btn-sm">+ Add Custom Rule</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

function thresholdItem(name, desc, value, status) {
    return `
    <div class="sa-threshold-item">
      <div class="sa-threshold-header">
        <strong>${name}</strong>
        <span style="font-weight:600;font-size:0.82rem">${value}</span>
      </div>
      <div class="sa-threshold-desc">${desc}</div>
    </div>
  `;
}
