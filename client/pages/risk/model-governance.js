/** Risk – Model Governance — reads from State._riskModelGov */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskModelGov || {};
  const models = D.models || []; const drift = D.drift || []; const changes = D.changes || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('shield', 28)} Model Governance</h1></div>
    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${m('Models', models.length, '', 'blue', 'zap')}
      ${m('Drift Reports', drift.length, '', drift.length > 0 ? 'orange' : 'green', 'alertTriangle')}
      ${m('Change Requests', changes.length, '', 'purple', 'scroll')}
    </div>
    <div class="sa-grid-2col">
      <div class="sa-card"><h3>Model Inventory</h3>
        ${models.map(m => `<div style="padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;justify-content:space-between">
          <span style="font-weight:600">${m.version || '—'}</span><span class="sa-status-pill sa-pill-${m.status === 'production' ? 'green' : 'orange'}" style="font-size:0.65rem">${m.status}</span></div>`).join('') || '<p style="color:var(--text-secondary)">No models</p>'}
      </div>
      <div class="sa-card"><h3>Change Log</h3>
        ${changes.map(c => `<div style="padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
          <span class="sa-code">${c.factor || '—'}</span> <span style="font-size:0.8rem;color:var(--text-secondary)">${c.reason?.slice(0, 50) || ''}</span></div>`).join('') || '<p style="color:var(--text-secondary)">No changes</p>'}
      </div></div></div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
