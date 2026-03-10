/**
 * Ops – Open Incident Cases
 * Reads from workspace prefetch cache (_opsIncCache or _opsMonCache)
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

export function renderPage() {
  // Try workspace cache (prefetched from /api/ops/incidents?status=open)
  const cache = window._opsIncCache || window._opsMonCache || {};
  const raw = cache.openCases?.incidents || [];

  // Derive severity/status labels
  const sevMap = { SEV1: 'critical', SEV2: 'high', SEV3: 'medium', SEV4: 'low' };
  const cases = raw.map(c => ({
    id: c.incident_id || c.id,
    title: c.title || '',
    batch: c.affected_entity || '—',
    region: (c.module || '').toUpperCase().slice(0, 3) || '—',
    assigned: c.assigned_to || '—',
    sla: c.sla_breached ? 'SLA Breached' : 'Within SLA',
    severity: sevMap[c.severity] || c.severity || 'medium',
    status: c.status || 'open',
    created: c.created_at ? timeAgo(c.created_at) : '—',
  }));

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('alertTriangle', 28)} Open Cases${cases.length ? ` <span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400">(${cases.length})</span>` : ''}</h1>
        <div class="sa-title-actions">
          <button class="btn btn-primary btn-sm" onclick="window._opsCreateTicket && window._opsCreateTicket()">+ Create Ticket</button>
        </div>
      </div>

      ${cases.length === 0 ? '<div class="sa-card" style="padding:2rem;text-align:center;color:var(--text-secondary)">No open incidents — all clear ✓</div>' : `
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>Case ID</th><th>Title</th><th>Entity</th><th>Module</th><th>Assigned</th><th>SLA</th><th>Severity</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            ${cases.map(c => `
              <tr class="sa-row-clickable">
                <td><strong class="sa-code">${c.id}</strong></td>
                <td>${c.title}</td>
                <td class="sa-code">${c.batch}</td>
                <td>${c.region}</td>
                <td style="font-size:0.78rem">${c.assigned}</td>
                <td><span style="color:${c.sla === 'SLA Breached' ? '#ef4444' : '#f59e0b'};font-weight:600;font-size:0.78rem">${c.sla}</span></td>
                <td><span class="sa-score sa-score-${c.severity === 'critical' ? 'danger' : c.severity === 'high' ? 'warning' : 'info'}">${c.severity}</span></td>
                <td><span class="sa-status-pill sa-pill-${c.status === 'open' ? 'red' : 'orange'}">${c.status}</span></td>
                <td style="color:var(--text-secondary);font-size:0.75rem">${c.created}</td>
                <td>
                  <button class="btn btn-xs btn-outline" onclick="showToast('Viewing incident: ${c.id}','info')">View</button>
                  <button class="btn btn-xs btn-ghost" onclick="window._opsAssignIncident && window._opsAssignIncident('${c.id}')">Assign</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    </div>
  `;
}

// ─── Create Ticket Form ────────────────────────────────────────
window._opsCreateTicket = function () {
  const modal = document.createElement('div');
  modal.id = 'ops-ticket-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5)';
  modal.innerHTML = `
    <div style="background:var(--card-bg, #fff);border-radius:12px;padding:24px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      <h3 style="margin:0 0 16px">🎫 Create Incident Ticket</h3>
      <div style="display:flex;flex-direction:column;gap:12px">
        <input id="_t_title" placeholder="Incident title" style="padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem">
        <textarea id="_t_desc" placeholder="Description" rows="3" style="padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem;resize:vertical"></textarea>
        <select id="_t_sev" style="padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem">
          <option value="SEV3">Medium (SEV3)</option>
          <option value="SEV1">Critical (SEV1)</option>
          <option value="SEV2">High (SEV2)</option>
          <option value="SEV4">Low (SEV4)</option>
        </select>
        <input id="_t_module" placeholder="Module (e.g. logistics, warehouse)" style="padding:10px 12px;border-radius:8px;border:1px solid var(--border, #e2e8f0);background:var(--bg, #fff);color:var(--text-primary, #1e293b);font-size:0.9rem">
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('ops-ticket-modal')?.remove()">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="window._opsSubmitTicket()">Create</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
};

window._opsSubmitTicket = async function () {
  const title = document.getElementById('_t_title')?.value;
  const description = document.getElementById('_t_desc')?.value;
  const severity = document.getElementById('_t_sev')?.value;
  const module = document.getElementById('_t_module')?.value;
  if (!title) { showToast('Title is required', 'error'); return; }
  try {
    await api.post('/ops/data/incidents', { title, description, severity, module });
    showToast('✅ Incident created', 'success');
    document.getElementById('ops-ticket-modal')?.remove();
    // Refresh workspace
    if (window._opsIncRefresh) window._opsIncRefresh();
  } catch (e) { showToast('Failed to create incident', 'error'); }
};

window._opsAssignIncident = async function (id) {
  const assignee = prompt('Assign to (email or name):');
  if (!assignee) return;
  try {
    await api.put(`/ops/data/incidents/${id}`, { status: 'assigned', resolution: `Assigned to ${assignee}` });
    showToast(`✅ ${id} assigned to ${assignee}`, 'success');
  } catch (e) { showToast('Failed to assign', 'error'); }
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
