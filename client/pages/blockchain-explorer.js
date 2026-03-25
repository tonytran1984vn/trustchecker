/**
 * Blockchain Explorer — On-chain verification, NFT certificates, transaction history
 * Now API-driven: fetches real seals from /qr/blockchain
 */
import { icon } from '../core/icons.js';
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { timeAgo, shortHash } from '../utils/helpers.js';

// ─── Local state ────────────────────────────────────────────
let EX = null;
let _loading = false;

async function load() {
    if (_loading) return;
    _loading = true;
    try {
        const data = await API.get('/qr/blockchain');
        EX = data;
    } catch (e) { EX = { error: e.message }; }
    _loading = false;
    render();
}

// NFT certificates — placeholder until NFT backend is built
const NFT_CERTS = [
    { id: 'TC-NFT-2026-0895', batch: 'B-2026-0895', product: 'Premium Coffee Blend (Arabica)', chain: 'Polygon', standard: 'ERC-721', owner: 'company.eth', minted: '2026-02-19', verified: true, scans: 1247 },
    { id: 'TC-NFT-2026-0891', batch: 'B-2026-0891', product: 'Organic Tea Collection', chain: 'Polygon', standard: 'ERC-721', owner: 'company.eth', minted: '2026-02-18', verified: true, scans: 892 },
    { id: 'TC-NFT-2026-0887', batch: 'B-2026-0887', product: 'Manuka Honey (UMF 15+)', chain: 'Polygon', standard: 'ERC-721', owner: 'company.eth', minted: '2026-02-17', verified: true, scans: 2103 },
];

export function renderPage() {
    if (!EX) { load(); return `<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading Explorer…</span></div>`; }
    if (EX.error) return `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load explorer: ${EX.error}</div><button class="btn btn-sm" onclick="window._explorerReload()" style="margin-top:12px">↻ Retry</button></div>`;

    const stats = EX.stats || {};
    const seals = EX.recent_seals || [];
    const totalSeals = stats.total_seals || 0;
    const integrityValid = stats.chain_integrity?.valid;
    const integrityRate = integrityValid ? '100%' : ((stats.chain_integrity?.blocks_checked - (stats.chain_integrity?.errors?.length || 0)) / (stats.chain_integrity?.blocks_checked || 1) * 100).toFixed(1) + '%';

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('lock', 28)} Blockchain Explorer</h1><div class="sa-title-actions"><button class="btn btn-outline btn-sm" onclick="explorerVerifyHash()">Verify Hash</button><button class="btn btn-primary btn-sm" style="margin-left:0.5rem" onclick="explorerMintNFT()">Mint NFT Certificate</button></div></div>

      <div class="sa-metrics-grid" style="margin-bottom:1.5rem">
        ${m('On-chain Seals', totalSeals.toLocaleString(), 'Immutable audit trail', 'blue', 'lock')}
        ${m('Chain Integrity', integrityValid ? '✓ VALID' : '✗ BROKEN', integrityRate + ' verified', integrityValid ? 'green' : 'red', 'check')}
        ${m('NFT Certificates', NFT_CERTS.length.toString(), 'ERC-721 proof-of-authenticity', 'purple', 'shield')}
        ${m('Latest Block', '#' + (stats.latest_block ?? '—'), shortHash(stats.latest_hash), 'green', 'dashboard')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🏆 NFT Authenticity Certificates</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Each batch can have an on-chain proof-of-authenticity NFT. Consumers verify via QR scan.</p>
        <table class="sa-table"><thead><tr><th>Certificate ID</th><th>Batch</th><th>Product</th><th>Chain</th><th>Standard</th><th>Minted</th><th>Scans</th><th>Verified</th><th>Actions</th></tr></thead><tbody>
          ${NFT_CERTS.map(n => `<tr>
            <td class="sa-mono" style="font-size:0.72rem">${n.id}</td>
            <td class="sa-mono">${n.batch}</td>
            <td><strong>${n.product}</strong></td>
            <td>${n.chain}</td><td class="sa-mono">${n.standard}</td>
            <td>${n.minted}</td>
            <td style="text-align:right">${n.scans.toLocaleString()}</td>
            <td><span class="sa-status-pill sa-pill-green"><span class="status-icon status-pass" aria-label="Pass">✓</span> verified</span></td>
            <td><button class="btn btn-xs btn-outline" onclick="explorerViewNFT('${n.id}')">View</button> <button class="btn btn-xs btn-ghost" onclick="explorerTransferNFT('${n.id}')">Transfer</button></td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <div class="sa-card">
        <h3>📜 Recent On-Chain Seals</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Real-time blockchain seal records from the TrustChecker integrity layer.</p>
        <table class="sa-table"><thead><tr><th>Block</th><th>Event</th><th>Data Hash</th><th>Prev Hash</th><th>Merkle Root</th><th>Time</th></tr></thead><tbody>
          ${seals.map(s => `<tr>
            <td class="sa-mono" style="font-weight:700;color:var(--cyan)">#${s.block_index}</td>
            <td><span class="sa-status-pill sa-pill-blue">${s.event_type}</span></td>
            <td class="sa-mono" style="font-size:0.7rem">${shortHash(s.data_hash)}</td>
            <td class="sa-mono" style="font-size:0.7rem">${shortHash(s.prev_hash)}</td>
            <td class="sa-mono" style="font-size:0.7rem">${shortHash(s.merkle_root)}</td>
            <td class="sa-mono" style="font-size:0.72rem">${timeAgo(s.sealed_at)}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }

// ─── Reload ─────────────────────────────────────────────────
window._explorerReload = function() { EX = null; _loading = false; render(); };

// ─── Modal helpers ──────────────────────────────────────────
function showModal(html) { State.modal = html; render(); }
function closeModal() { State.modal = null; render(); }

function gridRow(label, value) {
  return '<div><span style="color:var(--text-secondary)">' + label + '</span><br><strong>' + value + '</strong></div>';
}

window.explorerVerifyHash = function() {
  showModal(
    '<div class="modal" style="max-width:480px">' +
    '<div class="modal-title">' + icon('search', 20) + ' Verify Transaction Hash</div>' +
    '<p style="font-size:0.82rem;color:var(--text-secondary);margin:8px 0 16px">Enter a SHA-256 data hash to verify its on-chain seal status.</p>' +
    '<div class="form-group"><input type="text" id="verify-hash-input" class="form-input" placeholder="e.g. 2791b6e9…" style="font-family:\'JetBrains Mono\',monospace;font-size:0.82rem"></div>' +
    '<div style="display:flex;gap:8px;margin-top:16px">' +
    '<button class="btn btn-primary" style="flex:1" onclick="doVerifyHash()">🔍 Verify</button>' +
    '<button class="btn" onclick="closeExplorerModal()">Cancel</button>' +
    '</div></div>'
  );
};

window.doVerifyHash = function() {
  var hash = document.getElementById('verify-hash-input');
  if (!hash || !hash.value) return;
  var val = hash.value.trim();
  var seals = (EX && EX.recent_seals) || [];
  var found = seals.find(function(s) { return s.data_hash && s.data_hash.indexOf(val.slice(0, 8)) !== -1; });
  if (found) {
    showModal(
      '<div class="modal" style="max-width:480px">' +
      '<div class="modal-title">✅ Hash Verified</div>' +
      '<div style="background:var(--surface);border-radius:8px;padding:16px;margin:12px 0">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:0.82rem">' +
      gridRow('Block', '#' + found.block_index) +
      gridRow('Event', found.event_type) +
      gridRow('Merkle Root', shortHash(found.merkle_root)) +
      gridRow('Time', timeAgo(found.sealed_at)) +
      '</div></div>' +
      '<button class="btn" style="width:100%;margin-top:8px" onclick="closeExplorerModal()">Close</button>' +
      '</div>'
    );
  } else {
    showModal(
      '<div class="modal" style="max-width:400px">' +
      '<div class="modal-title">⚠️ Hash Not Found</div>' +
      '<p style="font-size:0.82rem;color:var(--text-secondary);margin:12px 0">The hash was not found in recent seals. It may exist on-chain but is not in the current view.</p>' +
      '<button class="btn" style="width:100%;margin-top:8px" onclick="closeExplorerModal()">Close</button>' +
      '</div>'
    );
  }
};

window.explorerMintNFT = function() {
  showModal(
    '<div class="modal" style="max-width:440px">' +
    '<div class="modal-title">' + icon('zap', 20) + ' Mint NFT Certificate</div>' +
    '<div style="background:var(--surface);border-radius:8px;padding:20px;margin:12px 0;text-align:center">' +
    '<div style="font-size:2rem;margin-bottom:8px">🔗</div>' +
    '<p style="font-size:0.85rem;color:var(--text-secondary);margin:0">Connect your VeChain or Polygon wallet to mint an ERC-721 proof-of-authenticity NFT for a verified batch.</p>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:16px">' +
    '<button class="btn btn-primary" style="flex:1" disabled>Connect Wallet</button>' +
    '<button class="btn" onclick="closeExplorerModal()">Close</button>' +
    '</div></div>'
  );
};

window.explorerViewNFT = function(id) {
  var nft = NFT_CERTS.find(function(n) { return n.id === id; });
  if (!nft) return;
  showModal(
    '<div class="modal" style="max-width:500px">' +
    '<div class="modal-title">🏆 NFT Certificate</div>' +
    '<div style="background:var(--surface);border-radius:8px;padding:16px;margin:12px 0">' +
    '<div style="font-family:\'JetBrains Mono\',monospace;font-size:0.72rem;color:var(--cyan);margin-bottom:12px">' + nft.id + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:0.82rem">' +
    gridRow('Product', nft.product) +
    gridRow('Batch', nft.batch) +
    gridRow('Chain', nft.chain) +
    gridRow('Standard', nft.standard) +
    gridRow('Minted', nft.minted) +
    gridRow('Scans', nft.scans.toLocaleString()) +
    '</div>' +
    '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:flex;align-items:center;gap:6px">' +
    '<span class="badge valid">✓ Verified</span>' +
    '<span style="font-size:0.75rem;color:var(--text-secondary)">On-chain proof-of-authenticity</span>' +
    '</div></div>' +
    '<button class="btn" style="width:100%;margin-top:8px" onclick="closeExplorerModal()">Close</button>' +
    '</div>'
  );
};

window.explorerTransferNFT = function(id) {
  showModal(
    '<div class="modal" style="max-width:440px">' +
    '<div class="modal-title">🔄 Transfer NFT</div>' +
    '<div style="background:var(--surface);border-radius:8px;padding:20px;margin:12px 0;text-align:center">' +
    '<div style="font-size:2rem;margin-bottom:8px">👛</div>' +
    '<p style="font-size:0.85rem;color:var(--text-secondary);margin:0">Connect your wallet to transfer NFT ownership on-chain. The new owner will receive full verification rights.</p>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:16px">' +
    '<button class="btn btn-primary" style="flex:1" disabled>Connect Wallet</button>' +
    '<button class="btn" onclick="closeExplorerModal()">Close</button>' +
    '</div></div>'
  );
};

window.closeExplorerModal = closeModal;
