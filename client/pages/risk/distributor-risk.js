/** Risk – Distributor Risk — reads from State._riskBehavior */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskBehavior || {};
  const signals = D.signals || D.entities || D.behaviors || D.analysis || [];
  const dp = D.data_points || {};
  const riskScore = D.risk_score || 0;
  const riskLevel = D.risk_level || 'low';
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('network', 28)} Distributor Risk</h1></div>
    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      <div class="sa-metric-card sa-metric-${riskScore > 50 ? 'red' : riskScore > 25 ? 'orange' : 'green'}"><div class="sa-metric-body"><div class="sa-metric-value">${riskScore}</div><div class="sa-metric-label">Risk Score</div></div></div>
      <div class="sa-metric-card"><div class="sa-metric-body"><div class="sa-metric-value">${dp.shipments || 0}</div><div class="sa-metric-label">Shipments</div></div></div>
      <div class="sa-metric-card"><div class="sa-metric-body"><div class="sa-metric-value">${dp.partners || 0}</div><div class="sa-metric-label">Partners</div></div></div>
      <div class="sa-metric-card"><div class="sa-metric-body"><div class="sa-metric-value">${dp.scans || 0}</div><div class="sa-metric-label">Scans</div></div></div>
    </div>
    <div class="sa-card">${signals.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No behavioral signals detected — risk level: ' + riskLevel + '</p>' : `
      <table class="sa-table"><thead><tr><th>Pattern</th><th>Severity</th><th>Score</th><th>Detail</th></tr></thead>
      <tbody>${signals.map(e => `<tr><td class="sa-code">${e.pattern || e.name || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${e.severity === 'critical' || e.severity === 'high' ? 'red' : 'orange'}">${e.severity || '—'}</span></td>
        <td>${e.score || 0}</td>
        <td style="font-size:0.8rem">${e.detail || '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
