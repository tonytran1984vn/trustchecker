/**
 * Ops – Incident History
 * Reads from workspace prefetch cache (_opsIncCache)
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
  // Try workspace cache (prefetched from /api/ops/incidents?status=closed)
  const cache = window._opsIncCache || window._opsMonCache || {};
  const raw = cache.closedCases?.incidents || [];

  const sevMap = { SEV1: 'critical', SEV2: 'high', SEV3: 'medium', SEV4: 'low' };
  const history = raw.map(h => ({
    id: h.incident_id || h.id,
    title: h.title || '',
    resolution: h.resolution || '—',
    severity: sevMap[h.severity] || h.severity || 'medium',
    status: h.status || 'resolved',
    duration: h.resolved_at && h.created_at ? formatDuration(new Date(h.resolved_at) - new Date(h.created_at)) : '—',
    resolved: h.resolved_at ? timeAgo(h.resolved_at) : '—',
  }));

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('scroll', 28)} Incident History${history.length ? ` <span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400">(${history.length})</span>` : ''}</h1></div>

      ${history.length === 0 ? '<div class="sa-card" style="padding:2rem;text-align:center;color:var(--text-secondary)">No resolved incidents yet</div>' : `
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>Case ID</th><th>Title</th><th>Resolution</th><th>Severity</th><th>Status</th><th>Duration</th><th>Resolved</th></tr></thead>
          <tbody>
            ${history.map(h => `
              <tr>
                <td class="sa-code">${h.id}</td>
                <td>${h.title}</td>
                <td style="font-size:0.78rem;color:var(--text-secondary)">${h.resolution}</td>
                <td><span class="sa-score sa-score-${h.severity === 'high' || h.severity === 'critical' ? 'danger' : h.severity === 'medium' ? 'warning' : 'low'}">${h.severity}</span></td>
                <td><span class="sa-status-pill sa-pill-${h.status === 'resolved' ? 'green' : h.status === 'escalated' ? 'orange' : 'blue'}">${h.status}</span></td>
                <td class="sa-code">${h.duration}</td>
                <td style="color:var(--text-secondary)">${h.resolved}</td>
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

function formatDuration(ms) {
  const hrs = Math.floor(ms / 3600000);
  if (hrs < 1) return `${Math.floor(ms / 60000)}m`;
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}
