/** Risk – Heatmap — reads from State._riskHeatmap */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskHeatmap || {};
  const regions = D.regions || D.heatmap || [];
  const hotZones = D.hot_zones || regions.filter(r => (r.heat_score || r.risk_score || r.score || 0) > 50).length;
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('globe', 28)} Risk Heatmap</h1><div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${regions.length} regions · ${hotZones} hot zones</span></div></div>
    <div class="sa-card">${regions.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No heatmap data</p>' : `
      <table class="sa-table"><thead><tr><th>Region</th><th>Risk Score</th><th>Level</th><th>Partners</th><th>Leak Alerts</th><th>Visual</th></tr></thead>
      <tbody>${regions.map(r => {
    const s = r.heat_score || r.risk_score || r.score || 0;
    const level = r.risk_level || (s > 50 ? 'hot' : s > 25 ? 'warm' : 'cool');
    return `<tr><td style="font-weight:600">${r.region || r.country || '—'}</td>
      <td class="sa-code">${typeof s === 'number' ? s.toFixed?.(1) || s : s}</td>
      <td><span class="sa-status-pill sa-pill-${level === 'hot' ? 'red' : level === 'warm' ? 'orange' : 'green'}">${level}</span></td>
      <td>${r.partners || r.partner_count || '—'}</td>
      <td>${r.leak_alerts || r.leaks || '—'}</td>
      <td><div style="background:rgba(255,255,255,0.06);border-radius:4px;height:8px;width:100px;overflow:hidden"><div style="height:100%;width:${Math.min(100, s)}%;background:${s > 50 ? '#ef4444' : s > 25 ? '#f59e0b' : '#22c55e'};border-radius:4px"></div></div></td></tr>`;
  }).join('')}</tbody></table>`}</div></div>`;
}
