/**
 * Risk – Pattern Clusters
 * Reads behavioral patterns from /api/risk-graph/patterns
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

let D = null;
async function load() {
  if (D) return;
  try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    D = await fetch('/api/risk-graph/patterns', { headers: h }).then(r => r.json());
  } catch { D = {}; }
}
load();

export function renderPage() {
  const patterns = D?.patterns || [];
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('workflow', 28)} Pattern Clusters</h1>
        <div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${patterns.length} patterns detected</span></div>
      </div>

      <div class="sa-card">
        ${patterns.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No pattern clusters detected — system is learning</p>' : `
        <table class="sa-table"><thead><tr><th>Pattern</th><th>Type</th><th>Confidence</th><th>Occurrences</th><th>Risk Level</th></tr></thead>
        <tbody>${patterns.map(p => `<tr>
          <td style="font-weight:600">${p.name || p.pattern_id || '—'}</td>
          <td class="sa-code">${p.type || p.category || '—'}</td>
          <td style="font-weight:700">${p.confidence ? (p.confidence * 100).toFixed(0) + '%' : p.score || '—'}</td>
          <td>${p.count || p.occurrences || '—'}</td>
          <td><span class="sa-status-pill sa-pill-${p.risk_level === 'high' ? 'red' : p.risk_level === 'medium' ? 'orange' : 'blue'}">${p.risk_level || '—'}</span></td>
        </tr>`).join('')}
        </tbody></table>`}
      </div>
    </div>`;
}
