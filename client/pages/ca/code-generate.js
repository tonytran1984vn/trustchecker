/**
 * Company Admin – Generate Codes (Bulk Code Generation Engine)
 * Enterprise: template-driven, no manual free-text, validation enforced
 */
import { icon } from '../../core/icons.js';

const RECENT_JOBS = [
    { id: 'GEN-2026-0451', format: 'FMT-001 (Standard Product)', quantity: 10000, product: 'Premium Coffee Blend', batch: 'B-2026-0895', factory: 'Factory HCM-01', requestedBy: 'prod-mgr@company.com', approvedBy: 'admin@company.com', status: 'completed', generated: '2026-02-19 14:30', duration: '12s' },
    { id: 'GEN-2026-0450', format: 'FMT-002 (High-Security)', quantity: 5000, product: 'Organic Tea Collection', batch: 'B-2026-0891', factory: 'Factory HN-02', requestedBy: 'prod-mgr@company.com', approvedBy: 'admin@company.com', status: 'completed', generated: '2026-02-18 09:15', duration: '8s' },
    { id: 'GEN-2026-0449', format: 'FMT-003 (Distributor)', quantity: 2000, product: 'Manuka Honey UMF15+', batch: 'B-2026-0887', factory: 'Factory SG-01', requestedBy: 'ops@company.com', approvedBy: '—', status: 'pending_approval', generated: '—', duration: '—' },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('zap', 28)} Generate Codes</h1></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Codes Generated (MTD)', '127,500', '+15% vs last month', 'blue', 'zap')}
        ${m('Active Formats', '4', 'All validated', 'green', 'settings')}
        ${m('Pending Approval', '1', 'GEN-2026-0449', 'orange', 'clock')}
        ${m('Collision Check', '0 duplicates', 'Platform-wide unique', 'green', 'shield')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>➕ New Code Generation Request</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Codes are generated using approved Format Rules only. Free-text entry is disabled for enterprise security.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div>
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:0.3rem">Format Rule *</label>
            <select class="ops-input" style="width:100%;padding:0.6rem"><option>FMT-001 – Standard Product QR</option><option>FMT-002 – High-Security Batch</option><option>FMT-003 – Distributor Tracking</option><option>FMT-004 – Export Certificate</option></select>
          </div>
          <div>
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:0.3rem">Quantity *</label>
            <input class="ops-input" type="number" value="10000" style="width:100%;padding:0.6rem" />
          </div>
          <div>
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:0.3rem">Product Line *</label>
            <select class="ops-input" style="width:100%;padding:0.6rem"><option>Premium Coffee Blend (Arabica)</option><option>Organic Tea Collection</option><option>Manuka Honey UMF15+</option></select>
          </div>
          <div>
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:0.3rem">Target Batch</label>
            <select class="ops-input" style="width:100%;padding:0.6rem"><option>Auto-create new batch</option><option>B-2026-0895</option><option>B-2026-0891</option></select>
          </div>
          <div>
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:0.3rem">Factory</label>
            <select class="ops-input" style="width:100%;padding:0.6rem"><option>Factory HCM-01</option><option>Factory HN-02</option><option>Factory SG-01</option></select>
          </div>
          <div>
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:0.3rem">Activation Mode</label>
            <select class="ops-input" style="width:100%;padding:0.6rem"><option>Auto-activate on print</option><option>Manual activation required</option><option>Time-delayed (24h after print)</option></select>
          </div>
        </div>
        <div style="display:flex;gap:0.75rem;margin-top:1.25rem;align-items:center">
          <button class="btn btn-primary btn-sm">Submit for Approval</button>
          <span style="font-size:0.72rem;color:var(--text-secondary)"><span class="status-icon status-warn" aria-label="Warning">!</span> Requires admin approval (4-Eyes) for qty > 5,000</span>
        </div>

        <div style="margin-top:1rem;padding:0.75rem;background:rgba(99,102,241,0.04);border-radius:8px;border:1px solid rgba(99,102,241,0.1)">
          <strong style="font-size:0.78rem">Preview:</strong>
          <div class="sa-code" style="font-size:0.82rem;margin-top:0.3rem;color:#6366f1">ACME-2026-000001-3K → ACME-2026-010000-8M</div>
          <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:0.2rem">Pattern: [BRAND]-[YEAR]-[SEQ6]-[CHK2] · Check: Luhn Mod-36 · Unique: Platform-verified</div>
        </div>
      </div>

      <div class="sa-card">
        <h3>📋 Recent Generation Jobs</h3>
        <table class="sa-table"><thead><tr><th>Job ID</th><th>Format</th><th>Qty</th><th>Product</th><th>Batch</th><th>Factory</th><th>Requested By</th><th>Approved By</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${RECENT_JOBS.map(j => `<tr class="${j.status === 'pending_approval' ? 'ops-alert-row' : ''}">
            <td class="sa-code">${j.id}</td>
            <td style="font-size:0.72rem">${j.format}</td>
            <td style="text-align:right;font-weight:600">${j.quantity.toLocaleString()}</td>
            <td style="font-size:0.82rem">${j.product}</td>
            <td class="sa-code">${j.batch}</td>
            <td style="font-size:0.78rem">${j.factory}</td>
            <td style="font-size:0.78rem">${j.requestedBy}</td>
            <td style="font-size:0.78rem">${j.approvedBy}</td>
            <td class="sa-code" style="font-size:0.72rem">${j.generated}</td>
            <td><span class="sa-status-pill sa-pill-${j.status === 'completed' ? 'green' : 'orange'}">${j.status.replace('_', ' ')}</span></td>
            <td>${j.status === 'completed' ? '<button class="btn btn-xs btn-outline">Download</button>' : '<button class="btn btn-xs btn-primary">Approve</button>'}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
