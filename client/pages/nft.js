/**
 * TrustChecker – Nft Page
 */
import { State, render } from '../core/state.js';
import { timeAgo } from '../utils/helpers.js';

export function renderPage() {
  const d = State.nftData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading NFT certificates...</span></div>';
  return `
    <div class="stats-grid">
      <div class="stat-card violet"><div class="stat-icon">🎨</div><div class="stat-value">${d.total || (d.certificates || []).length}</div><div class="stat-label">Total NFTs</div></div>
      <div class="stat-card emerald"><div class="stat-icon">✅</div><div class="stat-value">${(d.certificates || []).filter(c => c.status === 'active').length}</div><div class="stat-label">Active</div></div>
      <div class="stat-card cyan"><div class="stat-icon">🔗</div><div class="stat-value">${(d.certificates || []).filter(c => c.blockchain_seal_id).length}</div><div class="stat-label">On-Chain</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🎨 NFT Certificate Registry</div></div>
      <table class="data-table"><thead><tr><th>Token ID</th><th>Type</th><th>Product</th><th>Owner</th><th>Status</th><th>Minted</th></tr></thead><tbody>
        ${(d.certificates || []).map(n => `<tr><td><strong>#${n.token_id || '—'}</strong></td><td>${n.certificate_type}</td><td>${n.product_id?.slice(0, 8) || '—'}</td><td>${n.owner?.slice(0, 12) || '—'}</td><td><span class="badge ${n.status === 'active' ? 'badge-green' : 'badge-red'}">${n.status}</span></td><td>${timeAgo(n.minted_at)}</td></tr>`).join('')}
      </tbody></table>
    </div>`;
}

// Window exports for onclick handlers

