/** Risk – Pattern Clusters — reads from State._riskPatterns */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskPatterns || {};
  const patterns = D.patterns || D.clusters || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('network', 28)} Pattern Clusters</h1></div>
    <div class="sa-card">${patterns.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No patterns detected</p>' : `
      <table class="sa-table"><thead><tr><th>Pattern</th><th>Type</th><th>Confidence</th><th>Risk</th></tr></thead>
      <tbody>${patterns.map(p => `<tr><td style="font-weight:600">${p.name || p.pattern_id || '—'}</td><td class="sa-code">${p.type || p.category || '—'}</td>
        <td>${(p.confidence || 0).toFixed?.(0) || 0}%</td><td><span class="sa-status-pill sa-pill-${(p.risk_score || 0) > 70 ? 'red' : (p.risk_score || 0) > 40 ? 'orange' : 'green'}">${(p.risk_score || 0).toFixed?.(0) || 0}</span></td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
