/**
 * Super Admin – Access Logs (Cross-Tenant & Impersonation)
 * Pulls real data from /api/platform/audit
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let _logs = null;
let _loading = false;

async function fetchLogs() {
  if (_loading) return;
  _loading = true;
  try {
    const res = await API.get('/platform/audit?limit=50');
    _logs = (res.logs || []).map(l => ({
      time: formatTime(l.timestamp || l.created_at),
      actor: l.actor_name || l.actor_id?.substring(0, 8) || 'System',
      action: l.action || 'Unknown',
      entity: `${l.entity_type || ''} ${l.entity_id?.substring(0, 8) || ''}`.trim(),
      details: parseDetails(l.details),
      ip: l.ip_address || '—'
    }));
  } catch (e) {
    console.error('Access logs fetch error:', e);
    _logs = [];
  }
  _loading = false;
  const el = document.getElementById('access-logs-root');
  if (el) el.innerHTML = renderContent();
}

function formatTime(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 172800000) return 'Yesterday ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch { return ts; }
}

function parseDetails(d) {
  if (!d) return '';
  try {
    const obj = typeof d === 'string' ? JSON.parse(d) : d;
    return Object.entries(obj).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ');
  } catch { return String(d); }
}

function actionPill(action) {
  const a = (action || '').toUpperCase();
  if (a.includes('DELETE') || a.includes('SUSPEND')) return `<span class="sa-status-pill sa-pill-red">${action}</span>`;
  if (a.includes('CREATE') || a.includes('ACTIVATE')) return `<span class="sa-status-pill sa-pill-green">${action}</span>`;
  if (a.includes('UPDATE') || a.includes('RESET') || a.includes('TOGGLE')) return `<span class="sa-status-pill sa-pill-orange">${action}</span>`;
  return `<span class="sa-status-pill sa-pill-blue">${action}</span>`;
}

function renderContent() {
  if (!_logs || _logs.length === 0) {
    return `
        <div class="sa-card">
            <h3>Cross-Organization Access & Audit Log</h3>
            <div class="sa-empty-state">${_loading ? 'Loading audit logs...' : 'No audit logs available'}</div>
        </div>`;
  }
  return `
    <div class="sa-card">
        <h3 style="display:flex;align-items:center;gap:8px">
            Cross-Organization Access & Audit Log
            <span class="sa-status-pill sa-pill-blue" style="font-size:0.65rem">${_logs.length} entries</span>
        </h3>
        <table class="sa-table">
            <thead>
                <tr><th>Time</th><th>User</th><th>Action</th><th>Target</th><th>Details</th><th>IP</th></tr>
            </thead>
            <tbody>
                ${_logs.map(l => `
                <tr>
                    <td style="white-space:nowrap">${l.time}</td>
                    <td><strong>${l.actor}</strong></td>
                    <td>${actionPill(l.action)}</td>
                    <td>${l.entity || '—'}</td>
                    <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${l.details}">${l.details || '—'}</td>
                    <td class="sa-code">${l.ip}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>
    <div class="sa-card" style="margin-top:1rem">
        <h3>Cross-Organization Access Policy</h3>
        <div class="sa-detail-grid">
            <div class="sa-detail-item"><span class="sa-detail-label">Reason Required</span><span class="sa-mfa-on">Mandatory</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Time Limit</span><span>30 minutes per session</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Auto-Log</span><span class="sa-mfa-on">All actions recorded</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Notification</span><span>Organization Admin notified on entry/exit</span></div>
        </div>
    </div>`;
}

export function renderPage() {
  setTimeout(() => fetchLogs(), 50);
  return `
    <div class="sa-page">
        <div class="sa-page-title"><h1>${icon('scroll', 28)} Access Logs</h1></div>
        <div id="access-logs-root">
            <div class="sa-card">
                <div class="sa-empty-state">Loading audit logs...</div>
            </div>
        </div>
    </div>
    `;
}
