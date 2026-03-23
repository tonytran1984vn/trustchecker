/**
 * TrustChecker – Evidence Page
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';
import { timeAgo } from '../utils/helpers.js';
import { navigate } from '../core/router.js';
import { escapeHTML } from '../utils/sanitize.js';

export function renderPage() {
  const d = State.evidenceData;
  if (!d) return '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Loading Evidence Vault…</div></div>';
  const s = d.stats;

  const formatSize = (bytes) => {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  };

  return `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${s.total_items}</div><div class="stat-label">Total Evidence</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--emerald)">${s.anchored}</div><div class="stat-label">Anchored</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--cyan)">${s.verified}</div><div class="stat-label">Verified</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--rose)">${s.tampered}</div><div class="stat-label">Tampered</div></div>
      <div class="stat-card"><div class="stat-value">${s.total_size_mb} MB</div><div class="stat-label">Storage Used</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--emerald)">${s.integrity_rate}%</div><div class="stat-label">Integrity Rate</div></div>
    </div>

    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-title">🔒 Evidence Items</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm" onclick="exportEvidenceCSV()">📊 Export CSV</button>
          <button class="btn btn-primary" onclick="showUploadEvidence()">+ Upload Evidence</button>
        </div>
      </div>
      <div class="table-container">
        <table>
          <tr><th>Title</th><th>Description</th><th>Type</th><th>Size</th><th>SHA-256</th><th>Status</th><th>Uploaded</th><th>Actions</th></tr>
          ${d.items.map(e => `
            <tr>
              <td style="font-weight:600">${escapeHTML(e.title)}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(e.description)}</td>
              <td><span class="badge">${e.file_type?.split('/')[1] || 'file'}</span></td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${formatSize(e.file_size)}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.68rem;color:var(--cyan)">${e.sha256_hash?.substring(0, 12)}…</td>
              <td><span class="badge ${e.verification_status === 'anchored' || e.verification_status === 'verified' ? 'valid' : 'suspicious'}">${e.verification_status}</span></td>
              <td style="font-size:0.75rem;color:var(--text-muted)">${timeAgo(e.created_at)}</td>
              <td>
                <button class="btn btn-sm" onclick="verifyEvidence('${e.id}')">🔍 Verify</button>
                <button class="btn btn-sm" onclick="exportEvidence('${e.id}')" style="margin-left:4px">📄 Export</button>
                <button class="btn btn-sm" onclick="downloadForensicReport('${e.id}')" style="margin-left:4px">📋 Forensic</button>
              </td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>
  `;
}
async function showUploadEvidence() {
  State.modal = `
    <div class="modal" style="max-width:520px">
      <div class="modal-title">🔒 Upload Evidence</div>
      <p style="font-size:0.82rem;color:var(--text-secondary);margin:4px 0 16px">Upload a document or file to anchor it on the blockchain for tamper-proof verification.</p>
      <div class="form-group" style="margin-bottom:12px">
        <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Title *</label>
        <input type="text" id="ev-title" class="form-input" placeholder="e.g. GMP Compliance Certificate" style="width:100%;padding:10px 12px">
      </div>
      <div class="form-group" style="margin-bottom:12px">
        <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Description</label>
        <textarea id="ev-desc" class="form-input" rows="3" placeholder="Brief description of the evidence..." style="width:100%;padding:10px 12px;resize:vertical"></textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px">
        <div class="form-group">
          <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Entity Type</label>
          <input type="text" id="ev-etype" class="form-input" placeholder="product, shipment…" style="width:100%;padding:10px 12px">
        </div>
        <div class="form-group">
          <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Entity ID</label>
          <input type="text" id="ev-eid" class="form-input" placeholder="Related entity ID" style="width:100%;padding:10px 12px">
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:20px">
        <button class="btn btn-primary" onclick="submitEvidence()" style="flex:1;padding:10px">🔗 Upload & Anchor</button>
        <button class="btn" onclick="State.modal=null;render()" style="padding:10px 20px">Cancel</button>
      </div>
    </div>
  `;
  render();
}
async function submitEvidence() {
  const title = document.getElementById('ev-title')?.value;
  if (!title) return showToast('Title required', 'error');
  try {
    const res = await API.post('/evidence/upload', {
      title,
      description: document.getElementById('ev-desc')?.value,
      entity_type: document.getElementById('ev-etype')?.value,
      entity_id: document.getElementById('ev-eid')?.value
    });
    showToast(`Evidence anchored – Block #${res.block_index}`, 'success');
    State.modal = null;
    navigate('evidence');
  } catch (e) { showToast(e.message || 'Upload failed', 'error'); }
}
async function verifyEvidence(id) {
  try {
    const res = await API.get(`/evidence/${id}/verify`);
    showToast(`Integrity: ${res.integrity} | Block #${res.block_index}`, res.integrity === 'verified' ? 'success' : 'warning');
    navigate('evidence');
  } catch (e) { showToast('Verify failed', 'error'); }
}
async function exportEvidence(id) {
  try {
    const report = await API.get(`/evidence/${id}/export`);
    // Open report in new window — use safe DOM API instead of document.write
    const w = window.open('', '_blank');
    if (w) {
      const pre = w.document.createElement('pre');
      pre.style.cssText = 'font-family:monospace;white-space:pre-wrap';
      pre.textContent = JSON.stringify(report, null, 2);
      w.document.body.appendChild(pre);
      w.document.title = `Forensic Report – ${escapeHTML(report.evidence?.title || id)}`;
    }
  } catch (e) { showToast('Export failed', 'error'); }
}
async function downloadForensicReport(id) {
  try {
    const report = await API.get(`/evidence/${id}/export`);
    const w = window.open('', '_blank');
    if (w) {
      w.document.title = `Forensic Report – ${id}`;
      const pre = w.document.createElement('pre');
      pre.style.cssText = 'font-family:monospace;white-space:pre-wrap;padding:24px;background:#0f172a;color:#e2e8f0;max-width:100%';
      pre.textContent = JSON.stringify(report, null, 2);
      w.document.body.style.cssText = 'margin:0;background:#0f172a';
      w.document.body.appendChild(pre);
    }
  } catch (e) { showToast('Forensic report failed', 'error'); }
}

// Window exports for onclick handlers
window.showUploadEvidence = showUploadEvidence;
window.submitEvidence = submitEvidence;
window.verifyEvidence = verifyEvidence;
window.exportEvidence = exportEvidence;
window.downloadForensicReport = downloadForensicReport;
