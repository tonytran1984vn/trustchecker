/** Compliance – Investigation Summary — reads from State._investigationData */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._investigationData || {};
  const incidents = D.incidents || []; const alerts = D.alerts || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('search', 28)} Investigation Summary</h1></div>
    <div class="sa-grid-2col">
      <div class="sa-card"><h3>Incidents (${incidents.length})</h3>
        ${incidents.length === 0 ? '<p style="color:var(--text-secondary)">No incidents</p>' :
      incidents.map(i => `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span class="sa-code">${i.incident_id || i.id?.slice(0, 12) || '—'}</span><span style="font-size:0.8rem">${i.title || '—'}</span><span class="sa-status-pill sa-pill-${i.status === 'open' ? 'red' : 'green'}" style="font-size:0.65rem">${i.status}</span></div>`).join('')}
      </div>
      <div class="sa-card"><h3>Risk Alerts (${alerts.length})</h3>
        ${alerts.length === 0 ? '<p style="color:var(--text-secondary)">No alerts</p>' :
      alerts.slice(0, 10).map(a => `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span class="sa-code">${a.source || '—'}</span><span style="font-size:0.8rem">${a.description?.slice(0, 40) || '—'}</span><span class="sa-status-pill sa-pill-${a.severity === 'high' ? 'red' : 'orange'}" style="font-size:0.65rem">${a.severity}</span></div>`).join('')}
      </div></div></div>`;
}
