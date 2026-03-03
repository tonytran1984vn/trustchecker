/**
 * Risk – Reports
 * Risk trend summary from /api/scm/risk/trends
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

let D = null;
async function load() {
  if (D) return;
  try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    D = await fetch('/api/scm/risk/trends?period=30d', { headers: h }).then(r => r.json());
  } catch { D = {}; }
}
load();

export function renderPage() {
  const s = D?.summary || {};
  const fraud = D?.trends?.fraud_alerts || [];
  const leaks = D?.trends?.leak_alerts || [];
  const violations = D?.trends?.sla_violations || [];

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('scroll', 28)} Risk Reports</h1></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Fraud (30d)', s.total_fraud || 0, '', 'red', 'alertTriangle')}
        ${m('Leaks (30d)', s.total_leaks || 0, '', 'orange', 'shield')}
        ${m('SLA Violations', s.total_violations || 0, '', 'blue', 'clock')}
      </div>

      <div class="sa-grid-2col" style="margin-bottom:1.5rem">
        <div class="sa-card">
          <h3>Fraud Alert Timeline</h3>
          ${fraud.length === 0 ? '<p style="color:var(--text-secondary)">No data</p>' :
      fraud.map(d => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-size:0.8rem">${d.day}</span><span style="font-weight:700;color:#ef4444">${d.count}</span></div>`).join('')}
        </div>
        <div class="sa-card">
          <h3>Leak Alert Timeline</h3>
          ${leaks.length === 0 ? '<p style="color:var(--text-secondary)">No data</p>' :
      leaks.map(d => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-size:0.8rem">${d.day}</span><span style="font-weight:700;color:#f59e0b">${d.count}</span></div>`).join('')}
        </div>
      </div>

      <div class="sa-card">
        <h3>SLA Violation Timeline</h3>
        ${violations.length === 0 ? '<p style="color:var(--text-secondary)">No SLA violation data</p>' :
      violations.map(d => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-size:0.8rem">${d.day}</span><span style="font-weight:700;color:#3b82f6">${d.count}</span></div>`).join('')}
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
