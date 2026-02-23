/**
 * Company Admin – Flow Configuration
 * ════════════════════════════════════
 * Define supply flow, batch transfer logic, shipment validation rules
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('network', 28)} Flow Configuration</h1>
        <div class="sa-title-actions">
          <button class="btn btn-primary btn-sm">+ Create Flow</button>
        </div>
      </div>

      <div class="sa-grid-2col">
        <!-- Active Flows -->
        <div class="sa-card">
          <h3>Active Supply Flows</h3>
          <div class="sa-spike-list">
            ${flowItem('Standard Production', 'Factory → Warehouse → Distributor → Retailer', 4, 'active')}
            ${flowItem('Direct-to-Store', 'Factory → Retailer', 2, 'active')}
            ${flowItem('Export Pipeline', 'Factory → Warehouse → Port → Intl Distributor', 4, 'active')}
            ${flowItem('Recall Flow', 'Retailer → Warehouse → Factory (reverse)', 3, 'draft')}
          </div>
        </div>

        <!-- Batch Transfer Rules -->
        <div class="sa-card">
          <h3>Batch Transfer Logic</h3>
          <div class="sa-threshold-list">
            ${ruleItem('Auto-approve transfers', 'Transfers under 500 units auto-approved', true)}
            ${ruleItem('QR validation required', 'Each item scanned before transfer', true)}
            ${ruleItem('Temperature check', 'Cold-chain validation at each hop', false)}
            ${ruleItem('Geo-fence validation', 'GPS must match destination node', true)}
          </div>
        </div>
      </div>

      <!-- Shipment Validation Rules -->
      <section class="sa-section" style="margin-top:1.5rem">
        <h2 class="sa-section-title">${icon('shield', 20)} Shipment Validation Rules</h2>
        <div class="sa-card">
          <table class="sa-table">
            <thead>
              <tr><th>Rule</th><th>Scope</th><th>Condition</th><th>Action</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Weight Mismatch</strong></td><td>All transfers</td><td>Δ > 5%</td><td>Flag + Hold</td><td><span class="sa-status-pill sa-pill-green">active</span></td></tr>
              <tr><td><strong>Missing Documents</strong></td><td>Export only</td><td>No invoice attached</td><td>Block transfer</td><td><span class="sa-status-pill sa-pill-green">active</span></td></tr>
              <tr><td><strong>Expiry Check</strong></td><td>Perishables</td><td>< 30 days remaining</td><td>Warning</td><td><span class="sa-status-pill sa-pill-orange">warning</span></td></tr>
              <tr><td><strong>Duplicate Serial</strong></td><td>All items</td><td>Serial seen before</td><td>Reject + Alert</td><td><span class="sa-status-pill sa-pill-green">active</span></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function flowItem(name, path, hops, status) {
    return `
    <div class="sa-spike-item sa-spike-${status === 'active' ? 'info' : 'warning'}">
      <div class="sa-spike-header">
        <strong>${name}</strong>
        <span class="sa-status-pill sa-pill-${status === 'active' ? 'green' : 'orange'}">${status}</span>
      </div>
      <div class="sa-spike-detail">${path} · ${hops} hops</div>
    </div>
  `;
}

function ruleItem(name, desc, enabled) {
    return `
    <div class="sa-threshold-item">
      <div class="sa-threshold-header">
        <strong>${name}</strong>
        <span class="sa-status-pill sa-pill-${enabled ? 'green' : 'red'}">${enabled ? 'Enabled' : 'Disabled'}</span>
      </div>
      <div class="sa-threshold-desc">${desc}</div>
    </div>
  `;
}
