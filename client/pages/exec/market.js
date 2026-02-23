/**
 * Executive – Market Insights
 * ═════════════════════════════
 * First scan ratio, channel leak, gray market, market intelligence
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="exec-page">
      <div class="exec-header">
        <h1>${icon('globe', 28)} Market Insights</h1>
        <div class="exec-timestamp">Market intelligence · 30-day window</div>
      </div>

      <!-- Key Market Metrics -->
      <section class="exec-section">
        <h2 class="exec-section-title">Key Market Metrics</h2>
        <div class="exec-kpi-grid" style="grid-template-columns: repeat(4, 1fr)">
          ${kpi('First Scan Ratio', '78.3%', '+3.2%', true)}
          ${kpi('Repeat Scan Rate', '12.4%', '−1.8%', true)}
          ${kpi('Channel Compliance', '91.2%', '+2.1%', true)}
          ${kpi('Gray Market Index', '0.08', '−0.02', true)}
        </div>
      </section>

      <!-- Channel Analysis -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('network', 20)} Channel Analysis</h2>
        <div class="exec-grid-2">
          <div class="exec-card">
            <h3>Channel Performance</h3>
            ${channelRow('Direct Retail', 89, 42, 'healthy')}
            ${channelRow('Distributor Network', 92, 35, 'healthy')}
            ${channelRow('Online Marketplace', 71, 15, 'warning')}
            ${channelRow('Cross-Border', 54, 8, 'risk')}
          </div>
          <div class="exec-card">
            <h3>Market Penetration by Region</h3>
            ${regionRow('Vietnam', 94, '🇻🇳')}
            ${regionRow('Singapore', 87, '🇸🇬')}
            ${regionRow('Thailand', 72, '🇹🇭')}
            ${regionRow('Japan', 41, '🇯🇵')}
            ${regionRow('Cambodia', 23, '🇰🇭')}
          </div>
        </div>
      </section>

      <!-- Gray Market Detection -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('search', 20)} Gray Market Detection</h2>
        <div class="exec-card">
          <div class="exec-grid-3">
            <div class="exec-detection-item">
              <div class="exec-detection-icon" style="color:#f59e0b">${icon('alert', 24)}</div>
              <div class="exec-detection-label">Unauthorized Channels</div>
              <div class="exec-detection-value">2 detected</div>
              <div class="exec-detection-detail">Cambodia border, Laos online</div>
            </div>
            <div class="exec-detection-item">
              <div class="exec-detection-icon" style="color:#22c55e">${icon('check', 24)}</div>
              <div class="exec-detection-label">Verified Channels</div>
              <div class="exec-detection-value">47 / 49</div>
              <div class="exec-detection-detail">95.9% channel integrity</div>
            </div>
            <div class="exec-detection-item">
              <div class="exec-detection-icon" style="color:#3b82f6">${icon('target', 24)}</div>
              <div class="exec-detection-label">Price Anomaly</div>
              <div class="exec-detection-value">3 SKUs</div>
              <div class="exec-detection-detail">Below floor price in gray channels</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}

function kpi(label, value, change, isGood) {
    return `
    <div class="exec-kpi-card">
      <div class="exec-kpi-value">${value}</div>
      <div class="exec-kpi-label">${label}</div>
      <div class="exec-kpi-change ${isGood ? 'exec-change-good' : 'exec-change-bad'}">${change}</div>
    </div>
  `;
}

function channelRow(name, compliance, share, status) {
    const color = status === 'healthy' ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#ef4444';
    return `
    <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
      <div style="flex:1"><strong>${name}</strong></div>
      <div style="width:120px">
        <div class="exec-score-bar"><div class="exec-score-fill" style="width:${compliance}%;background:${color}"></div></div>
      </div>
      <div style="width:40px;text-align:right;font-weight:600;font-size:0.82rem">${compliance}%</div>
      <div style="width:50px;text-align:right;color:var(--text-secondary);font-size:0.75rem">${share}% share</div>
    </div>
  `;
}

function regionRow(name, penetration, flag) {
    return `
    <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
      <span style="font-size:1.2rem">${flag}</span>
      <div style="flex:1"><strong>${name}</strong></div>
      <div style="width:120px">
        <div class="exec-score-bar"><div class="exec-score-fill" style="width:${penetration}%;background:#6366f1"></div></div>
      </div>
      <div style="width:40px;text-align:right;font-weight:600;font-size:0.82rem">${penetration}%</div>
    </div>
  `;
}
