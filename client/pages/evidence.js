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
  State.modal = {
    title: '🔒 Upload Evidence',
    body: `
      <div class="form-group"><label>Title*</label><input type="text" id="ev-title" class="form-input" placeholder="Evidence title"></div>
      <div class="form-group"><label>Description</label><textarea id="ev-desc" class="form-input" rows="3" placeholder="Description"></textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Entity Type</label><input type="text" id="ev-etype" class="form-input" placeholder="product, shipment…"></div>
        <div class="form-group"><label>Entity ID</label><input type="text" id="ev-eid" class="form-input" placeholder="Related entity ID"></div>
      </div>
    `,
    action: 'submitEvidence()',
    actionLabel: 'Upload & Anchor'
  };
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

// Window exports for onclick handlers
window.showUploadEvidence = showUploadEvidence;
window.submitEvidence = submitEvidence;
window.verifyEvidence = verifyEvidence;
window.exportEvidence = exportEvidence;
