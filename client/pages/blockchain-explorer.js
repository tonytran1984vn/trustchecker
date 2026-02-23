/**
 * Blockchain Explorer — On-chain verification, NFT certificates, transaction history
 */
import { icon } from '../../core/icons.js';

const RECENT_TXN = [
    { hash: '0xa3f8…d91e', block: 18492031, action: 'batch.register', batch: 'B-2026-0895', chain: 'VeChain', timestamp: '2026-02-19 17:15', gas: '0.012 VET', status: 'confirmed', confirmations: 42 },
    { hash: '0xe7b2…f04c', block: 18492028, action: 'batch.transfer', batch: 'B-2026-0893', chain: 'VeChain', timestamp: '2026-02-19 17:10', gas: '0.008 VET', status: 'confirmed', confirmations: 45 },
    { hash: '0xb9d4…a218', block: 18492019, action: 'nft.mint', batch: 'B-2026-0891', chain: 'Polygon', timestamp: '2026-02-19 17:05', gas: '0.003 MATIC', status: 'confirmed', confirmations: 120 },
    { hash: '0xc1f7…e392', block: 18492015, action: 'scan.verify', batch: 'B-2026-0889', chain: 'VeChain', timestamp: '2026-02-19 17:00', gas: '0.005 VET', status: 'confirmed', confirmations: 156 },
    { hash: '0xd2a9…b741', block: 18491998, action: 'batch.certify', batch: 'B-2026-0887', chain: 'Polygon', timestamp: '2026-02-19 16:45', gas: '0.015 MATIC', status: 'confirmed', confirmations: 287 },
];

const NFT_CERTS = [
    { id: 'TC-NFT-2026-0895', batch: 'B-2026-0895', product: 'Premium Coffee Blend (Arabica)', chain: 'Polygon', standard: 'ERC-721', owner: 'company.eth', minted: '2026-02-19', verified: true, scans: 1247 },
    { id: 'TC-NFT-2026-0891', batch: 'B-2026-0891', product: 'Organic Tea Collection', chain: 'Polygon', standard: 'ERC-721', owner: 'company.eth', minted: '2026-02-18', verified: true, scans: 892 },
    { id: 'TC-NFT-2026-0887', batch: 'B-2026-0887', product: 'Manuka Honey (UMF 15+)', chain: 'Polygon', standard: 'ERC-721', owner: 'company.eth', minted: '2026-02-17', verified: true, scans: 2103 },
];

const CHAIN_STATS = [
    { chain: 'VeChain', txns: '12,847', batches: '2,341', verified: '99.8%', avgConf: '12s', cost: '$0.003/tx' },
    { chain: 'Polygon', txns: '8,234', batches: '1,892', verified: '100%', avgConf: '2s', cost: '$0.001/tx' },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('lock', 28)} Blockchain Explorer</h1><div class="sa-title-actions"><button class="btn btn-outline btn-sm">Verify Hash</button><button class="btn btn-primary btn-sm" style="margin-left:0.5rem">Mint NFT Certificate</button></div></div>

      <div class="sa-metrics-grid" style="margin-bottom:1.5rem">
        ${m('On-chain Transactions', '21,081', 'VeChain + Polygon', 'blue', 'lock')}
        ${m('Verified Batches', '4,233', '99.9% verification rate', 'green', 'check')}
        ${m('NFT Certificates', NFT_CERTS.length.toString(), 'ERC-721 proof-of-authenticity', 'purple', 'shield')}
        ${m('Chain Cost (30d)', '$142', 'Avg $0.002/transaction', 'green', 'dashboard')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">
        ${CHAIN_STATS.map(cs => `
          <div class="sa-card">
            <h3 style="display:flex;align-items:center;gap:0.5rem">${cs.chain === 'VeChain' ? '⛓' : '🔷'} ${cs.chain}</h3>
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.75rem;margin-top:0.75rem">
              ${[['Transactions', cs.txns], ['Batches', cs.batches], ['Verified', cs.verified], ['Confirmation', cs.avgConf], ['Cost', cs.cost]].map(([l, v]) =>
        `<div style="text-align:center"><div style="font-size:1.1rem;font-weight:700">${v}</div><div style="font-size:0.68rem;color:var(--text-secondary)">${l}</div></div>`
    ).join('')}
            </div>
          </div>
        `).join('')}
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
            <td><button class="btn btn-xs btn-outline">View</button> <button class="btn btn-xs btn-ghost">Transfer</button></td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <div class="sa-card">
        <h3>📜 Recent On-Chain Transactions</h3>
        <table class="sa-table"><thead><tr><th>Tx Hash</th><th>Block</th><th>Action</th><th>Batch</th><th>Chain</th><th>Time</th><th>Gas</th><th>Confirmations</th><th>Status</th></tr></thead><tbody>
          ${RECENT_TXN.map(t => `<tr>
            <td class="sa-mono" style="font-size:0.7rem;color:#6366f1">${t.hash}</td>
            <td class="sa-mono" style="font-size:0.78rem">${t.block.toLocaleString()}</td>
            <td><span class="sa-status-pill sa-pill-blue">${t.action}</span></td>
            <td class="sa-mono">${t.batch}</td>
            <td>${t.chain}</td>
            <td class="sa-mono" style="font-size:0.72rem">${t.timestamp}</td>
            <td class="sa-mono" style="font-size:0.72rem">${t.gas}</td>
            <td style="text-align:center">${t.confirmations}</td>
            <td><span class="sa-status-pill sa-pill-green">${t.status}</span></td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
