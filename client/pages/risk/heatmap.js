/**
 * Risk – Heatmap (Regional Risk Map)
 * Reads from /api/scm/risk/heatmap — regions aggregated from partners + shipments + leak_alerts
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

let D = null;
async function load() {
  if (D) return;
  try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    D = await fetch('/api/scm/risk/heatmap', { headers: h }).then(r => r.json());
  } catch { D = {}; }
}
load();

export function renderPage() {
  const regions = D?.regions || [];
  const hotZones = D?.hot_zones || 0;

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('globe', 28)} Risk Heatmap</h1>
        <div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${regions.length} regions · ${hotZones} hot zones</span></div>
      </div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Regions Tracked', regions.length, '', 'blue', 'globe')}
        ${m('Hot Zones', hotZones, 'Requires action', 'red', 'alertTriangle')}
        ${m('Warm Zones', regions.filter(r => r.risk_level === 'warm').length, 'Monitor closely', 'orange', 'alert')}
        ${m('Cool Zones', regions.filter(r => r.risk_level === 'cool' || r.risk_level === 'low').length, 'Low risk', 'green', 'check')}
      </div>

      <div class="sa-card">
        <h3>Regional Risk Rankings</h3>
        ${regions.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No heatmap data — run risk assessment first</p>' : `
        <table class="sa-table"><thead><tr><th>Region</th><th>Risk Score</th><th>Level</th><th>Partners</th><th>Incidents</th></tr></thead>
        <tbody>${regions.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).map(r => {
    const c = r.risk_level === 'hot' ? '#ef4444' : r.risk_level === 'warm' ? '#f59e0b' : r.risk_level === 'medium' ? '#3b82f6' : '#22c55e';
    return `<tr>
            <td style="font-weight:600">${r.region || r.country || '—'}</td>
            <td><div style="display:flex;align-items:center;gap:8px"><div style="width:80px;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden"><div style="width:${Math.min(r.risk_score || 0, 100)}%;height:100%;background:${c};border-radius:3px"></div></div><span style="font-weight:700;color:${c};font-size:0.85rem">${r.risk_score || 0}</span></div></td>
            <td><span class="sa-status-pill" style="background:${c}18;color:${c};border:1px solid ${c}30">${r.risk_level || '—'}</span></td>
            <td>${r.partner_count || '—'}</td>
            <td>${r.incident_count || r.alert_count || '—'}</td>
          </tr>`;
  }).join('')}
        </tbody></table>`}
      </div>
    </div>`;
}

function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
