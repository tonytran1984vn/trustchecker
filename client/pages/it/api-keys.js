/**
 * IT – API Keys
 */
import { icon } from '../../core/icons.js';
export function renderPage() {
    const keys = [
        { id: 'ak_live_...x4f2', name: 'Production', scope: 'read, write', created: '2025-12-01', lastUsed: '2 min ago', expires: '2026-03-01', status: 'active' },
        { id: 'ak_live_...p8d1', name: 'Webhook Delivery', scope: 'webhook', created: '2026-01-15', lastUsed: '5 min ago', expires: '2026-04-15', status: 'active' },
        { id: 'ak_test_...t3k9', name: 'Sandbox', scope: 'read', created: '2026-02-01', lastUsed: '3d ago', expires: '2026-05-01', status: 'active' },
        { id: 'ak_live_...r7m2', name: 'Legacy Export', scope: 'read', created: '2025-06-01', lastUsed: '90d ago', expires: 'Expired', status: 'revoked' },
    ];
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('lock', 28)} API Keys</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Generate Key</button></div></div>
      <div class="sa-card">
        <table class="sa-table"><thead><tr><th>Key</th><th>Name</th><th>Scope</th><th>Created</th><th>Last Used</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${keys.map(k => `<tr><td class="sa-code" style="font-size:0.72rem">${k.id}</td><td><strong>${k.name}</strong></td><td style="font-size:0.78rem">${k.scope}</td><td>${k.created}</td><td>${k.lastUsed}</td><td style="color:${k.expires === 'Expired' ? '#ef4444' : 'var(--text-secondary)'}">${k.expires}</td><td><span class="sa-status-pill sa-pill-${k.status === 'active' ? 'green' : 'red'}">${k.status}</span></td><td>${k.status === 'active' ? '<button class="btn btn-xs btn-outline">Rotate</button> <button class="btn btn-xs btn-ghost">Revoke</button>' : ''}</td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
