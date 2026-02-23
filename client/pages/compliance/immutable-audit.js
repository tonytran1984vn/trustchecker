/**
 * Compliance – Immutable Audit (Hash Chain, Signed Export, Tamper Detection)
 */
import { icon } from '../../core/icons.js';

const CHAIN_BLOCKS = [
    { seq: 1048, hash: 'a3f8c2...d91e', prevHash: 'e7b2a1...f04c', timestamp: '2026-02-19 17:15:02', events: 12, actor: 'system', action: 'batch.transfer.approve', verified: true },
    { seq: 1047, hash: 'e7b2a1...f04c', prevHash: 'b9d4e3...a218', timestamp: '2026-02-19 17:14:58', events: 1, actor: 'ops@company.com', action: 'batch.transfer.initiate', verified: true },
    { seq: 1046, hash: 'b9d4e3...a218', prevHash: 'c1f7d8...e392', timestamp: '2026-02-19 17:10:33', events: 3, actor: 'risk@company.com', action: 'risk.rule.edit', verified: true },
    { seq: 1045, hash: 'c1f7d8...e392', prevHash: 'd2a9c4...b741', timestamp: '2026-02-19 17:05:15', events: 1, actor: 'admin@company.com', action: 'user.create', verified: true },
    { seq: 1044, hash: 'd2a9c4...b741', prevHash: 'f5e1b6...c809', timestamp: '2026-02-19 17:00:00', events: 8, actor: 'system', action: 'batch.create (auto)', verified: true },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('lock', 28)} Immutable Audit Trail</h1></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Chain Length', '1,048 blocks', 'Since 2025-12-01', 'blue', 'shield')}
        ${m('Integrity', '100% <span class="status-icon status-pass" aria-label="Pass">✓</span>', 'All blocks verified', 'green', 'check')}
        ${m('Last Block', '2 min ago', 'Seq #1048', 'green', 'clock')}
        ${m('Tamper Alerts', '0', 'No anomalies detected', 'green', 'shield')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🔗 Hash Chain (Latest Blocks)</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">SHA-256 hash chain — each block references previous block hash. Any tampering breaks the chain.</p>
        <table class="sa-table"><thead><tr><th>Seq</th><th>Block Hash</th><th>Prev Hash</th><th>Timestamp</th><th>Events</th><th>Actor</th><th>Action</th><th>Verified</th></tr></thead><tbody>
          ${CHAIN_BLOCKS.map(b => `<tr>
            <td><strong>#${b.seq}</strong></td>
            <td class="sa-code" style="font-size:0.68rem;color:#22c55e">${b.hash}</td>
            <td class="sa-code" style="font-size:0.68rem;color:var(--text-secondary)">${b.prevHash}</td>
            <td class="sa-code" style="font-size:0.72rem">${b.timestamp}</td>
            <td>${b.events}</td><td style="font-size:0.78rem">${b.actor}</td>
            <td class="sa-code" style="font-size:0.72rem">${b.action}</td>
            <td>${b.verified ? '<span class="sa-status-pill sa-pill-green"><span class="status-icon status-pass" aria-label="Pass">✓</span> verified</span>' : '<span class="sa-status-pill sa-pill-red"><span class="status-icon status-warn" aria-label="Warning">!</span> BROKEN</span>'}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">
        <div class="sa-card">
          <h3>📜 Signed Export</h3>
          <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem">Digitally signed audit exports for regulatory submission.</p>
          <div class="sa-threshold-list">
            ${th('Signature Algorithm', 'RSA-2048 / SHA-256')}
            ${th('Certificate', 'TrustChecker Audit CA (valid until 2027)')}
            ${th('Export Format', 'PDF + CSV + JSON (signed bundle)')}
            ${th('Verification URL', 'https://verify.trustchecker.io/audit')}
          </div>
          <div style="display:flex;gap:0.75rem;margin-top:1rem">
            <button class="btn btn-primary btn-sm">Export Signed Audit</button>
            <button class="btn btn-outline btn-sm">Verify Existing Export</button>
          </div>
        </div>

        <div class="sa-card">
          <h3>🛡 Tamper Detection Policy</h3>
          <div class="sa-threshold-list">
            ${th('Hash Algorithm', 'SHA-256')}
            ${th('Chain Verification', 'Every 5 minutes (auto)')}
            ${th('Alert on Break', 'Email + Slack + SMS (Compliance team)')}
            ${th('Deletion Policy', 'PROHIBITED — no log deletion allowed')}
            ${th('Retention', '7 years (regulatory minimum)')}
            ${th('Encryption at Rest', 'AES-256-GCM')}
          </div>
        </div>
      </div>

      <div class="sa-card">
        <h3>🔍 Chain Integrity Verification</h3>
        <div style="display:flex;align-items:center;gap:1rem;padding:1rem;background:rgba(34,197,94,0.06);border-radius:8px;border:1px solid rgba(34,197,94,0.15)">
          <span style="font-size:2rem"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span></span>
          <div>
            <div style="font-weight:700;color:#22c55e">Chain Integrity: VERIFIED</div>
            <div style="font-size:0.82rem;color:var(--text-secondary)">Last full verification: 4 min ago · 1,048 blocks · 0 anomalies · Next: in 1 min</div>
          </div>
          <button class="btn btn-outline btn-sm" style="margin-left:auto">Run Full Verification</button>
        </div>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
function th(n, v) { return `<div class="sa-threshold-item"><div class="sa-threshold-header"><strong>${n}</strong><input class="ops-input" value="${v}" style="width:300px;text-align:center;font-size:0.78rem" /></div></div>`; }
