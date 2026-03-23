/** Compliance – Privacy Requests (Admin View + Personal Consent Management) */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
import { API } from '../../core/api.js';

export function renderPage() {
  const consent = State._gdprConsent || {};
  const categories = consent.consent_categories || [];
  const report = State._complianceData?.report || {};
  const dsr = report.data_subject_requests || {};
  const userStats = report.user_statistics || {};
  const isAdmin = ['compliance_officer', 'org_owner', 'super_admin', 'admin'].includes(State.user?.active_role || State.user?.role);

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('lock', 28)} Privacy & Data Requests</h1></div>

    ${isAdmin ? `
    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${_m('Total Users', userStats.total_users ?? 0, '', 'blue', 'users')}
      ${_m('Consented', userStats.consented_users ?? 0, userStats.consent_rate || '—', 'green', 'checkCircle')}
      ${_m('Data Exports', dsr.exports ?? 0, 'GDPR Article 15', 'purple', 'download')}
      ${_m('Deletions', dsr.deletions ?? 0, 'GDPR Article 17', dsr.deletions > 0 ? 'red' : 'slate', 'trash2')}
    </div>

    <div class="sa-card" style="margin-bottom:1.5rem">
      <h3 style="margin-bottom:1rem">${icon('activity', 18)} Organization Privacy Overview</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;font-size:0.78rem">
        <div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px">
          <div style="font-weight:700;margin-bottom:0.5rem">Consent Rate</div>
          <div style="font-size:1.5rem;font-weight:700;color:var(--accent-green,#10b981)">${userStats.consent_rate || '—'}</div>
          <div style="color:var(--text-secondary);font-size:0.72rem">${userStats.consented_users ?? 0} of ${userStats.total_users ?? 0} users</div>
        </div>
        <div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px">
          <div style="font-weight:700;margin-bottom:0.5rem">Data Subject Requests</div>
          <div style="color:var(--text-secondary);line-height:1.8">
            <div>📤 <strong>${dsr.exports ?? 0}</strong> data export requests</div>
            <div>🗑️ <strong>${dsr.deletions ?? 0}</strong> deletion requests</div>
          </div>
        </div>
      </div>
    </div>
    ` : ''}

    <div class="sa-card" style="margin-bottom:1.5rem;background:linear-gradient(135deg,rgba(16,185,129,0.05),rgba(59,130,246,0.05));border:1px solid rgba(16,185,129,0.15)">
      <div style="display:flex;align-items:center;gap:0.75rem">
        ${icon('shield', 24)}
        <div>
          <div style="font-weight:700;font-size:0.88rem">Your Privacy Controls</div>
          <div style="font-size:0.75rem;color:var(--text-secondary)">Manage your consent preferences and exercise your GDPR rights. Changes take effect immediately.</div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
      <div class="sa-card">
        <h3 style="margin-bottom:1rem">${icon('toggleLeft', 18)} Consent Preferences</h3>
        <div style="display:grid;gap:0.75rem">
          ${_toggle('data_processing', 'Data Processing', 'Required for core service operation', consent.data_processing !== false, true)}
          ${_toggle('analytics', 'Analytics & Insights', 'Usage analytics to improve the platform', consent.analytics !== false, false)}
          ${_toggle('marketing', 'Marketing Communications', 'Product updates, newsletters, and offers', consent.marketing === true, false)}
        </div>
        <button class="sa-btn sa-btn-sm" style="margin-top:1rem;width:100%" onclick="window._saveConsent()">💾 Save Preferences</button>
      </div>

      <div class="sa-card">
        <h3 style="margin-bottom:1rem">${icon('fileText', 18)} Consent History</h3>
        ${categories.length === 0 ? `<p style="color:var(--text-secondary);text-align:center;padding:1.5rem">Consent records will appear here after you update preferences.</p>` : `
        <div style="max-height:200px;overflow-y:auto">
          ${categories.map(c => `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid var(--border-light);font-size:0.78rem">
            <span style="font-weight:600">${c.category?.replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase()) || '—'}</span>
            <span class="sa-status-pill sa-pill-${c.status === 'granted' ? 'green' : 'orange'}" style="font-size:0.68rem">${c.status || '—'}</span>
          </div>`).join('')}
        </div>`}
      </div>
    </div>

    <div class="sa-card" style="margin-top:1.5rem;border:1px solid rgba(239,68,68,0.2);background:rgba(239,68,68,0.03)">
      <h3 style="margin-bottom:1rem;color:var(--accent-red,#ef4444)">${icon('alertTriangle', 18)} Danger Zone</h3>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem">
        <div>
          <div style="font-weight:600;font-size:0.82rem">Request Data Deletion</div>
          <div style="font-size:0.72rem;color:var(--text-secondary)">GDPR Right to Erasure (Article 17). This will anonymize your profile, clear sessions, and redact support tickets. <strong>This action is irreversible.</strong></div>
        </div>
        <button class="sa-btn sa-btn-sm" style="background:var(--accent-red,#ef4444);color:white;white-space:nowrap;min-width:140px" onclick="window._requestDeletion()">🗑️ Delete My Data</button>
      </div>
    </div>
  </div>`;
}

function _m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`; }

function _toggle(id, label, desc, checked, disabled) {
  return `<div style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem;background:var(--bg-secondary);border-radius:8px">
    <div><div style="font-weight:600;font-size:0.78rem">${label}</div><div style="font-size:0.68rem;color:var(--text-secondary)">${desc}</div></div>
    <label style="position:relative;display:inline-block;width:44px;height:24px;cursor:${disabled ? 'not-allowed' : 'pointer'}">
      <input type="checkbox" id="consent-${id}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} style="opacity:0;width:0;height:0">
      <span style="position:absolute;inset:0;background:${checked ? 'var(--accent-green,#10b981)' : 'var(--border-light)'};border-radius:24px;transition:0.3s"></span>
      <span style="position:absolute;left:${checked ? '22px' : '2px'};top:2px;width:20px;height:20px;background:white;border-radius:50%;transition:0.3s;box-shadow:0 1px 3px rgba(0,0,0,0.2)"></span>
    </label>
  </div>`;
}

export function initPage() {
  window._saveConsent = async () => {
    const dp = document.getElementById('consent-data_processing')?.checked ?? true;
    const an = document.getElementById('consent-analytics')?.checked ?? false;
    const mk = document.getElementById('consent-marketing')?.checked ?? false;
    try {
      await API.post('/compliance/gdpr/consent', { data_processing: dp, analytics: an, marketing: mk });
      window.showToast?.('✅ Consent preferences saved', 'success');
    } catch (e) { window.showToast?.('❌ Save failed: ' + e.message, 'error'); }
  };

  window._requestDeletion = () => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = '_del_modal';
    modal.innerHTML = `<div class="modal-card" style="max-width:420px;padding:1.5rem;border-radius:12px;background:var(--bg-primary);box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      <h3 style="margin:0 0 0.5rem;color:var(--accent-red,#ef4444)">⚠️ Delete My Data</h3>
      <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:0.75rem">This is <strong>irreversible</strong>. Your profile will be anonymized, all sessions cleared, and support tickets redacted.</p>
      <div style="margin-bottom:1rem"><label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:4px">Confirm Password</label>
        <input id="_del_pw" type="password" placeholder="Enter your password" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);font-size:0.82rem;box-sizing:border-box"></div>
      <div style="display:flex;gap:0.5rem;justify-content:flex-end">
        <button class="sa-btn sa-btn-sm sa-btn-outline" onclick="document.getElementById('_del_modal')?.remove()">Cancel</button>
        <button class="sa-btn sa-btn-sm" style="background:var(--accent-red,#ef4444);color:white" onclick="window._doDeleteData()">Delete Forever</button>
      </div>
    </div>`;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
  };

  window._doDeleteData = async () => {
    const pw = document.getElementById('_del_pw')?.value;
    document.getElementById('_del_modal')?.remove();
    if (!pw) { window.showToast?.('❌ Password required', 'error'); return; }
    try {
      await API.delete('/compliance/gdpr/delete', { password: pw });
      window.showToast?.('Data deletion processed. Logging out...', 'info');
      setTimeout(() => { window.location.href = '/trustchecker/'; }, 2000);
    } catch (e) { window.showToast?.('❌ Deletion failed: ' + e.message, 'error'); }
  };
}
