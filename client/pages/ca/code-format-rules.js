/**
 * Company Admin – Code Format Rules
 * Enterprise code governance: pattern structure, check digit, prefix control
 */
import { icon } from '../../core/icons.js';

const FORMAT_RULES = [
  { id: 'FMT-001', name: 'Standard Product QR', pattern: '[BRAND]-[YEAR]-[SEQ6]-[CHK2]', example: 'ACME-2026-000142-7K', length: 20, prefix: 'ACME', checkDigit: 'Luhn Mod-36', expiry: '24 months from activation', rescanLimit: 50, status: 'active', usedBy: 3 },
  { id: 'FMT-002', name: 'High-Security Batch', pattern: '[BRAND]-[FAC]-[DATE]-[RND8]-[HMAC4]', example: 'ACME-F01-20260219-a8f3d2c1-9K2L', length: 32, prefix: 'ACME-F*', checkDigit: 'HMAC-SHA256 (last 4)', expiry: '36 months', rescanLimit: 100, status: 'active', usedBy: 1 },
  { id: 'FMT-003', name: 'Distributor Tracking', pattern: '[BRAND]-D-[DIST]-[SEQ6]', example: 'ACME-D-VN045-000891', length: 20, prefix: 'ACME-D', checkDigit: 'Modulo-97', expiry: '12 months', rescanLimit: 20, status: 'active', usedBy: 5 },
  { id: 'FMT-004', name: 'Export Certificate', pattern: '[BRAND]-EX-[COUNTRY]-[YEAR]-[RND6]-[CHK2]', example: 'ACME-EX-US-2026-f8a3c2-LM', length: 26, prefix: 'ACME-EX', checkDigit: 'CRC-16', expiry: 'Never', rescanLimit: 999, status: 'active', usedBy: 2 },
];

const VALIDATION_RULES = [
  { rule: 'Uniqueness Check', desc: 'Every generated code must be globally unique across all batches and tenants', enforcement: 'HARD BLOCK', scope: 'Platform-wide' },
  { rule: 'Pattern Compliance', desc: 'Code must match assigned format rule pattern before generation', enforcement: 'HARD BLOCK', scope: 'Per format rule' },
  { rule: 'Check Digit Validation', desc: 'Check digit must pass algorithm verification on every scan', enforcement: 'HARD BLOCK', scope: 'Every scan event' },
  { rule: 'Prefix Reservation', desc: 'Each brand prefix is reserved per tenant — no cross-tenant collision', enforcement: 'HARD BLOCK', scope: 'Platform-wide' },
  { rule: 'Expiry Enforcement', desc: 'Codes past expiry date return "expired" on scan and log alert', enforcement: 'SOFT (log + alert)', scope: 'Per code' },
  { rule: 'Re-scan Throttle', desc: 'Codes exceeding re-scan limit trigger velocity alert', enforcement: 'SOFT (flag)', scope: 'Per code' },
  { rule: 'Sequential Gap Detection', desc: 'Gaps in sequential codes are flagged for investigation', enforcement: 'SOFT (flag)', scope: 'Per batch' },
];

export function renderPage() {
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('settings', 28)} Code Format Rules</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Create Format Rule</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Active Formats', FORMAT_RULES.length, `${FORMAT_RULES.reduce((s,f) => s+f.usedBy, 0)} product lines using`, 'blue', 'settings')}
        ${m('Validation Rules', VALIDATION_RULES.length, '4 hard blocks + 3 soft flags', 'green', 'shield')}
        ${m('Prefix Reserved', '4', 'ACME, ACME-D, ACME-EX, ACME-F*', 'green', 'lock')}
        ${m('Check Algorithms', '4', 'Luhn, HMAC, Mod-97, CRC-16', 'blue', 'check')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📐 Format Definitions</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Each format rule defines how codes are structured. Production can only generate codes using approved formats.</p>
        <table class="sa-table"><thead><tr><th>ID</th><th>Name</th><th>Pattern</th><th>Example</th><th>Length</th><th>Check Digit</th><th>Expiry</th><th>Re-scan Limit</th><th>Used By</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${FORMAT_RULES.map(f => `<tr>
            <td class="sa-code">${f.id}</td><td><strong>${f.name}</strong></td>
            <td class="sa-code" style="font-size:0.68rem;max-width:220px">${f.pattern}</td>
            <td class="sa-code" style="font-size:0.72rem;color:#6366f1">${f.example}</td>
            <td style="text-align:center">${f.length}</td>
            <td style="font-size:0.78rem">${f.checkDigit}</td>
            <td style="font-size:0.78rem">${f.expiry}</td>
            <td style="text-align:center">${f.rescanLimit}</td>
            <td style="text-align:center">${f.usedBy} lines</td>
            <td><span class="sa-status-pill sa-pill-green">${f.status}</span></td>
            <td><button class="btn btn-xs btn-outline">Edit</button></td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <div class="sa-card">
        <h3>🛡 Validation & Enforcement Rules</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">System-enforced rules that prevent code integrity violations.</p>
        <table class="sa-table"><thead><tr><th>Rule</th><th>Description</th><th>Enforcement</th><th>Scope</th></tr></thead><tbody>
          ${VALIDATION_RULES.map(v => `<tr>
            <td><strong>${v.rule}</strong></td>
            <td style="font-size:0.82rem">${v.desc}</td>
            <td><span class="sa-status-pill sa-pill-${v.enforcement.includes('HARD')?'red':'orange'}">${v.enforcement}</span></td>
            <td style="font-size:0.78rem">${v.scope}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l,v,s,c,i){return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i,22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`;}
