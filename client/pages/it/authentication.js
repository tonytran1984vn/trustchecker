/**
 * IT – Authentication (MFA, password policy, session, device trust)
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('lock', 28)} Authentication</h1></div>

      <div class="sa-card" style="margin-bottom:1rem">
        <h3>🔑 MFA Enforcement</h3>
        <div class="sa-threshold-list">
          ${setting('MFA Required', 'All users', 'toggle', true)}
          ${setting('MFA Methods', 'TOTP, SMS, WebAuthn', 'select', null)}
          ${setting('MFA Grace Period', '48 hours for new users', 'input', null)}
          ${setting('Remember Device', '30 days', 'input', null)}
        </div>
      </div>

      <div class="sa-card" style="margin-bottom:1rem">
        <h3>🔐 Password Policy</h3>
        <div class="sa-threshold-list">
          ${setting('Minimum Length', '12 characters', 'input', null)}
          ${setting('Require Uppercase', 'At least 1', 'toggle', true)}
          ${setting('Require Number', 'At least 1', 'toggle', true)}
          ${setting('Require Special Char', 'At least 1', 'toggle', true)}
          ${setting('Password Expiry', '90 days', 'input', null)}
          ${setting('Password History', 'Last 5 passwords', 'input', null)}
        </div>
      </div>

      <div class="sa-card">
        <h3>⏱ Session Management</h3>
        <div class="sa-threshold-list">
          ${setting('Session Timeout', '30 minutes idle', 'input', null)}
          ${setting('Max Concurrent Sessions', '3', 'input', null)}
          ${setting('Device Trust', 'Require known devices', 'toggle', false)}
          ${setting('Force Logout on Password Change', 'All sessions', 'toggle', true)}
        </div>
      </div>

      <div style="display:flex;gap:1rem;justify-content:flex-end;margin-top:1.5rem">
        <button class="btn btn-outline">Reset to Default</button>
        <button class="btn btn-primary">Save Changes</button>
      </div>
    </div>
  `;
}

function setting(name, value, type, checked) {
    const ctrl = type === 'toggle' ? `<label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer"><input type="checkbox" ${checked ? 'checked' : ''} /><span style="font-size:0.78rem">${value}</span></label>` : `<input class="ops-input" value="${value}" style="width:200px;text-align:center" />`;
    return `<div class="sa-threshold-item"><div class="sa-threshold-header"><strong>${name}</strong>${ctrl}</div></div>`;
}
