/** Risk – SKU Risk — reads from State._riskAnalytics */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskAnalytics || {};
  const items = D.products || D.analytics || D.risk_items || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('products', 28)} SKU Risk Ranking</h1></div>
    <div class="sa-card">${items.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No SKU risk data</p>' : `
      <table class="sa-table"><thead><tr><th>SKU / Product</th><th>Risk Score</th><th>Events</th><th>Trend</th></tr></thead>
      <tbody>${items.map(i => `<tr><td style="font-weight:600">${i.name || i.sku || i.product_id || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${(i.risk_score || 0) > 70 ? 'red' : (i.risk_score || 0) > 40 ? 'orange' : 'green'}">${(i.risk_score || 0).toFixed?.(0) || 0}</span></td>
        <td>${i.event_count || i.fraud_events || 0}</td><td>${i.trend || '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
