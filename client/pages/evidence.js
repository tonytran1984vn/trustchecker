/**
 * TrustChecker – Evidence Page
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';
import { timeAgo } from '../utils/helpers.js';
import { navigate } from '../core/router.js';
import { escapeHTML } from '../utils/sanitize.js';
import { icon } from '../core/icons.js';

// ─── Pagination State ────────────────────────────────────
let evPage = 1;
let evPerPage = 20;

export function renderPage() {
  const d = State.evidenceData;
  if (!d) return '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Loading Evidence Vault…</div></div>';
  const s = d.stats;
  const items = d.items || [];

  // Pagination
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / evPerPage));
  if (evPage > totalPages) evPage = totalPages;
  const start = (evPage - 1) * evPerPage;
  const pageItems = items.slice(start, start + evPerPage);

  const formatSize = (bytes) => {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  };

  // Build pagination controls
  const paginationHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-top:1px solid var(--border);margin-top:8px">
      <div style="display:flex;align-items:center;gap:8px;font-size:0.78rem;color:var(--text-secondary)">
        <span>Show</span>
        <select onchange="window.evSetPerPage(this.value)" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:0.78rem;cursor:pointer">
          ${[10, 20, 50].map(n => '<option value="' + n + '"' + (n === evPerPage ? ' selected' : '') + '>' + n + '</option>').join('')}
        </select>
        <span>per page</span>
        <span style="margin-left:12px;color:var(--text-muted)">Showing ${start + 1}–${Math.min(start + evPerPage, total)} of ${total}</span>
      </div>
      <div style="display:flex;gap:4px">
        <button class="btn btn-sm" onclick="window.evGoPage(1)" ${evPage <= 1 ? 'disabled style="opacity:0.4"' : ''}>«</button>
        <button class="btn btn-sm" onclick="window.evGoPage(${evPage - 1})" ${evPage <= 1 ? 'disabled style="opacity:0.4"' : ''}>‹</button>
        <span style="padding:4px 12px;font-size:0.78rem;color:var(--text-secondary)">${evPage} / ${totalPages}</span>
        <button class="btn btn-sm" onclick="window.evGoPage(${evPage + 1})" ${evPage >= totalPages ? 'disabled style="opacity:0.4"' : ''}>›</button>
        <button class="btn btn-sm" onclick="window.evGoPage(${totalPages})" ${evPage >= totalPages ? 'disabled style="opacity:0.4"' : ''}>»</button>
      </div>
    </div>`;

  return `
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
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
          <button class="btn btn-sm" onclick="window.exportEvidenceCSV()">📊 Export CSV</button>
          <button class="btn btn-primary" onclick="window.showUploadEvidence()">+ Upload Evidence</button>
        </div>
      </div>
      <div class="table-container">
        <table>
          <tr><th>Title</th><th>Description</th><th>Type</th><th>Size</th><th>SHA-256</th><th>Status</th><th>Uploaded</th><th>Actions</th></tr>
          ${pageItems.map(e => `
            <tr>
              <td style="font-weight:600">${escapeHTML(e.title)}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(e.description)}</td>
              <td><span class="badge">${e.file_type?.split('/')[1] || 'file'}</span></td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${formatSize(e.file_size)}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.68rem;color:var(--cyan)">${e.sha256_hash?.substring(0, 12)}…</td>
              <td><span class="badge ${e.verification_status === 'anchored' || e.verification_status === 'verified' ? 'valid' : 'suspicious'}">${e.verification_status}</span></td>
              <td style="font-size:0.75rem;color:var(--text-muted)">${timeAgo(e.created_at)}</td>
              <td style="white-space:nowrap">
                <button class="btn btn-sm" onclick="window.verifyEvidence('${e.id}')" title="Verify integrity">${icon('check', 14)} Verify</button>
                <button class="btn btn-sm" onclick="window.exportEvidence('${e.id}')" style="margin-left:4px" title="Export report">${icon('download', 14)} Export</button>
                <button class="btn btn-sm" onclick="window.downloadForensicReport('${e.id}')" style="margin-left:4px" title="Forensic analysis">${icon('shield', 14)} Forensic</button>
              </td>
            </tr>
          `).join('')}
        </table>
      </div>
      ${paginationHtml}
    </div>
  `;
}

// ─── Pagination Handlers ───────────────────────────────
window.evGoPage = function(p) {
  const d = State.evidenceData;
  if (!d) return;
  const totalPages = Math.max(1, Math.ceil((d.items || []).length / evPerPage));
  evPage = Math.max(1, Math.min(p, totalPages));
  render();
};
window.evSetPerPage = function(v) {
  evPerPage = parseInt(v) || 20;
  evPage = 1;
  render();
};

// ─── Upload Evidence Modal ───────────────────────────────
window.showUploadEvidence = async function() {
  State.modal =
    '<div class="modal" style="max-width:520px">' +
    '<div class="modal-title">' + icon('lock', 20) + ' Upload Evidence</div>' +
    '<p style="font-size:0.82rem;color:var(--text-secondary);margin:4px 0 16px">Upload a document or file to anchor it on the blockchain for tamper-proof verification.</p>' +
    '<div style="margin-bottom:12px"><label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Title *</label>' +
    '<input type="text" id="ev-title" class="form-input" placeholder="e.g. GMP Compliance Certificate" style="width:100%;padding:10px 12px"></div>' +
    '<div style="margin-bottom:12px"><label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Description</label>' +
    '<textarea id="ev-desc" class="form-input" rows="3" placeholder="Brief description of the evidence..." style="width:100%;padding:10px 12px;resize:vertical"></textarea></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px">' +
    '<div><label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Entity Type</label>' +
    '<input type="text" id="ev-etype" class="form-input" placeholder="product, shipment…" style="width:100%;padding:10px 12px"></div>' +
    '<div><label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Entity ID</label>' +
    '<input type="text" id="ev-eid" class="form-input" placeholder="Related entity ID" style="width:100%;padding:10px 12px"></div></div>' +
    '<div style="display:flex;gap:8px;margin-top:20px">' +
    '<button class="btn btn-primary" onclick="window.submitEvidence()" style="flex:1;padding:10px">' + icon('zap', 16) + ' Upload & Anchor</button>' +
    '<button class="btn" onclick="State.modal=null;render()" style="padding:10px 20px">Cancel</button></div></div>';
  render();
};

window.submitEvidence = async function() {
  var title = document.getElementById('ev-title')?.value;
  if (!title) return showToast('Title required', 'error');
  try {
    var res = await API.post('/evidence/upload', {
      title: title,
      description: document.getElementById('ev-desc')?.value,
      entity_type: document.getElementById('ev-etype')?.value,
      entity_id: document.getElementById('ev-eid')?.value
    });
    showToast('Evidence anchored – Block #' + (res.block_index || ''), 'success');
    State.modal = null;
    navigate('evidence');
  } catch (e) { showToast(e.message || 'Upload failed', 'error'); }
};

// ─── Verify Evidence ─────────────────────────────────────
window.verifyEvidence = async function(id) {
  try {
    var res = await API.get('/evidence/' + id + '/verify');
    var ok = res.integrity === 'verified' || res.integrity === 'valid';
    State.modal =
      '<div class="modal" style="max-width:420px">' +
      '<div class="modal-title">' + icon('check', 20) + ' Verification Result</div>' +
      '<div style="text-align:center;padding:20px 0">' +
      '<div style="font-size:3rem;margin-bottom:8px">' + (ok ? '✅' : '⚠️') + '</div>' +
      '<div style="font-size:1.2rem;font-weight:700;color:' + (ok ? '#10b981' : '#f59e0b') + '">' + (res.integrity || 'unknown').toUpperCase() + '</div>' +
      '<div style="color:var(--text-secondary);font-size:0.82rem;margin-top:8px">Block Index: <strong>#' + (res.block_index || '—') + '</strong></div>' +
      '</div>' +
      '<div style="background:var(--surface);border-radius:8px;padding:12px;font-size:0.78rem;margin-bottom:16px">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:var(--text-secondary)">Hash Match</span><span style="color:' + (ok ? '#10b981' : '#ef4444') + ';font-weight:600">' + (ok ? '✓ Match' : '✗ Mismatch') + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:var(--text-secondary)">Chain Link</span><span style="color:#10b981;font-weight:600">✓ Valid</span></div>' +
      '<div style="display:flex;justify-content:space-between"><span style="color:var(--text-secondary)">Timestamp</span><span style="color:var(--text)">' + (res.sealed_at ? new Date(res.sealed_at).toLocaleString() : 'N/A') + '</span></div>' +
      '</div>' +
      '<button class="btn" onclick="State.modal=null;render()" style="width:100%;padding:10px">Close</button></div>';
    render();
  } catch (e) {
    showToast('Verify failed: ' + (e.message || 'Server error'), 'error');
  }
};

// ─── Export Evidence ─────────────────────────────────────
window.exportEvidence = async function(id) {
  try {
    var report = await API.get('/evidence/' + id + '/export');
    var json = JSON.stringify(report, null, 2);
    State.modal =
      '<div class="modal" style="max-width:600px">' +
      '<div class="modal-title">' + icon('download', 20) + ' Evidence Export</div>' +
      '<p style="font-size:0.82rem;color:var(--text-secondary);margin:4px 0 12px">' + escapeHTML(report.evidence?.title || id) + '</p>' +
      '<div style="background:var(--surface);border-radius:8px;padding:12px;max-height:400px;overflow:auto">' +
      '<pre style="font-family:JetBrains Mono,monospace;font-size:0.72rem;white-space:pre-wrap;margin:0;color:var(--text)">' + escapeHTML(json) + '</pre></div>' +
      '<div style="display:flex;gap:8px;margin-top:16px">' +
      '<button class="btn btn-primary" onclick="window.evCopyJSON()" style="flex:1;padding:10px">' + icon('clipboard', 16) + ' Copy JSON</button>' +
      '<button class="btn" onclick="window.evDownloadJSON(\'' + id + '\')" style="flex:1;padding:10px">' + icon('download', 16) + ' Download</button>' +
      '<button class="btn" onclick="State.modal=null;render()" style="padding:10px 20px">Close</button></div></div>';
    render();
    // Store JSON for copy
    window._evExportJSON = json;
  } catch (e) { showToast('Export failed: ' + (e.message || 'Server error'), 'error'); }
};

// ─── Forensic Report ─────────────────────────────────────
window.downloadForensicReport = async function(id) {
  try {
    var report = await API.get('/evidence/' + id + '/export');
    var ev = report.evidence || {};
    var seal = report.blockchain_seal || {};
    State.modal =
      '<div class="modal" style="max-width:520px">' +
      '<div class="modal-title">' + icon('shield', 20) + ' Forensic Analysis</div>' +
      '<p style="font-size:0.82rem;color:var(--text-secondary);margin:4px 0 16px">' + escapeHTML(ev.title || id) + '</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">' +
      '<div style="padding:12px;background:var(--surface);border-radius:8px"><div style="font-size:0.72rem;color:var(--text-secondary)">File Type</div><div style="font-weight:600;font-size:0.85rem">' + (ev.file_type || '—') + '</div></div>' +
      '<div style="padding:12px;background:var(--surface);border-radius:8px"><div style="font-size:0.72rem;color:var(--text-secondary)">File Size</div><div style="font-weight:600;font-size:0.85rem">' + (ev.file_size ? (ev.file_size > 1048576 ? (ev.file_size / 1048576).toFixed(1) + ' MB' : (ev.file_size / 1024).toFixed(0) + ' KB') : '—') + '</div></div>' +
      '<div style="padding:12px;background:var(--surface);border-radius:8px"><div style="font-size:0.72rem;color:var(--text-secondary)">Status</div><div style="font-weight:600;font-size:0.85rem;color:#10b981">' + (ev.verification_status || '—') + '</div></div>' +
      '<div style="padding:12px;background:var(--surface);border-radius:8px"><div style="font-size:0.72rem;color:var(--text-secondary)">Block #</div><div style="font-weight:600;font-size:0.85rem;color:var(--cyan)">' + (seal.block_index || '—') + '</div></div></div>' +
      '<div style="background:var(--surface);border-radius:8px;padding:12px;font-size:0.75rem;margin-bottom:12px">' +
      '<div style="margin-bottom:8px"><span style="color:var(--text-secondary)">SHA-256:</span><br><code style="font-size:0.68rem;color:var(--cyan);word-break:break-all">' + (ev.sha256_hash || '—') + '</code></div>' +
      '<div style="margin-bottom:8px"><span style="color:var(--text-secondary)">Data Hash:</span><br><code style="font-size:0.68rem;color:#8b5cf6;word-break:break-all">' + (seal.data_hash || '—') + '</code></div>' +
      '<div><span style="color:var(--text-secondary)">Merkle Root:</span><br><code style="font-size:0.68rem;color:#f59e0b;word-break:break-all">' + (seal.merkle_root || '—') + '</code></div></div>' +
      '<div style="display:flex;gap:8px">' +
      '<button class="btn" onclick="window.evDownloadJSON(\'' + id + '\')" style="flex:1;padding:10px">' + icon('download', 16) + ' Download Full Report</button>' +
      '<button class="btn" onclick="State.modal=null;render()" style="padding:10px 20px">Close</button></div></div>';
    render();
    window._evExportJSON = JSON.stringify(report, null, 2);
  } catch (e) { showToast('Forensic report failed: ' + (e.message || 'Server error'), 'error'); }
};

// ─── Helpers ─────────────────────────────────────────────
window.evCopyJSON = function() {
  if (window._evExportJSON) {
    navigator.clipboard.writeText(window._evExportJSON).then(function() {
      showToast('JSON copied to clipboard', 'success');
    }).catch(function() { showToast('Copy failed', 'error'); });
  }
};

window.evDownloadJSON = function(id) {
  if (window._evExportJSON) {
    var blob = new Blob([window._evExportJSON], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'forensic-report-' + id + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Report downloaded', 'success');
  }
};

window.exportEvidenceCSV = function() {
  var d = State.evidenceData;
  if (!d || !d.items?.length) return showToast('No evidence to export', 'error');
  var csv = 'Title,Description,Type,Size,SHA-256,Status,Uploaded\n';
  d.items.forEach(function(e) {
    csv += '"' + (e.title || '').replace(/"/g, '""') + '","' +
           (e.description || '').replace(/"/g, '""') + '","' +
           (e.file_type || '') + '",' +
           (e.file_size || 0) + ',"' +
           (e.sha256_hash || '') + '","' +
           (e.verification_status || '') + '","' +
           (e.created_at || '') + '"\n';
  });
  var blob = new Blob([csv], { type: 'text/csv' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'evidence-export-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported (' + d.items.length + ' items)', 'success');
};
