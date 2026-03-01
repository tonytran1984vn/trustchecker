/**
 * Company Admin – Incident Management (Tenant Scope)
 * ════════════════════════════════════════════════════
 * Real data from /api/ops/incidents — with Create + Status Update
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let incidents = null, loading = false, showForm = false;

async function load() {
  if (loading) return; loading = true;
  try {
    if (window._caRiskReady) { try { await window._caRiskReady; } catch { } }
    const rc = window._caRiskCache;
    let res;
    if (rc?.incidents && rc._loadedAt && !incidents) { res = rc.incidents; }
    else { res = await API.get('/ops/incidents'); }
    incidents = Array.isArray(res) ? res : (res.incidents || []);
  } catch (e) { incidents = []; }
  loading = false;
  refresh();
}

function refresh() {
  setTimeout(() => {
    const el = document.getElementById('incidents-root');
    if (el) el.innerHTML = renderContent();
  }, 50);
}

function timeAgo(d) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), dd = Math.floor(h / 24);
  if (m < 1) return 'Just now'; if (m < 60) return m + 'm ago'; if (h < 24) return h + 'h ago'; return dd + 'd ago';
}

function renderCreateForm() {
  return `
    <div class="sa-card" style="margin-bottom:1.5rem;border:2px solid var(--primary, #3b82f6);position:relative">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;color:var(--text-primary)">${icon('plus', 20)} Create New Incident</h3>
        <button class="btn btn-xs btn-ghost" onclick="window._incToggleForm()">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div>
          <label style="display:block;font-size:0.78rem;color:var(--text-secondary);margin-bottom:4px">Title *</label>
          <input id="inc-title" type="text" placeholder="Brief incident title" style="width:100%;padding:8px 12px;border:1px solid var(--border-color, #334155);border-radius:6px;background:var(--bg-secondary, #0f172a);color:var(--text-primary, #f1f5f9);font-size:13px">
        </div>
        <div>
          <label style="display:block;font-size:0.78rem;color:var(--text-secondary);margin-bottom:4px">Severity</label>
          <select id="inc-severity" style="width:100%;padding:8px 12px;border:1px solid var(--border-color, #334155);border-radius:6px;background:var(--bg-secondary, #0f172a);color:var(--text-primary, #f1f5f9);font-size:13px">
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium" selected>Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:0.78rem;color:var(--text-secondary);margin-bottom:4px">Description</label>
        <textarea id="inc-desc" rows="3" placeholder="Detailed description of the incident..." style="width:100%;padding:8px 12px;border:1px solid var(--border-color, #334155);border-radius:6px;background:var(--bg-secondary, #0f172a);color:var(--text-primary, #f1f5f9);font-size:13px;resize:vertical"></textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div>
          <label style="display:block;font-size:0.78rem;color:var(--text-secondary);margin-bottom:4px">Assignee</label>
          <input id="inc-assignee" type="text" placeholder="e.g. Security Team" style="width:100%;padding:8px 12px;border:1px solid var(--border-color, #334155);border-radius:6px;background:var(--bg-secondary, #0f172a);color:var(--text-primary, #f1f5f9);font-size:13px">
        </div>
        <div>
          <label style="display:block;font-size:0.78rem;color:var(--text-secondary);margin-bottom:4px">Runbook Key</label>
          <input id="inc-runbook" type="text" placeholder="Optional runbook reference" style="width:100%;padding:8px 12px;border:1px solid var(--border-color, #334155);border-radius:6px;background:var(--bg-secondary, #0f172a);color:var(--text-primary, #f1f5f9);font-size:13px">
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-sm btn-ghost" onclick="window._incToggleForm()">Cancel</button>
        <button class="btn btn-sm btn-primary" onclick="window._incCreate()">Create Incident</button>
      </div>
    </div>
  `;
}

function renderContent() {
  if (!incidents && !loading) { load(); }
  if (loading && !incidents) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Incidents...</div></div>`;

  const list = incidents || [];
  const counts = {
    open: list.filter(i => i.status === 'open').length,
    investigating: list.filter(i => i.status === 'investigating').length,
    resolved: list.filter(i => i.status === 'resolved').length,
    closed: list.filter(i => i.status === 'closed').length,
  };

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('alertTriangle', 28)} Incident Management</h1>
        <div class="sa-title-actions">
          <button class="btn btn-primary btn-sm" onclick="window._incToggleForm()">+ Create Incident</button>
        </div>
      </div>

      ${showForm ? renderCreateForm() : ''}

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        <div class="sa-metric-card sa-metric-red"><div class="sa-metric-body"><div class="sa-metric-value">${counts.open}</div><div class="sa-metric-label">Open</div></div></div>
        <div class="sa-metric-card sa-metric-orange"><div class="sa-metric-body"><div class="sa-metric-value">${counts.investigating}</div><div class="sa-metric-label">Investigating</div></div></div>
        <div class="sa-metric-card sa-metric-green"><div class="sa-metric-body"><div class="sa-metric-value">${counts.resolved}</div><div class="sa-metric-label">Resolved</div></div></div>
        <div class="sa-metric-card sa-metric-blue"><div class="sa-metric-body"><div class="sa-metric-value">${counts.closed}</div><div class="sa-metric-label">Closed</div></div></div>
      </div>

      <div class="sa-card">
        ${list.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--text-muted)">No incidents found</div>' : `
        <table class="sa-table">
          <thead>
            <tr><th>ID</th><th>Title</th><th>Severity</th><th>Assignee</th><th>Status</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${list.map(i => `
              <tr class="sa-row-clickable">
                <td><strong class="sa-code">${i.incident_id || i.id?.substring(0, 12) || '—'}</strong></td>
                <td>${i.title || i.description || '—'}</td>
                <td><span class="sa-score sa-score-${i.severity === 'critical' ? 'danger' : i.severity === 'high' ? 'warning' : i.severity === 'medium' ? 'info' : 'low'}">${i.severity || 'medium'}</span></td>
                <td>${i.assignee || i.assigned_to || '—'}</td>
                <td>
                  <select onchange="window._incStatus('${i.id}', this.value)" style="padding:2px 6px;border-radius:4px;border:1px solid var(--border-color,#334155);background:transparent;color:inherit;font-size:0.78rem;cursor:pointer">
                    ${['open', 'investigating', 'resolved', 'closed'].map(s => `<option value="${s}" ${i.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                  </select>
                </td>
                <td style="color:var(--text-secondary)">${timeAgo(i.created_at)}</td>
                <td>
                  <button class="btn btn-xs btn-ghost" onclick="window._incDelete('${i.id}')" title="Delete">🗑</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`}
      </div>
    </div>
  `;
}

export function renderPage() {
  return `<div id="incidents-root">${renderContent()}</div>`;
}

// ─── Global handlers ────────────────────────────────────────
window._incToggleForm = function () {
  showForm = !showForm;
  refresh();
};

window._incCreate = async function () {
  const title = document.getElementById('inc-title')?.value?.trim();
  if (!title) { alert('Title is required'); return; }
  const data = {
    title,
    description: document.getElementById('inc-desc')?.value?.trim() || '',
    severity: document.getElementById('inc-severity')?.value || 'medium',
    assignee: document.getElementById('inc-assignee')?.value?.trim() || '',
    runbook_key: document.getElementById('inc-runbook')?.value?.trim() || '',
  };
  try {
    await API.post('/ops/incidents', data);
    showForm = false;
    incidents = null;
    load();
  } catch (e) {
    alert('Failed to create incident: ' + (e.message || 'Unknown error'));
  }
};

window._incStatus = async function (id, status) {
  try {
    await API.put('/ops/incidents/' + id, { status });
    const inc = (incidents || []).find(i => i.id === id);
    if (inc) inc.status = status;
    refresh();
  } catch (e) {
    alert('Failed to update status');
    refresh();
  }
};

window._incDelete = async function (id) {
  if (!confirm('Delete this incident?')) return;
  try {
    await API.delete('/ops/incidents/' + id);
    incidents = (incidents || []).filter(i => i.id !== id);
    refresh();
  } catch (e) { alert('Failed to delete'); }
};
