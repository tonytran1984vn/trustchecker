/** Risk – Dashboard — reads from State._riskData (populated by router/loadPageData) */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

export function renderPage() {
  const D = State._riskData || {};
  const alerts = D.alerts?.alerts || [];
  const heatmap = D.heatmap?.regions || D.heatmap?.heatmap || [];
  const trends = D.trends || {};
  const radar = D.radar || {};

  const openAlerts = alerts.filter(a => a.status === 'open').length;
  const critAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;
  const regionCount = heatmap.length;
  const fraudTrend = trends.fraud_alerts || [];
  const leakTrend = trends.leak_alerts || [];

  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('shield', 28)} Risk Dashboard</h1>
    <div class="sa-title-actions"><span class="ops-live-dot"></span><span style="font-size:0.75rem;color:#22c55e;font-weight:600">LIVE</span></div></div>

    <div class="sa-metrics-row">
      ${m('Active Alerts', openAlerts, `${alerts.length} total`, openAlerts > 5 ? 'red' : 'green', 'alert')}
      ${m('Critical/High', critAlerts, critAlerts > 0 ? 'Requires attention' : 'All clear', critAlerts > 0 ? 'orange' : 'green', 'alertTriangle')}
      ${m('Risk Regions', regionCount, 'Supply chain zones', 'blue', 'globe')}
      ${m('Fraud Signals', fraudTrend.length, `${leakTrend.length} leak signals`, 'purple', 'search')}
    </div>

    <div class="sa-grid-2col">
      <div class="sa-card"><h3>Recent Alerts</h3>
        ${alerts.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:1rem">No alerts</p>' :
      alerts.slice(0, 8).map(a => `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
            <span class="sa-code">${a.source || a.alert_type || '—'}</span>
            <span style="font-size:0.8rem;color:var(--text-secondary)">${a.description?.slice(0, 40) || '—'}</span>
            <span class="sa-status-pill sa-pill-${a.severity === 'critical' || a.severity === 'high' ? 'red' : 'orange'}" style="font-size:0.65rem">${a.severity || '—'}</span>
          </div>`).join('')}
      </div>
      <div class="sa-card"><h3>Risk Heatmap</h3>
        ${heatmap.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:1rem">No heatmap data</p>' :
      heatmap.slice(0, 8).map(r => `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
            <span style="font-weight:600">${r.region || r.country || '—'}</span>
            <div style="flex:1;margin:0 1rem"><div style="background:rgba(255,255,255,0.06);border-radius:4px;height:8px;overflow:hidden"><div style="height:100%;width:${Math.min(100, (r.risk_score || r.score || 0))}%;background:${(r.risk_score || r.score || 0) > 70 ? '#ef4444' : (r.risk_score || r.score || 0) > 40 ? '#f59e0b' : '#22c55e'};border-radius:4px"></div></div></div>
            <span class="sa-code">${(r.risk_score || r.score || 0).toFixed?.(0) || 0}%</span>
          </div>`).join('')}
      </div>
    </div></div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
