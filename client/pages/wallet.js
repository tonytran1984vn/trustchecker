/**
 * TrustChecker – Wallet Page
 */
import { State, render } from '../core/state.js';
import { timeAgo } from '../utils/helpers.js';

export function renderPage() {
  const d = State.walletData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading wallet data...</span></div>';
  return `
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">💰</div><div class="stat-value">${(d.wallets || []).length}</div><div class="stat-label">Wallets</div></div>
      <div class="stat-card violet"><div class="stat-icon">💸</div><div class="stat-value">${(d.transactions || []).length}</div><div class="stat-label">Transactions</div></div>
      <div class="stat-card emerald"><div class="stat-icon">✅</div><div class="stat-value">${(d.transactions || []).filter(t => t.status === 'completed').length}</div><div class="stat-label">Completed</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">💰 Wallets</div></div>
      <table class="data-table"><thead><tr><th>Address</th><th>Network</th><th>Balance</th><th>Status</th></tr></thead><tbody>
        ${(d.wallets || []).map(w => `<tr><td><code>${w.address?.slice(0, 16) || '—'}...</code></td><td>${w.network || 'ETH'}</td><td style="font-weight:700">${w.balance || 0} ${w.currency || 'ETH'}</td><td><span class="badge badge-green">${w.status || 'active'}</span></td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">💸 Transaction History</div></div>
      <table class="data-table"><thead><tr><th>Time</th><th>Type</th><th>Amount</th><th>From</th><th>To</th><th>Status</th></tr></thead><tbody>
        ${(d.transactions || []).map(t => `<tr><td>${timeAgo(t.created_at)}</td><td>${t.type || '—'}</td><td style="font-weight:700">${t.amount || 0} ${t.currency || 'USD'}</td><td>${t.from_address?.slice(0, 10) || '—'}</td><td>${t.to_address?.slice(0, 10) || '—'}</td><td><span class="badge ${t.status === 'completed' ? 'badge-green' : t.status === 'pending' ? 'badge-amber' : 'badge-red'}">${t.status}</span></td></tr>`).join('')}
      </tbody></table>
    </div>`;
}

// Window exports for onclick handlers

