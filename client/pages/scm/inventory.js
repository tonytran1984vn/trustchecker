/**
 * TrustChecker – Scm Inventory Page
 */
import { State, render } from '../../core/state.js';

// Fallback demo data when State is not pre-populated (e.g. inside workspace tabs)
const DEMO_INVENTORY = {
  inventory: [
    { product_name: 'Weasel Coffee Limited', sku: 'COFFEE-WL-250', location: 'WH-HCM-01', quantity: 1200, min_stock: 500, max_stock: 5000 },
    { product_name: 'Dragon Fruit Premium', sku: 'FRUIT-DF-500', location: 'WH-HCM-01', quantity: 180, min_stock: 200, max_stock: 2000 },
    { product_name: 'Robusta Grade A 1kg', sku: 'COFFEE-RB-1K', location: 'WH-HN-02', quantity: 3400, min_stock: 1000, max_stock: 5000 },
    { product_name: 'CardioPlus 100mg', sku: 'PHARMA-CP-100', location: 'WH-SG-01', quantity: 5200, min_stock: 2000, max_stock: 8000 },
    { product_name: 'VitaKing Multi-Vitamin', sku: 'PHARMA-VK-60', location: 'WH-HCM-01', quantity: 890, min_stock: 500, max_stock: 3000 },
    { product_name: 'GPS Tracker Mini', sku: 'ELEC-GT-01', location: 'WH-SG-01', quantity: 420, min_stock: 100, max_stock: 1000 },
    { product_name: 'Organic Tea 100g', sku: 'TEA-ORG-100', location: 'WH-HN-02', quantity: 2800, min_stock: 800, max_stock: 4000 },
    { product_name: 'Noodle RC 400g', sku: 'NOODLE-RC-400', location: 'WH-HCM-01', quantity: 150, min_stock: 300, max_stock: 2000 },
  ]
};
const DEMO_FORECAST = {
  trend: 'increasing', confidence: 0.87, alert: null, forecast: [
    { period: 1, predicted: 420 }, { period: 2, predicted: 450 }, { period: 3, predicted: 480 },
    { period: 4, predicted: 510 }, { period: 5, predicted: 490 },
  ]
};

export function renderPage() {
  // Use State data if available, otherwise fall back to prefetch cache or demo data
  const cache = window._opsErpCache || {};
  const inv = State.scmInventory || cache.inventory || DEMO_INVENTORY;
  const fc = State.scmForecast || cache.forecast || DEMO_FORECAST;
  const items = inv.inventory || [];

  return `
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card cyan"><div class="stat-icon">📋</div><div class="stat-value">${items.length}</div><div class="stat-label">Inventory Records</div></div>
      <div class="stat-card emerald"><div class="stat-icon">📦</div><div class="stat-value">${items.reduce((s, i) => s + i.quantity, 0)}</div><div class="stat-label">Total Units</div></div>
      <div class="stat-card ${fc?.alert ? 'amber' : 'emerald'}"><div class="stat-icon">${fc?.alert ? '<span class="status-icon status-warn" aria-label="Warning">!</span>' : '📈'}</div><div class="stat-value">${fc?.trend || 'stable'}</div><div class="stat-label">Forecast Trend</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">📦 Current Stock</div></div>
        <div class="table-container">
          <table>
            <tr><th>Product</th><th>Location</th><th>Qty</th><th>Min</th><th>Max</th><th>Status</th></tr>
            ${items.map(i => {
    const status = i.quantity <= i.min_stock ? 'low' : i.quantity >= i.max_stock ? 'high' : 'ok';
    return `
              <tr>
                <td style="font-weight:600">${i.product_name || i.sku || '—'}</td>
                <td style="font-size:0.78rem">${i.location || '—'}</td>
                <td style="font-family:'JetBrains Mono';font-weight:700;color:${status === 'low' ? 'var(--rose)' : status === 'high' ? 'var(--amber)' : 'var(--emerald)'}">${i.quantity}</td>
                <td style="font-family:'JetBrains Mono';font-size:0.72rem">${i.min_stock}</td>
                <td style="font-family:'JetBrains Mono';font-size:0.72rem">${i.max_stock}</td>
                <td><span class="badge ${status === 'low' ? 'suspicious' : status === 'high' ? 'warning' : 'valid'}">${status === 'low' ? 'Understock' : status === 'high' ? 'Overstock' : 'Normal'}</span></td>
              </tr>
            `}).join('')}
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">🤖 AI Forecast</div></div>
        ${fc ? `
          <div class="forecast-panel">
            <div class="forecast-row">
              <span>Trend: <strong style="color:var(--cyan)">${fc.trend}</strong></span>
              <span>Confidence: <strong>${Math.round((fc.confidence || 0) * 100)}%</strong></span>
            </div>
            ${fc.alert ? `<div class="forecast-alert"><span class="status-icon status-warn" aria-label="Warning">!</span> ${fc.alert.message} (${fc.alert.severity})</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${(fc.forecast || []).map(f => `
              <div class="factor-bar-container">
                <div class="factor-bar-label"><span>Day ${f.period}</span><span style="font-family:'JetBrains Mono'">${f.predicted} units</span></div>
                <div class="factor-bar"><div class="fill" style="width:${Math.min(100, f.predicted / Math.max(...(fc.forecast || []).map(x => x.upper || 1)) * 100)}%;background:var(--cyan)"></div></div>
              </div>
            `).join('')}
          </div>
        ` : '<div class="empty-state"><div class="empty-text">Insufficient data for forecast</div></div>'}
      </div>
    </div>
  `;
}

// Window exports for onclick handlers

