/**
 * Risk – Model Governance
 * Risk model lifecycle, drift monitoring, change log from /api/scm/risk-model
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

let D = {};
async function load() {
  const h = { 'Authorization': 'Bearer ' + State.token };
  const [models, drift, changes] = await Promise.all([
    fetch('/api/scm/risk-model/models', { headers: h }).then(r => r.json()).catch(() => ({})),
    fetch('/api/scm/risk-model/models/drift', { headers: h }).then(r => r.json()).catch(() => ({})),
    fetch('/api/scm/risk-model/model-changes', { headers: h }).then(r => r.json()).catch(() => ({})),
  ]);
  D = { models: models.models || [], drift: drift.drift_reports || drift.reports || [], changes: changes.changes || [] };
}

export function renderPage() {
  load();
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('settings', 28)} Model Governance</h1></div>

      <div class="sa-grid-2col" style="margin-bottom:1.5rem">
        <div class="sa-card">
          <h3>Model Inventory</h3>
          ${D.models.length === 0 ? '<p style="color:var(--text-secondary)">No models</p>' :
      D.models.map(m => `<div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
              <div><span class="sa-code">${m.model_id || '—'}</span> <span style="font-size:0.8rem;color:var(--text-secondary)">${m.type || ''}</span></div>
              <span class="sa-status-pill sa-pill-${m.status === 'production' ? 'green' : 'orange'}">${m.lifecycle?.current_phase || m.status || '—'}</span>
            </div>`).join('')}
        </div>
        <div class="sa-card">
          <h3>Drift Monitoring</h3>
          ${D.drift.length === 0 ? '<p style="color:var(--text-secondary)">No drift detected</p>' :
      D.drift.map(d => `<div style="padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
              <span class="sa-code">${d.model_id || '—'}</span>
              <span style="font-size:0.8rem;margin-left:0.5rem">${d.drift_type || '—'}: ${d.drift_score || d.value || '—'}</span>
            </div>`).join('')}
        </div>
      </div>

      <div class="sa-card">
        <h3>Recent Changes</h3>
        ${D.changes.length === 0 ? '<p style="color:var(--text-secondary)">No changes recorded</p>' : `
        <table class="sa-table"><thead><tr><th>Model</th><th>Action</th><th>By</th><th>Date</th></tr></thead>
        <tbody>${D.changes.slice(0, 20).map(c => `<tr>
          <td class="sa-code">${c.model_id || '—'}</td>
          <td style="font-size:0.82rem">${c.action || c.change_type || '—'}</td>
          <td style="font-size:0.8rem">${c.changed_by || c.user || '—'}</td>
          <td style="font-size:0.7rem;color:var(--text-secondary)">${c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</td>
        </tr>`).join('')}
        </tbody></table>`}
      </div>
    </div>`;
}
