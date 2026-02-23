/**
 * IT – Conditional Access (Zero-Trust Policies)
 */
import { icon } from '../../core/icons.js';

const POLICIES = [
    { id: 'CA-01', name: 'Admin MFA Enforcement', condition: 'Role = admin, super_admin, risk_officer', action: 'Require MFA (TOTP/WebAuthn)', scope: 'All sessions', status: 'active' },
    { id: 'CA-02', name: 'Unknown Device Block', condition: 'Device fingerprint NOT in trusted list', action: 'Block + notify admin', scope: 'Non-SSO logins', status: 'active' },
    { id: 'CA-03', name: 'Geo Restriction', condition: 'Location NOT in [VN, SG, TH]', action: 'Step-up auth + SMS verify', scope: 'All roles', status: 'active' },
    { id: 'CA-04', name: 'After Hours Access', condition: 'Time: 22:00–06:00 local', action: 'Require additional MFA + log alert', scope: 'Non-executive roles', status: 'active' },
    { id: 'CA-05', name: 'High-Risk Action', condition: 'Action = data.export, user.delete, role.assign', action: 'Step-up auth + approval required', scope: 'All users', status: 'active' },
    { id: 'CA-06', name: 'VPN Required (Admin)', condition: 'Role = super_admin, developer', action: 'Require VPN connection', scope: 'Platform access', status: 'active' },
];

const DEVICES = [
    { fingerprint: 'FP-a3f8...d91e', user: 'admin@company.com', os: 'macOS 15.2', browser: 'Chrome 121', location: 'HCM, VN', lastSeen: '5 min ago', trusted: true },
    { fingerprint: 'FP-e7b2...f04c', user: 'ops@company.com', os: 'Windows 11', browser: 'Edge 121', location: 'Hanoi, VN', lastSeen: '1h ago', trusted: true },
    { fingerprint: 'FP-b9d4...a218', user: 'risk@company.com', os: 'iOS 18.2', browser: 'Safari', location: 'Bangkok, TH', lastSeen: '3h ago', trusted: true },
    { fingerprint: 'FP-c1f7...e392', user: 'unknown', os: 'Linux', browser: 'Firefox 124', location: 'Moscow, RU', lastSeen: '2d ago', trusted: false },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('shield', 28)} Conditional Access</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Create Policy</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Active Policies', POLICIES.length, 'Zero-trust framework', 'blue', 'shield')}
        ${m('Blocked (24h)', '3', '2 geo + 1 unknown device', 'red', 'alertTriangle')}
        ${m('Step-up Auth (24h)', '12', 'All successful', 'green', 'lock')}
        ${m('Trusted Devices', `${DEVICES.filter(d => d.trusted).length}/${DEVICES.length}`, '1 untrusted flagged', 'orange', 'settings')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📋 Access Policies</h3>
        <table class="sa-table"><thead><tr><th>ID</th><th>Policy</th><th>Condition</th><th>Action</th><th>Scope</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${POLICIES.map(p => `<tr>
            <td class="sa-code">${p.id}</td><td><strong>${p.name}</strong></td>
            <td style="font-size:0.78rem">${p.condition}</td>
            <td style="font-size:0.78rem">${p.action}</td>
            <td style="font-size:0.78rem">${p.scope}</td>
            <td><span class="sa-status-pill sa-pill-green">${p.status}</span></td>
            <td><button class="btn btn-xs btn-outline">Edit</button></td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <div class="sa-card">
        <h3>📱 Device Fingerprints</h3>
        <table class="sa-table"><thead><tr><th>Fingerprint</th><th>User</th><th>OS</th><th>Browser</th><th>Location</th><th>Last Seen</th><th>Trusted</th><th>Actions</th></tr></thead><tbody>
          ${DEVICES.map(d => `<tr class="${!d.trusted ? 'ops-alert-row' : ''}">
            <td class="sa-code" style="font-size:0.7rem">${d.fingerprint}</td>
            <td>${d.user}</td><td>${d.os}</td><td>${d.browser}</td><td>${d.location}</td>
            <td>${d.lastSeen}</td>
            <td><span class="sa-status-pill sa-pill-${d.trusted ? 'green' : 'red'}">${d.trusted ? 'trusted' : '<span class="status-icon status-warn" aria-label="Warning">!</span> untrusted'}</span></td>
            <td>${d.trusted ? '<button class="btn btn-xs btn-ghost">Revoke</button>' : '<button class="btn btn-xs btn-outline">Trust</button> <button class="btn btn-xs btn-ghost">Block</button>'}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
