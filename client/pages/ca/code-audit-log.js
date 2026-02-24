/**
 * Company Admin – Code Audit Log
 * Real data from /api/audit-log (filtered to code-related actions)
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let logs = null, loading = false;

async function load() {
  if (loading) return; loading = true;
  try {
    const res = await API.get('/audit-log?limit=100');
    const all = Array.isArray(res) ? res : (res.logs || res.entries || []);
    logs = all;
  } catch (e) { logs = []; }
  loading = false;
  setTimeout(() => { const el = document.getElementById('code-audit-log-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
}

function renderContent() {
  if (!logs && !loading) { load(); }
  if (loading && !logs) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Code Audit Log...</div></div>`;

  const list = logs || [];
  const codeActions = list.filter(l => {
    const a = (l.action || '').toLowerCase();
    return a.includes('code') || a.includes('qr') || a.includes('generate') || a.includes('lock') || a.includes('revoke') || a.includes('batch') || a.includes('format');
  });
  const displayList = codeActions.length > 0 ? codeActions : list;

  const actionColors = {
    'code_generate': '#3b82f6', 'code_lock': '#ef4444', 'code_revoke': '#991b1b',
    'code_flag': '#f59e0b', 'qr_create': '#3b82f6', 'batch_create': '#22c55e',
  };

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('scroll', 28)} Code Audit Log</h1><div class="sa-title-actions"><button class="btn btn-outline btn-sm">Export Signed Audit</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Total Actions', String(list.length), 'All audit entries', 'blue', 'scroll')}
        ${m('Code Actions', String(codeActions.length), 'Code-related events', 'green', 'zap')}
      </div>

      <div class="sa-card">
        <h3>📋 Audit Trail</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Immutable record of all code lifecycle events.</p>
        ${displayList.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--text-muted)">No audit log entries found</div>' : `
        <table class="sa-table"><thead><tr><th>Timestamp</th><th>Action</th><th>Actor</th><th>Detail</th><th>IP</th></tr></thead><tbody>
          ${displayList.slice(0, 30).map(l => {
    const action = (l.action || '').toLowerCase().replace(/_/g, '.');
    const color = actionColors[l.action] || '#64748b';
    const details = typeof l.details === 'string' ? (() => { try { return JSON.parse(l.details); } catch (e) { return {}; } })() : (l.details || {});
    const detailStr = Object.entries(details).slice(0, 3).map(([k, v]) => k + ': ' + v).join(', ') || '—';
    return `<tr>
              <td class="sa-code" style="font-size:0.72rem;white-space:nowrap">${l.created_at ? new Date(l.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
              <td><span class="sa-status-pill" style="background:${color}12;color:${color};border:1px solid ${color}25;font-size:0.68rem">${(l.action || '').replace(/_/g, ' ')}</span></td>
              <td style="font-size:0.78rem">${l.actor_id?.substring(0, 8) || '—'}</td>
              <td style="font-size:0.78rem;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${detailStr}</td>
              <td class="sa-code" style="font-size:0.72rem">${l.ip_address || '—'}</td>
            </tr>`;
  }).join('')}
        </tbody></table>`}
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }

export function renderPage() {
  return `<div id="code-audit-log-root">${renderContent()}</div>`;
}
