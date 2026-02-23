/**
 * TrustChecker – KYC Business Page (Enhanced)
 * Business verification + submission + approver management.
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../core/router.js';

export function renderPage() {
  const d = State.kycData;
  if (!d) return '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Loading KYC data…</div></div>';
  const s = d.stats;
  const isSuperAdmin = State.user?.role === 'super_admin';

  return `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${s.total_businesses}</div><div class="stat-label">Total Businesses</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--emerald)">${s.verified}</div><div class="stat-label">Verified</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--amber)">${s.pending}</div><div class="stat-label">Pending</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--rose)">${s.high_risk}</div><div class="stat-label">High Risk</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--rose)">${s.pending_sanctions}</div><div class="stat-label">Sanction Hits</div></div>
      <div class="stat-card"><div class="stat-value">${s.verification_rate}%</div><div class="stat-label">Verification Rate</div></div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">🏢 Registered Businesses</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" onclick="showKycSubmit()">📝 Submit Business</button>
          <button class="btn" onclick="showKycVerify()">🔍 Quick Verify</button>
        </div>
      </div>
      <div class="table-container">
        <table>
          <tr><th>Business</th><th>Reg #</th><th>Country</th><th>Industry</th><th>Risk</th><th>Status</th><th>Checks</th><th>Sanctions</th><th>Actions</th></tr>
          ${d.businesses.map(b => `
            <tr>
              <td style="font-weight:600">${b.name}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${b.registration_number || '—'}</td>
              <td>${b.country}</td>
              <td>${b.industry}</td>
              <td><span class="badge ${b.risk_level === 'low' ? 'valid' : b.risk_level === 'high' || b.risk_level === 'critical' ? 'suspicious' : 'warning'}">${b.risk_level}</span></td>
              <td><span class="badge ${b.verification_status === 'verified' ? 'valid' : b.verification_status === 'rejected' ? 'suspicious' : 'warning'}">${b.verification_status}</span></td>
              <td style="text-align:center">${b.check_count || 0}</td>
              <td style="text-align:center;color:${b.pending_sanctions > 0 ? 'var(--rose)' : 'var(--text-muted)'}">${b.pending_sanctions || 0}</td>
              <td>
                ${b.verification_status === 'pending' ? `
                  <button class="btn btn-sm" onclick="kycApprove('${b.id}')"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Approve</button>
                  <button class="btn btn-sm" onclick="kycReject('${b.id}')" style="margin-left:4px"><span class="status-icon status-fail" aria-label="Fail">✗</span> Reject</button>
                ` : '—'}
              </td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>

    ${isSuperAdmin ? renderApproverSection() : ''}
  `;
}

function renderApproverSection() {
  const approvers = State.kycApprovers || [];
  return `
    <div class="card" style="margin-top:20px">
      <div class="card-header">
        <div class="card-title">👤 KYC Approvers</div>
        <button class="btn btn-primary" onclick="showAddApprover()">+ Add Approver</button>
      </div>
      <div class="table-container">
        ${approvers.length ? `
          <table>
            <tr><th>User</th><th>Email</th><th>Role</th><th>Added</th><th>Actions</th></tr>
            ${approvers.map(a => `
              <tr>
                <td style="font-weight:600">${a.username}</td>
                <td style="font-size:0.82rem">${a.email || '—'}</td>
                <td><span class="badge info">${a.role}</span></td>
                <td style="font-size:0.72rem;color:var(--text-muted)">${a.added_at ? new Date(a.added_at).toLocaleDateString() : '—'}</td>
                <td><button class="btn btn-sm" onclick="removeApprover('${a.user_id}')" style="color:var(--rose)">🗑️ Remove</button></td>
              </tr>
            `).join('')}
          </table>
        ` : '<div style="padding:20px;text-align:center;color:var(--text-muted)">No approvers configured — only super admins can approve</div>'}
      </div>
    </div>
  `;
}

// --- Business Submission (formal) ---
function showKycSubmit() {
  State.modal = `
    <div class="modal">
      <div class="modal-title">📝 Submit Business for KYC</div>
      <div class="input-group"><label>Business Name *</label><input class="input" id="kyc-sub-name" placeholder="Legal entity name"></div>
      <div class="input-group"><label>Registration Number *</label><input class="input" id="kyc-sub-reg" placeholder="e.g. VN-0401-2019"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="input-group"><label>Country *</label><input class="input" id="kyc-sub-country" placeholder="Country"></div>
        <div class="input-group"><label>Industry</label><input class="input" id="kyc-sub-industry" placeholder="Industry"></div>
      </div>
      <div class="input-group"><label>Contact Email</label><input class="input" id="kyc-sub-email" placeholder="email@company.com"></div>
      <div class="input-group"><label>Notes</label><textarea class="input" id="kyc-sub-notes" placeholder="Additional info…" rows="3" style="resize:vertical"></textarea></div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-primary" onclick="submitKycBusiness()" style="flex:1">Submit for Review</button>
        <button class="btn" onclick="State.modal=null;render()">Cancel</button>
      </div>
    </div>
  `;
  render();
}

async function submitKycBusiness() {
  const name = document.getElementById('kyc-sub-name')?.value?.trim();
  const reg = document.getElementById('kyc-sub-reg')?.value?.trim();
  const country = document.getElementById('kyc-sub-country')?.value?.trim();
  if (!name || !reg || !country) return showToast('Name, registration number, and country are required', 'error');
  try {
    await API.post('/kyc/businesses/submit', {
      name,
      registration_number: reg,
      country,
      industry: document.getElementById('kyc-sub-industry')?.value?.trim(),
      contact_email: document.getElementById('kyc-sub-email')?.value?.trim(),
      notes: document.getElementById('kyc-sub-notes')?.value?.trim()
    });
    showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Business submitted for KYC review', 'success');
    State.modal = null;
    navigate('kyc');
  } catch (e) { showToast(e.message || 'Submission failed', 'error'); }
}

// --- Quick Verify (original) ---
function showKycVerify() {
  State.modal = `
    <div class="modal">
      <div class="modal-title">🔍 Quick Verify Business</div>
      <div class="input-group"><label>Business Name *</label><input class="input" id="kyc-name" placeholder="Company name"></div>
      <div class="input-group"><label>Registration Number</label><input class="input" id="kyc-reg" placeholder="e.g. VN-0401-2019"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="input-group"><label>Country</label><input class="input" id="kyc-country" placeholder="Country"></div>
        <div class="input-group"><label>Industry</label><input class="input" id="kyc-industry" placeholder="Industry"></div>
      </div>
      <div class="input-group"><label>Contact Email</label><input class="input" id="kyc-email" placeholder="email@company.com"></div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-primary" onclick="submitKycVerify()" style="flex:1">Run Verification</button>
        <button class="btn" onclick="State.modal=null;render()">Cancel</button>
      </div>
    </div>
  `;
  render();
}

async function submitKycVerify() {
  const name = document.getElementById('kyc-name')?.value;
  if (!name) return showToast('Business name required', 'error');
  try {
    const res = await API.post('/kyc/verify', {
      name,
      registration_number: document.getElementById('kyc-reg')?.value,
      country: document.getElementById('kyc-country')?.value,
      industry: document.getElementById('kyc-industry')?.value,
      contact_email: document.getElementById('kyc-email')?.value
    });
    showToast(`KYC submitted – Risk: ${res.risk_level}, Score: ${res.avg_score}`, 'success');
    State.modal = null;
    navigate('kyc');
  } catch (e) { showToast(e.message || 'KYC failed', 'error'); }
}

// --- Approve / Reject ---
async function kycApprove(id) {
  try {
    await API.post(`/kyc/businesses/${id}/approve`);
    showToast('Business approved <span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', 'success');
    navigate('kyc');
  } catch (e) { showToast(e.message || 'Approve failed', 'error'); }
}
async function kycReject(id) {
  try {
    await API.post(`/kyc/businesses/${id}/reject`);
    showToast('Business rejected', 'info');
    navigate('kyc');
  } catch (e) { showToast(e.message || 'Reject failed', 'error'); }
}

// --- Approver Management (super_admin) ---
function showAddApprover() {
  State.modal = `
    <div class="modal">
      <div class="modal-title">👤 Add KYC Approver</div>
      <div class="input-group">
        <label>User ID *</label>
        <input class="input" id="approver-uid" placeholder="User UUID">
        <small style="color:var(--text-muted);font-size:0.7rem">Enter the user's ID to grant them KYC approval rights</small>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-primary" onclick="submitAddApprover()" style="flex:1">Add Approver</button>
        <button class="btn" onclick="State.modal=null;render()">Cancel</button>
      </div>
    </div>
  `;
  render();
}

async function submitAddApprover() {
  const userId = document.getElementById('approver-uid')?.value?.trim();
  if (!userId) return showToast('User ID required', 'error');
  try {
    await API.post('/kyc/approvers', { userId });
    showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Approver added', 'success');
    State.modal = null;
    navigate('kyc');
  } catch (e) { showToast(e.message || 'Failed to add approver', 'error'); }
}

async function removeApprover(userId) {
  if (!confirm('Remove this approver?')) return;
  try {
    await API.delete(`/kyc/approvers/${userId}`);
    showToast('Approver removed', 'info');
    navigate('kyc');
  } catch (e) { showToast(e.message || 'Remove failed', 'error'); }
}

async function kycSanctionCheck(id) {
  try {
    const res = await API.post('/kyc/sanction-check', { business_id: id });
    showToast(res.clean ? 'No sanctions found <span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : `<span class="status-icon status-warn" aria-label="Warning">!</span> ${res.hits.length} sanction hit(s)`, res.clean ? 'success' : 'warning');
    navigate('kyc');
  } catch (e) { showToast('Sanction check failed', 'error'); }
}

// Window exports
window.showKycSubmit = showKycSubmit;
window.submitKycBusiness = submitKycBusiness;
window.showKycVerify = showKycVerify;
window.submitKycVerify = submitKycVerify;
window.kycApprove = kycApprove;
window.kycReject = kycReject;
window.showAddApprover = showAddApprover;
window.submitAddApprover = submitAddApprover;
window.removeApprover = removeApprover;
window.kycSanctionCheck = kycSanctionCheck;

