/**
 * Risk – Model Governance (Enterprise Risk Model Lifecycle)
 * Versioning, change approval, sandbox simulation, calibration audit
 * Compliance requirement: no dynamic recalibration without governance
 */
import { icon } from '../../core/icons.js';

const MODEL_VERSIONS = [
  { ver: 'v2.3.1', status: 'production', deployed: '2026-02-17', factors: 12, weights: '12 adjusted', fpRate: '8.2%', approvedBy: 'risk-lead@company.com', change: '3 weights recalibrated (F1↓, T1↓, G2↑)' },
  { ver: 'v2.3.0', status: 'archived', deployed: '2026-02-10', factors: 12, weights: '10 adjusted', fpRate: '11.4%', approvedBy: 'risk-lead@company.com', change: 'B3↑, T3↑ after confirmed cases' },
  { ver: 'v2.2.0', status: 'archived', deployed: '2026-01-20', factors: 12, weights: 'baseline', fpRate: '14.1%', approvedBy: 'cto@company.com', change: 'Initial production model' },
  { ver: 'v2.4.0-rc1', status: 'sandbox', deployed: '—', factors: 12, weights: '5 proposed', fpRate: '~6.8% (simulated)', approvedBy: '—', change: 'Aggressive decay + B2 boost (pending approval)' },
];

const PENDING_CHANGES = [
  { id: 'RC-2026-014', factor: 'B2 (Flagged IP)', current: '1.0×', proposed: '1.25×', reason: 'IP blacklist proven 95% accurate over last 30 cases', impact: 'ERS +3-5 avg for flagged IPs', requestedBy: 'risk-analyst@company.com', status: 'pending_approval' },
  { id: 'RC-2026-013', factor: 'λ (Decay Rate)', current: '0.015', proposed: '0.020', reason: 'Faster decay reduces noise for old events', impact: 'Half-life: 46d → 35d', requestedBy: 'risk-lead@company.com', status: 'pending_approval' },
  { id: 'RC-2026-012', factor: 'F3 (Burst Scan)', current: '0.85×', proposed: '0.78×', reason: 'FP rate 19% — warehouse loading patterns trigger false bursts', impact: '~12% fewer medium-level cases', requestedBy: 'ops@company.com', status: 'approved' },
];

const SANDBOX_RESULTS = [
  { scenario: 'v2.4.0-rc1 vs Production', dataset: 'Last 30 days (4,892 events)', result: 'FP rate: 8.2% → 6.8%', truePositive: '98.1% → 97.8%', falseNeg: '1.9% → 2.2%', verdict: 'Acceptable — marginal TP loss for significant FP reduction' },
  { scenario: 'Aggressive decay (λ=0.025)', dataset: 'Historical 90 days', result: 'FP rate: 8.2% → 5.1%', truePositive: '98.1% → 94.2%', falseNeg: '1.9% → 5.8%', verdict: '<span class="status-icon status-warn" aria-label="Warning">!</span> REJECTED — TP drops below 95% threshold' },
];

export function renderPage() {
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('settings', 28)} Model Governance</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Propose Change</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Production Model', 'v2.3.1', 'Deployed Feb 17', 'green', 'check')}
        ${m('Sandbox', 'v2.4.0-rc1', 'Pending approval', 'orange', 'settings')}
        ${m('Pending Changes', PENDING_CHANGES.filter(c => c.status === 'pending_approval').length.toString(), 'Awaiting Risk Lead approval', 'blue', 'clipboard')}
        ${m('FP Rate Trend', '14.1% → 8.2%', '3 calibration cycles', 'green', 'target')}
      </div>

      <!-- MODEL VERSIONING -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📦 Model Version History</h3>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:0.75rem">Every model change requires approval. No weight adjustment goes to production without governance.</p>
        <table class="sa-table"><thead><tr><th>Version</th><th>Status</th><th>Deployed</th><th>Factors</th><th>FP Rate</th><th>Approved By</th><th>Change Summary</th></tr></thead><tbody>
          ${MODEL_VERSIONS.map(v => `<tr class="${v.status === 'sandbox' ? 'ops-alert-row' : ''}">
            <td class="sa-code" style="font-weight:700">${v.ver}</td>
            <td><span class="sa-status-pill sa-pill-${v.status === 'production' ? 'green' : v.status === 'sandbox' ? 'orange' : 'blue'}">${v.status}</span></td>
            <td class="sa-code" style="font-size:0.78rem">${v.deployed}</td>
            <td style="text-align:center">${v.factors}</td>
            <td style="font-weight:600;color:${parseFloat(v.fpRate) < 10 ? '#22c55e' : '#f59e0b'}">${v.fpRate}</td>
            <td style="font-size:0.72rem">${v.approvedBy}</td>
            <td style="font-size:0.78rem">${v.change}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <!-- PENDING CHANGES (APPROVAL QUEUE) -->
      <div class="sa-card" style="margin-bottom:1.5rem;border-left:4px solid #f59e0b">
        <h3>⏳ Pending Change Requests</h3>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:0.75rem">Compliance requirement: all weight changes must be approved by Risk Lead before production deployment.</p>
        <table class="sa-table"><thead><tr><th>ID</th><th>Factor</th><th>Current</th><th>Proposed</th><th>Reason</th><th>Impact</th><th>Requested By</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${PENDING_CHANGES.map(c => `<tr>
            <td class="sa-code">${c.id}</td><td><strong>${c.factor}</strong></td>
            <td class="sa-code">${c.current}</td>
            <td class="sa-code" style="font-weight:700;color:#6366f1">${c.proposed}</td>
            <td style="font-size:0.72rem;max-width:200px">${c.reason}</td>
            <td style="font-size:0.72rem">${c.impact}</td>
            <td style="font-size:0.72rem">${c.requestedBy}</td>
            <td><span class="sa-status-pill sa-pill-${c.status === 'approved' ? 'green' : 'orange'}">${c.status.replace('_', ' ')}</span></td>
            <td>${c.status === 'pending_approval' ? '<button class="btn btn-xs btn-primary">Approve</button> <button class="btn btn-xs btn-ghost">Reject</button>' : ''}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <!-- SANDBOX SIMULATION -->
      <div class="sa-card" style="border-left:4px solid #8b5cf6">
        <h3>🧪 Sandbox Simulation Results</h3>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:0.75rem">Test impact of proposed changes against historical data before deploying to production.</p>
        <table class="sa-table"><thead><tr><th>Scenario</th><th>Dataset</th><th>FP Rate Change</th><th>True Positive</th><th>False Negative</th><th>Verdict</th></tr></thead><tbody>
          ${SANDBOX_RESULTS.map(s => `<tr class="${s.verdict.includes('REJECTED') ? 'ops-alert-row' : ''}">
            <td><strong>${s.scenario}</strong></td>
            <td style="font-size:0.78rem">${s.dataset}</td>
            <td style="font-weight:600">${s.result}</td>
            <td>${s.truePositive}</td><td>${s.falseNeg}</td>
            <td style="font-size:0.78rem">${s.verdict}</td>
          </tr>`).join('')}
        </tbody></table>
        <div style="margin-top:0.75rem;padding:0.5rem;background:rgba(139,92,246,0.04);border-radius:6px;font-size:0.72rem">
          <strong>Deployment Gate:</strong> True Positive must remain ≥95%. False Positive target <10%. Any change violating these gates is auto-rejected.
        </div>
      </div>

      <!-- VERSION COMPARE TOOL -->
      <div class="sa-card" style="margin-bottom:1.5rem;margin-top:1.5rem">
        <h3>🔍 Version Compare Tool (A/B Weight Diff)</h3>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:0.75rem">Compare two model versions side-by-side before deciding rollback or promotion.</p>
        <table class="sa-table"><thead><tr><th>Factor</th><th>v2.3.1 (prod)</th><th>v2.4.0-rc1 (sandbox)</th><th>Δ</th><th>Impact</th></tr></thead><tbody>
          ${[
      ['F1 Scan Count', '0.92×', '0.92×', '—', 'No change'],
      ['F2 Time Gap', '0.9×', '0.9×', '—', 'No change'],
      ['F3 Burst Scan', '0.85×', '0.78×', '-0.07', '~12% fewer medium cases'],
      ['G2 Cross-Country', '1.35×', '1.35×', '—', 'No change'],
      ['T1 Device Repeat', '0.58×', '0.50×', '-0.08', 'FP reduction on warehouse'],
      ['B2 Flagged IP', '1.0×', '1.25×', '+0.25', 'Stronger IP-based detection'],
      ['λ (Decay Rate)', '0.015', '0.020', '+0.005', 'Half-life: 46d → 35d'],
    ].map(([f, a, b, d, i]) => `<tr>
            <td><strong>${f}</strong></td>
            <td class="sa-code">${a}</td>
            <td class="sa-code" style="font-weight:700;color:#6366f1">${b}</td>
            <td style="color:${d !== '—' ? '#f59e0b' : 'var(--text-secondary)'}; font-weight:${d !== '—' ? '700' : '400'}">${d}</td>
            <td style="font-size:0.72rem">${i}</td>
          </tr>`).join('')}
        </tbody></table>
        <div style="margin-top:0.75rem;display:flex;gap:0.5rem">
          <button class="btn btn-primary btn-sm">Promote v2.4.0-rc1 to Production</button>
          <button class="btn btn-outline btn-sm">Run More Simulations</button>
        </div>
      </div>

      <!-- ROLLBACK -->
      <div class="sa-card" style="margin-bottom:1.5rem;border-left:4px solid #ef4444">
        <h3>⏪ Version Rollback</h3>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:0.75rem">Emergency rollback to previous model version. Requires 4-Eyes approval. Previous version weights are immutably stored.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem">
          ${MODEL_VERSIONS.filter(v => v.status === 'archived').map(v => `
            <div style="padding:0.5rem;border:1px solid var(--border);border-radius:6px">
              <div style="font-weight:700;font-size:0.88rem">${v.ver}</div>
              <div style="font-size:0.72rem;color:var(--text-secondary)">Deployed: ${v.deployed} · FP: ${v.fpRate}</div>
              <div style="font-size:0.68rem;margin-top:0.2rem">${v.change}</div>
              <button class="btn btn-xs btn-outline" style="margin-top:0.4rem">Rollback to ${v.ver}</button>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:0.5rem;padding:0.4rem 0.6rem;background:rgba(239,68,68,0.04);border-radius:4px;font-size:0.68rem;color:#ef4444">
          <span class="status-icon status-warn" aria-label="Warning">!</span> Rollback requires: 4-Eyes approval (Risk Lead + Compliance). Reason must be documented. Action is logged in calibration audit.
        </div>
      </div>

      <!-- DRIFT DETECTION -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📉 Model Drift Detection</h3>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:0.75rem">Monitors model performance over time. Alerts when metrics drift beyond acceptable thresholds.</p>
        <table class="sa-table"><thead><tr><th>Metric</th><th>Baseline</th><th>Current</th><th>Drift</th><th>Threshold</th><th>Status</th></tr></thead><tbody>
          ${[
      ['TP Rate', '97.8%', '97.2%', '-0.6%', '±1%', 'OK'],
      ['FP Rate', '8.2%', '9.1%', '+0.9%', '±2%', 'OK'],
      ['Avg ERS', '24.3', '28.7', '+4.4', '±5', 'OK'],
      ['G2 FP Contribution', '3%', '6.2%', '+3.2%', '±3%', '<span class="status-icon status-warn" aria-label="Warning">!</span> WARN'],
      ['Case Volume / Week', '12', '18', '+50%', '±40%', '<span class="status-icon status-warn" aria-label="Warning">!</span> WARN'],
    ].map(([mt, bl, cur, d, th, st]) => `<tr class="${st.includes('WARN') ? 'ops-alert-row' : ''}">
            <td><strong>${mt}</strong></td><td class="sa-code">${bl}</td>
            <td class="sa-code" style="font-weight:600">${cur}</td>
            <td style="color:${d.includes('+') ? '#f59e0b' : '#3b82f6'}">${d}</td>
            <td class="sa-code" style="font-size:0.72rem">${th}</td>
            <td><span class="sa-status-pill sa-pill-${st === 'OK' ? 'green' : 'orange'}">${st}</span></td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <!-- SoD ENFORCEMENT -->
      <div class="sa-card">
        <h3>🔐 Segregation of Duties (Model Changes)</h3>
        <table class="sa-table"><thead><tr><th>Action</th><th>Ops</th><th>Risk Analyst</th><th>Risk Lead</th><th>Compliance</th><th>Admin</th></tr></thead><tbody>
          ${[
      ['Propose weight change', '<span class="status-icon status-fail" aria-label="Fail">✗</span>', '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Propose', '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Propose', '<span class="status-icon status-fail" aria-label="Fail">✗</span>', '<span class="status-icon status-fail" aria-label="Fail">✗</span>'],
      ['Approve weight change', '<span class="status-icon status-fail" aria-label="Fail">✗</span>', '<span class="status-icon status-fail" aria-label="Fail">✗</span>', '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Approve', '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Co-approve', '<span class="status-icon status-fail" aria-label="Fail">✗</span>'],
      ['Run sandbox simulation', '<span class="status-icon status-fail" aria-label="Fail">✗</span>', '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', '👁 View only', '<span class="status-icon status-fail" aria-label="Fail">✗</span>'],
      ['Deploy to production', '<span class="status-icon status-fail" aria-label="Fail">✗</span>', '<span class="status-icon status-fail" aria-label="Fail">✗</span>', '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> + Compliance', '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Co-sign', '<span class="status-icon status-fail" aria-label="Fail">✗</span>'],
      ['Emergency rollback', '<span class="status-icon status-fail" aria-label="Fail">✗</span>', '<span class="status-icon status-fail" aria-label="Fail">✗</span>', '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Initiate', '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> 4-Eyes', '<span class="status-icon status-fail" aria-label="Fail">✗</span>'],
      ['View calibration audit', '<span class="status-icon status-fail" aria-label="Fail">✗</span>', '👁', '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', '👁'],
    ].map(([a, ...roles]) => `<tr>
            <td><strong>${a}</strong></td>${roles.map(r => `<td style="text-align:center;font-size:0.78rem">${r}</td>`).join('')}
          </tr>`).join('')}
        </tbody></table>
        <div style="margin-top:0.5rem;font-size:0.68rem;color:var(--text-secondary)">No single role can propose + approve + deploy. Minimum 2-party governance for all model changes.</div>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
