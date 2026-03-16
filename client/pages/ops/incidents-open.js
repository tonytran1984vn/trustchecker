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
    _uuid: c.id,
    title: c.title || '',
    description: c.description || '',
    batch: c.affected_entity || '—',
    module: c.module || '—',
    region: (c.module || '').toUpperCase().slice(0, 3) || '—',
    assigned: c.assigned_to || '—',
    sla: c.sla_breached ? 'SLA Breached' : 'Within SLA',
    severity: sevMap[c.severity] || c.severity || 'medium',
    rawSeverity: c.severity || 'SEV3',
    status: c.status || 'open',
    created: c.created_at ? timeAgo(c.created_at) : '—',
    createdRaw: c.created_at,
    resolution: c.resolution || '',
    rootCause: c.root_cause || '',
  }));

  window._incCases = cases;

  const sevC = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e' };

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('alertTriangle', 28)} Open Cases${cases.length ? ` <span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400">(${cases.length})</span>` : ''}</h1>
        <div class="sa-title-actions">
          <button style="padding:6px 16px;border:none;border-radius:8px;background:#0d9488;color:#fff;font-size:0.78rem;font-weight:600;cursor:pointer" onclick="window._opsCreateTicket && window._opsCreateTicket()">+ Create Ticket</button>
        </div>
      </div>

      ${cases.length === 0 ? '<div class="sa-card" style="padding:2rem;text-align:center;color:var(--text-secondary)">No open incidents — all clear ✓</div>' : `
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>Case ID</th><th>Title</th><th>Entity</th><th>Module</th><th>Assigned</th><th>SLA</th><th>Severity</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            ${cases.map((c, i) => `
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
                  <button class="btn btn-xs btn-outline" onclick="window._viewIncident(${i})">View</button>
                  <button class="btn btn-xs btn-ghost" onclick="window._opsAssignIncident && window._opsAssignIncident('${c._uuid}')">Assign</button>
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
        <button style="padding:6px 16px;border:none;border-radius:8px;background:#0d9488;color:#fff;font-size:0.78rem;font-weight:600;cursor:pointer" onclick="window._opsSubmitTicket()">Create</button>
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

window._viewIncident = function(idx) {
  const c = window._incCases?.[idx];
  if (!c) return;
  const sevC = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e' };
  const sc = sevC[c.severity] || '#f59e0b';
  const modal = document.createElement('div');
  modal.id = '_inc_detail_modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div style="background:var(--card-bg,#fff);border-radius:14px;padding:28px 24px;width:560px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.25);border:1px solid var(--border-color,#e2e8f0)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 style="margin:0;font-size:1.1rem;color:var(--text-primary)">🎫 Case Detail</h3>
        <button onclick="document.getElementById('_inc_detail_modal')?.remove()" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-secondary);padding:4px 8px;border-radius:6px">✕</button>
      </div>
      <div style="display:grid;gap:14px">
        <div style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:10px;background:${sc}08;border:1px solid ${sc}20">
          <span style="font-weight:700;font-size:0.92rem;color:var(--text-primary);font-family:monospace">${c.id}</span>
          <span style="font-size:0.62rem;padding:2px 8px;border-radius:12px;font-weight:700;text-transform:uppercase;background:${sc}12;color:${sc}">${c.rawSeverity} — ${c.severity}</span>
          <span style="font-size:0.62rem;padding:2px 8px;border-radius:12px;font-weight:600;background:${c.status==='open'?'rgba(239,68,68,0.08)':'rgba(245,158,11,0.08)'};color:${c.status==='open'?'#ef4444':'#f59e0b'}">${c.status}</span>
        </div>
        <div>
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Title</div>
          <div style="font-size:0.92rem;font-weight:600;color:var(--text-primary)">${c.title}</div>
        </div>
        ${c.description ? `<div>
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Description</div>
          <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5">${c.description}</div>
        </div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Affected Entity</div>
            <div style="font-size:0.85rem;font-family:monospace;color:var(--text-primary)">${c.batch}</div>
          </div>
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Module</div>
            <div style="font-size:0.85rem;color:var(--text-primary)">${c.module}</div>
          </div>
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Assigned To</div>
            <div style="font-size:0.85rem;color:var(--text-primary)">${c.assigned}</div>
          </div>
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">SLA Status</div>
            <div style="font-size:0.85rem;font-weight:600;color:${c.sla==='SLA Breached'?'#ef4444':'#f59e0b'}">${c.sla}</div>
          </div>
        </div>
        ${c.resolution ? `<div>
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Resolution</div>
          <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5">${c.resolution}</div>
        </div>` : ''}
        ${c.rootCause ? `<div>
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Root Cause</div>
          <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5">${c.rootCause}</div>
        </div>` : ''}
        <div>
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Created</div>
          <div style="font-size:0.82rem;color:var(--text-secondary)">${c.created}</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px">
        <button onclick="document.getElementById('_inc_detail_modal')?.remove()" style="flex:1;padding:10px;background:var(--bg-secondary,#f1f5f9);color:var(--text-primary);border:1px solid var(--border-color,#e2e8f0);border-radius:8px;cursor:pointer;font-weight:500;font-size:0.85rem">Close</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
