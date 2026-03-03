/** Compliance – Investigation Summary — reads from /api/ops/incidents + /api/scm/risk/alerts */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let D = {};
async function load() {
  const h = { 'Authorization': 'Bearer ' + State.token };
  const [incidents, alerts] = await Promise.all([
    fetch('/api/ops/incidents?limit=20', { headers: h }).then(r => r.json()).catch(() => ({})),
    fetch('/api/scm/risk/alerts?limit=20', { headers: h }).then(r => r.json()).catch(() => ({})),
  ]);
  D = { incidents: incidents.incidents || [], alerts: alerts.alerts || [] };
}
export function renderPage() {
  load();
  const total = D.incidents.length + D.alerts.length;
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('search', 28)} Investigation Summary</h1><div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${total} items</span></div></div>
    <div class="sa-grid-2col">
      <div class="sa-card"><h3>Incidents (${D.incidents.length})</h3>
        ${D.incidents.length === 0 ? '<p style="color:var(--text-secondary)">No incidents</p>' :
      D.incidents.map(i => `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span class="sa-code">${i.incident_id || i.id?.slice(0, 12) || '—'}</span><span style="font-size:0.8rem">${i.title || '—'}</span><span class="sa-status-pill sa-pill-${i.status === 'open' ? 'red' : 'green'}" style="font-size:0.65rem">${i.status}</span></div>`).join('')}
      </div>
      <div class="sa-card"><h3>Risk Alerts (${D.alerts.length})</h3>
        ${D.alerts.length === 0 ? '<p style="color:var(--text-secondary)">No alerts</p>' :
      D.alerts.slice(0, 10).map(a => `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span class="sa-code">${a.source}</span><span style="font-size:0.8rem">${a.description?.slice(0, 40) || '—'}</span><span class="sa-status-pill sa-pill-${a.severity === 'high' ? 'red' : 'orange'}" style="font-size:0.65rem">${a.severity}</span></div>`).join('')}
      </div>
    </div></div>`;
}
