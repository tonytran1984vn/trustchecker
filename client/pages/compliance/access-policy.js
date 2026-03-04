/** Compliance – Access Policy — reads from State._compliancePolicies */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const all = State._compliancePolicies?.policies || [];
  const access = all.filter(p => p.type?.includes('access') || p.category === 'access');
  const list = access.length > 0 ? access : all;
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('shield', 28)} Access Policy</h1></div>
    <div class="sa-card">${list.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No access policies</p>' : `
      <table class="sa-table"><thead><tr><th>Policy</th><th>Type</th><th>Status</th><th>Enforced</th></tr></thead>
      <tbody>${list.map(p => `<tr><td style="font-weight:600">${p.name || '—'}</td><td class="sa-code">${p.type || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${p.status === 'active' ? 'green' : 'orange'}">${p.status || '—'}</span></td><td>${p.enforced !== false ? '✅' : '❌'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
