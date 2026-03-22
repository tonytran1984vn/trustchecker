/** Risk – Scoring Engine — reads from State._riskModels */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskModels || {};
  const models = D.models || [];
  const rules = D.rules || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('zap', 28)} Scoring Engine</h1></div>
    <div class="sa-grid-2col">
      <div class="sa-card"><h3>Risk Models (${models.length})</h3>
        ${models.length === 0 ? '<p style="color:var(--text-secondary)">No models</p>' :
      models.map(m => `<div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
            <div><span style="font-weight:600">${m.version || m.name || '—'}</span><br><span style="font-size:0.72rem;color:var(--text-secondary)">${m.factors || 0} factors</span></div>
            <span class="sa-status-pill sa-pill-${m.status === 'production' || m.status === 'deployed' ? 'green' : 'orange'}" style="font-size:0.65rem">${m.status || '—'}</span></div>`).join('')}
      </div>
      <div class="sa-card"><h3>Rule Configuration (${rules.length})</h3>
        ${rules.length === 0 ? '<p style="color:var(--text-secondary)">No rules</p>' :
      `<table class="sa-table"><thead><tr><th>Rule</th><th>Category</th><th>Active</th></tr></thead>
          <tbody>${rules.map(r => {
            const ruleName = r.name || r.rule_key || r.rule_id || '—';
            const cat = r.severity || r.category || 'general';
            const catColor = cat === 'high' || cat === 'blocking' ? 'red' : cat === 'medium' || cat === 'scoring' ? 'orange' : 'blue';
            const active = r.is_active !== undefined ? r.is_active !== false : r.rule_value !== undefined;
            return `<tr><td style="font-weight:600">${ruleName}</td>
            <td><span class="sa-status-pill sa-pill-${catColor}">${cat}</span></td>
            <td>${active ? '✅' : '❌'}</td></tr>`;
          }).join('')}</tbody></table>`}
      </div></div></div>`;
}
