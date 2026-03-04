/** Risk – Reports — reads from State._riskTrends */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskTrends || {};
  const fraud = D.fraud_alerts || []; const leaks = D.leak_alerts || []; const sla = D.sla_violations || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('scroll', 28)} Risk Reports</h1></div>
    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${m('Fraud Signals', fraud.length, '', fraud.length > 0 ? 'red' : 'green', 'alert')}
      ${m('Leak Alerts', leaks.length, '', leaks.length > 0 ? 'orange' : 'green', 'globe')}
      ${m('SLA Violations', sla.length, '', sla.length > 0 ? 'orange' : 'green', 'clock')}
    </div>
    <div class="sa-card"><h3>Fraud Alert Timeline</h3>
      ${fraud.length === 0 ? '<p style="color:var(--text-secondary)">No fraud data</p>' : fraud.slice(0, 10).map(f => `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span>${f.period || f.date || '—'}</span><span class="sa-code">${f.count || f.total || 0}</span></div>`).join('')}
    </div></div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
