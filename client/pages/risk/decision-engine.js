/** Risk – Decision Engine — reads from State._riskGraph */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskGraph || {};
  const nodes = D.nodes || []; const edges = D.edges || []; const stats = D.stats || D.summary || {};
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('network', 28)} Decision Engine</h1></div>
    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${m('Graph Nodes', nodes.length, '', 'blue', 'network')}
      ${m('Edges', edges.length, '', 'purple', 'workflow')}
      ${m('Risk Score', stats.avg_risk?.toFixed?.(0) || stats.risk_score || '—', '', 'orange', 'shield')}
    </div>
    <div class="sa-card"><h3>Graph Nodes</h3>
      ${nodes.length === 0 ? '<p style="color:var(--text-secondary)">No graph data</p>' : `
        <table class="sa-table"><thead><tr><th>Node</th><th>Type</th><th>Risk</th></tr></thead>
        <tbody>${nodes.slice(0, 15).map(n => `<tr><td style="font-weight:600">${n.label || n.name || n.id || '—'}</td><td class="sa-code">${n.type || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${(n.risk || 0) > 0.7 ? 'red' : (n.risk || 0) > 0.4 ? 'orange' : 'green'}">${(n.risk || 0).toFixed?.(2) || 0}</span></td></tr>`).join('')}</tbody></table>`}
    </div></div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
