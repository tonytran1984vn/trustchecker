/** Compliance – Violation Log — reads from State._complianceRecords */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const records = State._complianceRecords?.records || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('alertTriangle', 28)} Violation Log</h1><div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${records.length} records</span></div></div>
    <div class="sa-card">${records.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No compliance violations</p>' : `
      <table class="sa-table"><thead><tr><th>Framework</th><th>Entity</th><th>Requirement</th><th>Status</th></tr></thead>
      <tbody>${records.map(r => `<tr><td class="sa-code">${r.framework || '—'}</td><td>${r.entity_type || '—'} ${r.entity_id?.slice(0, 8) || ''}</td><td>${r.requirement?.slice(0, 40) || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${r.status === 'compliant' ? 'green' : r.status === 'non_compliant' ? 'red' : 'orange'}">${r.status || '—'}</span></td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
