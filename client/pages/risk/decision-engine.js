/**
 * Risk – Decision Engine (Enterprise Auto-Response & Escalation)
 * Scan → ERS → Threshold → Action → Escalation → Dashboard Update
 */
import { icon } from '../../core/icons.js';

const DECISION_RULES = [
    { id: 'DEC-001', condition: 'ERS < 30', level: 'Low', actions: ['Log scan event', 'Update scan history', 'Return "Authentic" to user'], escalation: 'None', sla: '—', autoExecute: true },
    { id: 'DEC-002', condition: '30 ≤ ERS < 60', level: 'Medium', actions: ['Create soft case', 'Tag product as "watch"', 'Notify Ops dashboard'], escalation: 'Ops Manager', sla: '24h review', autoExecute: true },
    { id: 'DEC-003', condition: '60 ≤ ERS < 80', level: 'High', actions: ['Create high-risk case', 'Flag product', 'Notify Risk team', 'Warn user on scan'], escalation: 'Risk Officer → Compliance (if no action 4h)', sla: '4h response', autoExecute: true },
    { id: 'DEC-004', condition: 'ERS ≥ 80', level: 'Critical', actions: ['Lock entire batch', 'Create critical case + investigation', 'Notify Risk + Compliance + CEO', 'Return "Suspicious" to user'], escalation: 'Risk → Compliance → CEO (immediate)', sla: '30min response', autoExecute: true },
    { id: 'DEC-005', condition: 'BRS > 70', level: 'Batch Flag', actions: ['Flag batch in system', 'Suspend distribution temporarily', 'Create investigation case'], escalation: 'Ops → Risk → Compliance chain', sla: '2h response', autoExecute: true },
    { id: 'DEC-006', condition: 'CRS > 20%', level: 'Channel Alert', actions: ['Flag distributor', 'Suspend new shipments to channel', 'Create distributor investigation'], escalation: 'Risk → Legal (if confirmed)', sla: '8h response', autoExecute: false },
    { id: 'DEC-007', condition: 'T3: Bot detected', level: 'Security', actions: ['Block IP immediately', 'Flag all codes from that IP', 'Create IT security case'], escalation: 'IT Security (immediate)', sla: '15min response', autoExecute: true },
];

const FLOW_STEPS = [
    { step: 1, title: 'User Scan', desc: 'QR scan hit → API Gateway → Token validate → Fetch product record', icon: '📱', color: '#3b82f6' },
    { step: 2, title: 'Risk Engine Trigger', desc: 'If first scan: ERS=0, store geo+device. Else: calculate ERS, update scan history, update batch risk', icon: '⚡', color: '#6366f1' },
    { step: 3, title: 'Decision Engine', desc: 'ERS → threshold matching → select action set → auto-execute or queue for approval', icon: '🧠', color: '#8b5cf6' },
    { step: 4, title: 'Case Management', desc: 'Case created → Ops validate → Risk confirm → Compliance legal record → IT block if needed', icon: '📋', color: '#f59e0b' },
    { step: 5, title: 'Dashboard Update', desc: 'CEO: BRI + heatmap. Ops: batch anomalies. Risk: active cases. Compliance: audit. IT: traffic', icon: '📊', color: '#22c55e' },
];

const ESCALATION_PATHS = [
    { trigger: 'No action after SLA', from: 'Ops Manager', to: 'Risk Officer', auto: true, timeout: '24h → 4h' },
    { trigger: 'No action after SLA', from: 'Risk Officer', to: 'Compliance Officer', auto: true, timeout: '4h → 2h' },
    { trigger: 'Critical ERS (≥80)', from: 'System', to: 'Risk + Compliance + CEO', auto: true, timeout: 'Immediate' },
    { trigger: 'Bot detection', from: 'System', to: 'IT Security', auto: true, timeout: 'Immediate' },
    { trigger: 'Legal hold required', from: 'Compliance', to: 'Legal Team', auto: false, timeout: 'Manual' },
    { trigger: 'Distributor investigation', from: 'Risk Officer', to: 'Legal + Ops', auto: false, timeout: '8h' },
];

const RECENT_DECISIONS = [
    { ts: '19:01:42', code: 'ACME-2026-004891-3L', ers: 82, rule: 'DEC-004', actions: 'Batch locked · CEO notified · Critical case created', latency: '45ms', autoExecuted: true },
    { ts: '19:01:38', code: 'ACME-2026-001233-9K', ers: 64, rule: 'DEC-003', actions: 'High-risk case · Risk team notified · Product flagged', latency: '32ms', autoExecuted: true },
    { ts: '19:01:30', code: 'ACME-D-VN045-000891', ers: 42, rule: 'DEC-002', actions: 'Soft case created · Ops dashboard updated', latency: '28ms', autoExecuted: true },
    { ts: '19:01:22', code: 'ACME-2026-000142-7K', ers: 12, rule: 'DEC-001', actions: 'Logged · "Authentic" returned', latency: '12ms', autoExecuted: true },
    { ts: '19:01:15', code: 'ACME-2026-007100-2M', ers: 95, rule: 'DEC-004 + DEC-007', actions: 'Batch locked · IP blocked · IT case created', latency: '68ms', autoExecuted: true },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('zap', 28)} Decision Engine</h1><div class="sa-title-actions"><span style="font-size:0.72rem;color:var(--text-secondary)">Scan → Score → Decide → Act → Escalate</span></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Decisions (24h)', '4,892', 'Avg 28ms decision time', 'blue', 'zap')}
        ${m('Auto-Executed', '4,880', '99.8% automated', 'green', 'check')}
        ${m('Escalated', '12', '8 to Risk, 4 to CEO', 'orange', 'alertTriangle')}
        ${m('Avg Latency', '31ms', 'P99: 89ms (<300ms SLA)', 'green', 'clock')}
      </div>

      <!-- ENTERPRISE FLOW -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🔄 Enterprise Decision Flow</h3>
        <div style="display:flex;gap:0.25rem;margin:1rem 0;align-items:stretch">
          ${FLOW_STEPS.map(s => `
            <div style="flex:1;background:${s.color}06;border:1px solid ${s.color}15;border-top:3px solid ${s.color};border-radius:8px;padding:0.75rem;text-align:center">
              <div style="font-size:1.5rem">${s.icon}</div>
              <div style="font-size:0.72rem;font-weight:600;color:${s.color};margin:0.1rem 0">STEP ${s.step}</div>
              <div style="font-size:0.82rem;font-weight:700">${s.title}</div>
              <div style="font-size:0.65rem;color:var(--text-secondary);margin-top:0.3rem">${s.desc}</div>
            </div>
          `).join('<div style="display:flex;align-items:center;color:var(--text-secondary);font-size:1rem">→</div>')}
        </div>
      </div>

      <!-- DECISION RULES TABLE -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📐 Decision Rules</h3>
        <table class="sa-table"><thead><tr><th>ID</th><th>Condition</th><th>Level</th><th>Actions</th><th>Escalation</th><th>SLA</th><th>Auto</th></tr></thead><tbody>
          ${DECISION_RULES.map(r => {
        const color = r.level === 'Critical' || r.level === 'Security' ? '#991b1b' : r.level === 'High' || r.level === 'Batch Flag' ? '#ef4444' : r.level === 'Medium' || r.level === 'Channel Alert' ? '#f59e0b' : '#22c55e';
        return `<tr>
              <td class="sa-code">${r.id}</td>
              <td class="sa-code" style="font-size:0.72rem;font-weight:600">${r.condition}</td>
              <td><span class="sa-status-pill" style="background:${color}12;color:${color};border:1px solid ${color}25">${r.level}</span></td>
              <td style="font-size:0.72rem;max-width:250px"><ul style="margin:0;padding-left:1rem">${r.actions.map(a => `<li>${a}</li>`).join('')}</ul></td>
              <td style="font-size:0.72rem">${r.escalation}</td>
              <td style="font-size:0.78rem;font-weight:600">${r.sla}</td>
              <td>${r.autoExecute ? '<span style="color:#22c55e"><span class="status-icon status-pass" aria-label="Pass">✓</span> Auto</span>' : '<span style="color:#f59e0b">Manual</span>'}</td>
            </tr>`;
    }).join('')}
        </tbody></table>
      </div>

      <!-- ESCALATION PATHS -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📈 Escalation Paths</h3>
        <table class="sa-table"><thead><tr><th>Trigger</th><th>From</th><th>To</th><th>Auto-Escalate</th><th>Timeout</th></tr></thead><tbody>
          ${ESCALATION_PATHS.map(e => `<tr>
            <td><strong>${e.trigger}</strong></td>
            <td>${e.from}</td><td style="font-weight:600">${e.to}</td>
            <td>${e.auto ? '<span style="color:#22c55e"><span class="status-icon status-pass" aria-label="Pass">✓</span> Auto</span>' : '<span style="color:#f59e0b">Manual</span>'}</td>
            <td class="sa-code">${e.timeout}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <!-- RECENT DECISIONS LOG -->
      <div class="sa-card">
        <h3>📋 Recent Decision Log</h3>
        <table class="sa-table"><thead><tr><th>Time</th><th>Code</th><th>ERS</th><th>Rule</th><th>Actions Taken</th><th>Latency</th><th>Auto</th></tr></thead><tbody>
          ${RECENT_DECISIONS.map(d => `<tr class="${d.ers > 60 ? 'ops-alert-row' : ''}">
            <td class="sa-code" style="font-size:0.78rem">${d.ts}</td>
            <td class="sa-code" style="font-size:0.68rem;color:#6366f1">${d.code}</td>
            <td style="font-weight:800;color:${d.ers > 80 ? '#991b1b' : d.ers > 60 ? '#ef4444' : d.ers > 30 ? '#f59e0b' : '#22c55e'}">${d.ers}</td>
            <td class="sa-code" style="font-size:0.72rem">${d.rule}</td>
            <td style="font-size:0.78rem">${d.actions}</td>
            <td class="sa-code" style="font-size:0.78rem">${d.latency}</td>
            <td>${d.autoExecuted ? '<span class="status-icon status-pass" aria-label="Pass">✓</span>' : ''}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
