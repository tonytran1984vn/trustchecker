/**
 * Risk – Scoring Engine
 * Reads risk models and rules from /api/scm/risk-model/models + /api/scm/risk-model/rules-config
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

let D = {};
async function load() {
  const h = { 'Authorization': 'Bearer ' + State.token };
  const [models, rules] = await Promise.all([
    fetch('/api/scm/risk-model/models', { headers: h }).then(r => r.json()).catch(() => ({})),
    fetch('/api/scm/risk-model/rules-config', { headers: h }).then(r => r.json()).catch(() => ({})),
  ]);
  D = { models: models.models || [], rules: rules.rules || rules.config || [] };
}

export function renderPage() {
  load();
  const models = D.models || [];
  const rules = D.rules || [];
  const production = models.filter(m => m.status === 'production' || m.lifecycle?.current_phase === 'production');

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('target', 28)} Risk Scoring Engine</h1></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Total Models', models.length, '', 'blue', 'target')}
        ${m('In Production', production.length, '', 'green', 'check')}
        ${m('Rules Active', Array.isArray(rules) ? rules.length : '—', '', 'orange', 'settings')}
      </div>

      <!-- Models -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>${icon('target', 16)} Risk Models</h3>
        ${models.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:1rem">No models registered</p>' : `
        <table class="sa-table"><thead><tr><th>Model</th><th>Type</th><th>Version</th><th>Phase</th><th>Accuracy</th><th>Status</th></tr></thead>
        <tbody>${models.map(md => `<tr>
          <td class="sa-code">${md.model_id || md.id || '—'}</td>
          <td style="font-size:0.82rem">${md.type || md.model_type || '—'}</td>
          <td class="sa-code">${md.version || md.lifecycle?.version || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${md.status === 'production' ? 'green' : md.status === 'sandbox' ? 'orange' : 'blue'}">${md.lifecycle?.current_phase || md.status || '—'}</span></td>
          <td style="font-weight:700">${md.performance?.accuracy ? (md.performance.accuracy * 100).toFixed(1) + '%' : md.accuracy || '—'}</td>
          <td>${md.governance?.approved ? '✅ Approved' : '⏳ Pending'}</td>
        </tr>`).join('')}
        </tbody></table>`}
      </div>

      <!-- Rules Config -->
      <div class="sa-card">
        <h3>${icon('settings', 16)} Active Rules Configuration</h3>
        ${!Array.isArray(rules) || rules.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:1rem">No rules configured</p>' : `
        <table class="sa-table"><thead><tr><th>Rule</th><th>Type</th><th>Threshold</th><th>Action</th><th>Status</th></tr></thead>
        <tbody>${rules.map(r => `<tr>
          <td style="font-weight:600">${r.name || r.rule_id || '—'}</td>
          <td class="sa-code">${r.type || r.rule_type || '—'}</td>
          <td>${r.threshold || r.value || '—'}</td>
          <td style="font-size:0.8rem">${r.action || r.response || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${r.enabled !== false ? 'green' : 'red'}">${r.enabled !== false ? 'Active' : 'Disabled'}</span></td>
        </tr>`).join('')}
        </tbody></table>`}
      </div>
    </div>`;
}

function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
