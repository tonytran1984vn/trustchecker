/** Compliance – Data Export — reads from State._gdprExport */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._gdprExport || {};
  const exports = D.exports || D.data || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('scroll', 28)} Data Export (GDPR)</h1></div>
    <div class="sa-card">${exports.length === 0 && !D.export_id ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No GDPR exports available</p>' : `
      ${D.export_id ? `<p style="margin-bottom:1rem;color:var(--text-secondary)">Export ID: <code>${D.export_id}</code></p>` : ''}
      ${Array.isArray(exports) && exports.length > 0 ? `<table class="sa-table"><thead><tr><th>Type</th><th>Records</th><th>Status</th></tr></thead>
      <tbody>${exports.map(e => `<tr><td style="font-weight:600">${e.type || e.category || '—'}</td><td>${e.count || e.records || '—'}</td><td><span class="sa-status-pill sa-pill-green">${e.status || 'ready'}</span></td></tr>`).join('')}</tbody></table>` : `<p style="color:var(--text-secondary)">Export data: ${JSON.stringify(D).slice(0, 200)}</p>`}`}</div></div>`;
}
