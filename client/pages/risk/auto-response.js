/**
 * Risk – Auto Response
 * Automated response rules — reads rules from /api/scm/risk-model/rules-config
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let D = null;
async function load() {
  if (D) return;
  try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    D = await fetch('/api/scm/risk-model/rules-config', { headers: h }).then(r => r.json());
  } catch { D = {}; }
}
load();
export function renderPage() {
  const rules = D?.rules || D?.config || [];
  const auto = Array.isArray(rules) ? rules.filter(r => r.auto_response || r.action) : [];
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('settings', 28)} Auto Response Rules</h1></div>
      <div class="sa-card">
        ${auto.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No auto-response rules configured</p>' : `
        <table class="sa-table"><thead><tr><th>Rule</th><th>Trigger</th><th>Action</th><th>Enabled</th></tr></thead>
        <tbody>${auto.map(r => `<tr>
          <td style="font-weight:600">${r.name || r.rule_id || '—'}</td>
          <td class="sa-code">${r.trigger || r.condition || r.type || '—'}</td>
          <td style="font-size:0.82rem">${r.action || r.auto_response || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${r.enabled !== false ? 'green' : 'red'}">${r.enabled !== false ? 'Active' : 'Disabled'}</span></td>
        </tr>`).join('')}</tbody></table>`}
      </div></div>`;
}
