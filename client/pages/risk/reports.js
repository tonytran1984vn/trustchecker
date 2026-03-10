/** Risk – Reports — reads from State._riskTrends */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
function fmtDay(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch (e) { return d; } }
export function renderPage() {
  const D = State._riskTrends || {};
  const t = D.trends || {};
  const fraud = t.fraud_alerts || D.fraud_alerts || []; const leaks = t.leak_alerts || D.leak_alerts || []; const sla = t.sla_violations || D.sla_violations || [];
  const sum = D.summary || {};
  const totalFraud = sum.total_fraud || fraud.reduce((s, d) => s + (parseInt(d.count) || 0), 0);
  const totalLeaks = sum.total_leaks || leaks.reduce((s, d) => s + (parseInt(d.count) || 0), 0);
  const totalSLA = sum.total_violations || sla.reduce((s, d) => s + (parseInt(d.count) || 0), 0);
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('scroll', 28)} Risk Reports</h1><div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">Period: ${D.days || 30} days</span></div></div>
    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${m('Fraud Signals', totalFraud, fraud.length + ' data points', totalFraud > 0 ? 'red' : 'green', 'alert')}
      ${m('Leak Alerts', totalLeaks, leaks.length + ' data points', totalLeaks > 0 ? 'orange' : 'green', 'globe')}
      ${m('SLA Violations', totalSLA, sla.length + ' data points', totalSLA > 0 ? 'orange' : 'green', 'clock')}
    </div>
    <div class="sa-grid-2col">
    <div class="sa-card"><h3>Fraud Alert Timeline</h3>
      ${fraud.length === 0 ? '<p style="color:var(--text-secondary)">No fraud data</p>' : fraud.slice(0, 15).map(f => `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span>${fmtDay(f.day || f.period || f.date)}</span><span class="sa-code">${f.count || f.total || 0}</span></div>`).join('')}
    </div>
    <div class="sa-card"><h3>Leak & SLA Timeline</h3>
      ${leaks.length === 0 && sla.length === 0 ? '<p style="color:var(--text-secondary)">No leak/SLA data</p>' : `
      ${leaks.slice(0, 8).map(l => `<div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span>🔓 ${fmtDay(l.day)}</span><span class="sa-code">${l.count || 0}</span></div>`).join('')}
      ${sla.slice(0, 8).map(s => `<div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span>⏰ ${fmtDay(s.day)}</span><span class="sa-code">${s.count || 0}</span></div>`).join('')}`}
    </div></div></div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
