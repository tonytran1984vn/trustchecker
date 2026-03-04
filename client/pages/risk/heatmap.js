/** Risk – Heatmap — reads from State._riskHeatmap */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskHeatmap || {};
  const regions = D.regions || D.heatmap || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('globe', 28)} Risk Heatmap</h1></div>
    <div class="sa-card">${regions.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No heatmap data</p>' : `
      <table class="sa-table"><thead><tr><th>Region</th><th>Risk Score</th><th>Partners</th><th>Shipments</th><th>Visual</th></tr></thead>
      <tbody>${regions.map(r => {
    const s = r.risk_score || r.score || 0; return `<tr><td style="font-weight:600">${r.region || r.country || '—'}</td><td class="sa-code">${s.toFixed?.(1) || s}</td><td>${r.partner_count || r.partners || '—'}</td><td>${r.shipment_count || r.shipments || '—'}</td>
        <td><div style="background:rgba(255,255,255,0.06);border-radius:4px;height:8px;width:100px;overflow:hidden"><div style="height:100%;width:${Math.min(100, s)}%;background:${s > 70 ? '#ef4444' : s > 40 ? '#f59e0b' : '#22c55e'};border-radius:4px"></div></div></td></tr>`;
  }).join('')}</tbody></table>`}</div></div>`;
}
