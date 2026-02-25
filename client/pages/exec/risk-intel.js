/**
 * Executive – Risk Intelligence (Strategic View)
 * ═══════════════════════════════════════════════
 * Data from PostgreSQL via /owner/ccs/risk-intel
 */
import { icon } from '../../core/icons.js';
import { api } from '../../core/api.js';

let _data = null;

export function renderPage() {
  if (!_data) { loadData(); return loadingState(); }
  const d = _data;
  const is = d.integrity_score;
  const fc = d.forecast;

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
              <div class="exec-score-value">${is.overall}</div>
              <div class="exec-score-label">/ 100</div>
            </div>
            <div class="exec-score-meta">
              <h3>Supply Chain Integrity Score</h3>
              <div class="exec-score-breakdown">
                ${scoreLine('Traceability Completeness', is.traceability)}
                ${scoreLine('Duplicate Rate', is.duplicate_rate)}
                ${scoreLine('Scan Authenticity', is.scan_authenticity)}
                ${scoreLine('Distribution Compliance', is.distribution_compliance)}
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
            <h3>Top Risk Zones (${d.risk_heatmap.length} regions)</h3>
            <div class="exec-risk-zones">
              ${d.risk_heatmap.length > 0
      ? d.risk_heatmap.map(z => riskZone(z.name, z.level, z.score, z.detail)).join('')
      : '<div style="color:var(--text-secondary);font-size:0.82rem;padding:1rem 0">No risk zones detected</div>'}
            </div>
          </div>
          <div class="exec-card">
            <h3>Product Line Risk (${d.product_risk.length} products)</h3>
            <div class="exec-risk-zones">
              ${d.product_risk.length > 0
      ? d.product_risk.map(p => productRisk(p.name, p.score, p.level)).join('')
      : '<div style="color:var(--text-secondary);font-size:0.82rem;padding:1rem 0">No product risk data</div>'}
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
            <div class="exec-forecast-value ${fc.fraud_probability === 'Low' ? 'exec-trend-good' : 'exec-trend-warn'}">${fc.fraud_pct}%</div>
            <div class="exec-forecast-detail">${fc.fraud_probability} risk level</div>
          </div>
          <div class="exec-forecast-card">
            <div class="exec-forecast-label">Counterfeit Risk</div>
            <div class="exec-forecast-value ${fc.counterfeit_risk === 'Low' ? 'exec-trend-good' : 'exec-trend-warn'}">${fc.counterfeit_risk}</div>
            <div class="exec-forecast-detail">${fc.counterfeit_risk === 'Low' ? 'No emerging patterns' : 'Patterns detected — monitor'}</div>
          </div>
          <div class="exec-forecast-card">
            <div class="exec-forecast-label">Open Anomalies</div>
            <div class="exec-forecast-value ${fc.open_anomalies === 0 ? 'exec-trend-good' : 'exec-trend-warn'}">${fc.open_anomalies}</div>
            <div class="exec-forecast-detail">${fc.open_anomalies === 0 ? 'All clear' : 'Require investigation'}</div>
          </div>
        </div>
      </section>
    </div>
  `;
}

async function loadData() {
  try {
    const r = await api.get('/tenant/owner/ccs/risk-intel');
    _data = r;
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
  } catch (e) { console.error('[RiskIntel]', e); }
}

function loadingState() {
  return `<div class="exec-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading risk intelligence...</div></div></div>`;
}

function scoreLine(label, score) {
  const color = score >= 85 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444';
  return `
    <div class="exec-score-line">
      <span>${label}</span>
      <div class="exec-score-bar"><div class="exec-score-fill" style="width:${score}%;background:${color}"></div></div>
      <span class="exec-score-num">${score}%</span>
    </div>`;
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
    </div>`;
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
    </div>`;
}
