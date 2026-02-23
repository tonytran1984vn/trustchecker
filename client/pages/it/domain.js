/**
 * IT – Domain Verification
 */
import { icon } from '../../core/icons.js';
export function renderPage() {
    const domains = [
        { domain: 'company.com', status: 'verified', method: 'DNS TXT', verified: '2025-12-01' },
        { domain: 'subsidiary.co', status: 'pending', method: 'DNS TXT', verified: '—' },
    ];
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('globe', 28)} Domain Verification</h1></div>
      <div class="sa-card">
        <table class="sa-table"><thead><tr><th>Domain</th><th>Status</th><th>Method</th><th>Verified</th><th>Actions</th></tr></thead><tbody>
          ${domains.map(d => `<tr><td class="sa-code"><strong>${d.domain}</strong></td><td><span class="sa-status-pill sa-pill-${d.status === 'verified' ? 'green' : 'orange'}">${d.status}</span></td><td>${d.method}</td><td>${d.verified}</td><td><button class="btn btn-xs btn-outline">${d.status === 'verified' ? 'Reverify' : 'Verify'}</button></td></tr>`).join('')}
        </tbody></table>
        <button class="btn btn-sm btn-ghost" style="margin-top:0.75rem">+ Add Domain</button>
      </div>
    </div>`;
}
