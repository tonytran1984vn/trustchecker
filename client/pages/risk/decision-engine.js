/**
 * Risk – Decision Engine
 * Risk-graph dashboard with behavioral analytics from /api/risk-graph/dashboard
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let D = null;
async function load() {
  if (D) return;
  try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    D = await fetch('/api/risk-graph/dashboard', { headers: h }).then(r => r.json());
  } catch { D = {}; }
}
load();
export function renderPage() {
  const nodes = D?.nodes || D?.graph?.nodes || [];
  const edges = D?.edges || D?.graph?.edges || [];
  const stats = D?.stats || {};
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('zap', 28)} Decision Engine</h1></div>
      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Graph Nodes', nodes.length || stats.total_nodes || 0, '', 'blue', 'network')}
        ${m('Graph Edges', edges.length || stats.total_edges || 0, '', 'green', 'workflow')}
        ${m('Anomalies', stats.anomalies || 0, '', 'red', 'alertTriangle')}
      </div>
      <div class="sa-card">
        <h3>Risk Decision Graph</h3>
        ${nodes.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No graph data — run risk analysis first</p>' : `
        <table class="sa-table"><thead><tr><th>Node</th><th>Type</th><th>Risk</th><th>Connections</th></tr></thead>
        <tbody>${nodes.slice(0, 20).map(n => `<tr>
          <td style="font-weight:600">${n.id || n.name || '—'}</td>
          <td class="sa-code">${n.type || '—'}</td>
          <td style="font-weight:700;color:${(n.risk || 0) > 70 ? '#ef4444' : (n.risk || 0) > 40 ? '#f59e0b' : '#22c55e'}">${n.risk || n.risk_score || '—'}</td>
          <td>${n.degree || n.connections || '—'}</td>
        </tr>`).join('')}</tbody></table>`}
      </div></div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
