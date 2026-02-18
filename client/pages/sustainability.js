/**
 * TrustChecker – Sustainability Page
 */
import { State, render } from '../core/state.js';

export function renderPage() {
  const d = State.sustainData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading sustainability data...</span></div>';
  const s = d.stats || {};
  return `
    <div class="stats-grid">
      <div class="stat-card emerald"><div class="stat-icon">♻️</div><div class="stat-value">${s.products_assessed || 0}</div><div class="stat-label">Products Assessed</div></div>
      <div class="stat-card cyan"><div class="stat-icon">📊</div><div class="stat-value">${s.avg_score?.toFixed(1) || 0}</div><div class="stat-label">Avg Score</div></div>
      <div class="stat-card violet"><div class="stat-icon">🏅</div><div class="stat-value">${s.certifications_issued || 0}</div><div class="stat-label">Green Certs</div></div>
      <div class="stat-card amber"><div class="stat-icon">🌍</div><div class="stat-value">${s.avg_carbon_footprint?.toFixed(1) || 0}</div><div class="stat-label">Avg Carbon</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🌱 Sustainability Scores</div></div>
      <table class="data-table"><thead><tr><th>Product</th><th>Carbon</th><th>Water</th><th>Recycl.</th><th>Ethical</th><th>Overall</th><th>Grade</th></tr></thead><tbody>
        ${(d.scores || []).map(s => `<tr><td>${s.product_id?.slice(0, 8) || '—'}</td><td>${s.carbon_footprint}</td><td>${s.water_usage}</td><td>${s.recyclability}</td><td>${s.ethical_sourcing}</td><td style="font-weight:700">${s.overall_score}</td><td><span class="badge ${s.grade === 'A' ? 'badge-green' : s.grade === 'B' ? 'badge-cyan' : s.grade === 'C' ? 'badge-amber' : 'badge-red'}">${s.grade}</span></td></tr>`).join('')}
      </tbody></table>
    </div>`;
}

// Window exports for onclick handlers

