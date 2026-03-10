/** Compliance – Violation Log — Compliance records & violations */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

export function renderPage() {
  const records = State._complianceRecords?.records || [];
  const violations = records.filter(r => r.status === 'non_compliant' || r.status === 'violation');
  const compliant = records.filter(r => r.status === 'compliant');
  const pending = records.filter(r => r.status !== 'compliant' && r.status !== 'non_compliant' && r.status !== 'violation');

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('alertTriangle', 28)} Violation Log</h1>
      <div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${records.length} records</span></div>
    </div>

    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${_m('Total Records', records.length, '', 'blue', 'fileText')}
      ${_m('Compliant', compliant.length, '', 'green', 'checkCircle')}
      ${_m('Violations', violations.length, '', violations.length > 0 ? 'red' : 'green', 'alertTriangle')}
      ${_m('Pending', pending.length, '', 'orange', 'clock')}
    </div>

    <div class="sa-card">
      ${records.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No compliance records. Records are created when compliance checks run against products and entities.</p>' : `
      <table class="sa-table"><thead><tr><th>Framework</th><th>Entity</th><th>Requirement</th><th>Evidence</th><th>Status</th><th>Next Review</th></tr></thead>
      <tbody>${records.map(r => `<tr${r.status === 'non_compliant' || r.status === 'violation' ? ' style="background:rgba(239,68,68,0.04)"' : ''}>
        <td><span class="sa-code" style="font-size:0.72rem;font-weight:600">${r.framework || '—'}</span></td>
        <td style="font-size:0.75rem">${r.entity_type || '—'} <span style="color:var(--text-secondary);font-size:0.7rem">${r.entity_id?.slice(0, 8) || ''}</span></td>
        <td style="font-size:0.75rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.requirement || '—'}</td>
        <td style="font-size:0.72rem;color:var(--text-secondary)">${r.evidence?.slice(0, 30) || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${r.status === 'compliant' ? 'green' : r.status === 'non_compliant' || r.status === 'violation' ? 'red' : 'orange'}">${r.status || '—'}</span></td>
        <td style="font-size:0.7rem;color:var(--text-secondary)">${r.next_review ? new Date(r.next_review).toLocaleDateString() : '—'}</td>
      </tr>`).join('')}</tbody></table>`}
    </div>
  </div>`;
}

function _m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`; }
