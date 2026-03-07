/** Risk – Pattern Clusters — reads from State._riskPatterns */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskPatterns || {};
  // API returns { patterns: { key: {...}, ... } } — convert object to array if needed
  let rawPatterns = D.patterns || D.clusters || [];
  if (rawPatterns && typeof rawPatterns === 'object' && !Array.isArray(rawPatterns)) {
    rawPatterns = Object.entries(rawPatterns).map(([key, val]) => ({ pattern_id: key, ...val }));
  }
  const patterns = Array.isArray(rawPatterns) ? rawPatterns : [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('network', 28)} Pattern Clusters</h1><div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${patterns.length} patterns</span></div></div>
    <div class="sa-card">${patterns.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No patterns detected</p>' : `
      <table class="sa-table"><thead><tr><th>Pattern</th><th>Type</th><th>Weight</th><th>Description</th></tr></thead>
      <tbody>${patterns.map(p => `<tr><td style="font-weight:600">${p.name || p.pattern_id || '—'}</td><td class="sa-code">${p.type || p.category || p.pattern_id || '—'}</td>
        <td>${(p.weight ? (p.weight * 100).toFixed(0) : (p.confidence || 0)) || 0}%</td><td style="font-size:0.8rem;color:var(--text-secondary)">${(p.description || '—').slice(0, 80)}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
