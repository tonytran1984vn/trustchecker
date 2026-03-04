/** Risk – Auto Response — reads from State._riskRules */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskRules || {};
  const rules = D.rules || D.config || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('zap', 28)} Auto Response Rules</h1></div>
    <div class="sa-card">${rules.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No auto-response rules</p>' : `
      <table class="sa-table"><thead><tr><th>Rule</th><th>Severity</th><th>Action</th><th>Active</th></tr></thead>
      <tbody>${rules.map(r => `<tr><td style="font-weight:600">${r.name || r.rule_id || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${r.severity === 'high' ? 'red' : 'orange'}">${r.severity || '—'}</span></td>
        <td class="sa-code">${r.auto_action || r.action || '—'}</td><td>${r.is_active !== false ? '✅' : '❌'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
