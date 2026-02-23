/**
 * IT – SSO Configuration (SAML/OIDC, role mapping)
 */
import { icon } from '../../core/icons.js';
export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('users', 28)} SSO Configuration</h1></div>
      <div class="sa-card" style="margin-bottom:1rem">
        <h3>Identity Provider</h3>
        <div class="sa-threshold-list">
          ${th('Protocol', 'SAML 2.0')}
          ${th('Entity ID', 'https://idp.company.com/saml/metadata')}
          ${th('SSO Login URL', 'https://idp.company.com/saml/login')}
          ${th('Certificate', 'Uploaded <span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> (expires: 2027-03-15)')}
          ${th('Status', 'Active')}
        </div>
      </div>
      <div class="sa-card" style="margin-bottom:1rem">
        <h3>Role Mapping (SSO → Internal)</h3>
        <table class="sa-table"><thead><tr><th>SSO Group</th><th>Internal Role</th><th>Status</th></tr></thead><tbody>
          <tr><td>Engineering</td><td>developer</td><td><span class="sa-status-pill sa-pill-green">active</span></td></tr>
          <tr><td>Operations</td><td>ops_manager</td><td><span class="sa-status-pill sa-pill-green">active</span></td></tr>
          <tr><td>Risk Team</td><td>risk_officer</td><td><span class="sa-status-pill sa-pill-green">active</span></td></tr>
          <tr><td>Compliance</td><td>compliance_officer</td><td><span class="sa-status-pill sa-pill-green">active</span></td></tr>
          <tr><td>Admin</td><td>admin</td><td><span class="sa-status-pill sa-pill-green">active</span></td></tr>
        </tbody></table>
        <button class="btn btn-sm btn-ghost" style="margin-top:0.75rem">+ Add Mapping</button>
      </div>
      <div style="display:flex;gap:1rem;justify-content:flex-end"><button class="btn btn-outline">Test SSO</button><button class="btn btn-primary">Save</button></div>
    </div>`;
}
function th(n, v) { return `<div class="sa-threshold-item"><div class="sa-threshold-header"><strong>${n}</strong><input class="ops-input" value="${v}" style="width:340px;text-align:center;font-size:0.78rem" /></div></div>`; }
