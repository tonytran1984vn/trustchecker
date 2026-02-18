/**
 * TrustChecker – Scm Risk Radar Page
 */
import { State, render } from '../../core/state.js';

export function renderPage() {
  const d = State.riskRadarData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Computing risk vectors...</span></div>';
  const r = d.radar || {};
  const threatColor = r.threat_level === 'critical' ? 'var(--rose)' : r.threat_level === 'high' ? 'var(--amber)' : r.threat_level === 'medium' ? 'var(--warning)' : 'var(--emerald)';
  return `
    <div class="stats-grid">
      <div class="stat-card" style="border-color:${threatColor}"><div class="stat-icon">🎯</div><div class="stat-value" style="color:${threatColor}">${r.overall_threat_index || 0}</div><div class="stat-label">Threat Index</div><div class="stat-change" style="color:${threatColor}">⬤ ${(r.threat_level || 'unknown').toUpperCase()}</div></div>
      <div class="stat-card rose"><div class="stat-icon">🚨</div><div class="stat-value">${d.alerts?.total_active || 0}</div><div class="stat-label">Active Alerts</div></div>
      <div class="stat-card amber"><div class="stat-icon">🔥</div><div class="stat-value">${(d.heatmap?.regions || []).filter(r => r.risk_level === 'hot').length}</div><div class="stat-label">Hot Zones</div></div>
      <div class="stat-card cyan"><div class="stat-icon">📊</div><div class="stat-value">8</div><div class="stat-label">Risk Vectors</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🎯 8-Vector Risk Assessment</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;padding:16px">
        ${Object.entries(r.vectors || {}).map(([key, v]) => {
    const color = v.level === 'high' ? 'var(--rose)' : v.level === 'medium' ? 'var(--amber)' : 'var(--emerald)';
    const icon = { 'partner_risk': '🤝', 'geographic_risk': '🌍', 'route_risk': '🚚', 'financial_risk': '💰', 'compliance_risk': '📜', 'cyber_risk': '🔐', 'environmental_risk': '🌱', 'supply_disruption': '⚡' }[key] || '📊';
    return `<div style="padding:16px;background:var(--bg-tertiary);border-radius:12px;border-left:4px solid ${color}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <span style="font-weight:600">${icon} ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              <span style="font-weight:700;color:${color}">${v.score}</span>
            </div>
            <div style="background:var(--bg-secondary);border-radius:4px;height:6px;overflow:hidden"><div style="width:${v.score}%;height:100%;background:${color};border-radius:4px"></div></div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:8px">${Object.entries(v.details || {}).slice(0, 3).map(([k, val]) => `${k}: ${val}`).join(' • ')}</div>
          </div>`;
  }).join('')}
      </div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🗺️ Regional Risk Heatmap</div></div>
      <table class="data-table"><thead><tr><th>Region</th><th>Heat Score</th><th>Level</th><th>Partners</th><th>Leak Alerts</th></tr></thead><tbody>
        ${(d.heatmap?.regions || []).map(r => `<tr><td style="font-weight:600">${r.region}</td><td><span style="color:${r.risk_level === 'hot' ? 'var(--rose)' : r.risk_level === 'warm' ? 'var(--amber)' : 'var(--emerald)'};font-weight:700">${r.heat_score}</span></td><td><span class="badge ${r.risk_level === 'hot' ? 'badge-red' : r.risk_level === 'warm' ? 'badge-amber' : 'badge-green'}">${r.risk_level}</span></td><td>${r.partners}</td><td>${r.leak_alerts}</td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🚨 Active Alerts by Source</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;padding:16px">
        ${Object.entries(d.alerts?.by_source || {}).map(([k, v]) => `<div style="text-align:center;padding:12px;background:var(--bg-tertiary);border-radius:8px"><div style="font-size:1.4rem;font-weight:700;color:${v > 0 ? 'var(--rose)' : 'var(--emerald)'}">${v}</div><div style="font-size:0.75rem;color:var(--text-muted)">${k}</div></div>`).join('')}
      </div>
    </div>`;
}

// Window exports for onclick handlers

