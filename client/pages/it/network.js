/**
 * IT – Network Security (IP whitelist, geo, VPN)
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const whitelist = [
        { ip: '171.252.0.0/16', label: 'Office HCM', added: '2025-12-01' },
        { ip: '14.161.0.0/16', label: 'Office Hanoi', added: '2025-12-01' },
        { ip: '103.5.210.0/24', label: 'VPN Gateway', added: '2026-01-15' },
    ];
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('globe', 28)} Network Security</h1></div>
      <div class="sa-card" style="margin-bottom:1rem">
        <h3>IP Whitelist</h3>
        <table class="sa-table"><thead><tr><th>IP / CIDR</th><th>Label</th><th>Added</th><th>Actions</th></tr></thead><tbody>
          ${whitelist.map(w => `<tr><td class="sa-code">${w.ip}</td><td>${w.label}</td><td>${w.added}</td><td><button class="btn btn-xs btn-ghost">Remove</button></td></tr>`).join('')}
        </tbody></table>
        <button class="btn btn-sm btn-ghost" style="margin-top:0.75rem">+ Add IP Range</button>
      </div>
      <div class="sa-card" style="margin-bottom:1rem">
        <h3>Geo Restriction</h3>
        <div class="sa-threshold-list">
          ${th('Allowed Countries', 'Vietnam, Thailand, Singapore')}
          ${th('Block Unknown Regions', 'Enabled')}
          ${th('Alert on New Region', 'Slack + Email')}
        </div>
      </div>
      <div class="sa-card">
        <h3>VPN Enforcement</h3>
        <div class="sa-threshold-list">
          ${th('Require VPN', 'Admin roles only')}
          ${th('VPN Provider', 'WireGuard / Tailscale')}
        </div>
      </div>
    </div>`;
}
function th(n, v) { return `<div class="sa-threshold-item"><div class="sa-threshold-header"><strong>${n}</strong><input class="ops-input" value="${v}" style="width:220px;text-align:center" /></div></div>`; }
