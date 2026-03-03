/**
 * Risk – Risk Dashboard (Landing)
 * Fetches KRI metrics, heatmap, trends, and top risk products from API
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

let D = {};
async function load() {
  const h = { 'Authorization': 'Bearer ' + State.token };
  const [alerts, heatmap, trends, radar] = await Promise.all([
    fetch('/api/scm/risk/alerts?limit=10', { headers: h }).then(r => r.json()).catch(() => ({})),
    fetch('/api/scm/risk/heatmap', { headers: h }).then(r => r.json()).catch(() => ({})),
    fetch('/api/scm/risk/trends', { headers: h }).then(r => r.json()).catch(() => ({})),
    fetch('/api/scm/risk/radar', { headers: h }).then(r => r.json()).catch(() => ({})),
  ]);
  D = { alerts, heatmap, trends, radar };
}

export function renderPage() {
  load();
  const a = D.alerts || {};
  const bySev = a.by_severity || {};
  const bySrc = a.by_source || {};
  const regions = (D.heatmap?.regions || []).slice(0, 6);
  const tSummary = D.trends?.summary || {};
  const alertList = (a.alerts || []).slice(0, 8);
  const vectors = D.radar?.vectors || D.radar?.risk_vectors || [];

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('shield', 28)} Risk Dashboard</h1>
        <div class="sa-title-actions">
          <span style="font-size:0.75rem;color:var(--text-secondary)">Last updated: ${new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <!-- Key Risk Indicators -->
      <section class="sa-section">
        <h2 class="sa-section-title">Key Risk Indicators (KRI)</h2>
        <div class="sa-metrics-row">
          ${kri('Active Alerts', a.total_active || 0, `${bySev.critical || 0} critical`, (bySev.critical > 0 ? 'red' : 'orange'), 'alertTriangle')}
          ${kri('Fraud Alerts', bySrc.fraud || 0, `${bySev.high || 0} high severity`, 'red', 'alert')}
          ${kri('Anomalies', bySrc.anomaly || 0, `${bySrc.leak || 0} data leaks`, 'orange', 'shield')}
          ${kri('SLA Violations', bySrc.sla || 0, `${bySev.medium || 0} medium`, 'blue', 'clock')}
          ${kri('Fraud Trend (30d)', tSummary.total_fraud || 0, `${tSummary.total_leaks || 0} leaks`, 'orange', 'workflow')}
          ${kri('Risk Vectors', vectors.length || '—', D.radar?.overall_risk_grade || 'N/A', 'blue', 'dashboard')}
        </div>
      </section>

      <div class="sa-grid-2col">
        <!-- Risk Heatmap -->
        <div class="sa-card">
          <h3>${icon('globe', 16)} Risk Heatmap by Region</h3>
          ${regions.length === 0 ? '<p style="color:var(--text-secondary);padding:1rem">No heatmap data</p>' :
      regions.map(r => heatZone(r.region || r.country || '—', r.risk_score || r.score || 0, r.risk_level || 'low')).join('')}
        </div>

        <!-- Recent Alerts Feed -->
        <div class="sa-card">
          <h3>${icon('alertTriangle', 16)} Recent Alerts</h3>
          ${alertList.length === 0 ? '<p style="color:var(--text-secondary);padding:1rem">No active alerts</p>' :
      alertList.map(al => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
                <div style="flex:1">
                  <span class="sa-status-pill sa-pill-${al.severity === 'critical' || al.severity === 'high' ? 'red' : al.severity === 'medium' ? 'orange' : 'blue'}" style="font-size:0.65rem;margin-right:0.5rem">${al.severity || '—'}</span>
                  <span style="font-size:0.8rem">${al.description || al.alert_type || '—'}</span>
                </div>
                <span style="font-size:0.65rem;color:var(--text-secondary)">${al.source || '—'}</span>
              </div>
            `).join('')}
        </div>
      </div>

      <!-- Risk Trend Summary -->
      <section class="sa-section" style="margin-top:1.5rem">
        <h2 class="sa-section-title">Trend Summary (${D.trends?.period || '30d'})</h2>
        <div class="sa-card">
          <table class="sa-table">
            <thead><tr><th>Category</th><th>Count</th><th>Period</th></tr></thead>
            <tbody>
              <tr><td>Fraud Alerts</td><td style="font-weight:700">${tSummary.total_fraud || 0}</td><td>${D.trends?.days || 30} days</td></tr>
              <tr><td>Data Leaks</td><td style="font-weight:700">${tSummary.total_leaks || 0}</td><td>${D.trends?.days || 30} days</td></tr>
              <tr><td>SLA Violations</td><td style="font-weight:700">${tSummary.total_violations || 0}</td><td>${D.trends?.days || 30} days</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function kri(label, value, sub, color, iconName) {
  return `<div class="sa-metric-card sa-metric-${color}"><div class="sa-metric-icon">${icon(iconName, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${value}</div><div class="sa-metric-label">${label}</div><div class="sa-metric-sub">${sub}</div></div></div>`;
}

function heatZone(region, score, level) {
  const c = level === 'critical' || level === 'hot' ? '#ef4444' : level === 'high' || level === 'warm' ? '#f59e0b' : level === 'medium' ? '#3b82f6' : '#22c55e';
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span>${region}</span><div style="display:flex;align-items:center;gap:0.5rem"><div style="width:80px;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden"><div style="width:${Math.min(score, 100)}%;height:100%;background:${c};border-radius:3px"></div></div><span style="font-weight:700;color:${c};font-size:0.8rem;width:30px;text-align:right">${score}</span></div></div>`;
}
