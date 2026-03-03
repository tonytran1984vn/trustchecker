/**
 * Ops – Activity Log (Team Audit Trail)
 * ═══════════════════════════════════════
 * Reads from /api/ops/data/activity-log (audit_log table)
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let _activities = null;

async function loadActivities() {
  if (_activities) return _activities;
  try {
    const res = await API.get('/ops/data/activity-log');
    _activities = (res.activities || []).map(a => ({
      user: a.actor_id || 'system',
      action: (a.action || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      target: a.entity_id || '—',
      detail: formatDetails(a.action, a.details),
      time: timeAgo(a.timestamp),
      type: actionType(a.action),
    }));
    return _activities;
  } catch (e) {
    return [];
  }
}

// Kick off load immediately
loadActivities();

function actionType(action) {
  if (!action) return 'system';
  const a = action.toLowerCase();
  if (a.includes('create') || a.includes('batch_created')) return 'create';
  if (a.includes('confirm') || a.includes('transfer_confirmed')) return 'confirm';
  if (a.includes('approve') || a.includes('qc_approved')) return 'approve';
  if (a.includes('escalat')) return 'escalate';
  if (a.includes('recall') || a.includes('critical')) return 'critical';
  if (a.includes('update') || a.includes('split') || a.includes('modify')) return 'modify';
  if (a.includes('mismatch') || a.includes('warning')) return 'warning';
  return 'system';
}

function formatDetails(action, details) {
  if (!details || typeof details === 'string') return details || '';
  const d = typeof details === 'object' ? details : {};
  const parts = [];
  for (const [k, v] of Object.entries(d)) {
    if (v !== null && v !== undefined && v !== '') {
      parts.push(`${k.replace(/_/g, ' ')}: ${v}`);
    }
  }
  return parts.join(' · ') || '';
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function renderPage() {
  const activities = _activities || [];

  const typeColors = { create: '#22c55e', confirm: '#3b82f6', approve: '#10b981', escalate: '#f59e0b', critical: '#ef4444', modify: '#8b5cf6', warning: '#f59e0b', system: '#64748b' };
  const typeIcons = { create: '➕', confirm: '✅', approve: '✓', escalate: '⬆️', critical: '🚨', modify: '✏️', warning: '⚠️', system: '🤖' };

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('scroll', 28)} Activity Log${activities.length ? ` <span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400">(${activities.length})</span>` : ''}</h1>
        <div class="sa-title-actions">
          <button class="btn btn-outline btn-sm" onclick="showToast('📥 Exporting activity log as CSV…','info')">📥 Export Log</button>
        </div>
      </div>

      <!-- Filters -->
      <div style="display:flex;gap:8px;margin-bottom:1.5rem;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary" onclick="showToast('Showing all activity','info')">All Activity</button>
        <button class="btn btn-sm btn-outline" onclick="showToast('Filtering: My actions only','info')">My Actions</button>
        <button class="btn btn-sm btn-outline" onclick="showToast('Filtering: Critical events','info')">🚨 Critical</button>
        <button class="btn btn-sm btn-outline" onclick="showToast('Filtering: Batch events','info')">📦 Batches</button>
        <button class="btn btn-sm btn-outline" onclick="showToast('Filtering: Transfer events','info')">🚚 Transfers</button>
        <button class="btn btn-sm btn-outline" onclick="showToast('Filtering: Incident events','info')">🧾 Incidents</button>
      </div>

      ${activities.length === 0 ? '<div class="sa-card" style="padding:2rem;text-align:center;color:var(--text-secondary)">Loading activity log…</div>' : `
      <!-- Activity Timeline -->
      <div class="sa-card">
        ${activities.map((a, i) => `
          <div style="display:flex;gap:14px;padding:12px 0;${i < activities.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.04)' : ''}">
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:32px">
              <span style="font-size:1.2rem">${typeIcons[a.type] || '🤖'}</span>
              ${i < activities.length - 1 ? '<div style="width:2px;flex:1;background:rgba(255,255,255,0.06);border-radius:1px"></div>' : ''}
            </div>
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                  <span style="font-weight:600;font-size:0.85rem;color:${typeColors[a.type] || '#64748b'}">${a.action}</span>
                  <span class="sa-code" style="margin-left:6px;font-size:0.8rem">${a.target}</span>
                </div>
                <span style="font-size:0.7rem;color:var(--text-secondary);white-space:nowrap">${a.time}</span>
              </div>
              <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px">${a.detail}</div>
              <div style="font-size:0.68rem;color:var(--text-muted,#64748b);margin-top:2px">${a.user}</div>
            </div>
          </div>
        `).join('')}
      </div>`}
    </div>
  `;
}
