/** Compliance – User Activity — Full audit log with filters, pagination, CSV export */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
import { API } from '../../core/api.js';

export function renderPage() {
  const logs = State._auditLogs?.logs || State._auditLogs?.entries || [];
  const pagination = State._auditLogs?.pagination || {};
  const total = pagination.total || logs.length;

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('search', 28)} User Activity</h1>
      <div class="sa-title-actions">
        <span style="font-size:0.75rem;color:var(--text-secondary)">${total} records</span>
        <button class="sa-btn sa-btn-sm" onclick="window._auditExportCSV()">📥 Export CSV</button>
      </div>
    </div>

    <div class="sa-card" style="margin-bottom:1rem">
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center">
        <input type="text" id="audit-filter-action" placeholder="Filter by action..." style="padding:0.4rem 0.6rem;border:1px solid var(--border-light);border-radius:6px;font-size:0.78rem;background:var(--bg-secondary);color:var(--text-primary);width:160px">
        <input type="date" id="audit-filter-from" style="padding:0.4rem 0.6rem;border:1px solid var(--border-light);border-radius:6px;font-size:0.78rem;background:var(--bg-secondary);color:var(--text-primary)">
        <input type="date" id="audit-filter-to" style="padding:0.4rem 0.6rem;border:1px solid var(--border-light);border-radius:6px;font-size:0.78rem;background:var(--bg-secondary);color:var(--text-primary)">
        <button class="sa-btn sa-btn-sm sa-btn-outline" onclick="window._auditApplyFilter()">🔍 Filter</button>
        <button class="sa-btn sa-btn-sm sa-btn-outline" onclick="window._auditClearFilter()">✕ Clear</button>
      </div>
    </div>

    <div class="sa-card">
      ${logs.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No audit records found</p>' : `
      <table class="sa-table"><thead><tr><th>User</th><th>Action</th><th>Resource</th><th>IP Address</th><th>Time</th></tr></thead>
      <tbody>${logs.map(l => `<tr>
        <td style="font-weight:600;font-size:0.78rem">${l.actor_email || l.user_email || l.actor || l.actor_id?.slice(0, 8) || '—'}</td>
        <td><span class="sa-code" style="font-size:0.72rem">${l.action || '—'}</span></td>
        <td style="font-size:0.75rem">${l.entity_type || l.resource || '—'} ${l.entity_id ? `<span style="color:var(--text-secondary)">${l.entity_id.slice(0, 8)}</span>` : ''}</td>
        <td class="sa-code" style="font-size:0.72rem">${l.ip_address || '—'}</td>
        <td style="font-size:0.7rem;color:var(--text-secondary)">${_fmtDate(l.timestamp || l.created_at)}</td>
      </tr>`).join('')}</tbody></table>`}
    </div>

    ${pagination.pages > 1 ? `<div style="display:flex;justify-content:center;gap:0.5rem;margin-top:1rem">
      ${Array.from({ length: Math.min(pagination.pages, 10) }, (_, i) => `<button class="sa-btn sa-btn-sm ${pagination.page === i + 1 ? '' : 'sa-btn-outline'}" onclick="window._auditPage(${i + 1})">${i + 1}</button>`).join('')}
    </div>` : ''}
  </div>`;
}

function _fmtDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleString(); } catch { return d; } }

export function initPage() {
  window._auditExportCSV = async () => {
    try {
      const resp = await fetch('/api/audit-log/export', { credentials: 'include' });
      if (!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
      window.showToast?.('📥 CSV exported', 'success');
    } catch (e) { window.showToast?.('❌ CSV export failed: ' + e.message, 'error'); }
  };

  window._auditApplyFilter = async () => {
    const action = document.getElementById('audit-filter-action')?.value || '';
    const from = document.getElementById('audit-filter-from')?.value || '';
    const to = document.getElementById('audit-filter-to')?.value || '';
    let qs = '?limit=50';
    if (action) qs += `&action=${encodeURIComponent(action)}`;
    if (from) qs += `&from=${from}`;
    if (to) qs += `&to=${to}`;
    try {
      State._auditLogs = await API.get('/audit-log/' + qs);
      window.renderCurrentPage?.();
    } catch (e) { window.showToast?.('❌ Filter failed: ' + e.message, 'error'); }
  };

  window._auditClearFilter = () => { window.navigateTo?.('compliance-audit'); };
  window._auditPage = async (p) => {
    try {
      State._auditLogs = await API.get(`/audit-log/?limit=50&page=${p}`);
      window.renderCurrentPage?.();
    } catch (e) { window.showToast?.('❌ Load failed: ' + e.message, 'error'); }
  };
}
