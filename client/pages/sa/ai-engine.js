/**
 * Super Admin – AI Risk Engine Control
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('brain', 28)} AI Engine Settings</h1></div>
      <div class="sa-grid-2col">
        <div class="sa-card">
          <h3>Model Configuration</h3>
          <div class="sa-detail-grid">
            <div class="sa-detail-item"><span class="sa-detail-label">Active Model</span><span>TrustScore v3.2.1</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Last Trained</span><span>2026-02-15</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Accuracy</span><span>96.8%</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">F1 Score</span><span>0.94</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Fallback Model</span><span>TrustScore v3.1.0</span></div>
          </div>
        </div>
        <div class="sa-card">
          <h3>Threshold Configuration</h3>
          <div class="sa-threshold-list">
            ${thresholdRow('Auto-Block', 90, 'Immediately block scanning')}
            ${thresholdRow('Alert Trigger', 70, 'Send alert to Risk Officer')}
            ${thresholdRow('Watch Threshold', 50, 'Add to monitoring queue')}
            ${thresholdRow('Safe Zone', 30, 'No action needed')}
          </div>
        </div>
        <div class="sa-card">
          <h3>Auto-Lock Policy</h3>
          <div class="sa-detail-grid">
            <div class="sa-detail-item"><span class="sa-detail-label">Auto-Lock Enabled</span><span class="sa-mfa-on">Yes</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Lock After</span><span>5 consecutive alerts with score ≥ 85</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Cooldown Period</span><span>24 hours</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Notify</span><span>Tenant Admin + Platform Risk Officer</span></div>
          </div>
        </div>
        <div class="sa-card">
          <h3>Alert Sensitivity</h3>
          <div class="sa-detail-grid">
            <div class="sa-detail-item"><span class="sa-detail-label">Velocity Check</span><span>Enabled · Window: 5 min · Threshold: 100 req</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Geo Anomaly</span><span>Enabled · Distance: 500km / 30min</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">QR Duplication</span><span>Enabled · Cooldown: 10 sec</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Bot Detection</span><span>Enabled · Confidence: 85%</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function thresholdRow(label, value, desc) {
    const color = value >= 80 ? 'danger' : value >= 60 ? 'warning' : value >= 40 ? 'info' : 'low';
    return `
    <div class="sa-threshold-item">
      <div class="sa-threshold-header">
        <strong>${label}</strong>
        <span class="sa-score sa-score-${color}">${value}</span>
      </div>
      <div class="sa-threshold-desc">${desc}</div>
    </div>
  `;
}
