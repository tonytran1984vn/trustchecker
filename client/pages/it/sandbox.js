/**
 * IT – Sandbox / Test Environment
 */
import { icon } from '../../core/icons.js';
export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('settings', 28)} Sandbox</h1></div>
      <div class="sa-card" style="margin-bottom:1rem">
        <h3>🧪 Test Environment</h3>
        <div class="sa-threshold-list">
          ${th('Sandbox URL', 'https://sandbox.trustchecker.io')}
          ${th('API Base', 'https://sandbox-api.trustchecker.io/v1')}
          ${th('Status', 'Running <span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>')}
          ${th('Data Reset', 'Last reset: 7 days ago')}
          ${th('Test Users', '5 pre-configured (all roles)')}
        </div>
        <div style="display:flex;gap:0.75rem;margin-top:1rem">
          <button class="btn btn-outline btn-sm">Reset Data</button>
          <button class="btn btn-ghost btn-sm">Copy Prod Config</button>
        </div>
      </div>
      <div class="sa-card" style="margin-bottom:1rem">
        <h3>API Staging</h3>
        <div class="sa-threshold-list">
          ${th('Staging Key', 'ak_test_...t3k9 (read-only)')}
          ${th('Rate Limit', '100 req/min (relaxed)')}
          ${th('Webhook Testing', 'https://webhook.site/unique-id')}
        </div>
      </div>
      <div class="sa-card">
        <h3>Config Preview</h3>
        <div class="sa-threshold-list">
          ${th('Feature Flags', 'v2_scan_engine: ON, new_dashboard: ON')}
          ${th('A/B Tests', 'None active')}
          ${th('Preview Mode', 'Available for admin roles')}
        </div>
      </div>
    </div>`;
}
function th(n, v) { return `<div class="sa-threshold-item"><div class="sa-threshold-header"><strong>${n}</strong><input class="ops-input" value="${v}" style="width:320px;text-align:center;font-size:0.78rem" /></div></div>`; }
