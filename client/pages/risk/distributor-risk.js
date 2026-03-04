/** Risk – Distributor Risk — reads from State._riskBehavior */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskBehavior || {};
  const entities = D.entities || D.behaviors || D.analysis || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('network', 28)} Distributor Risk</h1></div>
    <div class="sa-card">${entities.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No behavioral analysis data</p>' : `
      <table class="sa-table"><thead><tr><th>Entity</th><th>Type</th><th>Risk Score</th><th>Anomalies</th></tr></thead>
      <tbody>${entities.map(e => `<tr><td style="font-weight:600">${e.name || e.entity_id || '—'}</td><td class="sa-code">${e.type || e.entity_type || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${(e.risk_score || 0) > 70 ? 'red' : (e.risk_score || 0) > 40 ? 'orange' : 'green'}">${(e.risk_score || 0).toFixed?.(0) || 0}</span></td>
        <td>${e.anomaly_count || e.anomalies || 0}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
