/**
 * SCM – Demand Planning (AI-Driven Forecasting)
 * Enterprise: demand signals, safety stock, reorder engine
 */
import { icon } from '../../core/icons.js';

const FORECAST = [
    { sku: 'ACME-CFE-001', product: 'Coffee Blend', current: '12,500/mo', f30: '14,200', f90: '42,000', conf: '92%', trend: '↑ +13.6%', season: 'Q1 peak', safety: 2500, reorder: 5000, stock: 8400, action: 'Monitor' },
    { sku: 'ACME-TEA-003', product: 'Green Tea', current: '8,200/mo', f30: '7,800', f90: '23,000', conf: '88%', trend: '↓ -4.9%', season: 'Stable', safety: 1800, reorder: 3600, stock: 5200, action: 'Monitor' },
    { sku: 'ACME-HNY-002', product: 'Manuka Honey', current: '3,100/mo', f30: '4,500', f90: '15,000', conf: '85%', trend: '↑ +45.2%', season: 'CNY surge', safety: 800, reorder: 1500, stock: 1180, action: 'ORDER' },
    { sku: 'ACME-CFE-002', product: 'Dark Roast', current: '6,800/mo', f30: '6,500', f90: '19,200', conf: '90%', trend: '→ -4.4%', season: 'Stable', safety: 1500, reorder: 3000, stock: 4800, action: 'Monitor' },
];

const SIGNALS = [
    { signal: 'CNY Gift Season', impact: '+45% Honey demand', conf: '92%', source: 'Historical + Trends', action: 'Increase Honey PO +2K' },
    { signal: 'Coffee price spike', impact: '+12% unit cost', conf: '88%', source: 'Commodity futures', action: 'Lock forward contract' },
    { signal: 'New TH distributor', impact: '+3K units/mo', conf: '75%', source: 'Sales pipeline', action: 'Prep WH-BKK capacity' },
    { signal: 'Competitor recall (TH)', impact: '+15-20% demand', conf: '70%', source: 'Market intel', action: 'Accelerate TH inventory' },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('workflow', 28)} Demand Planning</h1></div>
      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Forecast Accuracy', '89.4%', '30d MAPE', 'green', 'target')}
        ${m('Active Signals', SIGNALS.length.toString(), '2 high-conf', 'blue', 'zap')}
        ${m('Reorder Queue', '2', '1 critical', 'red', 'alertTriangle')}
        ${m('Inventory Turns', '8.2x', 'vs avg 5.5x', 'green', 'workflow')}
      </div>
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📈 Product Demand Forecast</h3>
        <table class="sa-table"><thead><tr><th>SKU</th><th>Product</th><th>Current</th><th>30d</th><th>90d</th><th>Conf</th><th>Trend</th><th>Season</th><th>Safety</th><th>Reorder</th><th>Stock</th><th>Action</th></tr></thead><tbody>
          ${FORECAST.map(f => `<tr class="${f.action === 'ORDER' ? 'ops-alert-row' : ''}">
            <td class="sa-code" style="font-size:0.68rem">${f.sku}</td><td><strong>${f.product}</strong></td>
            <td>${f.current}</td><td style="font-weight:600">${f.f30}</td><td>${f.f90}</td>
            <td style="color:${parseInt(f.conf) > 85 ? '#22c55e' : '#f59e0b'}">${f.conf}</td>
            <td style="color:${f.trend.includes('↑') ? '#22c55e' : f.trend.includes('↓') ? '#ef4444' : 'var(--text-secondary)'};font-weight:600">${f.trend}</td>
            <td style="font-size:0.72rem">${f.season}</td>
            <td style="text-align:right">${f.safety.toLocaleString()}</td>
            <td style="text-align:right">${f.reorder.toLocaleString()}</td>
            <td style="text-align:right;font-weight:700;color:${f.stock > f.reorder ? '#22c55e' : '#ef4444'}">${f.stock.toLocaleString()}</td>
            <td>${f.action === 'ORDER' ? '<button class="btn btn-xs btn-primary" style="background:#ef4444;border-color:#ef4444">ORDER</button>' : '<span style="font-size:0.72rem;color:var(--text-secondary)">Monitor</span>'}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
      <div class="sa-card">
        <h3>📡 Demand Signals</h3>
        ${SIGNALS.map(s => `<div style="padding:0.6rem;background:rgba(99,102,241,0.03);border-radius:6px;margin-bottom:0.5rem;border-left:3px solid ${parseInt(s.conf) > 85 ? '#22c55e' : '#f59e0b'}">
          <div style="display:flex;justify-content:space-between"><strong style="font-size:0.82rem">${s.signal}</strong><span style="font-size:0.72rem;color:${parseInt(s.conf) > 85 ? '#22c55e' : '#f59e0b'}">${s.conf}</span></div>
          <div style="font-size:0.75rem;color:var(--text-secondary)">${s.impact}</div>
          <div style="font-size:0.72rem;margin-top:0.3rem;color:#6366f1;font-weight:600">→ ${s.action}</div>
        </div>`).join('')}
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
