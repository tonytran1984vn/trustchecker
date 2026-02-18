/**
 * TrustChecker – Scm Twin Page
 */
import { State, render } from '../../core/state.js';

export function renderPage() {
  const d = State.twinData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Building digital twin...</span></div>';
  const m = d.model || {};
  const k = d.kpis || {};
  const a = d.anomalies || {};
  const healthColor = m.health?.overall === 'healthy' ? 'var(--emerald)' : m.health?.overall === 'warning' ? 'var(--amber)' : 'var(--rose)';
  return `
    <div class="stats-grid">
      <div class="stat-card" style="border-color:${healthColor}"><div class="stat-icon">🪞</div><div class="stat-value" style="color:${healthColor}">${(m.health?.overall || 'unknown').toUpperCase()}</div><div class="stat-label">Twin Health</div></div>
      <div class="stat-card cyan"><div class="stat-icon">🔗</div><div class="stat-value">${m.topology?.nodes || 0}/${m.topology?.edges || 0}</div><div class="stat-label">Nodes / Edges</div></div>
      <div class="stat-card violet"><div class="stat-icon">📊</div><div class="stat-value">${k.overall_score || 0}%</div><div class="stat-label">KPI Score</div></div>
      <div class="stat-card ${a.total_anomalies > 0 ? 'rose' : 'emerald'}"><div class="stat-icon">⚡</div><div class="stat-value">${a.total_anomalies || 0}</div><div class="stat-label">Anomalies</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📊 KPI Dashboard</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;padding:16px">
        ${Object.entries(k.kpis || {}).map(([key, kpi]) => {
    const color = kpi.status === 'excellent' ? 'var(--emerald)' : kpi.status === 'good' || kpi.status === 'normal' || kpi.status === 'high' ? 'var(--cyan)' : 'var(--amber)';
    return `<div style="padding:16px;background:var(--bg-tertiary);border-radius:12px">
            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase">${key.replace(/_/g, ' ')}</div>
            <div style="font-size:1.6rem;font-weight:700;color:${color};margin:4px 0">${kpi.value}${kpi.unit}</div>
            <div style="font-size:0.7rem;display:flex;justify-content:space-between"><span>Benchmark: ${kpi.benchmark}${kpi.unit}</span><span style="color:${color}">${kpi.status}</span></div>
          </div>`;
  }).join('')}
      </div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🏗️ Supply Chain State</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;padding:16px">
        ${Object.entries(m.state || {}).map(([k, v]) => `<div style="text-align:center;padding:12px;background:var(--bg-tertiary);border-radius:8px"><div style="font-size:1.2rem;font-weight:700">${v}</div><div style="font-size:0.7rem;color:var(--text-muted)">${k.replace(/_/g, ' ')}</div></div>`).join('')}
      </div>
    </div>
    ${a.total_anomalies > 0 ? `<div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">⚡ Detected Anomalies</div></div>
      <table class="data-table"><thead><tr><th>Type</th><th>Severity</th><th>Entity</th><th>Message</th><th>Action</th></tr></thead><tbody>
        ${(a.anomalies || []).map(an => `<tr><td>${an.type}</td><td><span class="badge ${an.severity === 'critical' ? 'badge-red' : an.severity === 'high' ? 'badge-amber' : 'badge-cyan'}">${an.severity}</span></td><td>${an.entity_type}/${an.entity_id?.slice(0, 8) || '—'}</td><td style="font-size:0.8rem">${an.message}</td><td style="font-size:0.75rem;color:var(--text-muted)">${an.recommended_action}</td></tr>`).join('')}
      </tbody></table>
    </div>` : ''}`;
}

// Window exports for onclick handlers

