/**
 * SA – Escalation Flow (Event → Risk → Case → Action per Role)
 * Data persisted to PostgreSQL via /api/platform/sa-config/escalation_flow
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

const DEFAULT_PIPELINE = [
  { stage: 1, name: 'Event Capture', owner: 'System (auto)', sla: '< 50ms', input: 'QR scan from consumer', output: 'Raw event + ERS calculated', roles: { 'Ops': 'Sees in live feed', 'Risk': 'Score logged', 'IT': 'API latency tracked' } },
  { stage: 2, name: 'Risk Scoring', owner: 'Risk Engine (auto)', sla: '< 100ms', input: 'Raw event + 12 factors', output: 'ERS 0-100 + factor breakdown', roles: { 'Risk': 'Model owner', 'Ops': 'Sees ERS on scan', 'IT': 'Engine performance' } },
  { stage: 3, name: 'Decision', owner: 'Decision Engine (auto)', sla: '< 300ms', input: 'ERS + rules', output: 'Action: log / soft case / high case / lock batch', roles: { 'Risk': 'Rule configurator', 'Ops': 'Action recipient', 'CA': 'Threshold setter' } },
  { stage: 4, name: 'Case Creation', owner: 'System → Ops', sla: '< 1min', input: 'Decision output (if ERS > 30)', output: 'Case with severity, assigned to Ops', roles: { 'Ops': 'Primary assignee', 'Risk': 'CC if ERS > 60', 'Compliance': 'CC if ERS > 80' } },
  { stage: 5, name: 'Ops Triage', owner: 'Ops Manager', sla: '24h', input: 'Case + scan data + geo context', output: 'Validated / escalated / false positive', roles: { 'Ops': 'Owner — validate anomaly', 'Risk': 'Standby for escalation', 'CEO': 'Sees case count aggregated' } },
  { stage: 6, name: 'Risk Analysis', owner: 'Risk Officer', sla: '4h', input: 'Escalated case + pattern data', output: 'Counterfeit probability, linked cases, risk adjustment', roles: { 'Risk': 'Owner — deep analysis', 'Compliance': 'Legal hold assessment', 'Ops': 'Field intelligence provider' } },
  { stage: 7, name: 'Compliance Review', owner: 'Compliance Officer', sla: '8h', input: 'Confirmed case + evidence', output: 'Evidence package, legal hold, regulator notification', roles: { 'Compliance': 'Owner — legal + export', 'CEO': 'Board notification if severe', 'IT': 'Audit log integrity verify' } },
  { stage: 8, name: 'Resolution', owner: 'Risk + Compliance', sla: '—', input: 'Investigation complete', output: 'Verdict: Confirmed / FP / Inconclusive → feedback to model', roles: { 'Risk': 'FP feedback → model recalibration', 'Compliance': 'Archive evidence', 'CEO': 'BRI updated' } },
];

const DEFAULT_ERS_ESCALATION = [
  { range: '0–30', level: 'Low', color: '#22c55e', path: 'Log only → No escalation', involvedRoles: 'System only', sla: 'Instant', example: 'Consumer re-scan same device, 2 days later' },
  { range: '31–60', level: 'Medium', color: '#f59e0b', path: 'Soft case → Ops triage (24h SLA)', involvedRoles: 'Ops', sla: '24h', example: 'Duplicate in different city, same device' },
  { range: '61–80', level: 'High', color: '#ef4444', path: 'Case → Ops (4h) → Risk (4h) → Compliance (if confirmed)', involvedRoles: 'Ops → Risk → Compliance', sla: '12h total', example: 'Different device, different country, < 1 hour gap' },
  { range: '81–100', level: 'Critical', color: '#991b1b', path: 'Auto-lock batch → All roles notified → CEO briefing', involvedRoles: 'All: Ops → Risk → Compliance → CEO → IT', sla: '4h to initial response', example: 'Bot pattern + VPN + known counterfeit zone' },
];

const DEFAULT_HANDOFF_RULES = [
  { from: 'Ops', to: 'Risk', trigger: 'ERS > 60 OR pattern match OR Ops flags "needs analysis"', data: 'Scan log, geo trace, batch info, Ops notes', sla: '4h Risk pickup' },
  { from: 'Risk', to: 'Compliance', trigger: 'Confirmed counterfeit OR legal implications OR regulatory requirement', data: 'Risk analysis, counterfeit probability, linked cases, evidence', sla: '8h Compliance pickup' },
  { from: 'Compliance', to: 'CEO', trigger: 'Brand impact estimated > $100K OR multiple regions affected OR regulatory action required', data: 'Executive summary, BRI impact, recommended action', sla: 'Same business day' },
  { from: 'Risk', to: 'IT', trigger: 'Bot detected OR API abuse OR IP cluster needs blocking', data: 'IP list, user agent patterns, request volume', sla: '2h IT action' },
  { from: 'Any', to: 'Super Admin', trigger: 'Cross-tenant pattern detected OR platform integrity issue', data: 'Anonymized cluster data (no tenant PII)', sla: '24h SA review' },
];

let PIPELINE = [...DEFAULT_PIPELINE];
let ERS_ESCALATION = [...DEFAULT_ERS_ESCALATION];
let HANDOFF_RULES = [...DEFAULT_HANDOFF_RULES];
let _loaded = false;

async function loadFromDB() {
  if (_loaded) return;
  try {
    // Await workspace prefetch if it's in flight
    if (window._saGovReady) {
      try { await window._saGovReady; } catch { }
    }
    const gc = window._saGovCache;
    let res;
    if (gc?.escalationFlow && gc._loadedAt) {
      res = gc.escalationFlow;
    } else {
      res = await API.get('/platform/sa-config/escalation_flow');
    }
    if (res.data && res.source === 'database') {
      PIPELINE = res.data.pipeline || DEFAULT_PIPELINE;
      ERS_ESCALATION = res.data.ers_escalation || DEFAULT_ERS_ESCALATION;
      HANDOFF_RULES = res.data.handoff_rules || DEFAULT_HANDOFF_RULES;
    }
  } catch (e) { console.warn('Escalation flow load failed, using defaults:', e.message); }
  _loaded = true;
}

export function renderPage() {
  if (!_loaded) { loadFromDB().then(() => window.render?.()); }
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('workflow', 28)} Escalation Flow</h1></div>

      <!-- 8-STAGE PIPELINE -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📐 8-Stage Escalation Pipeline</h3>
        <table class="sa-table"><thead><tr><th>#</th><th>Stage</th><th>Owner</th><th>SLA</th><th>Input</th><th>Output</th></tr></thead><tbody>
          ${PIPELINE.map(p => `<tr>
            <td style="font-weight:800;color:#6366f1;font-size:1.1rem">${p.stage}</td>
            <td><strong>${p.name}</strong></td>
            <td style="font-size:0.78rem">${p.owner}</td>
            <td class="sa-code" style="font-size:0.78rem;color:${p.sla.includes('h') ? '#f59e0b' : '#22c55e'}">${p.sla}</td>
            <td style="font-size:0.72rem">${p.input}</td>
            <td style="font-size:0.72rem">${p.output}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <!-- ERS-BASED ESCALATION -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📊 ERS → Escalation Path Mapping</h3>
        ${ERS_ESCALATION.map(e => `
          <div style="display:flex;gap:1rem;padding:0.75rem;border-bottom:1px solid var(--border);align-items:center">
            <div style="min-width:60px;text-align:center;font-weight:800;font-size:1.2rem;color:${e.color}">${e.range}</div>
            <div style="min-width:80px"><span class="sa-status-pill" style="background:${e.color}12;color:${e.color};border:1px solid ${e.color}25">${e.level}</span></div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.82rem">${e.path}</div>
              <div style="font-size:0.68rem;color:var(--text-secondary)">Roles: ${e.involvedRoles} · SLA: ${e.sla}</div>
              <div style="font-size:0.68rem;color:#6366f1;margin-top:0.15rem">Example: ${e.example}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- HANDOFF RULES -->
      <div class="sa-card">
        <h3>🤝 Role Handoff Rules</h3>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:0.75rem">Standardized handoff: who passes to whom, when, what data travels, what SLA applies.</p>
        <table class="sa-table"><thead><tr><th>From</th><th>→</th><th>To</th><th>Trigger</th><th>Data Transferred</th><th>SLA</th></tr></thead><tbody>
          ${HANDOFF_RULES.map(h => `<tr>
            <td><strong>${h.from}</strong></td>
            <td style="text-align:center;color:#6366f1;font-size:1.2rem">→</td>
            <td><strong>${h.to}</strong></td>
            <td style="font-size:0.72rem">${h.trigger}</td>
            <td style="font-size:0.72rem">${h.data}</td>
            <td class="sa-code" style="font-size:0.78rem;color:#f59e0b">${h.sla}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
