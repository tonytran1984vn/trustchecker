/** Compliance – Workflow Control — reads from State._compliancePolicies */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const all = State._compliancePolicies?.policies || [];
  const wf = all.filter(p => p.type?.includes('workflow') || p.category === 'workflow');
  const list = wf.length > 0 ? wf : all;
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('workflow', 28)} Workflow Control</h1></div>
    <div class="sa-card">${list.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No workflow policies</p>' : `
      <table class="sa-table"><thead><tr><th>Workflow</th><th>Type</th><th>Status</th><th>Enforced</th></tr></thead>
      <tbody>${list.map(p => `<tr><td style="font-weight:600">${p.name || '—'}</td><td class="sa-code">${p.type || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${p.status === 'active' ? 'green' : 'orange'}">${p.status || '—'}</span></td><td>${p.enforced !== false ? '✅' : '❌'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
