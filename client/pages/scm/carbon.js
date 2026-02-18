/**
 * TrustChecker – Scm Carbon Page
 */
import { State, render } from '../../core/state.js';

export function renderPage() {
  const d = State.carbonData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading carbon data...</span></div>';
  const sc = d.scope || {};
  const rpt = d.report || {};
  return `
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">🌍</div><div class="stat-value">${sc.total_emissions_kgCO2e || 0}</div><div class="stat-label">Total kgCO₂e</div></div>
      <div class="stat-card emerald"><div class="stat-icon">📦</div><div class="stat-value">${sc.products_assessed || 0}</div><div class="stat-label">Products Assessed</div></div>
      <div class="stat-card violet"><div class="stat-icon">🎯</div><div class="stat-value">${sc.reduction_targets?.paris_aligned_2030 || 0}</div><div class="stat-label">2030 Target kgCO₂e</div></div>
      <div class="stat-card amber"><div class="stat-icon">📊</div><div class="stat-value">${rpt.overall_esg_grade || 'N/A'}</div><div class="stat-label">ESG Grade</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📊 Scope 1 / 2 / 3 Breakdown</div></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:16px">
        ${[['Scope 1 — Manufacturing', sc.scope_1, 'var(--rose)'], ['Scope 2 — Energy/Warehousing', sc.scope_2, 'var(--amber)'], ['Scope 3 — Transport', sc.scope_3, 'var(--cyan)']].map(([label, data, color]) => `
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:12px;text-align:center;border-top:3px solid ${color}">
            <div style="font-size:0.8rem;color:var(--text-muted)">${label}</div>
            <div style="font-size:1.8rem;font-weight:700;color:${color};margin:8px 0">${data?.total || 0}</div>
            <div style="font-size:0.9rem">kgCO₂e (${data?.pct || 0}%)</div>
            <div style="background:var(--bg-secondary);border-radius:4px;height:8px;margin-top:8px"><div style="width:${data?.pct || 0}%;height:100%;background:${color};border-radius:4px"></div></div>
          </div>`).join('')}
      </div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🏆 Partner ESG Leaderboard</div></div>
      <table class="data-table"><thead><tr><th>Partner</th><th>Country</th><th>ESG Score</th><th>Grade</th><th>Reliability</th><th>Violations</th></tr></thead><tbody>
        ${(d.leaderboard?.leaderboard || []).map(p => `<tr><td style="font-weight:600">${p.name}</td><td>${p.country}</td><td><strong style="color:${p.esg_score >= 80 ? 'var(--emerald)' : p.esg_score >= 60 ? 'var(--cyan)' : 'var(--rose)'}">${p.esg_score}</strong></td><td><span class="badge ${p.grade === 'A' ? 'badge-green' : p.grade === 'B' ? 'badge-cyan' : p.grade === 'C' ? 'badge-amber' : 'badge-red'}">${p.grade}</span></td><td>${p.metrics?.shipment_reliability || 'N/A'}</td><td>${p.metrics?.sla_violations || 0}</td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📋 GRI Disclosures</div></div>
      <table class="data-table"><thead><tr><th>GRI Code</th><th>Disclosure</th><th>Value</th><th>Unit</th></tr></thead><tbody>
        ${Object.entries(rpt.disclosures || {}).map(([code, d]) => `<tr><td><strong>${code}</strong></td><td>${d.title}</td><td style="font-weight:700">${d.value}</td><td>${d.unit}</td></tr>`).join('')}
      </tbody></table>
    </div>`;
}

// Window exports for onclick handlers

