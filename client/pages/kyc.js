/**
 * TrustChecker – Kyc Page
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../core/router.js';

export function renderPage() {
  const d = State.kycData;
  if (!d) return '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Loading KYC data…</div></div>';
  const s = d.stats;

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
        <button class="btn btn-primary" onclick="showKycVerify()">+ Verify Business</button>
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
                  <button class="btn btn-sm" onclick="kycApprove('${b.id}')">✅ Approve</button>
                  <button class="btn btn-sm" onclick="kycReject('${b.id}')" style="margin-left:4px">❌ Reject</button>
                ` : '—'}
              </td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>
  `;
}
async function showKycVerify() {
  State.modal = {
    title: '🏢 Verify New Business',
    body: `
      <div class="form-group"><label>Business Name*</label><input type="text" id="kyc-name" class="form-input" placeholder="Company name"></div>
      <div class="form-group"><label>Registration Number</label><input type="text" id="kyc-reg" class="form-input" placeholder="e.g. VN-0401-2019"></div>
      <div class="form-row">
        <div class="form-group"><label>Country</label><input type="text" id="kyc-country" class="form-input" placeholder="Country"></div>
        <div class="form-group"><label>Industry</label><input type="text" id="kyc-industry" class="form-input" placeholder="Industry"></div>
      </div>
      <div class="form-group"><label>Contact Email</label><input type="text" id="kyc-email" class="form-input" placeholder="email@company.com"></div>
    `,
    action: 'submitKycVerify()',
    actionLabel: 'Run Verification'
  };
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
async function kycApprove(id) {
  try {
    await API.post(`/kyc/businesses/${id}/approve`);
    showToast('Business approved', 'success');
    navigate('kyc');
  } catch (e) { showToast('Approve failed', 'error'); }
}
async function kycReject(id) {
  try {
    await API.post(`/kyc/businesses/${id}/reject`);
    showToast('Business rejected', 'info');
    navigate('kyc');
  } catch (e) { showToast('Reject failed', 'error'); }
}
async function kycSanctionCheck(id) {
  try {
    const res = await API.post('/kyc/sanction-check', { business_id: id });
    showToast(res.clean ? 'No sanctions found ✅' : `⚠️ ${res.hits.length} sanction hit(s)`, res.clean ? 'success' : 'warning');
    navigate('kyc');
  } catch (e) { showToast('Sanction check failed', 'error'); }
}

// Window exports for onclick handlers
window.showKycVerify = showKycVerify;
window.submitKycVerify = submitKycVerify;
window.kycApprove = kycApprove;
window.kycReject = kycReject;
window.kycSanctionCheck = kycSanctionCheck;
