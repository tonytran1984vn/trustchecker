/**
 * Risk – Risk Dashboard (Landing)
 * KRI metrics + risk heatmap + trend
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('shield', 28)} Risk Dashboard</h1>
        <div class="sa-title-actions">
          <span style="font-size:0.75rem;color:var(--text-secondary)">Last updated: ${new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <!-- Key Risk Indicators -->
      <section class="sa-section">
        <h2 class="sa-section-title">Key Risk Indicators (KRI)</h2>
        <div class="sa-metrics-row">
          ${kri('Fraud Alerts (7d)', '47', '+12% vs last week', 'orange', 'alertTriangle')}
          ${kri('High Risk Events', '8', '3 critical', 'red', 'alert')}
          ${kri('Duplicate QR Rate', '0.34%', '↑ from 0.28%', 'orange', 'shield')}
          ${kri('Geo Anomalies', '15', '5 new today', 'red', 'globe')}
          ${kri('Velocity Spikes', '3', 'Bangkok region', 'orange', 'zap')}
          ${kri('Avg Risk Score', '34/100', 'Medium risk', 'blue', 'dashboard')}
        </div>
      </section>

      <!-- Risk Heatmap + Trend side by side -->
      <div class="sa-grid-2col">
        <div class="sa-card">
          <h3>${icon('globe', 16)} Risk Heatmap by Region</h3>
          ${heatZone('Bangkok, Thailand', 78, 'critical')}
          ${heatZone('Phnom Penh, Cambodia', 62, 'high')}
          ${heatZone('HCM City, Vietnam', 41, 'medium')}
          ${heatZone('Singapore', 18, 'low')}
          ${heatZone('Hanoi, Vietnam', 12, 'low')}
        </div>

        <div class="sa-card">
          <h3>${icon('workflow', 16)} Risk Trend (30 days)</h3>
          ${trendRow('Fraud events', '47', '+12%', 'up', '▃▄▅▆▆▇▇▇')}
          ${trendRow('Anomaly score', '34', '+6 pts', 'up', '▂▃▃▄▅▅▆▆')}
          ${trendRow('Duplicate rate', '0.34%', '+0.06', 'up', '▃▃▃▃▄▄▅▅')}
          ${trendRow('Repeat offenders', '4', 'stable', 'flat', '▃▃▃▃▃▃▃▃')}
        </div>
      </div>

      <!-- Top Risk by SKU -->
      <section class="sa-section" style="margin-top:1.5rem">
        <h2 class="sa-section-title">Risk Score by Product Line</h2>
        <div class="sa-card">
          <table class="sa-table">
            <thead><tr><th>Product / SKU</th><th>Risk Score</th><th>Fraud Events</th><th>Anomalies</th><th>Trend</th></tr></thead>
            <tbody>
              <tr><td>COFFEE-PRE-250</td><td><span class="sa-score sa-score-danger">72 / High</span></td><td>18</td><td>7</td><td style="color:#ef4444">↑ rising</td></tr>
              <tr><td>TEA-ORG-100</td><td><span class="sa-score sa-score-warning">45 / Medium</span></td><td>8</td><td>4</td><td style="color:#f59e0b">→ stable</td></tr>
              <tr><td>OIL-COC-500</td><td><span class="sa-score sa-score-low">22 / Low</span></td><td>3</td><td>1</td><td style="color:#22c55e">↓ declining</td></tr>
              <tr><td>SAUCE-FS-350</td><td><span class="sa-score sa-score-low">15 / Low</span></td><td>1</td><td>0</td><td style="color:#22c55e">↓ declining</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function kri(label, value, sub, color, iconName) {
    return `<div class="sa-metric-card sa-metric-${color}"><div class="sa-metric-icon">${icon(iconName, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${value}</div><div class="sa-metric-label">${label}</div><div class="sa-metric-sub">${sub}</div></div></div>`;
}

function heatZone(region, score, level) {
    const c = level === 'critical' ? '#ef4444' : level === 'high' ? '#f59e0b' : level === 'medium' ? '#3b82f6' : '#22c55e';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span>${region}</span><div style="display:flex;align-items:center;gap:0.5rem"><div style="width:80px;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden"><div style="width:${score}%;height:100%;background:${c};border-radius:3px"></div></div><span style="font-weight:700;color:${c};font-size:0.8rem;width:30px;text-align:right">${score}</span></div></div>`;
}

function trendRow(label, value, change, dir, spark) {
    const c = dir === 'up' ? '#ef4444' : dir === 'flat' ? '#f59e0b' : '#22c55e';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-size:0.82rem">${label}</span><div style="display:flex;align-items:center;gap:1rem"><span style="font-size:0.8rem;letter-spacing:1px;color:rgba(99,102,241,0.5)">${spark}</span><span style="font-weight:700;font-size:0.85rem">${value}</span><span style="font-size:0.72rem;color:${c}">${change}</span></div></div>`;
}
