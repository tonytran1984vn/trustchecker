/** Compliance – Access Policy — reads from /api/compliance/policies */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let _d = null;
async function load() { if (_d) return; try { _d = await fetch('/api/compliance/policies', { headers: { 'Authorization': 'Bearer ' + State.token } }).then(r => r.json()); } catch { _d = {}; } }
load();
export function renderPage() {
  const policies = _d?.policies || [];
  const access = policies.filter(p => p.type?.includes('access') || p.category === 'access');
  const all = access.length > 0 ? access : policies;
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('lock', 28)} Access Policy</h1></div>
    <div class="sa-card">${all.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No access policies configured</p>' : `
      <table class="sa-table"><thead><tr><th>Policy</th><th>Type</th><th>Status</th><th>Last Updated</th></tr></thead>
      <tbody>${all.map(p => `<tr><td style="font-weight:600">${p.name || p.policy_name || '—'}</td><td class="sa-code">${p.type || p.category || '—'}</td><td><span class="sa-status-pill sa-pill-${p.status === 'active' ? 'green' : 'orange'}">${p.status || '—'}</span></td><td style="font-size:0.7rem;color:var(--text-secondary)">${p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
