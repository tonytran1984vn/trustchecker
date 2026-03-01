/**
 * SuperAdmin – ABAC Policies (Attribute-Based Access Control)
 * Data persisted to PostgreSQL via /api/platform/sa-config/abac_policies
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

const DEFAULT_ATTRIBUTES = [
  { name: 'department', type: 'String', values: 'ops, risk, compliance, it, finance, legal, executive', source: 'User Profile' },
  { name: 'region', type: 'Enum', values: 'VN, SG, TH, US, EU, JP', source: 'User Profile / GeoIP' },
  { name: 'time_window', type: 'Time', values: '00:00–23:59', source: 'System Clock (local TZ)' },
  { name: 'device_trust_level', type: 'Enum', values: 'trusted, untrusted, unknown', source: 'Device Fingerprint' },
  { name: 'risk_score', type: 'Number', values: '0–100', source: 'Risk Engine' },
  { name: 'data_classification', type: 'Enum', values: 'public, internal, confidential, restricted', source: 'Data Catalog' },
  { name: 'ip_location', type: 'String', values: 'CIDR / Country code', source: 'Network Layer' },
  { name: 'session_mfa', type: 'Boolean', values: 'true / false', source: 'Auth Provider' },
  { name: 'contract_tier', type: 'Enum', values: 'starter, business, enterprise', source: 'Billing' },
];

const DEFAULT_POLICIES = [
  { id: 'ABAC-001', name: 'Restrict PII to local region', rule: 'data_classification = restricted AND region ≠ data.origin_region', effect: 'DENY', target: 'data.pii.access', priority: 1, status: 'active' },
  { id: 'ABAC-002', name: 'After-hours high-risk block', rule: 'time_window NOT IN [08:00–20:00] AND risk_score > 70', effect: 'DENY', target: 'batch.transfer.*', priority: 2, status: 'active' },
  { id: 'ABAC-003', name: 'Untrusted device → read-only', rule: 'device_trust_level = untrusted', effect: 'DENY write', target: '*.create, *.edit, *.delete', priority: 3, status: 'active' },
  { id: 'ABAC-004', name: 'Cross-region transfer approval', rule: 'action = batch.transfer AND sender.region ≠ receiver.region', effect: 'REQUIRE 4-Eyes', target: 'batch.transfer.approve', priority: 4, status: 'active' },
  { id: 'ABAC-005', name: 'Non-MFA session downgrade', rule: 'session_mfa = false', effect: 'DENY', target: 'user.create, role.assign, sso.config', priority: 1, status: 'active' },
  { id: 'ABAC-006', name: 'Starter tier feature gate', rule: 'contract_tier = starter', effect: 'DENY', target: 'scim.*, abac.*, sod.*', priority: 5, status: 'active' },
  { id: 'ABAC-007', name: 'Finance-only billing access', rule: 'department ≠ finance AND department ≠ executive', effect: 'DENY', target: 'billing.*', priority: 3, status: 'active' },
  { id: 'ABAC-008', name: 'High-risk auto escalate', rule: 'risk_score > 90', effect: 'ESCALATE', target: 'risk.case.*', priority: 1, status: 'active' },
];

const DEFAULT_EVAL_LOG = [
  { ts: '17:38:02', user: 'ops@company.com', action: 'batch.transfer.initiate', attrs: 'region=VN, time=17:38, device=trusted', policy: 'ABAC-004', result: 'ALLOW', reason: 'Same region' },
  { ts: '17:35:44', user: 'analyst@company.com', action: 'data.pii.access', attrs: 'region=US, data.origin=VN, class=restricted', policy: 'ABAC-001', result: 'DENY', reason: 'Cross-region PII' },
  { ts: '17:30:12', user: 'admin@company.com', action: 'role.assign', attrs: 'mfa=false, device=unknown', policy: 'ABAC-005', result: 'DENY', reason: 'No MFA session' },
  { ts: '17:22:08', user: 'ops2@company.com', action: 'batch.create', attrs: 'device=untrusted, region=SG', policy: 'ABAC-003', result: 'DENY', reason: 'Untrusted device' },
];

let ATTRIBUTES = [...DEFAULT_ATTRIBUTES];
let POLICIES = [...DEFAULT_POLICIES];
let EVAL_LOG = [...DEFAULT_EVAL_LOG];
let _loaded = false;

async function loadFromDB() {
  if (_loaded) return;
  try {
    const res = await API.get('/platform/sa-config/abac_policies');
    if (res.data && res.source === 'database') {
      ATTRIBUTES = res.data.attributes || DEFAULT_ATTRIBUTES;
      POLICIES = res.data.policies || DEFAULT_POLICIES;
      EVAL_LOG = res.data.eval_log || DEFAULT_EVAL_LOG;
    }
  } catch (e) { console.warn('ABAC policies load failed, using defaults:', e.message); }
  _loaded = true;
}

export function renderPage() {
  if (!_loaded) { loadFromDB().then(() => window.render?.()); }
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('shield', 28)} ABAC Policy Engine</h1><div class="sa-title-actions"><span style="font-size:0.78rem;color:var(--text-secondary)">Attribute-Based Access Control — Layer on RBAC</span><button class="btn btn-primary btn-sm" style="margin-left:1rem">+ Create Policy</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Active Policies', POLICIES.length, 'RBAC + ABAC combined', 'blue', 'shield')}
        ${m('Attributes', ATTRIBUTES.length, '9 attribute types', 'green', 'settings')}
        ${m('Denials (24h)', '18', '4 PII + 8 device + 6 time', 'red', 'alertTriangle')}
        ${m('Evaluations (24h)', '2,847', 'Avg 1.2ms per eval', 'green', 'check')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📋 ABAC Policies</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Policies evaluated in priority order. First matching policy wins. ABAC runs <strong>after</strong> RBAC permission check.</p>
        <table class="sa-table"><thead><tr><th>ID</th><th>Policy</th><th>Rule</th><th>Effect</th><th>Target</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${POLICIES.map(p => `<tr>
            <td class="sa-code">${p.id}</td><td><strong>${p.name}</strong></td>
            <td style="font-size:0.72rem;font-family:monospace;max-width:280px">${p.rule}</td>
            <td><span class="sa-status-pill sa-pill-${p.effect === 'DENY' ? 'red' : p.effect.includes('4-Eyes') ? 'orange' : 'blue'}">${p.effect}</span></td>
            <td class="sa-code" style="font-size:0.7rem">${p.target}</td>
            <td style="text-align:center"><strong>P${p.priority}</strong></td>
            <td><span class="sa-status-pill sa-pill-green">${p.status}</span></td>
            <td><button class="btn btn-xs btn-outline">Edit</button></td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">
        <div class="sa-card">
          <h3>🏷 Available Attributes</h3>
          <table class="sa-table"><thead><tr><th>Attribute</th><th>Type</th><th>Values</th><th>Source</th></tr></thead><tbody>
            ${ATTRIBUTES.map(a => `<tr>
              <td class="sa-code" style="font-size:0.78rem">${a.name}</td><td>${a.type}</td>
              <td style="font-size:0.72rem">${a.values}</td><td style="font-size:0.78rem">${a.source}</td>
            </tr>`).join('')}
          </tbody></table>
        </div>

        <div class="sa-card">
          <h3>🔬 Evaluation Flow</h3>
          <div style="font-size:0.82rem;line-height:1.8;padding:1rem;background:rgba(99,102,241,0.04);border-radius:8px;border:1px solid rgba(99,102,241,0.1)">
            <div style="margin-bottom:0.5rem"><strong>1.</strong> User requests action → <code>batch.transfer.initiate</code></div>
            <div style="margin-bottom:0.5rem"><strong>2.</strong> RBAC check → Does role have <code>batch.transfer.initiate</code>? <span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span></div>
            <div style="margin-bottom:0.5rem"><strong>3.</strong> ABAC evaluation → Collect attributes: <code>region, time, device, risk_score</code></div>
            <div style="margin-bottom:0.5rem"><strong>4.</strong> Policy matching → Walk P1→P5 policies in order</div>
            <div style="margin-bottom:0.5rem"><strong>5.</strong> First match → <code>ABAC-004: cross-region → REQUIRE 4-Eyes</code></div>
            <div><strong>6.</strong> Enforcement → Route to approval workflow or deny</div>
          </div>
          <div style="margin-top:0.75rem;padding:0.5rem;background:rgba(34,197,94,0.06);border-radius:6px;text-align:center;font-size:0.78rem">
            <strong>RBAC</strong> (what you CAN do) → <strong>ABAC</strong> (what you can do RIGHT NOW given context)
          </div>
        </div>
      </div>

      <div class="sa-card">
        <h3>📊 Recent Evaluation Log</h3>
        <table class="sa-table"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Attributes</th><th>Policy</th><th>Result</th><th>Reason</th></tr></thead><tbody>
          ${EVAL_LOG.map(e => `<tr class="${e.result === 'DENY' ? 'ops-alert-row' : ''}">
            <td class="sa-code" style="font-size:0.78rem">${e.ts}</td><td>${e.user}</td>
            <td class="sa-code" style="font-size:0.72rem">${e.action}</td>
            <td style="font-size:0.68rem;font-family:monospace;max-width:200px">${e.attrs}</td>
            <td class="sa-code">${e.policy}</td>
            <td><span class="sa-status-pill sa-pill-${e.result === 'DENY' ? 'red' : 'green'}">${e.result}</span></td>
            <td style="font-size:0.78rem">${e.reason}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
