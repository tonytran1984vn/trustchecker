/**
 * Executive – Risk Intelligence (Strategic View)
 * ═══════════════════════════════════════════════
 * Risk Heatmap, Top 5 zones, Product line comparison, AI Forecast
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="exec-page">
      <div class="exec-header">
        <h1>${icon('target', 28)} Risk Intelligence</h1>
        <div class="exec-timestamp">Strategic risk assessment · Real-time</div>
      </div>

      <!-- Supply Chain Integrity Score -->
      <section class="exec-section">
        <div class="exec-integrity-card">
          <div class="exec-integrity-score">
            <div class="exec-score-circle">
              <div class="exec-score-value">84</div>
              <div class="exec-score-label">/ 100</div>
            </div>
            <div class="exec-score-meta">
              <h3>Supply Chain Integrity Score</h3>
              <div class="exec-score-breakdown">
                ${scoreLine('Traceability Completeness', 91)}
                ${scoreLine('Duplicate Rate', 96)}
                ${scoreLine('Scan Authenticity', 78)}
                ${scoreLine('Distribution Compliance', 72)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Risk Heatmap -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('globe', 20)} Risk Heatmap by Region</h2>
        <div class="exec-grid-2">
          <div class="exec-card">
            <h3>Top 5 High-Risk Zones</h3>
            <div class="exec-risk-zones">
              ${riskZone('Phnom Penh, Cambodia', 'HIGH', 87, 'Gray market signals, scan anomalies')}
              ${riskZone('Vientiane, Laos', 'HIGH', 74, 'Counterfeit reports, low traceability')}
              ${riskZone('Bangkok East, Thailand', 'MEDIUM', 61, 'Duplicate QR detections')}
              ${riskZone('Yangon, Myanmar', 'MEDIUM', 58, 'Distribution gap, low scan rate')}
              ${riskZone('Manila, Philippines', 'LOW', 42, 'Minor velocity anomalies')}
            </div>
          </div>
          <div class="exec-card">
            <h3>Product Line Risk Comparison</h3>
            <div class="exec-risk-zones">
              ${productRisk('Premium Coffee', 12, 'low')}
              ${productRisk('Green Tea Organic', 28, 'low')}
              ${productRisk('Coconut Oil', 45, 'medium')}
              ${productRisk('Fish Sauce', 78, 'high')}
              ${productRisk('Rice Noodle', 15, 'low')}
            </div>
          </div>
        </div>
      </section>

      <!-- AI Forecast -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('brain', 20)} AI Risk Forecast (Next 30 Days)</h2>
        <div class="exec-grid-3">
          <div class="exec-forecast-card">
            <div class="exec-forecast-label">Fraud Probability</div>
            <div class="exec-forecast-value exec-trend-warn">18%</div>
            <div class="exec-forecast-detail">Moderate — seasonal spike expected</div>
          </div>
          <div class="exec-forecast-card">
            <div class="exec-forecast-label">Counterfeit Risk</div>
            <div class="exec-forecast-value exec-trend-good">Low</div>
            <div class="exec-forecast-detail">No emerging patterns detected</div>
          </div>
          <div class="exec-forecast-card">
            <div class="exec-forecast-label">Distribution Leak</div>
            <div class="exec-forecast-value exec-trend-warn">2 channels</div>
            <div class="exec-forecast-detail">Cambodia, Laos require monitoring</div>
          </div>
        </div>
      </section>
    </div>
  `;
}

function scoreLine(label, score) {
    const color = score >= 85 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444';
    return `
    <div class="exec-score-line">
      <span>${label}</span>
      <div class="exec-score-bar"><div class="exec-score-fill" style="width:${score}%;background:${color}"></div></div>
      <span class="exec-score-num">${score}%</span>
    </div>
  `;
}

function riskZone(name, level, score, detail) {
    const cls = level === 'HIGH' ? 'exec-risk-high' : level === 'MEDIUM' ? 'exec-risk-medium' : 'exec-risk-low';
    return `
    <div class="exec-risk-zone ${cls}">
      <div class="exec-risk-zone-header">
        <strong>${name}</strong>
        <span class="exec-risk-badge ${cls}">${level} · ${score}</span>
      </div>
      <div class="exec-risk-zone-detail">${detail}</div>
    </div>
  `;
}

function productRisk(name, score, level) {
    const barColor = level === 'high' ? '#ef4444' : level === 'medium' ? '#f59e0b' : '#22c55e';
    return `
    <div class="exec-product-risk">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span>${name}</span>
        <span style="font-weight:600;font-size:0.82rem">${score}</span>
      </div>
      <div class="exec-score-bar"><div class="exec-score-fill" style="width:${score}%;background:${barColor}"></div></div>
    </div>
  `;
}
