/** Compliance – Investigation Summary — Cross-reference incidents + risk alerts */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

export function renderPage() {
  const { incidents = [], alerts = [] } = State._investigationData || {};
  const totalIssues = incidents.length + alerts.length;
  const critical = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('search', 28)} Investigation Summary</h1>
      <div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${totalIssues} items</span></div>
    </div>

    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${_m('Total Items', totalIssues, '', 'blue', 'search')}
      ${_m('Incidents', incidents.length, '', 'orange', 'alertTriangle')}
      ${_m('Risk Alerts', alerts.length, '', 'red', 'activity')}
      ${_m('Critical/High', critical.length, '', critical.length > 0 ? 'red' : 'green', 'zap')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
      <div class="sa-card">
        <h3 style="margin-bottom:1rem">${icon('alertTriangle', 18)} Active Incidents (${incidents.length})</h3>
        ${incidents.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:1.5rem">No active incidents</p>' : `
        <div style="max-height:400px;overflow-y:auto;display:grid;gap:0.5rem">
          ${incidents.map(i => `<div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;border-left:3px solid var(--accent-${i.severity === 'critical' ? 'red' : i.severity === 'high' ? 'orange' : 'blue'},#ccc)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem">
              <span style="font-weight:600;font-size:0.78rem">${i.title || i.type || '—'}</span>
              <span class="sa-status-pill sa-pill-${i.severity === 'critical' ? 'red' : i.severity === 'high' ? 'orange' : 'blue'}" style="font-size:0.68rem">${i.severity || '—'}</span>
            </div>
            <div style="font-size:0.72rem;color:var(--text-secondary)">${i.description?.slice(0, 80) || '—'}</div>
            <div style="font-size:0.68rem;color:var(--text-secondary);margin-top:0.25rem">${i.created_at ? new Date(i.created_at).toLocaleString() : '—'}</div>
          </div>`).join('')}
        </div>`}
      </div>

      <div class="sa-card">
        <h3 style="margin-bottom:1rem">${icon('activity', 18)} Risk Alerts (${alerts.length})</h3>
        ${alerts.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:1.5rem">No risk alerts</p>' : `
        <div style="max-height:400px;overflow-y:auto;display:grid;gap:0.5rem">
          ${alerts.map(a => `<div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;border-left:3px solid var(--accent-${a.severity === 'critical' || a.severity === 'high' ? 'red' : a.severity === 'medium' ? 'orange' : 'green'},#ccc)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem">
              <span style="font-weight:600;font-size:0.78rem">${a.description || a.alert_type || '—'}</span>
              <span class="sa-status-pill sa-pill-${a.severity === 'high' || a.severity === 'critical' ? 'red' : a.severity === 'medium' ? 'orange' : 'green'}" style="font-size:0.68rem">${a.severity || '—'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-secondary)">
              <span class="sa-code">${a.source || '—'}</span>
              <span>${a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</span>
            </div>
          </div>`).join('')}
        </div>`}
      </div>
    </div>
  </div>`;
}

function _m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`; }
