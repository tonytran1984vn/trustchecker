/** Risk – Geo Rules — reads from State._riskGeoAlerts */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskGeoAlerts || {};
  const alerts = D.alerts || D.geo_alerts || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('globe', 28)} Geo Rules</h1><div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${alerts.length} geo alerts</span></div></div>
    <div class="sa-card">${alerts.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No geo-based alerts</p>' : `
      <table class="sa-table"><thead><tr><th>Region</th><th>Type</th><th>Description</th><th>Severity</th><th>Time</th></tr></thead>
      <tbody>${alerts.map(a => `<tr><td style="font-weight:600">${a.region || a.geo_city || a.extracted_location || a.geo_country || a.region_detected || '—'}</td><td class="sa-code">${a.alert_type || a.type || '—'}</td>
        <td style="font-size:0.8rem">${a.description?.slice(0, 50) || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${a.severity === 'high' || a.severity === 'critical' ? 'red' : 'orange'}">${a.severity || '—'}</span></td>
        <td style="font-size:0.7rem;color:var(--text-secondary)">${a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
