/**
 * Company Admin – Code Audit Log
 * Compliance layer: who created, when, how many, exported where, printed where
 */
import { icon } from '../../core/icons.js';

const AUDIT_LOG = [
    { ts: '2026-02-19 17:15:02', action: 'code.generate', actor: 'prod-mgr@company.com', detail: 'Generated 10,000 codes (FMT-001) for batch B-2026-0895', approval: 'admin@company.com', ip: '10.0.1.45', factory: 'HCM-01' },
    { ts: '2026-02-19 16:30:00', action: 'code.print.export', actor: 'print-ops@company.com', detail: 'Exported 10,000 codes to print system (Factory HCM-01)', approval: '—', ip: '10.0.1.52', factory: 'HCM-01' },
    { ts: '2026-02-19 15:00:00', action: 'code.activate', actor: 'system', detail: 'Auto-activated 10,000 codes (batch B-2026-0895) post-print confirmation', approval: 'auto', ip: 'system', factory: 'HCM-01' },
    { ts: '2026-02-19 14:30:00', action: 'code.generate.approve', actor: 'admin@company.com', detail: 'Approved generation request GEN-2026-0451 (10,000 codes)', approval: '4-Eyes', ip: '10.0.1.10', factory: '—' },
    { ts: '2026-02-18 09:15:00', action: 'code.generate', actor: 'prod-mgr@company.com', detail: 'Generated 5,000 codes (FMT-002) for batch B-2026-0891', approval: 'admin@company.com', ip: '10.0.1.45', factory: 'HN-02' },
    { ts: '2026-02-17 14:00:00', action: 'code.lock', actor: 'risk@company.com', detail: 'Locked code ACME-2026-007233-9M (suspected counterfeit)', approval: '—', ip: '10.0.1.30', factory: '—' },
    { ts: '2026-02-17 11:00:00', action: 'code.flag', actor: 'system', detail: 'Auto-flagged ACME-2026-004891-3L: 47 scans from Phnom Penh (velocity rule)', approval: 'auto', ip: 'system', factory: '—' },
    { ts: '2026-02-15 16:00:00', action: 'code.revoke', actor: 'admin@company.com', detail: 'Revoked ACME-2026-009999-1P: confirmed counterfeit (case FC-2026-012)', approval: '6-Eyes', ip: '10.0.1.10', factory: '—' },
    { ts: '2026-02-15 10:00:00', action: 'code.batch.reassign', actor: 'ops@company.com', detail: 'Reassigned 800 codes from D-VN-045 to D-VN-012 (batch B-2026-0887)', approval: 'admin@company.com', ip: '10.0.1.40', factory: '—' },
    { ts: '2026-02-14 08:00:00', action: 'format.rule.create', actor: 'admin@company.com', detail: 'Created FMT-004 (Export Certificate) format rule', approval: '—', ip: '10.0.1.10', factory: '—' },
];

const STATS = {
    totalActions: '1,247',
    generationsThisMonth: '3',
    lockedCodes: '8',
    revokedCodes: '3',
    printExports: '5',
    formatChanges: '1',
};

export function renderPage() {
    const actionColors = {
        'code.generate': '#3b82f6', 'code.generate.approve': '#22c55e', 'code.print.export': '#06b6d4',
        'code.activate': '#22c55e', 'code.flag': '#f59e0b', 'code.lock': '#ef4444',
        'code.revoke': '#991b1b', 'code.batch.reassign': '#6366f1', 'format.rule.create': '#8b5cf6',
    };

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('scroll', 28)} Code Audit Log</h1><div class="sa-title-actions"><button class="btn btn-outline btn-sm">Export Signed Audit</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Total Actions', STATS.totalActions, 'Since deployment', 'blue', 'scroll')}
        ${m('Generations (MTD)', STATS.generationsThisMonth, '127,500 codes total', 'green', 'zap')}
        ${m('Locked Codes', STATS.lockedCodes, 'Manual + auto', 'orange', 'lock')}
        ${m('Revoked Codes', STATS.revokedCodes, 'Permanent invalidation', 'red', 'alertTriangle')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🔍 Filters</h3>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
          <select class="ops-input" style="width:180px;padding:0.5rem"><option>All Actions</option><option>code.generate</option><option>code.lock</option><option>code.revoke</option><option>code.flag</option><option>code.print.export</option><option>code.batch.reassign</option></select>
          <input class="ops-input" type="date" value="2026-02-01" style="padding:0.5rem" />
          <input class="ops-input" type="date" value="2026-02-19" style="padding:0.5rem" />
          <input class="ops-input" placeholder="Actor email..." style="width:200px;padding:0.5rem" />
          <button class="btn btn-sm btn-outline">Apply</button>
        </div>
      </div>

      <div class="sa-card">
        <h3>📋 Audit Trail</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Immutable record of all code lifecycle events. Hash-chained for tamper detection.</p>
        <table class="sa-table"><thead><tr><th>Timestamp</th><th>Action</th><th>Actor</th><th>Detail</th><th>Approval</th><th>IP</th><th>Factory</th></tr></thead><tbody>
          ${AUDIT_LOG.map(l => {
        const color = actionColors[l.action] || '#64748b';
        return `<tr>
              <td class="sa-code" style="font-size:0.72rem;white-space:nowrap">${l.ts}</td>
              <td><span class="sa-status-pill" style="background:${color}12;color:${color};border:1px solid ${color}25;font-size:0.68rem">${l.action}</span></td>
              <td style="font-size:0.78rem">${l.actor}</td>
              <td style="font-size:0.78rem;max-width:300px">${l.detail}</td>
              <td style="font-size:0.78rem">${l.approval}</td>
              <td class="sa-code" style="font-size:0.72rem">${l.ip}</td>
              <td style="font-size:0.78rem">${l.factory}</td>
            </tr>`;
    }).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
