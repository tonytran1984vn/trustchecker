/**
 * Executive – Performance & Financial Impact
 * ════════════════════════════════════════════
 * Fraud loss, Revenue protected, ROI, Cost per verification
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="exec-page">
      <div class="exec-header">
        <h1>${icon('barChart', 28)} Performance</h1>
        <div class="exec-timestamp">Financial impact & ROI analysis</div>
      </div>

      <!-- Financial Impact -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('creditCard', 20)} Financial Impact (YTD)</h2>
        <div class="exec-kpi-grid" style="grid-template-columns: repeat(4, 1fr)">
          ${kpi('Estimated Fraud Loss', '$48.2K', '−62% vs prev year', true, 'alert')}
          ${kpi('Revenue Protected', '$2.41M', '+18% vs prev year', true, 'shield')}
          ${kpi('System ROI', '4,900%', '+820% vs year 1', true, 'barChart')}
          ${kpi('Cost per Verification', '$0.003', '−45% vs launch', true, 'zap')}
        </div>
      </section>

      <!-- ROI Breakdown -->
      <section class="exec-section">
        <h2 class="exec-section-title">ROI Breakdown</h2>
        <div class="exec-grid-2">
          <div class="exec-card">
            <h3>Cost Savings</h3>
            <div class="exec-finance-list">
              ${financeRow('Counterfeit Prevention', '$1.82M', 'savings')}
              ${financeRow('Recall Cost Reduction', '$340K', 'savings')}
              ${financeRow('Manual Audit Elimination', '$180K', 'savings')}
              ${financeRow('Insurance Premium Reduction', '$90K', 'savings')}
            </div>
            <div class="exec-finance-total">
              <strong>Total Savings</strong>
              <strong style="color:#22c55e">$2.43M</strong>
            </div>
          </div>
          <div class="exec-card">
            <h3>System Investment</h3>
            <div class="exec-finance-list">
              ${financeRow('Platform License', '$48K/yr', 'cost')}
              ${financeRow('Integration & Setup', '$12K (one-time)', 'cost')}
              ${financeRow('Training & Onboarding', '$5K', 'cost')}
              ${financeRow('QR Label Cost', '$8.4K', 'cost')}
            </div>
            <div class="exec-finance-total">
              <strong>Total Investment</strong>
              <strong style="color:#f59e0b">$73.4K</strong>
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
            <div class="exec-big-number">1.2s</div>
            <div class="exec-big-sub">Avg scan-to-result · P95: 2.8s</div>
          </div>
          <div class="exec-card" style="text-align:center">
            <h3>System Uptime</h3>
            <div class="exec-big-number">99.97%</div>
            <div class="exec-big-sub">30-day rolling · 13 min downtime</div>
          </div>
          <div class="exec-card" style="text-align:center">
            <h3>Customer Satisfaction</h3>
            <div class="exec-big-number">4.7★</div>
            <div class="exec-big-sub">Based on 892 scan feedbacks</div>
          </div>
        </div>
      </section>
    </div>
  `;
}

function kpi(label, value, change, isGood, iconName) {
    return `
    <div class="exec-kpi-card">
      <div class="exec-kpi-icon">${icon(iconName, 20)}</div>
      <div class="exec-kpi-value">${value}</div>
      <div class="exec-kpi-label">${label}</div>
      <div class="exec-kpi-change ${isGood ? 'exec-change-good' : 'exec-change-bad'}">${change}</div>
    </div>
  `;
}

function financeRow(label, amount, type) {
    return `
    <div class="exec-finance-row">
      <span>${label}</span>
      <span style="font-weight:600;color:${type === 'savings' ? '#22c55e' : '#f59e0b'}">${amount}</span>
    </div>
  `;
}
