/** Compliance – Privacy Requests — reads from /api/compliance/gdpr/consent */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let _d = null;
async function load() { if (_d) return; try { _d = await fetch('/api/compliance/gdpr/consent', { headers: { 'Authorization': 'Bearer ' + State.token } }).then(r => r.json()); } catch { _d = {}; } }
load();
export function renderPage() {
  const consents = _d?.consents || _d?.records || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('users', 28)} Privacy Requests</h1></div>
    <div class="sa-card">${consents.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No privacy/consent requests</p>' : `
      <table class="sa-table"><thead><tr><th>User</th><th>Type</th><th>Purpose</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${consents.map(c => `<tr><td>${c.email || c.user || '—'}</td><td class="sa-code">${c.consent_type || c.type || '—'}</td><td style="font-size:0.8rem">${c.purpose || '—'}</td><td><span class="sa-status-pill sa-pill-${c.status === 'granted' ? 'green' : c.status === 'revoked' ? 'red' : 'orange'}">${c.status || '—'}</span></td><td style="font-size:0.7rem;color:var(--text-secondary)">${c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
