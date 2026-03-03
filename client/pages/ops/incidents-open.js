/**
 * Ops – Open Incident Cases
 * Reads from workspace prefetch cache (_opsIncCache or _opsMonCache)
 */
import { icon } from '../../core/icons.js';

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
          <button class="btn btn-primary btn-sm" onclick="showToast('🧴 Incident ticket creation coming soon','info')">+ Create Ticket</button>
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
                  <button class="btn btn-xs btn-ghost" onclick="showToast('Assign: ${c.id} — coming soon','info')">Assign</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    </div>
  `;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
