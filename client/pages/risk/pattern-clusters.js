/** Risk – Pattern Clusters — reads from State._riskPatterns */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskPatterns || {};
  // API returns { patterns: { key: [...items], ... } } — flatten to array
  let rawPatterns = D.patterns || D.clusters || [];
  if (rawPatterns && typeof rawPatterns === 'object' && !Array.isArray(rawPatterns)) {
    rawPatterns = Object.entries(rawPatterns).flatMap(([key, val]) => {
      if (Array.isArray(val)) return val.map(v => ({ pattern_id: key, ...v }));
      return [{ pattern_id: key, ...val }];
    });
  }
  const patterns = Array.isArray(rawPatterns) ? rawPatterns : [];
  const totalScore = patterns.reduce((s, p) => s + (p.score || 0), 0) || 1;
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('network', 28)} Pattern Clusters</h1><div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${patterns.length} patterns</span></div></div>
    <div class="sa-card">${patterns.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No patterns detected</p>' : `
      <table class="sa-table"><thead><tr><th>Pattern</th><th>Severity</th><th>Score</th><th>Description</th></tr></thead>
      <tbody>${patterns.map(p => `<tr><td style="font-weight:600">${p.name || p.pattern_id || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${p.severity === 'critical' || p.severity === 'high' ? 'red' : p.severity === 'medium' ? 'orange' : 'green'}">${p.severity || p.type || p.category || '—'}</span></td>
        <td>${p.score || (p.weight ? (p.weight * 100).toFixed(0) + '%' : '0')}</td>
        <td style="font-size:0.8rem;color:var(--text-secondary)">${(p.description || '—').slice(0, 100)}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
