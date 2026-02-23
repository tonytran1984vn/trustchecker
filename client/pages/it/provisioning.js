/**
 * IT – Provisioning (SCIM, directory sync, JIT)
 */
import { icon } from '../../core/icons.js';
export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('workflow', 28)} Provisioning</h1></div>
      <div class="sa-card" style="margin-bottom:1rem">
        <h3>SCIM Provisioning</h3>
        <div class="sa-threshold-list">
          ${th('SCIM Endpoint', 'https://api.trustchecker.io/scim/v2')}
          ${th('Bearer Token', '••••••••••••••••')}
          ${th('Status', 'Active — last sync 2h ago')}
          ${th('Auto Create Users', 'Enabled')}
          ${th('Auto Deactivate', 'Enabled (on IdP removal)')}
        </div>
      </div>
      <div class="sa-card" style="margin-bottom:1rem">
        <h3>Directory Sync</h3>
        <div class="sa-threshold-list">
          ${th('Provider', 'Azure AD')}
          ${th('Sync Interval', 'Every 15 minutes')}
          ${th('Last Sync', '14 min ago — 48 users synced')}
          ${th('Sync Errors', '0')}
        </div>
      </div>
      <div class="sa-card">
        <h3>Just-in-Time Access</h3>
        <div class="sa-threshold-list">
          ${th('JIT Provisioning', 'Enabled on first SSO login')}
          ${th('Default Role', 'operator')}
          ${th('Auto-assign Node', 'Based on SSO group')}
        </div>
      </div>
    </div>`;
}
function th(n, v) { return `<div class="sa-threshold-item"><div class="sa-threshold-header"><strong>${n}</strong><input class="ops-input" value="${v}" style="width:300px;text-align:center;font-size:0.78rem" /></div></div>`; }
