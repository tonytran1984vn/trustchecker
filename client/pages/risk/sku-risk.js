/** Risk – SKU Risk — reads from State._riskAnalytics */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskAnalytics || {};
  const patterns = D.fraudPatterns || D.fraud_patterns || [];
  const categories = D.riskByCategory || D.risk_by_category || [];
  const items = patterns.length > 0 ? patterns : categories;
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('products', 28)} SKU Risk Ranking</h1></div>
    <div class="sa-card">${items.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No SKU risk data</p>' : `
      <table class="sa-table"><thead><tr><th>Category / Pattern</th><th>Incidents</th><th>Critical</th><th>Open</th></tr></thead>
      <tbody>${items.map(i => `<tr><td style="font-weight:600">${i.alert_type || i.category || i.name || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${(i.incidents || i.fraud_count || 0) > 10 ? 'red' : (i.incidents || i.fraud_count || 0) > 3 ? 'orange' : 'green'}">${i.incidents || i.fraud_count || 0}</span></td>
        <td>${i.critical || 0}</td>
        <td>${i.open_count || 0}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
