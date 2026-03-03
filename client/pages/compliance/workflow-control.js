/** Compliance – Workflow Control — reads from /api/compliance/policies */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let _d = null;
async function load() { if (_d) return; try { _d = await fetch('/api/compliance/policies', { headers: { 'Authorization': 'Bearer ' + State.token } }).then(r => r.json()); } catch { _d = {}; } }
load();
export function renderPage() {
  const policies = _d?.policies || [];
  const wf = policies.filter(p => p.type?.includes('workflow') || p.category === 'workflow');
  const all = wf.length > 0 ? wf : policies;
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('workflow', 28)} Workflow Control</h1></div>
    <div class="sa-card">${all.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No workflow policies</p>' : `
      <table class="sa-table"><thead><tr><th>Workflow</th><th>Type</th><th>Status</th><th>Enforced</th></tr></thead>
      <tbody>${all.map(p => `<tr><td style="font-weight:600">${p.name || '—'}</td><td class="sa-code">${p.type || '—'}</td><td><span class="sa-status-pill sa-pill-${p.status === 'active' ? 'green' : 'orange'}">${p.status || '—'}</span></td><td>${p.enforced !== false ? '✅' : '❌'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
