/**
 * Risk – SKU Risk Ranking
 * Product-level risk from /api/risk-graph/risk-analytics
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let D = null;
async function load() {
  if (D) return;
  try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    D = await fetch('/api/risk-graph/risk-analytics', { headers: h }).then(r => r.json());
  } catch { D = {}; }
}
load();
export function renderPage() {
  const products = D?.product_risk || D?.sku_risk || D?.analytics || [];
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('products', 28)} SKU Risk Ranking</h1></div>
      <div class="sa-card">
        ${(!Array.isArray(products) || products.length === 0) ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No SKU risk data available</p>' : `
        <table class="sa-table"><thead><tr><th>Product / SKU</th><th>Risk Score</th><th>Fraud Events</th><th>Anomalies</th><th>Trend</th></tr></thead>
        <tbody>${products.map(p => {
    const score = p.risk_score || p.score || 0;
    const c = score > 70 ? '#ef4444' : score > 40 ? '#f59e0b' : '#22c55e';
    return `<tr>
            <td style="font-weight:600">${p.product || p.sku || p.name || '—'}</td>
            <td><span class="sa-score" style="color:${c};font-weight:800">${score}</span></td>
            <td>${p.fraud_count || p.events || '—'}</td>
            <td>${p.anomaly_count || p.anomalies || '—'}</td>
            <td style="color:${p.trend === 'up' ? '#ef4444' : p.trend === 'down' ? '#22c55e' : '#f59e0b'}">${p.trend || '—'}</td>
          </tr>`;
  }).join('')}</tbody></table>`}
      </div></div>`;
}
