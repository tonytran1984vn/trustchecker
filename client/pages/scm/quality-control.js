/**
 * SCM – Quality Control & Inspection
 * Enterprise: QC checkpoints, inspection results, batch certification, defect tracking
 */
import { icon } from '../../core/icons.js';

/* ── State ─────────────────────────────────────────────────── */
let showInspModal = false;
let _inspSeq = 893; // next inspection sequence number

const QC_CHECKPOINTS = [
  { id: 'QC-INC', name: 'Incoming Raw Material', type: 'Mandatory', tests: ['Moisture %', 'Contaminant screen', 'Weight variance', 'Certificate match'], passRate: '97.2%', avgTime: '45min' },
  { id: 'QC-PROD', name: 'In-Process Production', type: 'Mandatory', tests: ['Temperature log', 'Roast level', 'Grind consistency', 'Metal detection'], passRate: '99.1%', avgTime: '30min' },
  { id: 'QC-PKG', name: 'Post-Packaging', type: 'Mandatory', tests: ['Seal integrity', 'Label accuracy', 'Weight check', 'Barcode/QR scan'], passRate: '98.8%', avgTime: '15min' },
  { id: 'QC-SHIP', name: 'Pre-Shipment', type: 'Optional', tests: ['Pallet count', 'Cold chain verify', 'Documentation check'], passRate: '99.5%', avgTime: '20min' },
];

const RECENT_INSPECTIONS = [
  { id: 'INS-2026-0892', batch: 'B-2026-0895', product: 'Premium Coffee Blend', checkpoint: 'QC-PROD', inspector: 'QC-Team-HCM', result: 'PASS', score: 98, defects: 0, ts: '2026-02-19 15:30', cert: 'GMP-certified' },
  { id: 'INS-2026-0891', batch: 'B-2026-0895', product: 'Premium Coffee Blend', checkpoint: 'QC-PKG', inspector: 'QC-Team-HCM', result: 'PASS', score: 96, defects: 2, ts: '2026-02-19 14:00', cert: 'ISO 22000' },
  { id: 'INS-2026-0890', batch: 'B-2026-0891', product: 'Organic Tea Collection', checkpoint: 'QC-INC', inspector: 'QC-Team-HN', result: 'CONDITIONAL', score: 82, defects: 5, ts: '2026-02-18 10:00', cert: 'Pending re-test' },
  { id: 'INS-2026-0889', batch: 'B-2026-0887', product: 'Manuka Honey UMF15+', checkpoint: 'QC-INC', inspector: 'QC-Team-SG', result: 'FAIL', score: 45, defects: 12, ts: '2026-02-17 09:00', cert: 'REJECTED' },
  { id: 'INS-2026-0888', batch: 'B-2026-0882', product: 'Dark Roast 500g', checkpoint: 'QC-SHIP', inspector: 'QC-Team-HCM', result: 'PASS', score: 100, defects: 0, ts: '2026-02-16 16:00', cert: 'Export cleared' },
];

const DEFECT_CATEGORIES = [
  { category: 'Moisture out of spec', count: 8, severity: 'High', trend: '↓ -3', impact: 'Raw material rejection' },
  { category: 'Label misprint', count: 5, severity: 'Medium', trend: '→ stable', impact: 'Repackaging required' },
  { category: 'Seal failure', count: 3, severity: 'Critical', trend: '↑ +1', impact: 'Product recall risk' },
  { category: 'Weight variance > 2%', count: 4, severity: 'Low', trend: '↓ -2', impact: 'Process adjustment' },
  { category: 'Foreign body (metal)', count: 1, severity: 'Critical', trend: '↓ -1', impact: 'Batch hold + investigation' },
];

/* ── Modal: New Inspection ─────────────────────────────────── */
function renderNewInspectionModal() {
  if (!showInspModal) return '';
  return `
  <div class="qc-overlay" onclick="if(event.target===this)window._qcHideModal()">
    <div class="qc-modal">
      <h2>${icon('check', 18)} New Inspection</h2>
      <form id="qc-insp-form" onsubmit="event.preventDefault();window._qcSubmitInsp()">
        <div class="qc-row">
          <div class="qc-field">
            <label class="qc-label">Batch ID</label>
            <input class="qc-input" id="qc-batch" placeholder="e.g. B-2026-0900" required>
          </div>
          <div class="qc-field">
            <label class="qc-label">Product</label>
            <input class="qc-input" id="qc-product" placeholder="e.g. Premium Coffee Blend" required>
          </div>
        </div>
        <div class="qc-row">
          <div class="qc-field">
            <label class="qc-label">Checkpoint</label>
            <select class="qc-select" id="qc-checkpoint" required>
              <option value="">— Select checkpoint —</option>
              ${QC_CHECKPOINTS.map(q => `<option value="${q.id}">${q.id} — ${q.name}</option>`).join('')}
            </select>
          </div>
          <div class="qc-field">
            <label class="qc-label">Inspector / Team</label>
            <select class="qc-select" id="qc-inspector" required>
              <option value="">— Select —</option>
              <option value="QC-Team-HCM">QC-Team-HCM</option>
              <option value="QC-Team-HN">QC-Team-HN</option>
              <option value="QC-Team-SG">QC-Team-SG</option>
              <option value="QC-Team-DN">QC-Team-DN</option>
            </select>
          </div>
        </div>
        <div class="qc-row">
          <div class="qc-field">
            <label class="qc-label">Result</label>
            <select class="qc-select" id="qc-result" required>
              <option value="">— Select —</option>
              <option value="PASS">✅ PASS</option>
              <option value="CONDITIONAL">⚠️ CONDITIONAL</option>
              <option value="FAIL">❌ FAIL</option>
            </select>
          </div>
          <div class="qc-field">
            <label class="qc-label">Score (0–100)</label>
            <input class="qc-input" id="qc-score" type="number" min="0" max="100" placeholder="e.g. 95" required>
          </div>
          <div class="qc-field">
            <label class="qc-label">Defects Found</label>
            <input class="qc-input" id="qc-defects" type="number" min="0" value="0" required>
          </div>
        </div>
        <div class="qc-field">
          <label class="qc-label">Certification / Notes</label>
          <input class="qc-input" id="qc-cert" placeholder="e.g. GMP-certified, ISO 22000, Pending re-test…">
        </div>
        <div class="qc-btns">
          <button type="button" class="qc-btn-cancel" onclick="window._qcHideModal()">Cancel</button>
          <button type="submit" class="qc-btn-submit">${icon('check', 14)} Create Inspection</button>
        </div>
      </form>
    </div>
  </div>`;
}

function submitInspection() {
  const batch = document.getElementById('qc-batch')?.value?.trim();
  const product = document.getElementById('qc-product')?.value?.trim();
  const checkpoint = document.getElementById('qc-checkpoint')?.value;
  const inspector = document.getElementById('qc-inspector')?.value;
  const result = document.getElementById('qc-result')?.value;
  const score = parseInt(document.getElementById('qc-score')?.value, 10);
  const defects = parseInt(document.getElementById('qc-defects')?.value || '0', 10);
  const cert = document.getElementById('qc-cert')?.value?.trim() || '—';

  if (!batch || !product || !checkpoint || !inspector || !result || isNaN(score)) {
    return window.showToast?.('Please fill all required fields', 'error');
  }

  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const id = `INS-2026-${String(_inspSeq++).padStart(4, '0')}`;

  RECENT_INSPECTIONS.unshift({ id, batch, product, checkpoint, inspector, result, score, defects, ts, cert });

  showInspModal = false;
  window.showToast?.(`Inspection ${id} created successfully`, 'success');
  window.render();
}

/* ── Global handlers ───────────────────────────────────────── */
window._qcShowModal = () => { showInspModal = true; window.render(); };
window._qcHideModal = () => { showInspModal = false; window.render(); };
window._qcSubmitInsp = submitInspection;

/* ── Page render ───────────────────────────────────────────── */
export function renderPage() {
  return `
    <style>
      .qc-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center}
      .qc-modal{background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:28px 32px;width:560px;max-width:92vw;box-shadow:0 24px 80px rgba(0,0,0,0.3)}
      .qc-modal h2{font-size:1.1rem;font-weight:800;margin-bottom:18px;display:flex;align-items:center;gap:8px}
      .qc-row{display:flex;gap:14px;margin-bottom:0}
      .qc-row .qc-field{flex:1}
      .qc-field{margin-bottom:14px}
      .qc-label{display:block;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:5px}
      .qc-input,.qc-select{width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:0.82rem;outline:none;box-sizing:border-box}
      .qc-input:focus,.qc-select:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.15)}
      .qc-btns{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
      .qc-btn-cancel{padding:8px 18px;border-radius:10px;font-size:0.78rem;font-weight:600;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text-primary)}
      .qc-btn-submit{padding:8px 22px;border-radius:10px;font-size:0.78rem;font-weight:700;cursor:pointer;border:none;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;display:flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(59,130,246,0.3)}
      .qc-btn-submit:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(59,130,246,0.4)}
    </style>
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('check', 28)} Quality Control</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm" onclick="window._qcShowModal()">+ New Inspection</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Inspections (30d)', '142', '94.4% pass rate', 'green', 'check')}
        ${m('Defects Found', '21', '3 critical', 'orange', 'alertTriangle')}
        ${m('Batches Certified', '38', 'All have QR certification', 'green', 'shield')}
        ${m('Avg Inspection Time', '32min', 'Target: <45min', 'blue', 'clock')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🔬 QC Checkpoints</h3>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.75rem">
          ${QC_CHECKPOINTS.map((q, i) => `
            <div style="background:rgba(99,102,241,0.03);border:1px solid rgba(99,102,241,0.08);border-top:3px solid ${['#3b82f6', '#6366f1', '#8b5cf6', '#06b6d4'][i]};border-radius:8px;padding:0.75rem">
              <div style="font-size:0.65rem;color:var(--text-secondary)">${q.id}</div>
              <div style="font-weight:700;margin:0.2rem 0">${q.name}</div>
              <div style="font-size:0.68rem;color:var(--text-secondary)">${q.type} · ${q.avgTime}</div>
              <div style="font-size:1.1rem;font-weight:800;color:#22c55e;margin:0.3rem 0">${q.passRate}</div>
              <div style="font-size:0.65rem;color:var(--text-secondary)">${q.tests.join(' · ')}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📋 Recent Inspections</h3>
        <table class="sa-table"><thead><tr><th>Inspection</th><th>Batch</th><th>Product</th><th>Checkpoint</th><th>Inspector</th><th>Score</th><th>Defects</th><th>Result</th><th>Certification</th><th>Time</th></tr></thead><tbody>
          ${RECENT_INSPECTIONS.map(r => {
    const color = r.result === 'PASS' ? '#22c55e' : r.result === 'CONDITIONAL' ? '#f59e0b' : '#ef4444';
    return `<tr class="${r.result === 'FAIL' ? 'ops-alert-row' : ''}">
              <td class="sa-code">${r.id}</td><td class="sa-code">${r.batch}</td>
              <td style="font-size:0.82rem">${r.product}</td>
              <td class="sa-code" style="font-size:0.72rem">${r.checkpoint}</td>
              <td style="font-size:0.78rem">${r.inspector}</td>
              <td style="font-weight:800;color:${color};font-size:1.1rem">${r.score}</td>
              <td style="text-align:center;color:${r.defects > 0 ? '#ef4444' : '#22c55e'}">${r.defects}</td>
              <td><span class="sa-status-pill" style="background:${color}12;color:${color};border:1px solid ${color}25">${r.result}</span></td>
              <td style="font-size:0.72rem">${r.cert}</td>
              <td class="sa-code" style="font-size:0.68rem">${r.ts}</td>
            </tr>`;
  }).join('')}
        </tbody></table>
      </div>

      <div class="sa-card">
        <h3>🐛 Defect Analysis (30 days)</h3>
        <table class="sa-table"><thead><tr><th>Category</th><th>Count</th><th>Severity</th><th>Trend</th><th>Impact</th></tr></thead><tbody>
          ${DEFECT_CATEGORIES.map(d => `<tr class="${d.severity === 'Critical' ? 'ops-alert-row' : ''}">
            <td><strong>${d.category}</strong></td>
            <td style="font-weight:600;text-align:center">${d.count}</td>
            <td><span class="sa-status-pill sa-pill-${d.severity === 'Critical' ? 'red' : d.severity === 'High' ? 'orange' : d.severity === 'Medium' ? 'blue' : 'green'}">${d.severity}</span></td>
            <td style="color:${d.trend.includes('↑') ? '#ef4444' : d.trend.includes('↓') ? '#22c55e' : 'var(--text-secondary)'}">${d.trend}</td>
            <td style="font-size:0.78rem">${d.impact}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      ${renderNewInspectionModal()}
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
