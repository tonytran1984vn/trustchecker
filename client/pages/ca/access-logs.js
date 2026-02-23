/**
 * Company Admin – Access Logs (Tenant Scope)
 * ════════════════════════════════════════════
 * Login history, permission changes, export log
 */
import { icon } from '../../core/icons.js';

let activeTab = 'login';
window._caAccessTab = (t) => { activeTab = t; window.render(); };

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('scroll', 28)} Access Logs</h1>
        <div class="sa-title-actions">
          <button class="btn btn-outline btn-sm">Export CSV</button>
        </div>
      </div>

      <div class="sa-tabs">
        ${tab('login', 'Login History')}
        ${tab('permissions', 'Permission Changes')}
        ${tab('exports', 'Data Exports')}
      </div>

      ${renderTabContent()}
    </div>
  `;
}

function tab(id, label) {
    return `<button class="sa-tab ${activeTab === id ? 'active' : ''}" onclick="_caAccessTab('${id}')">${label}</button>`;
}

function renderTabContent() {
    if (activeTab === 'login') {
        return `
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>User</th><th>Action</th><th>IP Address</th><th>Device</th><th>Location</th><th>Time</th><th>Status</th></tr></thead>
          <tbody>
            ${loginRow('admin@company.com', 'Login', '103.48.xx.xx', 'Chrome / macOS', 'Ho Chi Minh City', '5 min ago', 'success')}
            ${loginRow('ops@company.com', 'Login', '42.117.xx.xx', 'Firefox / Windows', 'Hanoi', '1h ago', 'success')}
            ${loginRow('warehouse@company.com', 'Login Failed', '113.161.xx.xx', 'Mobile / Android', 'Da Nang', '2h ago', 'failed')}
            ${loginRow('warehouse@company.com', 'Login', '113.161.xx.xx', 'Mobile / Android', 'Da Nang', '2h ago', 'success')}
            ${loginRow('audit@company.com', 'Logout', '1.54.xx.xx', 'Chrome / macOS', 'Singapore', '3h ago', 'success')}
            ${loginRow('dev@company.com', 'MFA Verified', '172.16.xx.xx', 'Safari / macOS', 'Ho Chi Minh City', '5h ago', 'success')}
          </tbody>
        </table>
      </div>
    `;
    }
    if (activeTab === 'permissions') {
        return `
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>User</th><th>Change</th><th>Changed By</th><th>Previous</th><th>New</th><th>Time</th></tr></thead>
          <tbody>
            <tr><td>ops@company.com</td><td>Role changed</td><td>admin@company.com</td><td><span class="sa-role-pill sa-role-viewer">operator</span></td><td><span class="sa-role-pill sa-role-ops">ops_manager</span></td><td style="color:var(--text-secondary)">1d ago</td></tr>
            <tr><td>new-user@company.com</td><td>Account created</td><td>admin@company.com</td><td>—</td><td><span class="sa-role-pill sa-role-viewer">operator</span></td><td style="color:var(--text-secondary)">2d ago</td></tr>
            <tr><td>temp@company.com</td><td>Account disabled</td><td>admin@company.com</td><td><span class="sa-status-pill sa-pill-green">active</span></td><td><span class="sa-status-pill sa-pill-red">disabled</span></td><td style="color:var(--text-secondary)">3d ago</td></tr>
            <tr><td>compliance@company.com</td><td>MFA enforced</td><td>admin@company.com</td><td>Optional</td><td><strong>Required</strong></td><td style="color:var(--text-secondary)">5d ago</td></tr>
          </tbody>
        </table>
      </div>
    `;
    }
    return `
    <div class="sa-card">
      <table class="sa-table">
        <thead><tr><th>Export ID</th><th>Type</th><th>Requested By</th><th>Records</th><th>Status</th><th>Time</th></tr></thead>
        <tbody>
          <tr><td class="sa-code">EXP-0024</td><td>Scan History</td><td>audit@company.com</td><td class="sa-code">12,450</td><td><span class="sa-status-pill sa-pill-green">completed</span></td><td style="color:var(--text-secondary)">1d ago</td></tr>
          <tr><td class="sa-code">EXP-0023</td><td>User List</td><td>admin@company.com</td><td class="sa-code">48</td><td><span class="sa-status-pill sa-pill-green">completed</span></td><td style="color:var(--text-secondary)">3d ago</td></tr>
          <tr><td class="sa-code">EXP-0022</td><td>Fraud Alerts</td><td>compliance@company.com</td><td class="sa-code">234</td><td><span class="sa-status-pill sa-pill-green">completed</span></td><td style="color:var(--text-secondary)">5d ago</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

function loginRow(user, action, ip, device, location, time, status) {
    return `
    <tr>
      <td><strong>${user}</strong></td>
      <td>${action}</td>
      <td class="sa-code">${ip}</td>
      <td>${device}</td>
      <td>${location}</td>
      <td style="color:var(--text-secondary)">${time}</td>
      <td><span class="sa-status-pill sa-pill-${status === 'success' ? 'green' : 'red'}">${status}</span></td>
    </tr>
  `;
}
