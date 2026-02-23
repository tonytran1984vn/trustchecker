/**
 * CEO Trust Report — Brand Protection Strength Dashboard
 * Shows seal coverage, chain integrity, tamper detection, brand protection score
 */
import { icon } from '../../core/icons.js';

const SAMPLE_REPORT = {
    integrity: { chain_intact: true, total_seals: 847, tamper_attempts_detected: 0, status: '<span class="status-dot green"></span> INTACT' },
    seal_coverage: { material_events_total: 312, events_sealed: 298, coverage_pct: '95.5%', grade: 'A' },
    by_category: {
        fraud_alerts: { total: 156, sealed: 152 },
        route_breaches: { total: 89, sealed: 84 },
        evidence_packages: { total: 42, sealed: 41 },
        model_deploys: { sealed: 21 }
    },
    brand_protection_score: 92,
    recommendation: 'Data integrity posture is strong. All material risk events are sealed.'
};

export function renderPage() {
    const r = SAMPLE_REPORT;
    const score = r.brand_protection_score;
    const scoreColor = score >= 80 ? 'green' : score >= 60 ? 'amber' : 'red';
    const gradeColors = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#ef4444', F: '#dc2626' };

    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('shield', 28)} Brand Protection Strength Report</h1>
        <div class="sa-title-actions">
          <button class="btn btn-outline btn-sm" onclick="window.refreshTrustReport()">↻ Refresh</button>
          <button class="btn btn-primary btn-sm" style="margin-left:0.5rem" onclick="window.exportTrustReport()">📥 Export PDF</button>
        </div>
      </div>

      <!-- Brand Protection Score (Hero) -->
      <div style="display:grid;grid-template-columns:1fr 2fr;gap:1.5rem;margin-bottom:1.5rem">
        <div class="sa-card" style="text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem">
          <div style="position:relative;width:140px;height:140px;margin-bottom:1rem">
            <svg viewBox="0 0 140 140" style="transform:rotate(-90deg)">
              <circle cx="70" cy="70" r="60" fill="none" stroke="var(--border)" stroke-width="10"/>
              <circle cx="70" cy="70" r="60" fill="none" stroke="var(--${scoreColor})" stroke-width="10"
                stroke-dasharray="${score * 3.77} 377" stroke-linecap="round"/>
            </svg>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center">
              <div style="font-size:2.5rem;font-weight:800;color:var(--${scoreColor})">${score}</div>
              <div style="font-size:0.7rem;color:var(--text-secondary)">/ 100</div>
            </div>
          </div>
          <div style="font-size:1.1rem;font-weight:700;margin-bottom:0.25rem">Brand Protection Score</div>
          <div style="font-size:0.75rem;color:var(--text-secondary)">Higher = stronger data integrity posture</div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="sa-card" style="padding:1.25rem">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem">
              <span style="font-size:1.5rem">${r.integrity.chain_intact ? '<span class="status-dot green"></span>' : '<span class="status-dot red"></span>'}</span>
              <div>
                <div style="font-weight:700;font-size:0.9rem">Chain Integrity</div>
                <div style="font-size:0.72rem;color:var(--text-secondary)">${r.integrity.chain_intact ? 'No tampering detected' : 'TAMPER DETECTED'}</div>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.78rem">
              <span>Total Seals</span><strong>${r.integrity.total_seals.toLocaleString()}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-top:0.25rem">
              <span>Tamper Attempts</span><strong style="color:${r.integrity.tamper_attempts_detected > 0 ? 'var(--red)' : 'var(--green)'}">${r.integrity.tamper_attempts_detected}</strong>
            </div>
          </div>

          <div class="sa-card" style="padding:1.25rem">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem">
              <span style="font-size:1.5rem;font-weight:800;color:${gradeColors[r.seal_coverage.grade]}">${r.seal_coverage.grade}</span>
              <div>
                <div style="font-weight:700;font-size:0.9rem">Seal Coverage</div>
                <div style="font-size:0.72rem;color:var(--text-secondary)">${r.seal_coverage.coverage_pct} of material events</div>
              </div>
            </div>
            <div style="background:var(--surface-elevated);border-radius:8px;height:10px;overflow:hidden;margin-bottom:0.5rem">
              <div style="height:100%;width:${r.seal_coverage.coverage_pct};background:${gradeColors[r.seal_coverage.grade]};border-radius:8px;transition:width 1s ease"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text-secondary)">
              <span>${r.seal_coverage.events_sealed} sealed</span>
              <span>${r.seal_coverage.material_events_total} total events</span>
            </div>
          </div>

          <div class="sa-card" style="padding:1.25rem;grid-column:span 2">
            <div style="font-weight:700;font-size:0.85rem;margin-bottom:0.5rem">💡 Recommendation</div>
            <div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.5;padding:0.75rem;background:var(--surface-elevated);border-radius:8px;border-left:3px solid var(--${scoreColor})">${r.recommendation}</div>
          </div>
        </div>
      </div>

      <!-- Seal Coverage by Category -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📊 Seal Coverage by Category</h3>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:1rem">Only material risk events are sealed. Normal scan events are excluded by policy.</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem">
          ${catCard('🚨', 'Fraud Alerts', r.by_category.fraud_alerts.sealed, r.by_category.fraud_alerts.total, 'red')}
          ${catCard('<span class="status-icon status-warn" aria-label="Warning">!</span>', 'Route Breaches', r.by_category.route_breaches.sealed, r.by_category.route_breaches.total, 'amber')}
          ${catCard('📋', 'Evidence Packages', r.by_category.evidence_packages.sealed, r.by_category.evidence_packages.total, 'blue')}
          ${catCard('🤖', 'Model Deploys', r.by_category.model_deploys.sealed, r.by_category.model_deploys.sealed, 'purple')}
        </div>
      </div>

      <!-- Trust Score Factors -->
      <div class="sa-card">
        <h3>🏗 Score Composition</h3>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:1rem">How the Brand Protection Score is calculated</p>
        <table class="sa-table">
          <thead><tr><th>Factor</th><th>Weight</th><th>Condition</th><th>Score</th><th>Status</th></tr></thead>
          <tbody>
            <tr>
              <td><strong>Chain Integrity</strong></td>
              <td>40 pts</td>
              <td>Hash chain intact, no tamper detected</td>
              <td style="font-weight:700;color:var(--green)">40/40</td>
              <td><span class="sa-status-pill sa-pill-green"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> PASS</span></td>
            </tr>
            <tr>
              <td><strong>Seal Coverage</strong></td>
              <td>40 pts</td>
              <td>% of material events sealed × 0.4</td>
              <td style="font-weight:700;color:var(--green)">${Math.round(parseFloat(r.seal_coverage.coverage_pct) * 0.4)}/40</td>
              <td><span class="sa-status-pill sa-pill-green"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> ${r.seal_coverage.coverage_pct}</span></td>
            </tr>
            <tr>
              <td><strong>Active Sealing</strong></td>
              <td>20 pts</td>
              <td>At least 1 seal exists in chain</td>
              <td style="font-weight:700;color:var(--green)">20/20</td>
              <td><span class="sa-status-pill sa-pill-green"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> ${r.integrity.total_seals} seals</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }

function catCard(emoji, title, sealed, total, color) {
    const pct = total > 0 ? ((sealed / total) * 100).toFixed(0) : 100;
    return `<div style="text-align:center;padding:1.25rem;background:var(--surface-elevated);border-radius:12px;border:1px solid var(--border)">
      <div style="font-size:1.5rem;margin-bottom:0.5rem">${emoji}</div>
      <div style="font-weight:600;font-size:0.82rem;margin-bottom:0.5rem">${title}</div>
      <div style="font-size:1.5rem;font-weight:800;color:var(--${color})">${pct}%</div>
      <div style="font-size:0.68rem;color:var(--text-secondary);margin-top:0.25rem">${sealed}/${total} sealed</div>
    </div>`;
}

// ─── Window handlers ────────────────────────────────────────
window.refreshTrustReport = async function () {
    try {
        const res = await fetch('/api/scm/integrity/trust-report', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
        if (res.ok) { location.reload(); }
    } catch (e) { console.error('Refresh failed:', e); }
};

window.exportTrustReport = function () {
    alert('Trust Report PDF export — integrate with reporting module');
};
