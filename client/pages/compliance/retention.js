/** Compliance – Retention — reads from State._complianceRetention */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const policies = State._complianceRetention?.policies || State._complianceRetention?.retention || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('clock', 28)} Data Retention</h1></div>
    <div class="sa-card">${(!Array.isArray(policies) || policies.length === 0) ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No retention policies</p>' : `
      <table class="sa-table"><thead><tr><th>Category</th><th>Retention Period</th><th>Action</th><th>Status</th></tr></thead>
      <tbody>${policies.map(p => `<tr><td style="font-weight:600">${p.category || p.data_type || p.table_name || '—'}</td><td>${p.retention_period || (p.retention_days ? p.retention_days + ' days' : '—')}</td><td class="sa-code">${p.action || p.on_expiry || '—'}</td><td><span class="sa-status-pill sa-pill-green">Active</span></td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
