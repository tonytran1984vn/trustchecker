/**
 * IT – OAuth Clients
 */
import { icon } from '../../core/icons.js';
export function renderPage() {
    const clients = [
        { id: 'oc_...f4a2', name: 'Mobile App', type: 'Public', grant: 'Auth Code + PKCE', redirects: 'trustchecker://callback', status: 'active' },
        { id: 'oc_...d8b1', name: 'SAP Integration', type: 'Confidential', grant: 'Client Credentials', redirects: '—', status: 'active' },
        { id: 'oc_...k2c3', name: 'Partner Portal', type: 'Public', grant: 'Auth Code + PKCE', redirects: 'https://partner.company.com/cb', status: 'active' },
    ];
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('users', 28)} OAuth Clients</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Register Client</button></div></div>
      <div class="sa-card">
        <table class="sa-table"><thead><tr><th>Client ID</th><th>Name</th><th>Type</th><th>Grant</th><th>Redirect URIs</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${clients.map(c => `<tr><td class="sa-code" style="font-size:0.72rem">${c.id}</td><td><strong>${c.name}</strong></td><td><span class="sa-status-pill sa-pill-${c.type === 'Confidential' ? 'blue' : 'orange'}">${c.type}</span></td><td style="font-size:0.78rem">${c.grant}</td><td class="sa-code" style="font-size:0.7rem">${c.redirects}</td><td><span class="sa-status-pill sa-pill-green">${c.status}</span></td><td><button class="btn btn-xs btn-outline">Edit</button> <button class="btn btn-xs btn-ghost">Secret</button></td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
