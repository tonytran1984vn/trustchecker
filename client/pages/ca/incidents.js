/**
 * Company Admin – Incident Management (Tenant Scope)
 * ════════════════════════════════════════════════════
 * Real data from /api/ops/incidents
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let incidents = null, loading = false;

async function load() {
  if (loading) return; loading = true;
  try {
    const res = await API.get('/ops/incidents');
    incidents = Array.isArray(res) ? res : (res.incidents || []);
  } catch (e) { incidents = []; }
  loading = false;
  setTimeout(() => { const el = document.getElementById('incidents-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
}

function timeAgo(d) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), dd = Math.floor(h / 24);
  if (m < 1) return 'Just now'; if (m < 60) return m + 'm ago'; if (h < 24) return h + 'h ago'; return dd + 'd ago';
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
          <button class="btn btn-primary btn-sm">+ Create Incident</button>
        </div>
      </div>

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
                <td><span class="sa-status-pill sa-pill-${i.status === 'open' ? 'red' : i.status === 'investigating' ? 'orange' : i.status === 'resolved' ? 'green' : 'blue'}">${i.status || 'open'}</span></td>
                <td style="color:var(--text-secondary)">${timeAgo(i.created_at)}</td>
                <td>
                  <button class="btn btn-xs btn-outline">View</button>
                  <button class="btn btn-xs btn-ghost">⋯</button>
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
