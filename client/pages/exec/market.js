/**
 * Executive – Market Insights
 * ═════════════════════════════
 * Data from PostgreSQL via /owner/ccs/market
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

let _data = null;

export function renderPage() {
  if (!_data) { loadData(); return loadingState(); }
  const d = _data;
  const k = d.kpis;
  return `
    <div class="exec-page" style="font-feature-settings:'tnum'">
      <div class="exec-header">
        <h1>${icon('globe', 28)} Market Insights</h1>
        <div class="exec-timestamp">Market intelligence · 30-day window · ${k.total_scans_30d.toLocaleString()} scans</div>
      </div>

      <!-- Key Market Metrics -->
      <section class="exec-section">
        <h2 class="exec-section-title" style="letter-spacing:0.025em">Key Market Metrics</h2>
        <div class="exec-kpi-grid" style="grid-template-columns: 1fr 1fr 1.4fr 1fr">
          ${kpi('First Scan Ratio', k.first_scan_ratio + '%', true, null)}
          ${kpi('Repeat Scan Rate', k.repeat_scan_rate + '%', k.repeat_scan_rate < 20, null)}
          ${kpi('Channel Compliance', k.channel_compliance + '%', k.channel_compliance > 80, null)}
          ${kpi('Gray Market Risk', k.gray_market_index.toFixed(2), k.gray_market_index < 0.2, k.gray_market_index === 0 ? 'No threats detected' : null)}
        </div>
      </section>

      <!-- Channel Analysis -->
      <section class="exec-section">
        <h2 class="exec-section-title" style="letter-spacing:0.025em">${icon('network', 20)} Channel Analysis</h2>
        <div class="exec-grid-2">
          <div class="exec-card">
            <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:1.5rem">Channel Performance <span style="font-weight:400;opacity:0.5;font-size:0.85rem">(${d.channels.length} types)</span></h3>
            ${d.channels.length > 0
      ? d.channels.map(c => channelRow(c.name, c.compliance, c.partners, c.compliance >= 80 ? 'healthy' : c.compliance >= 50 ? 'warning' : 'risk')).join('')
      : '<div style="color:var(--text-secondary);font-size:0.82rem;padding:1rem 0">No partner channels configured</div>'}
          </div>
          <div class="exec-card">
            <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:1.5rem">Market Penetration <span style="font-weight:400;opacity:0.5;font-size:0.85rem">(${d.regions.length} countries)</span></h3>
            ${d.regions.length > 0
      ? d.regions.map(r => regionRow(r.country, r.auth_rate, r.scans)).join('')
      : '<div style="color:var(--text-secondary);font-size:0.82rem;padding:1rem 0">No scan data by region</div>'}
          </div>
        </div>
      </section>

      <!-- Gray Market Detection -->
      <section class="exec-section">
        <h2 class="exec-section-title" style="letter-spacing:0.025em">${icon('search', 20)} Gray Market Detection</h2>
        <div class="exec-card">
          <div class="exec-grid-3">
            <div class="exec-detection-item">
              <div class="exec-detection-icon" style="color:#f59e0b">${icon('alert', 24)}</div>
              <div class="exec-detection-label" style="letter-spacing:0.02em">Unauthorised Alerts</div>
              <div class="exec-detection-value">${d.gray_market.total_alerts}</div>
              <div class="exec-detection-detail">Active leak alerts</div>
            </div>
            <div class="exec-detection-item">
              <div class="exec-detection-icon" style="color:#22c55e">${icon('check', 24)}</div>
              <div class="exec-detection-label" style="letter-spacing:0.02em">Verified Partners</div>
              <div class="exec-detection-value">${d.gray_market.partners_verified} / ${d.gray_market.partners_total}</div>
              <div class="exec-detection-detail">${d.gray_market.partners_total > 0 ? Math.round(100 * d.gray_market.partners_verified / d.gray_market.partners_total) : 0}% KYC verified</div>
            </div>
            <div class="exec-detection-item">
              <div class="exec-detection-icon" style="color:#ef4444">${icon('target', 24)}</div>
              <div class="exec-detection-label" style="letter-spacing:0.02em">High Risk Partners</div>
              <div class="exec-detection-value">${d.gray_market.partners_high_risk}</div>
              <div class="exec-detection-detail">Partners flagged high risk</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}

async function loadData() {
  try {
    const r = await api.get('/tenant/owner/ccs/market');
    _data = r;
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
  } catch (e) { console.error('[Market]', e); }
}

function loadingState() {
  return `<div class="exec-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading market intelligence...</div></div></div>`;
}

function kpi(label, value, isGood, note) {
  return `
    <div class="exec-kpi-card">
      <div class="exec-kpi-value" style="font-feature-settings:'tnum'">${value}</div>
      <div class="exec-kpi-label" style="letter-spacing:0.025em">${label}</div>
      <div class="exec-kpi-change ${isGood ? 'exec-change-good' : 'exec-change-bad'}">${isGood ? '✓ Good' : '⚠ Alert'}</div>
      ${note ? `<div style="font-size:0.65rem;opacity:0.45;margin-top:0.25rem">${note}</div>` : ''}
    </div>`;
}

function channelRow(name, compliance, count, status) {
  const color = status === 'healthy' ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#ef4444';
  return `
    <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 0;border-bottom:1px solid var(--border-color, rgba(255,255,255,0.04))">
      <div style="flex:1;font-size:1rem;font-weight:500;text-transform:capitalize">${name}</div>
      <div style="width:120px">
        <div class="exec-score-bar" style="background:${color}15"><div class="exec-score-fill" style="width:${compliance}%;background:${color}"></div></div>
      </div>
      <div style="width:44px;text-align:right;font-weight:600;font-size:0.88rem;font-feature-settings:'tnum'">${compliance}%</div>
      <div style="width:70px;text-align:right;color:var(--text-secondary);font-size:0.78rem;letter-spacing:0.02em">${count} partners</div>
    </div>`;
}

function regionRow(name, authRate, scans) {
  return `
    <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 0;border-bottom:1px solid var(--border-color, rgba(255,255,255,0.04))">
      <div style="flex:1;font-size:1rem;font-weight:500">${name}</div>
      <div style="width:120px">
        <div class="exec-score-bar" style="background:rgba(99,102,241,0.12)"><div class="exec-score-fill" style="width:${authRate}%;background:#6366f1"></div></div>
      </div>
      <div style="width:44px;text-align:right;font-weight:600;font-size:0.88rem;font-feature-settings:'tnum'">${authRate}%</div>
      <div style="width:65px;text-align:right;color:var(--text-secondary);font-size:0.82rem;letter-spacing:0.02em">${scans.toLocaleString()} scans</div>
    </div>`;
}

// Window handlers
window.refreshMarketInsights = function () {
  _data = null;
  const el = document.getElementById('main-content');
  if (el) el.innerHTML = renderPage();
};
