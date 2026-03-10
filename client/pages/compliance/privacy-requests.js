/** Compliance – Privacy Requests (Consent Management + Data Deletion) */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
import { API } from '../../core/api.js';

export function renderPage() {
  const consent = State._gdprConsent || {};
  const categories = consent.consent_categories || [];

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('lock', 28)} Privacy & Consent</h1></div>

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
      alert('✅ Consent preferences saved successfully');
      window.navigateTo('compliance-privacy-requests');
    } catch (e) { alert('Save failed: ' + e.message); }
  };

  window._requestDeletion = async () => {
    const pw = prompt('⚠️ IRREVERSIBLE ACTION\n\nTo confirm data deletion, enter your password:');
    if (!pw) return;
    if (!confirm('Are you absolutely sure? This will:\n• Anonymize your profile\n• Clear all sessions\n• Redact support tickets\n\nThis CANNOT be undone.')) return;
    try {
      await API.delete('/compliance/gdpr/delete', { password: pw });
      alert('Data deletion request processed. You will be logged out.');
      window.location.href = '/trustchecker/';
    } catch (e) { alert('Deletion failed: ' + e.message); }
  };
}
