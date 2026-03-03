/** Compliance – Violation Log — reads from /api/compliance/records */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let _d = null;
async function load() { if (_d) return; try { _d = await fetch('/api/compliance/records', { headers: { 'Authorization': 'Bearer ' + State.token } }).then(r => r.json()); } catch { _d = {}; } }
load();
export function renderPage() {
  const records = _d?.records || _d?.violations || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('alert', 28)} Violation Log</h1><div class="sa-title-actions"><span style="font-size:0.75rem;color:var(--text-secondary)">${records.length} records</span></div></div>
    <div class="sa-card">${records.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No compliance violations recorded</p>' : `
      <table class="sa-table"><thead><tr><th>Type</th><th>Description</th><th>Severity</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${records.map(r => `<tr><td class="sa-code">${r.type || r.violation_type || '—'}</td><td style="font-size:0.8rem">${r.description || '—'}</td><td><span class="sa-status-pill sa-pill-${r.severity === 'high' ? 'red' : r.severity === 'medium' ? 'orange' : 'blue'}">${r.severity || '—'}</span></td><td>${r.status || '—'}</td><td style="font-size:0.7rem;color:var(--text-secondary)">${r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
