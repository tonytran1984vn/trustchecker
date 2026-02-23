/**
 * Risk – Case Workflow (Enterprise Investigation Pipeline)
 * Ops Review → Risk Review → Compliance Review → IT Review → Resolution
 */
import { icon } from '../../core/icons.js';

const PIPELINE_STAGES = [
    { stage: 'Ops Review', color: '#3b82f6', desc: 'Validate distribution path, assign region tag, confirm anomaly', sla: '24h', count: 8 },
    { stage: 'Risk Review', color: '#f59e0b', desc: 'Confirm counterfeit probability, adjust risk level, link related cases', sla: '4h', count: 5 },
    { stage: 'Compliance Review', color: '#8b5cf6', desc: 'Create legal record, export evidence package, regulator reporting', sla: '8h', count: 2 },
    { stage: 'IT Review', color: '#06b6d4', desc: 'Check bot/API misuse, block IP if needed, device fingerprint analysis', sla: '2h', count: 1 },
    { stage: 'Resolution', color: '#22c55e', desc: 'Close case with verdict: confirmed/false-positive/inconclusive', sla: '—', count: 42 },
];

const ACTIVE_CASES = [
    { id: 'FC-2026-089', title: 'Counterfeit ring — Phnom Penh', severity: 'Critical', ers: 95, batch: 'B-2026-0891', stage: 'Risk Review', assignee: 'risk@company.com', opened: '2h ago', linked: 3, evidence: 12 },
    { id: 'FC-2026-088', title: 'Parallel import — Jakarta channel', severity: 'High', ers: 78, batch: 'B-2026-0887', stage: 'Ops Review', assignee: 'ops@company.com', opened: '5h ago', linked: 1, evidence: 5 },
    { id: 'FC-2026-087', title: 'Velocity anomaly — Bangkok distributor', severity: 'High', ers: 64, batch: 'B-2026-0895', stage: 'Ops Review', assignee: 'ops@company.com', opened: '1d ago', linked: 0, evidence: 3 },
    { id: 'FC-2026-086', title: 'Bot scanning — VPN endpoint', severity: 'Critical', ers: 95, batch: 'Multiple', stage: 'IT Review', assignee: 'it-sec@company.com', opened: '30m ago', linked: 0, evidence: 8 },
    { id: 'FC-2026-085', title: 'Night burst scan cluster — HCM', severity: 'Medium', ers: 42, batch: 'B-2026-0895', stage: 'Ops Review', assignee: 'ops@company.com', opened: '2d ago', linked: 0, evidence: 2 },
];

const RESOLUTION_LOG = [
    { id: 'FC-2026-082', title: 'Duplicate scan spike — SG warehouse', verdict: 'False Positive', resolution: 'Warehouse re-scan during stocktake', duration: '18h', closedBy: 'risk@company.com' },
    { id: 'FC-2026-079', title: 'Cross-border leak — Thailand', verdict: 'Confirmed', resolution: 'Distributor terminated · 3,000 codes revoked · Legal notified', duration: '3d', closedBy: 'compliance@company.com' },
    { id: 'FC-2026-075', title: 'API scraping attempt', verdict: 'Confirmed', resolution: 'IP range blocked · API key revoked · Security patch deployed', duration: '4h', closedBy: 'it-sec@company.com' },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('clipboard', 28)} Case Workflow</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Create Manual Case</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Active Cases', ACTIVE_CASES.length.toString(), `${ACTIVE_CASES.filter(c => c.severity === 'Critical').length} critical`, 'red', 'alertTriangle')}
        ${m('Avg Resolution', '22h', 'Critical: 4h, High: 18h', 'blue', 'clock')}
        ${m('Resolved (30d)', '42', '38 confirmed + 4 false positive', 'green', 'check')}
        ${m('Evidence Items', ACTIVE_CASES.reduce((s, c) => s + c.evidence, 0).toString(), 'Across active cases', 'blue', 'search')}
      </div>

      <!-- PIPELINE VISUALIZATION -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🔄 Investigation Pipeline</h3>
        <div style="display:flex;gap:0.25rem;margin:1rem 0;align-items:stretch">
          ${PIPELINE_STAGES.map(s => `
            <div style="flex:1;background:${s.color}06;border:1px solid ${s.color}15;border-top:3px solid ${s.color};border-radius:8px;padding:0.75rem;text-align:center">
              <div style="font-size:1.5rem;font-weight:800;color:${s.color}">${s.count}</div>
              <div style="font-size:0.78rem;font-weight:700">${s.stage}</div>
              <div style="font-size:0.62rem;color:var(--text-secondary);margin-top:0.3rem">${s.desc}</div>
              <div style="font-size:0.68rem;margin-top:0.4rem;color:${s.color}">SLA: ${s.sla}</div>
            </div>
          `).join('<div style="display:flex;align-items:center;color:var(--text-secondary)">→</div>')}
        </div>
      </div>

      <!-- ACTIVE CASES -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🔥 Active Cases</h3>
        <table class="sa-table"><thead><tr><th>Case ID</th><th>Title</th><th>Severity</th><th>ERS</th><th>Batch</th><th>Current Stage</th><th>Assignee</th><th>Opened</th><th>Linked</th><th>Evidence</th><th>Actions</th></tr></thead><tbody>
          ${ACTIVE_CASES.map(c => {
        const sevColor = c.severity === 'Critical' ? '#991b1b' : c.severity === 'High' ? '#ef4444' : '#f59e0b';
        const stageColor = PIPELINE_STAGES.find(s => s.stage === c.stage)?.color || '#64748b';
        return `<tr class="${c.severity === 'Critical' ? 'ops-alert-row' : ''}">
              <td class="sa-code" style="font-weight:600">${c.id}</td>
              <td><strong>${c.title}</strong></td>
              <td><span class="sa-status-pill" style="background:${sevColor}12;color:${sevColor};border:1px solid ${sevColor}25">${c.severity}</span></td>
              <td style="font-weight:800;color:${sevColor}">${c.ers}</td>
              <td class="sa-code">${c.batch}</td>
              <td><span class="sa-status-pill" style="background:${stageColor}12;color:${stageColor};border:1px solid ${stageColor}25">${c.stage}</span></td>
              <td style="font-size:0.78rem">${c.assignee}</td>
              <td>${c.opened}</td>
              <td style="text-align:center">${c.linked}</td>
              <td style="text-align:center">${c.evidence}</td>
              <td><button class="btn btn-xs btn-outline">Open</button></td>
            </tr>`;
    }).join('')}
        </tbody></table>
      </div>

      <!-- CASE → PERSONA MAPPING -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>👥 Review Responsibilities per Persona</h3>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.75rem">
          ${[
            ['Ops Manager', '#3b82f6', ['Validate distribution path', 'Confirm anomaly', 'Assign region tag', 'Check shipment records']],
            ['Risk Officer', '#f59e0b', ['Confirm counterfeit probability', 'Adjust risk level', 'Link related cases', 'Recommend batch action']],
            ['Compliance', '#8b5cf6', ['Create legal record', 'Export evidence package', 'Regulator reporting', 'Legal hold if needed']],
            ['IT Security', '#06b6d4', ['Check bot/API misuse', 'Block IP range', 'Device fingerprint analysis', 'Revoke compromised keys']],
        ].map(([role, color, tasks]) => `
            <div style="background:${color}06;border:1px solid ${color}15;border-top:3px solid ${color};border-radius:8px;padding:0.75rem">
              <div style="font-weight:700;color:${color};margin-bottom:0.5rem">${role}</div>
              <ul style="margin:0;padding-left:1rem;font-size:0.72rem;line-height:1.6">${tasks.map(t => `<li>${t}</li>`).join('')}</ul>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- RESOLUTION LOG -->
      <div class="sa-card">
        <h3><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Recent Resolutions</h3>
        <table class="sa-table"><thead><tr><th>Case ID</th><th>Title</th><th>Verdict</th><th>Resolution</th><th>Duration</th><th>Closed By</th></tr></thead><tbody>
          ${RESOLUTION_LOG.map(r => `<tr>
            <td class="sa-code">${r.id}</td>
            <td><strong>${r.title}</strong></td>
            <td><span class="sa-status-pill sa-pill-${r.verdict === 'Confirmed' ? 'red' : 'green'}">${r.verdict}</span></td>
            <td style="font-size:0.78rem;max-width:300px">${r.resolution}</td>
            <td class="sa-code">${r.duration}</td>
            <td style="font-size:0.78rem">${r.closedBy}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
