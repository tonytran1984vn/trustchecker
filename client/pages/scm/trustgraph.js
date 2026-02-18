/**
 * TrustChecker – Scm Trustgraph Page
 */
import { State, render } from '../../core/state.js';
import { scoreColor } from '../../utils/helpers.js';

export function renderPage() {
  const g = State.scmGraph;
  if (!g) return '<div class="loading"><div class="spinner"></div></div>';

  const nodes = g.nodes || [];
  const toxic = nodes.filter(n => n.is_toxic);

  return `
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card cyan"><div class="stat-icon">🕸️</div><div class="stat-value">${g.total_nodes}</div><div class="stat-label">Nodes</div></div>
      <div class="stat-card violet"><div class="stat-icon">🔗</div><div class="stat-value">${g.total_edges}</div><div class="stat-label">Edges</div></div>
      <div class="stat-card ${g.network_health === 'healthy' ? 'emerald' : 'rose'}"><div class="stat-icon">${g.network_health === 'healthy' ? '✅' : '⚠️'}</div><div class="stat-value">${g.network_health}</div><div class="stat-label">Network Health</div></div>
      <div class="stat-card ${toxic.length > 0 ? 'rose' : 'emerald'}"><div class="stat-icon">☠️</div><div class="stat-value">${g.toxic_count}</div><div class="stat-label">Toxic Nodes</div></div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><div class="card-title">📊 Risk Distribution</div></div>
      <div class="risk-pills">
        ${Object.entries(g.risk_distribution || {}).map(([level, count]) => `
          <div class="risk-pill ${level}">
            <div class="risk-pill-value">${count}</div>
            <div class="risk-pill-label">${level}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">🕸️ Network Nodes (PageRank Analysis)</div></div>
      <div class="table-container">
        <table>
          <tr><th>Node</th><th>Type</th><th>PageRank</th><th>Centrality</th><th>Trust</th><th>Alerts</th><th>Toxicity</th><th>Risk</th></tr>
          ${nodes.slice(0, 20).map(n => `
            <tr class="${n.is_toxic ? 'toxic-node' : ''}">
              <td style="font-weight:600">${n.name || n.id?.substring(0, 8)}</td>
              <td><span class="badge ${(n.type || '').toLowerCase()}">${n.type}</span></td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${n.pagerank}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${n.centrality}</td>
              <td class="stock-qty" style="color:${scoreColor(n.trust_score)}">${n.trust_score}</td>
              <td style="font-family:'JetBrains Mono';color:${n.alert_count > 0 ? 'var(--rose)' : 'var(--text-muted)'}">${n.alert_count}</td>
              <td style="font-family:'JetBrains Mono';font-weight:700;color:${n.toxicity_score > 0.5 ? 'var(--rose)' : n.toxicity_score > 0.3 ? 'var(--amber)' : 'var(--emerald)'}">${n.toxicity_score}</td>
              <td><span class="badge ${n.risk_level === 'critical' ? 'suspicious' : n.risk_level === 'high' ? 'warning' : 'valid'}">${n.risk_level}</span></td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>
  `;
}

// Window exports for onclick handlers

