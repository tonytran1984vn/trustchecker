/**
 * SuperAdmin – Approval Workflows (4-Eyes / 6-Eyes Engine)
 * Data persisted to PostgreSQL via /api/platform/sa-config/approval_workflows
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

// ─── Defaults (used on first load if DB is empty) ────────────
const DEFAULT_WORKFLOWS = [
  { id: 'WF-001', name: 'Batch Transfer', trigger: 'batch.transfer.initiate', condition: 'quantity > 1000 OR value > $10,000', eyes: 4, approvers: 'Ops Supervisor + Risk Manager', sla: '4h', status: 'active' },
  { id: 'WF-002', name: 'Risk Rule Change', trigger: 'risk.rule.edit', condition: 'All changes', eyes: 4, approvers: 'Risk Manager + Compliance Officer', sla: '8h', status: 'active' },
  { id: 'WF-003', name: 'Role Escalation', trigger: 'role.assign (privileged)', condition: 'Target role: admin, risk_officer, compliance_officer', eyes: 4, approvers: 'Company Admin + IT Security', sla: '24h', status: 'active' },
  { id: 'WF-004', name: 'User Suspension', trigger: 'user.suspend', condition: 'All users', eyes: 4, approvers: 'Company Admin + HR representative', sla: '2h', status: 'active' },
  { id: 'WF-005', name: 'Data Export (PII)', trigger: 'data.export.initiate', condition: 'Contains PII fields', eyes: 4, approvers: 'Compliance Officer + Data Owner', sla: '24h', status: 'active' },
  { id: 'WF-006', name: 'Compliance Policy Change', trigger: 'compliance.policy.edit', condition: 'All policy documents', eyes: 6, approvers: 'Compliance + Risk + Executive', sla: '48h', status: 'active' },
  { id: 'WF-007', name: 'Encryption Key Rotation', trigger: 'security.certificate.rotate', condition: 'Production keys only', eyes: 6, approvers: 'IT Security + Compliance + Executive', sla: '72h', status: 'active' },
  { id: 'WF-008', name: 'Legal Hold Release', trigger: 'legal.hold.release', condition: 'All holds', eyes: 6, approvers: 'Legal + Compliance + Executive', sla: '72h', status: 'active' },
  { id: 'WF-009', name: 'SoD Override', trigger: 'sod.rule.exception', condition: 'Temporary override', eyes: 6, approvers: 'Compliance + Risk + IT Security', sla: '24h', status: 'active' },
];

const DEFAULT_PENDING = [
  { id: 'APR-1201', workflow: 'WF-001', action: 'Batch transfer B-2026-0895 (2,500 units)', requester: 'ops@company.com', step: '1/2', waiting: 'Risk Manager', elapsed: '1h 20m', sla: '4h', status: 'pending' },
  { id: 'APR-1200', workflow: 'WF-002', action: 'Risk rule #52 threshold change: 85→70', requester: 'risk-analyst@company.com', step: '1/2', waiting: 'Compliance Officer', elapsed: '3h 45m', sla: '8h', status: 'pending' },
  { id: 'APR-1198', workflow: 'WF-006', action: 'Anti-fraud policy v3.2 update', requester: 'compliance@company.com', step: '2/3', waiting: 'Executive', elapsed: '18h', sla: '48h', status: 'pending' },
];

let WORKFLOWS = [...DEFAULT_WORKFLOWS];
let PENDING = [...DEFAULT_PENDING];
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
    if (gc?.approvalWorkflows && gc._loadedAt) {
      res = gc.approvalWorkflows;
    } else {
      res = await API.get('/platform/sa-config/approval_workflows');
    }
    if (res.data && res.source === 'database') {
      WORKFLOWS = res.data.workflows || DEFAULT_WORKFLOWS;
      PENDING = res.data.pending || DEFAULT_PENDING;
    }
  } catch (e) { console.warn('Workflows load from DB failed, using defaults:', e.message); }
  _loaded = true;
}

async function saveToDB() {
  try {
    await API.put('/platform/sa-config/approval_workflows', { data: { workflows: WORKFLOWS, pending: PENDING } });
  } catch (e) { console.warn('Workflows save to DB failed:', e.message); }
}

// ─── State ───────────────────────────────────────────────────
let modalMode = ''; // 'create' | 'edit' | 'review' | ''
let modalError = '';
let editingWf = null;   // workflow being edited
let reviewingApr = null; // approval being reviewed

const TRIGGER_OPTIONS = [
  { value: 'batch.transfer.initiate', label: 'Batch Transfer Initiate' },
  { value: 'risk.rule.edit', label: 'Risk Rule Edit' },
  { value: 'role.assign', label: 'Role Assignment' },
  { value: 'user.suspend', label: 'User Suspension' },
  { value: 'user.delete', label: 'User Deletion' },
  { value: 'data.export.initiate', label: 'Data Export Initiate' },
  { value: 'compliance.policy.edit', label: 'Compliance Policy Edit' },
  { value: 'security.certificate.rotate', label: 'Key/Certificate Rotation' },
  { value: 'legal.hold.release', label: 'Legal Hold Release' },
  { value: 'sod.rule.exception', label: 'SoD Rule Exception' },
  { value: 'config.critical.change', label: 'Critical Config Change' },
  { value: 'report.compliance.submit', label: 'Compliance Report Submit' },
  { value: 'custom', label: '— Custom (enter below)' },
];

const APPROVER_ROLES = [
  'Ops Supervisor', 'Risk Manager', 'Compliance Officer', 'Company Admin',
  'IT Security', 'Executive', 'Legal', 'HR Representative', 'Data Owner',
  'Finance Director', 'Audit Committee',
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function closeAll() { modalMode = ''; modalError = ''; editingWf = null; reviewingApr = null; window.render(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalMode) { e.preventDefault(); closeAll(); } });

// ─── SHARED MODAL STYLES ─────────────────────────────────────
const MODAL_CSS = `
<style>
  .wf-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.55);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;animation:wfFadeIn 0.15s ease}
  @keyframes wfFadeIn{from{opacity:0}to{opacity:1}}
  .wf-modal{background:var(--bg-card,#fff);border-radius:14px;box-shadow:0 25px 50px rgba(0,0,0,0.25);width:520px;max-width:95vw;max-height:80vh;display:flex;flex-direction:column;animation:wfSlideUp 0.2s ease}
  @keyframes wfSlideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
  .wf-modal-head{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid var(--border,#e2e8f0);flex-shrink:0}
  .wf-modal-head h2{font-size:0.92rem;font-weight:700;margin:0;display:flex;align-items:center;gap:6px}
  .wf-modal-close{background:none;border:none;font-size:1.1rem;cursor:pointer;color:var(--text-muted,#94a3b8);padding:2px 6px;border-radius:6px;transition:all 0.15s}
  .wf-modal-close:hover{background:rgba(239,68,68,0.1);color:#ef4444}
  .wf-modal-body{padding:14px 18px;overflow-y:auto;flex:1}
  .wf-form-group{margin-bottom:10px}
  .wf-label{display:block;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:var(--text-muted,#64748b);margin-bottom:3px}
  .wf-input,.wf-select,.wf-textarea{width:100%;padding:7px 10px;border:1px solid var(--border,#e2e8f0);border-radius:8px;font-size:0.8rem;font-family:inherit;background:var(--bg-card,#fff);color:var(--text-primary,#1e293b);transition:border-color 0.15s,box-shadow 0.15s;box-sizing:border-box}
  .wf-input:focus,.wf-select:focus,.wf-textarea:focus{outline:none;border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,0.12)}
  .wf-textarea{resize:vertical;min-height:40px}
  .wf-row{display:grid;gap:10px}
  .wf-row-2{grid-template-columns:1fr 1fr}
  .wf-eyes-toggle{display:flex;gap:0;border-radius:8px;overflow:hidden;border:1px solid var(--border,#e2e8f0)}
  .wf-eyes-btn{flex:1;padding:7px 10px;font-size:0.72rem;font-weight:600;border:none;cursor:pointer;transition:all 0.2s;background:var(--bg-card,#fff);color:var(--text-muted,#64748b);text-align:center}
  .wf-eyes-btn:first-child{border-right:1px solid var(--border,#e2e8f0)}
  .wf-eyes-btn.active-4{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-weight:700}
  .wf-eyes-btn.active-6{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;font-weight:700}
  .wf-approver-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
  .wf-chip{display:flex;align-items:center;gap:3px;padding:4px 10px;border-radius:16px;border:1px solid var(--border,#e2e8f0);cursor:pointer;transition:all 0.15s;font-size:0.68rem;font-weight:500;user-select:none}
  .wf-chip:hover{background:rgba(99,102,241,0.06);border-color:rgba(99,102,241,0.4)}
  .wf-chip.checked{background:linear-gradient(135deg,#6366f1,#4f46e5);border-color:#4f46e5;color:#fff;font-weight:700;box-shadow:0 2px 6px rgba(99,102,241,0.3)}
  .wf-chip input{display:none}
  .wf-section-label{font-size:0.6rem;font-weight:800;text-transform:uppercase;letter-spacing:0.4px;color:var(--text-muted,#94a3b8);margin-bottom:4px;margin-top:2px}
  .wf-modal-foot{display:flex;justify-content:flex-end;gap:8px;padding:10px 18px;border-top:1px solid var(--border,#e2e8f0);flex-shrink:0}
  .wf-btn{padding:8px 18px;border-radius:8px;font-size:0.78rem;font-weight:600;cursor:pointer;border:none;transition:all 0.2s}
  .wf-btn-cancel{background:var(--bg-secondary,#f1f5f9);color:var(--text-primary,#1e293b);border:1px solid var(--border,#e2e8f0)}
  .wf-btn-cancel:hover{background:#e2e8f0}
  .wf-btn-primary{background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;box-shadow:0 2px 8px rgba(99,102,241,0.35)}
  .wf-btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(99,102,241,0.45)}
  .wf-btn-approve{background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 2px 8px rgba(16,185,129,0.35)}
  .wf-btn-approve:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(16,185,129,0.45)}
  .wf-btn-reject{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;box-shadow:0 2px 8px rgba(239,68,68,0.3)}
  .wf-btn-reject:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(239,68,68,0.4)}
  .wf-btn-delete{background:none;color:#ef4444;border:1px solid #fecaca;font-size:0.68rem;padding:4px 10px}
  .wf-btn-delete:hover{background:#fef2f2}
  .wf-alert-error{background:#fef2f2;border:1px solid #fecaca;color:#dc2626;padding:8px 12px;border-radius:8px;font-size:0.76rem;margin-bottom:10px;font-weight:500}
  .wf-req{color:#ef4444}
  .wf-modal form{display:flex;flex-direction:column;flex:1;overflow:hidden;min-height:0}
  .wf-detail-row{display:flex;padding:6px 0;border-bottom:1px solid var(--border,#f1f5f9);font-size:0.8rem}
  .wf-detail-label{width:110px;font-weight:700;color:var(--text-muted,#64748b);font-size:0.7rem;text-transform:uppercase;flex-shrink:0}
  .wf-detail-val{flex:1;color:var(--text-primary,#1e293b)}
</style>`;

// ─── MAIN RENDER ─────────────────────────────────────────────
export function renderPage() {
  if (!_loaded) { loadFromDB().then(() => window.render?.()); }
  const activeWf = WORKFLOWS.filter(w => w.status === 'active').length;
  const pendingCount = PENDING.filter(p => p.status === 'pending').length;
  return `
    ${MODAL_CSS}
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('workflow', 28)} Approval Workflows</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm" onclick="window._wfShowCreate()">+ Create Workflow</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${metric('Active Workflows', activeWf, `${WORKFLOWS.filter(w => w.eyes === 4).length} × 4-Eyes · ${WORKFLOWS.filter(w => w.eyes === 6).length} × 6-Eyes`, 'blue', 'workflow')}
        ${metric('Pending Approvals', pendingCount, pendingCount > 0 ? '1 approaching SLA' : 'All clear', pendingCount > 0 ? 'orange' : 'green', 'clock')}
        ${metric('Approved (7d)', '24', 'Avg time: 3.2h', 'green', 'check')}
        ${metric('SLA Breaches', '0', 'Last 30 days', 'green', 'shield')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>⏳ Pending Approvals (${pendingCount})</h3>
        ${pendingCount === 0 ? '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.82rem">✅ No pending approvals</div>' : `
        <table class="sa-table"><thead><tr><th>ID</th><th>Workflow</th><th>Action</th><th>Requester</th><th>Step</th><th>Waiting For</th><th>Elapsed</th><th>SLA</th><th>Actions</th></tr></thead><tbody>
          ${PENDING.filter(p => p.status === 'pending').map(pendingRow).join('')}
        </tbody></table>`}
      </div>

      <div class="sa-card" style="margin-bottom:1rem">
        <h3>👁 4-Eyes Workflows (Dual Approval)</h3>
        <table class="sa-table"><thead><tr><th>ID</th><th>Name</th><th>Trigger</th><th>Condition</th><th>Approvers</th><th>SLA</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${WORKFLOWS.filter(w => w.eyes === 4).map(wfRow).join('')}
        </tbody></table>
      </div>

      <div class="sa-card">
        <h3>👁👁 6-Eyes Workflows (Triple Approval — Critical)</h3>
        <table class="sa-table"><thead><tr><th>ID</th><th>Name</th><th>Trigger</th><th>Condition</th><th>Approvers</th><th>SLA</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${WORKFLOWS.filter(w => w.eyes === 6).map(wfRow).join('')}
        </tbody></table>
      </div>

      ${modalMode === 'create' ? renderFormModal('Create Approval Workflow', null) : ''}
      ${modalMode === 'edit' && editingWf ? renderFormModal(`Edit Workflow — ${editingWf.id}`, editingWf) : ''}
      ${modalMode === 'review' && reviewingApr ? renderReviewModal() : ''}
    </div>`;
}

// ─── TABLE ROWS ──────────────────────────────────────────────
function pendingRow(p) {
  const pct = parseFloat(p.elapsed) / parseFloat(p.sla) * 100;
  const urgent = pct > 70;
  return `<tr class="${urgent ? 'ops-alert-row' : ''}">
    <td class="sa-code">${p.id}</td><td class="sa-code" style="font-size:0.72rem">${p.workflow}</td>
    <td style="font-size:0.78rem">${p.action}</td><td>${p.requester}</td>
    <td><strong>${p.step}</strong></td><td>${p.waiting}</td>
    <td style="color:${urgent ? '#ef4444' : 'var(--text-secondary)'}">${p.elapsed}</td><td>${p.sla}</td>
    <td><button class="btn btn-xs btn-outline" onclick="window._wfReview('${p.id}')">Review</button></td>
  </tr>`;
}

function wfRow(w) {
  return `<tr>
    <td class="sa-code">${w.id}</td><td><strong>${w.name}</strong></td>
    <td class="sa-code" style="font-size:0.7rem">${w.trigger}</td>
    <td style="font-size:0.78rem">${w.condition}</td>
    <td style="font-size:0.78rem">${w.approvers}</td><td>${w.sla}</td>
    <td><span class="sa-status-pill sa-pill-${w.status === 'active' ? 'green' : 'gray'}">${w.status}</span></td>
    <td style="white-space:nowrap">
      <button class="btn btn-xs btn-outline" onclick="window._wfEdit('${w.id}')" style="margin-right:4px">Edit</button>
      <button class="wf-btn wf-btn-delete" onclick="window._wfDelete('${w.id}')">🗑</button>
    </td>
  </tr>`;
}

// ─── REVIEW MODAL ────────────────────────────────────────────
function renderReviewModal() {
  const p = reviewingApr;
  const wf = WORKFLOWS.find(w => w.id === p.workflow);
  return `
    <div class="wf-overlay" onclick="if(event.target===this)window._wfClose()">
      <div class="wf-modal" style="width:480px">
        <div class="wf-modal-head">
          <h2>📋 Review Approval — ${p.id}</h2>
          <button class="wf-modal-close" onclick="window._wfClose()">✕</button>
        </div>
        <div class="wf-modal-body">
          <div class="wf-detail-row"><div class="wf-detail-label">Approval ID</div><div class="wf-detail-val"><strong>${p.id}</strong></div></div>
          <div class="wf-detail-row"><div class="wf-detail-label">Workflow</div><div class="wf-detail-val">${p.workflow}${wf ? ' — ' + wf.name : ''}</div></div>
          <div class="wf-detail-row"><div class="wf-detail-label">Action</div><div class="wf-detail-val">${p.action}</div></div>
          <div class="wf-detail-row"><div class="wf-detail-label">Requester</div><div class="wf-detail-val">${p.requester}</div></div>
          <div class="wf-detail-row"><div class="wf-detail-label">Step</div><div class="wf-detail-val"><strong>${p.step}</strong> — Waiting for: ${p.waiting}</div></div>
          <div class="wf-detail-row"><div class="wf-detail-label">Elapsed</div><div class="wf-detail-val">${p.elapsed} / ${p.sla} SLA</div></div>
          ${wf ? `<div class="wf-detail-row"><div class="wf-detail-label">Type</div><div class="wf-detail-val">${wf.eyes}-Eyes · Approvers: ${wf.approvers}</div></div>` : ''}
          <div style="margin-top:12px">
            <label class="wf-label">Comment (optional)</label>
            <textarea class="wf-textarea" id="wf-review-comment" rows="2" placeholder="Add a note for audit trail..."></textarea>
          </div>
        </div>
        <div class="wf-modal-foot" style="justify-content:space-between">
          <button type="button" class="wf-btn wf-btn-cancel" onclick="window._wfClose()">Cancel</button>
          <div style="display:flex;gap:8px">
            <button type="button" class="wf-btn wf-btn-reject" onclick="window._wfDecide('${p.id}','rejected')">✕ Reject</button>
            <button type="button" class="wf-btn wf-btn-approve" onclick="window._wfDecide('${p.id}','approved')">✓ Approve</button>
          </div>
        </div>
      </div>
    </div>`;
}

// ─── CREATE / EDIT FORM MODAL ────────────────────────────────
function renderFormModal(title, wf) {
  const isEdit = !!wf;
  const currentApprovers = wf ? wf.approvers.split(' + ').map(s => s.trim()) : [];
  const currentEyes = wf ? wf.eyes : 4;
  const triggerMatch = wf ? TRIGGER_OPTIONS.find(t => t.value === wf.trigger) : null;
  return `
    <div class="wf-overlay" onclick="if(event.target===this)window._wfClose()">
      <div class="wf-modal">
        <div class="wf-modal-head">
          <h2>${icon('workflow', 18)} ${title}</h2>
          <button class="wf-modal-close" onclick="window._wfClose()">✕</button>
        </div>
        <form onsubmit="event.preventDefault();window._wfSave(this,'${isEdit ? wf.id : ''}')">
          <div class="wf-modal-body">
            ${modalError ? `<div class="wf-alert-error">${esc(modalError)}</div>` : ''}

            <div class="wf-form-group">
              <label class="wf-label">Workflow Name <span class="wf-req">*</span></label>
              <input class="wf-input" type="text" name="wf_name" required placeholder="e.g. Vendor Onboarding Approval" value="${wf ? esc(wf.name) : ''}" autocomplete="off">
            </div>

            <div class="wf-row wf-row-2">
              <div class="wf-form-group">
                <label class="wf-label">Trigger Event <span class="wf-req">*</span></label>
                <select class="wf-select" name="wf_trigger" required onchange="document.getElementById('wf-custom-trigger').style.display=this.value==='custom'?'block':'none'">
                  <option value="" disabled ${!wf ? 'selected' : ''}>Select trigger...</option>
                  ${TRIGGER_OPTIONS.map(t => `<option value="${t.value}" ${triggerMatch && triggerMatch.value === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
                  ${wf && !triggerMatch ? `<option value="${esc(wf.trigger)}" selected>${esc(wf.trigger)}</option>` : ''}
                </select>
                <input class="wf-input" type="text" name="wf_custom_trigger" id="wf-custom-trigger" placeholder="e.g. invoice.payment.approve" style="display:none;margin-top:6px" autocomplete="off">
              </div>
              <div class="wf-form-group">
                <label class="wf-label">SLA Duration <span class="wf-req">*</span></label>
                <select class="wf-select" name="wf_sla" required>
                  ${['1h', '2h', '4h', '8h', '24h', '48h', '72h'].map(s => `<option value="${s}" ${wf && wf.sla === s ? 'selected' : (!wf && s === '4h' ? 'selected' : '')}>${s.replace('h', ' hour')}${parseInt(s) > 1 ? 's' : ''}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="wf-form-group">
              <label class="wf-label">Condition / Rule</label>
              <input class="wf-input" type="text" name="wf_condition" placeholder="e.g. quantity > 1000 OR value > $10,000" value="${wf ? esc(wf.condition) : ''}" autocomplete="off">
            </div>

            <div class="wf-form-group">
              <label class="wf-label">Approval Type <span class="wf-req">*</span></label>
              <div class="wf-eyes-toggle" id="wf-eyes-toggle">
                <button type="button" class="wf-eyes-btn ${currentEyes === 4 ? 'active-4' : ''}" data-eyes="4" onclick="window._wfSetEyes(4)">👁 4-Eyes (Dual)</button>
                <button type="button" class="wf-eyes-btn ${currentEyes === 6 ? 'active-6' : ''}" data-eyes="6" onclick="window._wfSetEyes(6)">👁👁 6-Eyes (Triple)</button>
              </div>
              <input type="hidden" name="wf_eyes" id="wf-eyes-val" value="${currentEyes}">
            </div>

            <div class="wf-form-group">
              <div class="wf-section-label">Approver Roles <span class="wf-req">*</span> <span style="font-weight:400;text-transform:none;letter-spacing:0">(select <span id="wf-min-approvers">${currentEyes === 6 ? 3 : 2}</span>+)</span></div>
              <div class="wf-approver-chips">
                ${APPROVER_ROLES.map(r => {
    const checked = currentApprovers.includes(r); return `
                  <label class="wf-chip ${checked ? 'checked' : ''}">
                    <input type="checkbox" name="wf_approver" value="${esc(r)}" ${checked ? 'checked' : ''} onchange="this.parentElement.classList.toggle('checked',this.checked)">
                    ${r}
                  </label>`;
  }).join('')}
              </div>
            </div>

            <div class="wf-form-group">
              <label class="wf-label">Status</label>
              <select class="wf-select" name="wf_status">
                <option value="active" ${!wf || wf.status === 'active' ? 'selected' : ''}>Active — immediately enforced</option>
                <option value="draft" ${wf && wf.status === 'draft' ? 'selected' : ''}>Draft — save without enforcing</option>
                <option value="disabled" ${wf && wf.status === 'disabled' ? 'selected' : ''}>Disabled — paused</option>
              </select>
            </div>
          </div>
          <div class="wf-modal-foot">
            <button type="button" class="wf-btn wf-btn-cancel" onclick="window._wfClose()">Cancel</button>
            <button type="submit" class="wf-btn wf-btn-primary">${isEdit ? '💾 Save Changes' : `${icon('plus', 14)} Create Workflow`}</button>
          </div>
        </form>
      </div>
    </div>`;
}

function metric(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }

// ─── WINDOW GLOBALS ──────────────────────────────────────────
window._wfShowCreate = () => { modalMode = 'create'; modalError = ''; editingWf = null; window.render(); };
window._wfClose = closeAll;
// Alias for backward compat
window._wfCloseCreate = closeAll;

window._wfEdit = (id) => {
  const wf = WORKFLOWS.find(w => w.id === id);
  if (!wf) return;
  editingWf = { ...wf };
  modalMode = 'edit';
  modalError = '';
  window.render();
};

window._wfDelete = (id) => {
  const wf = WORKFLOWS.find(w => w.id === id);
  if (!wf) return;
  if (!confirm(`Delete workflow ${wf.id} "${wf.name}"?\n\nThis cannot be undone.`)) return;
  const idx = WORKFLOWS.findIndex(w => w.id === id);
  if (idx >= 0) WORKFLOWS.splice(idx, 1);
  saveToDB();
  window.render();
  window.showToast?.(`🗑 Workflow ${id} deleted`, 'warning');
};

window._wfReview = (id) => {
  const apr = PENDING.find(p => p.id === id);
  if (!apr) return;
  reviewingApr = { ...apr };
  modalMode = 'review';
  window.render();
};

window._wfDecide = (id, decision) => {
  const apr = PENDING.find(p => p.id === id);
  if (!apr) return;
  const comment = document.getElementById('wf-review-comment')?.value?.trim() || '';
  apr.status = decision;
  saveToDB();
  closeAll();
  const label = decision === 'approved' ? '✅ Approved' : '❌ Rejected';
  window.showToast?.(`${label}: ${id}${comment ? ' — ' + comment : ''}`, decision === 'approved' ? 'success' : 'error');
};

window._wfSetEyes = (n) => {
  const el = document.getElementById('wf-eyes-val');
  if (el) el.value = n;
  const btns = document.querySelectorAll('#wf-eyes-toggle .wf-eyes-btn');
  btns.forEach(b => { b.className = 'wf-eyes-btn' + (parseInt(b.dataset.eyes) === n ? ` active-${n}` : ''); });
  const minLabel = document.getElementById('wf-min-approvers');
  if (minLabel) minLabel.textContent = n === 6 ? '3' : '2';
};

window._wfSave = (form, editId) => {
  const d = new FormData(form);
  const name = d.get('wf_name')?.trim();
  let trigger = d.get('wf_trigger');
  if (trigger === 'custom') trigger = d.get('wf_custom_trigger')?.trim();
  const condition = d.get('wf_condition')?.trim() || 'All';
  const eyes = parseInt(d.get('wf_eyes')) || 4;
  const sla = d.get('wf_sla') || '4h';
  const status = d.get('wf_status') || 'active';
  const approvers = d.getAll('wf_approver');
  const minApprovers = eyes === 6 ? 3 : 2;

  if (!name) { modalError = 'Workflow name is required.'; window.render(); return; }
  if (!trigger) { modalError = 'Please select or enter a trigger event.'; window.render(); return; }
  if (approvers.length < minApprovers) {
    modalError = `${eyes}-Eyes requires at least ${minApprovers} approver roles. You selected ${approvers.length}.`;
    window.render(); return;
  }

  if (editId) {
    // Edit existing
    const wf = WORKFLOWS.find(w => w.id === editId);
    if (wf) {
      Object.assign(wf, { name, trigger, condition, eyes, approvers: approvers.join(' + '), sla, status });
    }
    saveToDB();
    closeAll();
    window.showToast?.(`💾 Workflow ${editId} updated`, 'success');
  } else {
    // Create new
    const maxNum = WORKFLOWS.reduce((mx, w) => { const n = parseInt(w.id.replace('WF-', '')); return n > mx ? n : mx; }, 0);
    const newId = 'WF-' + String(maxNum + 1).padStart(3, '0');
    WORKFLOWS.push({ id: newId, name, trigger, condition, eyes, approvers: approvers.join(' + '), sla, status });
    saveToDB();
    closeAll();
    window.showToast?.(`✅ Workflow ${newId} "${name}" created`, 'success');
  }
};
