/**
 * Risk – Distributor Risk
 * Distributor/partner risk from /api/risk-graph/behavior
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let D = null;
async function load() {
  if (D) return;
  try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    D = await fetch('/api/risk-graph/behavior', { headers: h }).then(r => r.json());
  } catch { D = {}; }
}
load();
export function renderPage() {
  const entities = D?.entities || D?.behaviors || [];
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('network', 28)} Distributor Risk</h1></div>
      <div class="sa-card">
        ${entities.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No distributor risk data — run behavioral analysis first</p>' : `
        <table class="sa-table"><thead><tr><th>Entity</th><th>Type</th><th>Risk Score</th><th>Anomalies</th><th>Status</th></tr></thead>
        <tbody>${entities.map(e => `<tr>
          <td style="font-weight:600">${e.name || e.entity_id || '—'}</td>
          <td class="sa-code">${e.type || e.entity_type || '—'}</td>
          <td style="font-weight:700;color:${(e.risk_score || 0) > 70 ? '#ef4444' : (e.risk_score || 0) > 40 ? '#f59e0b' : '#22c55e'}">${e.risk_score || '—'}</td>
          <td>${e.anomaly_count || e.anomalies || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${e.risk_level === 'high' ? 'red' : e.risk_level === 'medium' ? 'orange' : 'green'}">${e.risk_level || '—'}</span></td>
        </tr>`).join('')}</tbody></table>`}
      </div></div>`;
}
