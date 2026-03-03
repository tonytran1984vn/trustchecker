/** Compliance – Risk Policy — reads from /api/compliance/policies */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let _d = null;
async function load() { if (_d) return; try { _d = await fetch('/api/compliance/policies', { headers: { 'Authorization': 'Bearer ' + State.token } }).then(r => r.json()); } catch { _d = {}; } }
load();
export function renderPage() {
  const policies = _d?.policies || [];
  const risk = policies.filter(p => p.type?.includes('risk') || p.category === 'risk');
  const all = risk.length > 0 ? risk : policies;
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('alertTriangle', 28)} Risk Policy</h1></div>
    <div class="sa-card">${all.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No risk policies configured</p>' : `
      <table class="sa-table"><thead><tr><th>Policy</th><th>Type</th><th>Status</th><th>Description</th></tr></thead>
      <tbody>${all.map(p => `<tr><td style="font-weight:600">${p.name || '—'}</td><td class="sa-code">${p.type || '—'}</td><td><span class="sa-status-pill sa-pill-${p.status === 'active' ? 'green' : 'orange'}">${p.status || '—'}</span></td><td style="font-size:0.78rem">${p.description || '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
