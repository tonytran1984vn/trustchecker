/** Risk – Decision Engine — reads from State._riskGraph */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskGraph || {};
  const beh = D.behavior || {};
  const signals = beh.signals || [];
  const dp = beh.data_points || {};
  const riskScore = beh.risk_score || 0;
  const riskLevel = beh.risk_level || 'low';
  const recommendation = beh.recommendation || '—';
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('network', 28)} Decision Engine</h1></div>
    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${m('Risk Score', riskScore, riskLevel, riskScore > 50 ? 'red' : riskScore > 25 ? 'orange' : 'green', 'shield')}
      ${m('Shipments Analyzed', D.total_shipments || dp.shipments || 0, '', 'blue', 'workflow')}
      ${m('Signals Detected', signals.length, '', signals.length > 0 ? 'orange' : 'green', 'alert')}
      ${m('Recommendation', recommendation.split('—')[0]?.trim() || '—', '', 'purple', 'check')}
    </div>
    <div class="sa-card"><h3>Risk Signals</h3>
      ${signals.length === 0 ? '<p style="color:var(--text-secondary)">No risk signals detected — system is clean</p>' : `
        <table class="sa-table"><thead><tr><th>Pattern</th><th>Severity</th><th>Score</th><th>Detail</th></tr></thead>
        <tbody>${signals.map(s => `<tr><td class="sa-code">${s.pattern || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${s.severity === 'critical' || s.severity === 'high' ? 'red' : 'orange'}">${s.severity || '—'}</span></td>
          <td>${s.score || 0}</td>
          <td style="font-size:0.8rem">${s.detail || '—'}</td></tr>`).join('')}</tbody></table>`}
    </div>
    <div class="sa-card" style="margin-top:1rem"><h3>Data Points</h3>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:1rem;text-align:center;padding:1rem 0">
        ${['shipments', 'credits', 'partners', 'scans', 'routes'].map(k => `<div><div style="font-size:1.4rem;font-weight:700">${dp[k] || 0}</div><div style="font-size:0.75rem;color:var(--text-secondary)">${k}</div></div>`).join('')}
      </div>
    </div></div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
