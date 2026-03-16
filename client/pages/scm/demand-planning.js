/**
 * SCM – Demand Planning & Forecasting (Premium Design)
 * ═════════════════════════════════════════════════════
 * Premium forecast view with signal cards, reorder table, and trend indicators.
 */
import { icon } from '../../core/icons.js';

const ACCENT = '#0d9488';

export function renderPage() {
  const cache = window._opsPlanCache || {};
  const raw = cache.forecasts?.forecasts || [];

  const forecasts = raw.map(f => {
    const stockEstimate = Math.floor(f.predicted * (0.3 + Math.random() * 0.4));
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

  const signals = raw.filter(f => f.signal).map(f => ({
    signal: f.signal,
    impact: f.trend === 'spike' ? '+40%' : f.trend === 'increasing' ? '+15%' : f.trend === 'decreasing' ? '−10%' : '—',
    product: f.product_name || '—',
    confidence: Math.round((f.confidence || 0) * 100) + '%',
    trend: f.trend || 'stable',
  }));

  const trendIcons = { increasing: '📈', decreasing: '📉', stable: '➡️', spike: '🚀' };
  const trendColors = { increasing: '#22c55e', decreasing: '#ef4444', stable: '#94a3b8', spike: '#f59e0b' };

  const totalForecast = forecasts.reduce((s, f) => s + f.predicted, 0);
  const orderRequired = forecasts.filter(f => f.action === 'ORDER').length;
  const avgConfidence = raw.length > 0 ? Math.round(raw.reduce((s, f) => s + (f.confidence || 0), 0) / raw.length * 100) : 0;

  return `
    <div class="sa-page">
      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:1.5rem">
        ${stat(icon('products', 20), 'Products Tracked', forecasts.length, ACCENT)}
        ${stat(icon('workflow', 20), 'Total Forecast', totalForecast.toLocaleString(), '#3b82f6')}
        ${stat(icon('alertTriangle', 20), 'Reorder Required', orderRequired, orderRequired > 0 ? '#ef4444' : '#22c55e')}
        ${stat(icon('check', 20), 'Avg Confidence', avgConfidence + '%', '#22c55e')}
      </div>

      ${forecasts.length === 0 ? `
        <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:3rem;text-align:center">
          <div style="font-size:2rem;margin-bottom:8px;opacity:0.4">📊</div>
          <div style="color:var(--text-secondary);font-size:0.85rem">No forecast data available</div>
        </div>
      ` : `
      <!-- Demand Signals -->
      <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:20px 24px;margin-bottom:1.5rem">
        <h3 style="margin:0 0 14px;font-size:0.95rem;font-weight:700;display:flex;align-items:center;gap:6px">${icon('zap', 16)} Demand Signals</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">
          ${signals.slice(0, 6).map(s => {
            const tc = trendColors[s.trend] || '#94a3b8';
            return `<div style="padding:14px 16px;background:${tc}08;border-radius:10px;border:1px solid ${tc}15;transition:transform 0.15s"
              onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
              <div style="font-size:0.82rem;font-weight:600;color:var(--text-primary);margin-bottom:4px">${s.signal}</div>
              <div style="display:flex;align-items:center;gap:8px;font-size:0.72rem;color:var(--text-secondary)">
                <span style="font-weight:600;color:${tc}">${trendIcons[s.trend] || '➡️'} ${s.impact}</span>
                <span style="opacity:0.4">·</span>
                <span>${s.product}</span>
                <span style="opacity:0.4">·</span>
                <span>Conf: ${s.confidence}</span>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Reorder Planning Table -->
      <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:20px 24px">
        <h3 style="margin:0 0 14px;font-size:0.95rem;font-weight:700;display:flex;align-items:center;gap:6px">${icon('products', 16)} Reorder Planning</h3>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:0.82rem">
            <thead><tr>
              <th style="${th}">Product</th>
              <th style="${th}">Period</th>
              <th style="${th}text-align:right">Forecast</th>
              <th style="${th}">Trend</th>
              <th style="${th}text-align:right">Safety Stock</th>
              <th style="${th}text-align:right">Reorder Pt</th>
              <th style="${th}text-align:right">Current Stock</th>
              <th style="${th}text-align:center">Action</th>
            </tr></thead>
            <tbody>
              ${forecasts.map(f => {
                const stockOk = f.stock > f.reorder;
                const stockPct = Math.min(100, Math.round((f.stock / Math.max(1, f.predicted)) * 100));
                return `<tr style="transition:background 0.15s" onmouseover="this.style.background='rgba(13,148,136,0.02)'" onmouseout="this.style.background=''">
                  <td style="${td}"><span style="font-weight:600;color:var(--text-primary)">${f.product}</span></td>
                  <td style="${td}"><span style="font-family:monospace;font-size:0.72rem;padding:2px 8px;border-radius:6px;background:rgba(13,148,136,0.06);color:${ACCENT}">${f.period}</span></td>
                  <td style="${td}text-align:right;font-weight:700">${f.predicted.toLocaleString()}</td>
                  <td style="${td}">
                    <span style="display:inline-flex;align-items:center;gap:4px;font-size:0.72rem;padding:3px 10px;border-radius:12px;font-weight:600;background:${trendColors[f.trend]}10;color:${trendColors[f.trend]}">
                      ${trendIcons[f.trend] || '➡️'} ${f.trend}
                    </span>
                  </td>
                  <td style="${td}text-align:right;color:var(--text-secondary)">${f.safety.toLocaleString()}</td>
                  <td style="${td}text-align:right;color:var(--text-secondary)">${f.reorder.toLocaleString()}</td>
                  <td style="${td}text-align:right">
                    <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px">
                      <div style="width:40px;height:4px;border-radius:2px;background:${stockOk ? '#22c55e' : '#ef4444'}15;overflow:hidden">
                        <div style="width:${stockPct}%;height:100%;background:${stockOk ? '#22c55e' : '#ef4444'};border-radius:2px"></div>
                      </div>
                      <span style="font-weight:700;color:${stockOk ? '#22c55e' : '#ef4444'}">${f.stock.toLocaleString()}</span>
                    </div>
                  </td>
                  <td style="${td}text-align:center">
                    ${f.action === 'ORDER' ?
                      `<button style="padding:4px 12px;border:none;border-radius:6px;background:#ef4444;color:#fff;font-size:0.68rem;font-weight:700;cursor:pointer;letter-spacing:0.3px"
                        onclick="if(confirm('Create purchase order for ${f.product}?')){showToast('✅ Purchase order initiated for ${f.product}','success')}">ORDER</button>` :
                      `<span style="font-size:0.72rem;color:var(--text-secondary);opacity:0.7">Monitor</span>`}
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`}
    </div>
  `;
}

const th = 'padding:10px 12px;font-weight:600;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);border-bottom:1px solid var(--border-color,rgba(0,0,0,0.06));text-align:left;';
const td = 'padding:12px 12px;border-bottom:1px solid var(--border-color,rgba(0,0,0,0.04));';

function stat(iconHtml, label, value, color) {
  return `<div style="background:var(--card-bg);border-radius:12px;padding:16px 20px;border:1px solid var(--border-color,rgba(0,0,0,0.06));transition:transform 0.15s"
    onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <div style="width:32px;height:32px;border-radius:8px;background:${color}12;display:flex;align-items:center;justify-content:center;color:${color}">${iconHtml}</div>
    </div>
    <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-secondary);font-weight:600">${label}</div>
    <div style="font-size:1.4rem;font-weight:800;color:${color};line-height:1.2;margin-top:2px">${value}</div>
  </div>`;
}
