/**
 * TrustChecker – Blockchain Page
 */
import { State, render } from '../core/state.js';
import { timeAgo, shortHash } from '../utils/helpers.js';

export function renderPage() {
  const b = State.blockchain;
  if (!b) return '<div class="loading"><div class="spinner"></div></div>';

  return `
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card emerald">
        <div class="stat-icon">🔗</div>
        <div class="stat-value">${b.stats?.total_seals || 0}</div>
        <div class="stat-label">Total Blocks</div>
      </div>
      <div class="stat-card ${b.stats?.chain_integrity?.valid ? 'emerald' : 'rose'}">
        <div class="stat-icon">${b.stats?.chain_integrity?.valid ? '✅' : '❌'}</div>
        <div class="stat-value">${b.stats?.chain_integrity?.valid ? 'VALID' : 'BROKEN'}</div>
        <div class="stat-label">Chain Integrity</div>
      </div>
      <div class="stat-card violet">
        <div class="stat-icon">🌳</div>
        <div class="stat-value">${shortHash(b.stats?.latest_merkle_root)}</div>
        <div class="stat-label" style="font-size:0.6rem">Latest Merkle Root</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><div class="card-title">⛓ Chain Visualization</div></div>
      <div style="overflow-x:auto;padding:10px 0;display:flex;align-items:center;flex-wrap:wrap">
        ${(b.recent_seals || []).slice(0, 10).reverse().map((s, i) => `
          ${i > 0 ? '<span class="chain-arrow">→</span>' : ''}
          <div class="chain-block">
            <div class="block-index">Block #${s.block_index}</div>
            <div class="block-hash">🔑 ${shortHash(s.data_hash)}</div>
            <div style="font-size:0.65rem;color:var(--text-muted);margin-top:4px">${s.event_type}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">📜 Recent Seals</div></div>
      <div class="table-container">
        <table>
          <tr><th>Block</th><th>Event</th><th>Data Hash</th><th>Prev Hash</th><th>Merkle Root</th><th>Time</th></tr>
          ${(b.recent_seals || []).map(s => `
            <tr>
              <td style="font-family:'JetBrains Mono';font-weight:700;color:var(--cyan)">#${s.block_index}</td>
              <td>${s.event_type}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.7rem">${shortHash(s.data_hash)}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.7rem">${shortHash(s.prev_hash)}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.7rem">${shortHash(s.merkle_root)}</td>
              <td class="event-time">${timeAgo(s.sealed_at)}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>
  `;
}

// Window exports for onclick handlers

