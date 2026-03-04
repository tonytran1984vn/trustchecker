/** Risk – Duplicate Rules — reads from State._riskDuplicates */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskDuplicates || {};
  const alerts = D.alerts || D.duplicate_alerts || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('search', 28)} Duplicate Rules</h1></div>
    <div class="sa-card">${alerts.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No duplicate anomalies</p>' : `
      <table class="sa-table"><thead><tr><th>Type</th><th>Description</th><th>Severity</th><th>Score</th><th>Status</th></tr></thead>
      <tbody>${alerts.map(a => `<tr><td class="sa-code">${a.anomaly_type || a.type || '—'}</td><td>${a.description?.slice(0, 50) || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${a.severity === 'high' ? 'red' : 'orange'}">${a.severity || '—'}</span></td>
        <td>${(a.score || 0).toFixed?.(1) || 0}</td>
        <td><span class="sa-status-pill sa-pill-${a.status === 'open' ? 'red' : 'green'}">${a.status || '—'}</span></td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
