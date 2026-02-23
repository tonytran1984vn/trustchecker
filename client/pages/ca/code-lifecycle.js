/**
 * Company Admin – Code Lifecycle Management
 * Enterprise: Generated → Printed → Activated → Scanned → Flagged → Locked → Revoked
 */
import { icon } from '../../core/icons.js';

const LIFECYCLE_STAGES = [
    { stage: 'Generated', color: '#64748b', count: 25000, desc: 'Code created, uniqueness verified' },
    { stage: 'Printed', color: '#3b82f6', count: 17000, desc: 'Sent to factory printing system' },
    { stage: 'Activated', color: '#22c55e', count: 15000, desc: 'Applied to product, ready for scan' },
    { stage: 'First Scanned', color: '#06b6d4', count: 12400, desc: 'Consumer or distributor first scan' },
    { stage: 'Flagged', color: '#f59e0b', count: 23, desc: 'Suspicious activity detected' },
    { stage: 'Locked', color: '#ef4444', count: 8, desc: 'Manually or auto-locked by Risk' },
    { stage: 'Revoked', color: '#991b1b', count: 3, desc: 'Permanently invalidated' },
];

const CODE_LIST = [
    { code: 'ACME-2026-000142-7K', batch: 'B-2026-0895', product: 'Coffee Blend', stage: 'First Scanned', scans: 12, lastScan: '5 min ago', location: 'HCM, VN', riskScore: 5 },
    { code: 'ACME-2026-004891-3L', batch: 'B-2026-0895', product: 'Coffee Blend', stage: 'Flagged', scans: 47, lastScan: '2h ago', location: 'Phnom Penh, KH', riskScore: 82 },
    { code: 'ACME-2026-007233-9M', batch: 'B-2026-0891', product: 'Tea Collection', stage: 'Locked', scans: 0, lastScan: '—', location: '—', riskScore: 95 },
    { code: 'ACME-2026-002100-5N', batch: 'B-2026-0895', product: 'Coffee Blend', stage: 'Activated', scans: 0, lastScan: '—', location: '—', riskScore: 0 },
    { code: 'ACME-D-VN045-000891', batch: 'B-2026-0887', product: 'Manuka Honey', stage: 'Printed', scans: 0, lastScan: '—', location: '—', riskScore: 0 },
    { code: 'ACME-2026-009999-1P', batch: 'B-2026-0895', product: 'Coffee Blend', stage: 'Revoked', scans: 3, lastScan: '5d ago', location: 'Bangkok, TH', riskScore: 100 },
];

const BULK_ACTIONS = [
    { action: 'Lock Batch', desc: 'Lock all codes in a specific batch', requires: '4-Eyes approval', impact: 'All codes return "locked" on scan' },
    { action: 'Revoke Batch', desc: 'Permanently invalidate entire batch', requires: '6-Eyes approval', impact: 'Irreversible — codes cannot be reactivated' },
    { action: 'Reassign Batch', desc: 'Move codes to different distributor', requires: '4-Eyes approval', impact: 'Updates distributor metadata, logs change' },
    { action: 'Extend Expiry', desc: 'Push expiry date for batch codes', requires: 'Admin only', impact: 'Updates expiry, audit logged' },
    { action: 'Lock Single Code', desc: 'Lock individual suspicious code', requires: 'Risk Officer', impact: 'Code returns "locked" on scan' },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('workflow', 28)} Code Lifecycle</h1></div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📊 Lifecycle Pipeline</h3>
        <div style="display:flex;gap:0.25rem;margin:1rem 0">
          ${LIFECYCLE_STAGES.map(s => {
        const width = Math.max(8, (s.count / 25000) * 100);
        return `<div style="flex:${width};text-align:center">
              <div style="background:${s.color};color:#fff;padding:0.5rem 0.25rem;border-radius:6px;font-size:0.72rem;font-weight:700">${s.count.toLocaleString()}</div>
              <div style="font-size:0.68rem;font-weight:600;margin-top:0.3rem">${s.stage}</div>
              <div style="font-size:0.6rem;color:var(--text-secondary)">${s.desc}</div>
            </div>`;
    }).join('<div style="display:flex;align-items:center;color:var(--text-secondary);font-size:0.8rem">→</div>')}
        </div>
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🔎 Code Lookup & Management</h3>
        <div style="display:flex;gap:0.75rem;margin-bottom:1rem">
          <input class="ops-input" placeholder="Search by code, batch, or product..." style="flex:1;padding:0.6rem" />
          <select class="ops-input" style="width:150px;padding:0.6rem"><option>All Stages</option>${LIFECYCLE_STAGES.map(s => `<option>${s.stage}</option>`).join('')}</select>
          <button class="btn btn-sm btn-outline">Search</button>
        </div>
        <table class="sa-table"><thead><tr><th>Code</th><th>Batch</th><th>Product</th><th>Stage</th><th>Scans</th><th>Last Scan</th><th>Location</th><th>Risk</th><th>Actions</th></tr></thead><tbody>
          ${CODE_LIST.map(c => {
        const stageColor = LIFECYCLE_STAGES.find(s => s.stage === c.stage)?.color || '#64748b';
        const isAlert = c.riskScore > 60;
        return `<tr class="${isAlert ? 'ops-alert-row' : ''}">
              <td class="sa-code" style="font-size:0.72rem;color:#6366f1">${c.code}</td>
              <td class="sa-code">${c.batch}</td>
              <td style="font-size:0.82rem">${c.product}</td>
              <td><span class="sa-status-pill" style="background:${stageColor}15;color:${stageColor};border:1px solid ${stageColor}30">${c.stage}</span></td>
              <td style="text-align:center">${c.scans}</td>
              <td style="font-size:0.78rem">${c.lastScan}</td>
              <td style="font-size:0.78rem">${c.location}</td>
              <td style="font-weight:700;color:${c.riskScore > 60 ? '#ef4444' : c.riskScore > 30 ? '#f59e0b' : '#22c55e'}">${c.riskScore}</td>
              <td>
                ${c.stage === 'Flagged' ? '<button class="btn btn-xs btn-outline" style="color:#ef4444">Lock</button>' : ''}
                ${c.stage === 'Activated' || c.stage === 'Printed' ? '<button class="btn btn-xs btn-ghost">Details</button>' : ''}
                ${c.stage === 'Locked' ? '<button class="btn btn-xs btn-outline">Revoke</button> <button class="btn btn-xs btn-ghost">Unlock</button>' : ''}
                ${c.stage === 'First Scanned' ? '<button class="btn btn-xs btn-ghost">Timeline</button>' : ''}
              </td>
            </tr>`;
    }).join('')}
        </tbody></table>
      </div>

      <div class="sa-card">
        <h3>⚡ Bulk Actions</h3>
        <table class="sa-table"><thead><tr><th>Action</th><th>Description</th><th>Requires</th><th>Impact</th><th></th></tr></thead><tbody>
          ${BULK_ACTIONS.map(b => `<tr>
            <td><strong>${b.action}</strong></td>
            <td style="font-size:0.82rem">${b.desc}</td>
            <td style="font-size:0.78rem">${b.requires}</td>
            <td style="font-size:0.78rem">${b.impact}</td>
            <td><button class="btn btn-xs btn-outline">Execute</button></td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
