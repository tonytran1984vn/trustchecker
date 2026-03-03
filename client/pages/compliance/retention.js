/** Compliance – Retention — reads from /api/compliance/retention */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let _d = null;
async function load() { if (_d) return; try { _d = await fetch('/api/compliance/retention', { headers: { 'Authorization': 'Bearer ' + State.token } }).then(r => r.json()); } catch { _d = {}; } }
load();
export function renderPage() {
  const policies = _d?.policies || _d?.retention || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('clock', 28)} Data Retention</h1></div>
    <div class="sa-card">${(!Array.isArray(policies) || policies.length === 0) ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No retention policies configured</p>' : `
      <table class="sa-table"><thead><tr><th>Category</th><th>Retention Period</th><th>Action</th><th>Status</th></tr></thead>
      <tbody>${policies.map(p => `<tr><td style="font-weight:600">${p.category || p.data_type || '—'}</td><td>${p.retention_period || p.period || '—'}</td><td class="sa-code">${p.action || p.on_expiry || '—'}</td><td><span class="sa-status-pill sa-pill-green">Active</span></td></tr>`).join('')}</tbody></table>`}</div></div>`;
}
