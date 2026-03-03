/**
 * SCM – Demand Planning & Forecasting
 * Reads from workspace cache (_opsPlanCache.forecasts) — prefetched from /ops/data/demand-forecast
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
  const cache = window._opsPlanCache || {};
  const raw = cache.forecasts?.forecasts || [];

  // Build forecast table data
  const forecasts = raw.map(f => {
    const stockEstimate = Math.floor(f.predicted * (0.3 + Math.random() * 0.4)); // simulated current stock
    const safetyStock = Math.floor(f.predicted * 0.2);
    const reorderPoint = Math.floor(f.predicted * 0.35);
    return {
      product: f.product_name || '—',
      period: f.period || '—',
      predicted: f.predicted || 0,
      confidence: f.confidence || 0,
      safety: safetyStock,
      reorder: reorderPoint,
      stock: stockEstimate,
      trend: f.trend || 'stable',
      signal: f.signal || '—',
      action: stockEstimate < reorderPoint ? 'ORDER' : 'Monitor',
    };
  });

  // Build signals from data
  const signals = raw.filter(f => f.signal).map(f => ({
    signal: f.signal,
    impact: f.trend === 'spike' ? '+40%' : f.trend === 'increasing' ? '+15%' : f.trend === 'decreasing' ? '−10%' : '—',
    product: f.product_name || '—',
    confidence: Math.round((f.confidence || 0) * 100) + '%',
  }));

  const trendIcons = { increasing: '📈', decreasing: '📉', stable: '➡️', spike: '🚀' };
  const trendColors = { increasing: '#22c55e', decreasing: '#ef4444', stable: '#94a3b8', spike: '#f59e0b' };

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('workflow', 28)} Demand Planning & Forecasting</h1></div>

      ${forecasts.length === 0 ? '<div class="sa-card" style="padding:2rem;text-align:center;color:var(--text-secondary)">No forecast data available. Run seed-ops-data.js to populate.</div>' : `
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3 style="margin:0 0 1rem">${icon('zap', 18)} Demand Signals</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem">
          ${signals.slice(0, 4).map(s => `
            <div style="padding:0.8rem;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.06)">
              <div style="font-size:0.82rem;font-weight:600">${s.signal}</div>
              <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:4px">${s.product} · Impact: ${s.impact} · Conf: ${s.confidence}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="sa-card">
        <h3 style="margin:0 0 1rem">${icon('products', 18)} Reorder Planning</h3>
        <table class="sa-table"><thead><tr><th>Product</th><th>Period</th><th style="text-align:right">Forecast</th><th>Trend</th><th style="text-align:right">Safety Stock</th><th style="text-align:right">Reorder Pt</th><th style="text-align:right">Current Stock</th><th>Action</th></tr></thead>
        <tbody>${forecasts.map(f => `<tr>
            <td>${f.product}</td>
            <td class="sa-code">${f.period}</td>
            <td style="text-align:right;font-weight:600">${f.predicted.toLocaleString()}</td>
            <td><span style="color:${trendColors[f.trend] || '#94a3b8'}">${trendIcons[f.trend] || '➡️'} ${f.trend}</span></td>
            <td style="text-align:right">${f.safety.toLocaleString()}</td>
            <td style="text-align:right">${f.reorder.toLocaleString()}</td>
            <td style="text-align:right;font-weight:700;color:${f.stock > f.reorder ? '#22c55e' : '#ef4444'}">${f.stock.toLocaleString()}</td>
            <td>${f.action === 'ORDER' ? '<button class="btn btn-xs btn-primary" style="background:#ef4444;border-color:#ef4444" onclick="showToast(\'🚨 Purchase order initiated for ' + f.product + '\',\'warning\')">ORDER</button>' : '<span style="font-size:0.72rem;color:var(--text-secondary)">Monitor</span>'}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>`}
    </div>
  `;
}
