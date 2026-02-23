/**
 * TrustChecker – Scm Inventory Page
 */
import { State, render } from '../../core/state.js';

export function renderPage() {
  const inv = State.scmInventory;
  const fc = State.scmForecast;
  if (!inv) return '<div class="loading"><div class="spinner"></div></div>';
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

