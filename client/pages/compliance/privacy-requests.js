/** Compliance – Privacy Requests — reads from State._gdprConsent */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const consents = State._gdprConsent?.consents || State._gdprConsent?.records || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('lock', 28)} Privacy Requests</h1></div>
    <div class="sa-card">${consents.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No privacy/consent records</p>' : `
      <table class="sa-table"><thead><tr><th>User</th><th>Consent Type</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${consents.map(c => `<tr><td style="font-weight:600">${c.user_email || c.user_id || '—'}</td><td class="sa-code">${c.consent_type || c.type || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${c.status === 'granted' ? 'green' : 'orange'}">${c.status || '—'}</span></td>
        <td style="font-size:0.7rem;color:var(--text-secondary)">${c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
