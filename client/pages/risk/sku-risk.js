/**
 * Risk – SKU Risk Ranking
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const products = [
        { sku: 'COFFEE-PRE-250', name: 'Premium Coffee 250g', score: 72, duplicates: 14, geo: 7, velocity: 3, trend: '↑', vulnerable: 'High counterfeit target — premium price point' },
        { sku: 'TEA-ORG-100', name: 'Organic Tea 100g', score: 45, duplicates: 5, geo: 4, velocity: 1, trend: '→', vulnerable: 'Moderate — regional distribution gaps' },
        { sku: 'OIL-COC-500', name: 'Coconut Oil 500ml', score: 22, duplicates: 2, geo: 1, velocity: 0, trend: '↓', vulnerable: 'Low — strong supply chain control' },
        { sku: 'SAUCE-FS-350', name: 'Fish Sauce 350ml', score: 15, duplicates: 1, geo: 0, velocity: 0, trend: '↓', vulnerable: 'Very low — niche market' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('products', 28)} SKU Risk Ranking</h1></div>

      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>SKU</th><th>Product</th><th>Risk Score</th><th>Duplicates</th><th>Geo</th><th>Velocity</th><th>Trend</th><th>Vulnerability</th></tr></thead>
          <tbody>
            ${products.map(p => `
              <tr class="sa-row-clickable">
                <td class="sa-code">${p.sku}</td>
                <td><strong>${p.name}</strong></td>
                <td><span class="sa-score sa-score-${p.score >= 60 ? 'danger' : p.score >= 30 ? 'warning' : 'low'}">${p.score}</span></td>
                <td>${p.duplicates}</td>
                <td>${p.geo}</td>
                <td>${p.velocity}</td>
                <td style="color:${p.trend === '↑' ? '#ef4444' : p.trend === '↓' ? '#22c55e' : 'var(--text-secondary)'};font-weight:600">${p.trend}</td>
                <td style="font-size:0.72rem;color:var(--text-secondary)">${p.vulnerable}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
