/**
 * Governance Dashboard — Real-time governance health monitoring
 * Calls: GET /api/tenant/governance/dashboard
 * Shows: SoD warnings, pending approvals, role distribution, high-severity events
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { injectMyActionsWidget } from '../../components/my-actions-widget.js';

let _data = null, _loading = false;

export function renderPage() {
  if (!_data && !_loading) { _load(); }
  return `<div id="gov-dash-root">${_renderContent()}</div>`;
}

async function _load() {
  _loading = true;
  try {
    if (window._caGovReady) { try { await window._caGovReady; } catch { } }
    const gc = window._caGovCache;
    if (gc?.dashboard && gc._loadedAt && !_data) { _data = gc.dashboard; }
    else { _data = await API.get('/tenant/governance/dashboard'); }
  } catch (e) {
    _data = { pending_approvals: 0, sod_warnings: [], sod_warning_count: 0, high_severity_events: [], total_users: 0, role_distribution: [] };
  }
  _loading = false;
  const el = document.getElementById('gov-dash-root');
  if (el) el.innerHTML = _renderContent();
  setTimeout(() => injectMyActionsWidget('my-actions-widget'), 100);
}

function _renderContent() {
  if (_loading && !_data) return `<div style="text-align:center;padding:60px;color:var(--text-muted)"><div class="spinner"></div> Loading Governance Dashboard...</div>`;
  const d = _data || {};

  const pending = d.pending_approvals || 0;
  const sodCount = d.sod_warning_count || 0;
  const totalUsers = d.total_users || 0;
  const events = d.high_severity_events || [];
  const roles = d.role_distribution || [];
  const sodWarnings = d.sod_warnings || [];

  return `
    <div class="sa-page" style="max-width:1100px">
      <div id="my-actions-widget" style="display:none"></div>
      <div class="sa-page-title">
        <h1>${icon('shield', 28)} Governance Dashboard</h1>
        <div class="sa-title-actions">
          <button class="btn btn-ghost btn-sm" onclick="window._govRefresh()">↻ Refresh</button>
        </div>
      </div>

      <!-- ═══ METRICS ROW ═══ -->
      <div class="sa-metrics-row" style="margin-bottom:1.25rem">
        ${_metricCard('⏳', 'Pending Approvals', pending, pending > 0 ? 'orange' : 'green', pending > 0 ? 'Requires org_owner / security_officer action' : 'All clear')}
        ${_metricCard('⚠️', 'SoD Conflicts', sodCount, sodCount > 0 ? 'red' : 'green', sodCount > 0 ? 'Users with conflicting permissions' : 'No conflicts detected')}
        ${_metricCard('👥', 'Total Users', totalUsers, 'blue', 'Active tenant users')}
        ${_metricCard('🛡️', 'Security Events', events.length, events.length > 0 ? 'purple' : 'green', 'Recent high-severity audit events')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <!-- ═══ SOD WARNINGS ═══ -->
        <div class="sa-card" style="grid-column:${sodCount > 0 ? '1' : '1 / -1'}">
          <h3 style="margin:0 0 12px;display:flex;align-items:center;gap:8px">
            ${icon('alert', 18)} Separation of Duties Warnings
            ${sodCount > 0 ? `<span style="background:rgba(239,68,68,0.15);color:#ef4444;font-size:0.7rem;padding:2px 8px;border-radius:10px;font-weight:600">${sodCount} conflict${sodCount > 1 ? 's' : ''}</span>` : '<span style="color:#10b981;font-size:0.75rem">✓ Clean</span>'}
          </h3>
          ${sodCount === 0 ? `
            <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.8rem">
              ${icon('check', 32)}<br>No SoD conflicts detected. All users have clean permission sets.
            </div>
          ` : `
            <div style="max-height:260px;overflow-y:auto">
              ${sodWarnings.map(w => `
                <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:6px;background:rgba(239,68,68,0.06);border-radius:8px;border-left:3px solid #ef4444">
                  <span style="font-weight:600;color:#ef4444;min-width:100px;font-size:0.78rem">${w.user}</span>
                  <span style="font-size:0.72rem;color:var(--text-secondary)">${w.conflict[0]} ↔ ${w.conflict[1]}</span>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- ═══ ROLE DISTRIBUTION ═══ -->
        <div class="sa-card">
          <h3 style="margin:0 0 12px;display:flex;align-items:center;gap:8px">
            ${icon('users', 18)} Role Distribution
          </h3>
          ${roles.length === 0 ? `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.8rem">No roles configured</div>` : `
            <div style="max-height:260px;overflow-y:auto">
              ${roles.map((r, i) => {
    const maxCount = Math.max(...roles.map(x => x.count || 0), 1);
    const pct = Math.round(((r.count || 0) / maxCount) * 100);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444', '#6366f1'];
    const color = colors[i % colors.length];
    return `
                  <div style="margin-bottom:8px">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
                      <span style="font-size:0.78rem;font-weight:500">${r.display_name || r.name}</span>
                      <span style="font-size:0.72rem;color:var(--text-secondary);font-weight:600">${r.count || 0}</span>
                    </div>
                    <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
                      <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width 0.5s ease"></div>
                    </div>
                  </div>`;
  }).join('')}
            </div>
          `}
        </div>
      </div>

      <!-- ═══ HIGH-SEVERITY EVENTS ═══ -->
      <div class="sa-card" style="margin-top:1rem">
        <h3 style="margin:0 0 12px;display:flex;align-items:center;gap:8px">
          ${icon('scroll', 18)} High-Severity Security Events
          <span style="font-size:0.7rem;color:var(--text-muted);font-weight:400">Last 20 events</span>
        </h3>
        ${events.length === 0 ? `
          <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.8rem">No high-severity events recorded</div>
        ` : `
          <div style="max-height:320px;overflow-y:auto">
            ${events.map(e => {
    const actionColors = {
      'SELF_ELEVATION_BLOCKED': '#ef4444',
      'PERMISSION_CEILING_BLOCKED': '#f59e0b',
      'HIGH_RISK_ROLE_PENDING': '#3b82f6',
      'HIGH_RISK_ROLE_APPROVED': '#10b981',
      'HIGH_RISK_ROLE_REJECTED': '#ef4444',
    };
    const actionIcons = {
      'SELF_ELEVATION_BLOCKED': '🚫',
      'PERMISSION_CEILING_BLOCKED': '🔒',
      'HIGH_RISK_ROLE_PENDING': '⏳',
      'HIGH_RISK_ROLE_APPROVED': '✅',
      'HIGH_RISK_ROLE_REJECTED': '❌',
    };
    const color = actionColors[e.action] || '#64748b';
    const ic = actionIcons[e.action] || '📌';
    const time = e.created_at ? new Date(e.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    let details = '';
    try { details = JSON.parse(e.details || '{}'); } catch (_) { details = {}; }
    return `
                <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;margin-bottom:4px;border-radius:8px;background:${color}08;border-left:3px solid ${color}">
                  <span style="font-size:1.1rem;margin-top:2px">${ic}</span>
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                      <span style="font-weight:600;font-size:0.78rem;color:${color}">${e.action.replace(/_/g, ' ')}</span>
                      <span style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap">${time}</span>
                    </div>
                    <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:2px">
                      Actor: <strong>${e.actor_name || 'system'}</strong>
                      ${details.role ? ` · Role: <strong>${details.role}</strong>` : ''}
                      ${details.target_user ? ` · User: ${details.target_user}` : ''}
                      ${details.reason ? ` · ${details.reason}` : ''}
                    </div>
                  </div>
                </div>`;
  }).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

function _metricCard(emoji, label, value, color, sub) {
  const colorMap = { green: '#10b981', red: '#ef4444', orange: '#f59e0b', blue: '#3b82f6', purple: '#8b5cf6' };
  const c = colorMap[color] || '#64748b';
  return `
    <div class="sa-metric-card" style="border-left:3px solid ${c}">
      <div class="sa-metric-body">
        <div style="font-size:1.4rem;margin-bottom:2px">${emoji}</div>
        <div class="sa-metric-value" style="color:${c}">${value}</div>
        <div class="sa-metric-label">${label}</div>
        <div style="font-size:0.65rem;color:var(--text-muted);margin-top:2px">${sub}</div>
      </div>
    </div>`;
}

window._govRefresh = () => { _data = null; _loading = false; _load(); };
