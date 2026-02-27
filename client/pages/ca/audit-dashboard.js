/**
 * Company Admin – Audit Dashboard
 * ═════════════════════════════════
 * Audit KPIs, action distribution, top users, daily activity, critical events
 * API: /governance/audit-summary
 */
import { API as api } from '../../core/api.js';

let _data = null;

export function renderPage() {
    if (!_data) { loadData(); return loading(); }
    const d = _data;

    return `
    <div class="page-content stagger-in">
      <div class="page-header"><h1>🔍 Audit Dashboard</h1><p class="desc">System activity overview & audit trail summary</p></div>

      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
        ${auditKpi('Total Events', d.total_events.toLocaleString(), '📝', '#6366f1')}
        ${auditKpi('Active Users (7d)', d.active_users_7d, '👥', '#22c55e')}
        ${auditKpi('Login Failures (30d)', d.login_failures_30d, '🚫', d.login_failures_30d > 10 ? '#ef4444' : '#f59e0b')}
      </div>

      <!-- Daily Activity Chart -->
      ${d.daily_activity.length > 1 ? `
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><div class="card-title">📈 Daily Activity (30 days)</div></div>
        <div style="padding:16px">${renderActivityBars(d.daily_activity)}</div>
      </div>` : ''}

      <!-- Action Distribution + Top Users -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <!-- Action Distribution -->
        <div class="card">
          <div class="card-header"><div class="card-title">📊 Action Distribution</div></div>
          <div style="padding:16px">
            ${d.action_distribution.length > 0 ? d.action_distribution.map(a => {
        const maxC = d.action_distribution[0]?.count || 1;
        const pct = Math.round(a.count / maxC * 100);
        const label = a.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        return `
              <div style="margin-bottom:8px">
                <div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:3px">
                  <span style="font-weight:600">${label}</span>
                  <span style="color:var(--text-muted)">${a.count}</span>
                </div>
                <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
                  <div style="width:${pct}%;height:100%;background:#6366f1;border-radius:3px"></div>
                </div>
              </div>`;
    }).join('') : '<div style="color:var(--text-muted);font-size:0.82rem;padding:12px 0">No audit events recorded</div>'}
          </div>
        </div>

        <!-- Top Users -->
        <div class="card">
          <div class="card-header"><div class="card-title">👤 Most Active Users</div></div>
          <div class="table-container">
            <table>
              <thead><tr><th>User</th><th>Events</th></tr></thead>
              <tbody>
                ${d.top_users.map((u, i) => `
                <tr>
                  <td>
                    <div style="font-weight:600">${u.username}</div>
                    <div style="font-size:0.68rem;color:var(--text-muted)">${u.email}</div>
                  </td>
                  <td style="font-weight:700;color:${i === 0 ? '#6366f1' : 'var(--text-primary)'}">${u.events}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Critical / High-Risk Events -->
      ${d.recent_critical.length > 0 ? `
      <div class="card">
        <div class="card-header">
          <div class="card-title">⚠️ Security & Role Events</div>
        </div>
        <div class="table-container" style="max-height:350px;overflow-y:auto">
          <table>
            <thead><tr><th>Action</th><th>Actor</th><th>Details</th><th>Time</th></tr></thead>
            <tbody>
              ${d.recent_critical.map(e => {
        const isBlock = e.action.includes('BLOCKED');
        const color = isBlock ? '#ef4444' : e.action.includes('REMOVED') ? '#f59e0b' : '#22c55e';
        return `
                <tr>
                  <td><span style="font-size:0.72rem;font-weight:600;padding:2px 8px;border-radius:6px;background:${color}15;color:${color}">${e.action.replace(/_/g, ' ')}</span></td>
                  <td style="font-weight:600">${e.actor}</td>
                  <td style="font-size:0.72rem;color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.details}</td>
                  <td style="font-size:0.72rem;color:var(--text-muted)">${timeAgo(e.timestamp)}</td>
                </tr>`;
    }).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}

      <!-- Link to full access logs -->
      <div style="text-align:center;margin-top:20px">
        <a href="#" onclick="event.preventDefault();window.navigate&&window.navigate('ca-access-logs')" style="color:#6366f1;font-weight:600;font-size:0.85rem;text-decoration:none">
          🔗 View Full Access Logs →
        </a>
      </div>
    </div>
  `;
}

function auditKpi(label, value, emoji, color) {
    return `
    <div class="card" style="text-align:center;padding:20px;border-left:3px solid ${color}">
      <div style="font-size:1.6rem;margin-bottom:4px">${emoji}</div>
      <div style="font-size:1.5rem;font-weight:800;color:${color}">${value}</div>
      <div style="font-size:0.78rem;font-weight:600;margin-top:4px">${label}</div>
    </div>`;
}

function renderActivityBars(series) {
    const mx = Math.max(...series.map(d => d.events), 1);
    const labelEvery = Math.max(1, Math.ceil(series.length / 10));
    return `
    <div style="display:flex;align-items:end;gap:3px;height:100px">
      ${series.map((d, i) => {
        const h = Math.max(2, (d.events / mx) * 85);
        const dt = new Date(d.day);
        return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px">
          <div style="width:100%;height:${h}px;background:#6366f1;border-radius:3px 3px 0 0;opacity:0.5"></div>
          ${i % labelEvery === 0 ? `<div style="font-size:0.5rem;color:var(--text-muted)">${dt.getDate()}/${dt.getMonth() + 1}</div>` : ''}
        </div>`;
    }).join('')}
    </div>`;
}

function timeAgo(ts) {
    if (!ts) return '—';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
}

async function loadData() {
    try {
        _data = await api.get('/tenant/governance/audit-summary');
        const el = document.getElementById('main-content');
        if (el) el.innerHTML = renderPage();
    } catch (e) { console.error('[Audit]', e); }
}

function loading() {
    return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading audit dashboard...</span></div>';
}
