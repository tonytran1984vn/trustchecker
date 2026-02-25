/**
 * Executive – Performance & Financial Impact
 * ════════════════════════════════════════════
 * Data from PostgreSQL via /owner/ccs/performance
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

let _data = null;

export function renderPage() {
  if (!_data) { loadData(); return loadingState(); }
  const d = _data;
  const fi = d.financial_impact;
  const sv = d.savings;
  const pf = d.performance;

  return `
    <div class="exec-page">
      <div class="exec-header">
        <h1>${icon('barChart', 28)} Performance</h1>
        <div class="exec-timestamp">Financial impact & ROI analysis · ${d.investment.total_scans_ytd} scans YTD</div>
      </div>

      <!-- Financial Impact -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('creditCard', 20)} Financial Impact (YTD)</h2>
        <div class="exec-kpi-grid" style="grid-template-columns: repeat(4, 1fr)">
          ${kpi('Estimated Fraud Loss', fmtMoney(fi.estimated_fraud_loss), fi.estimated_fraud_loss < 100000, 'alert')}
          ${kpi('Revenue Protected', fmtMoney(fi.revenue_protected), true, 'shield')}
          ${kpi('System ROI', fi.system_roi > 0 ? (fi.system_roi * 100).toFixed(0) + '%' : 'N/A', fi.system_roi > 1, 'barChart')}
          ${kpi('Cost per Verification', fi.cost_per_verification > 0 ? '$' + fi.cost_per_verification.toFixed(3) : 'N/A', true, 'zap')}
        </div>
      </section>

      <!-- ROI Breakdown -->
      <section class="exec-section">
        <h2 class="exec-section-title">ROI Breakdown</h2>
        <div class="exec-grid-2">
          <div class="exec-card">
            <h3>Cost Savings</h3>
            <div class="exec-finance-list">
              ${financeRow('Counterfeit Prevention', fmtMoney(sv.counterfeit_prevention), 'savings')}
              ${financeRow('Recall Cost Reduction', fmtMoney(sv.recall_reduction), 'savings')}
              ${financeRow('Manual Audit Elimination', fmtMoney(sv.audit_elimination), 'savings')}
            </div>
            <div class="exec-finance-total">
              <strong>Total Savings</strong>
              <strong style="color:#22c55e">${fmtMoney(sv.total)}</strong>
            </div>
          </div>
          <div class="exec-card">
            <h3>System Investment</h3>
            <div class="exec-finance-list">
              ${financeRow('Platform License', fmtMoney(d.investment.platform_cost) + '/yr', 'cost')}
            </div>
            <div class="exec-finance-total">
              <strong>Total Investment</strong>
              <strong style="color:#f59e0b">${fmtMoney(d.investment.platform_cost)}</strong>
            </div>
          </div>
        </div>
      </section>

      <!-- Performance Trends -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('zap', 20)} Performance Trends</h2>
        <div class="exec-grid-3">
          <div class="exec-card" style="text-align:center">
            <h3>Verification Speed</h3>
            <div class="exec-big-number">${pf.avg_speed_ms > 0 ? (pf.avg_speed_ms / 1000).toFixed(1) + 's' : 'N/A'}</div>
            <div class="exec-big-sub">Avg scan-to-result${pf.p95_speed_ms > 0 ? ' · P95: ' + (pf.p95_speed_ms / 1000).toFixed(1) + 's' : ''}</div>
          </div>
          <div class="exec-card" style="text-align:center">
            <h3>System Uptime</h3>
            <div class="exec-big-number">${pf.uptime_pct}%</div>
            <div class="exec-big-sub">30-day rolling</div>
          </div>
          <div class="exec-card" style="text-align:center">
            <h3>Fraud Resolution</h3>
            <div class="exec-big-number">${d.fraud.resolution_rate}%</div>
            <div class="exec-big-sub">${d.fraud.resolved} / ${d.fraud.total_alerts} alerts resolved</div>
          </div>
        </div>
      </section>
    </div>
  `;
}

async function loadData() {
  try {
    const r = await api.get('/tenant/owner/ccs/performance');
    _data = r;
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
  } catch (e) { console.error('[Performance]', e); }
}

function loadingState() {
  return `<div class="exec-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading performance metrics...</div></div></div>`;
}

function fmtMoney(v) {
  if (!v || v === 0) return '$0';
  if (v >= 1000000) return '$' + (v / 1000000).toFixed(2) + 'M';
  if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
}

function kpi(label, value, isGood, iconName) {
  return `
    <div class="exec-kpi-card">
      <div class="exec-kpi-icon">${icon(iconName, 20)}</div>
      <div class="exec-kpi-value">${value}</div>
      <div class="exec-kpi-label">${label}</div>
    </div>`;
}

function financeRow(label, amount, type) {
  return `
    <div class="exec-finance-row">
      <span>${label}</span>
      <span style="font-weight:600;color:${type === 'savings' ? '#22c55e' : '#f59e0b'}">${amount}</span>
    </div>`;
}
