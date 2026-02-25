/**
 * Approval Queue — Dual-Control for High-Risk Role Assignments
 * Calls: GET /api/tenant/approvals
 * Actions: POST /api/tenant/approvals/:id/approve | reject
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { showToast } from '../../components/toast.js';

let _approvals = null, _loading = false;

export function renderPage() {
    if (!_approvals && !_loading) { _load(); }
    return `<div id="approval-queue-root">${_render()}</div>`;
}

async function _load() {
    _loading = true;
    try {
        const res = await API.get('/tenant/approvals');
        _approvals = res.approvals || [];
    } catch (e) { _approvals = []; }
    _loading = false;
    const el = document.getElementById('approval-queue-root');
    if (el) el.innerHTML = _render();
}

function _render() {
    if (_loading && !_approvals) return `<div style="text-align:center;padding:60px;color:var(--text-muted)"><div class="spinner"></div> Loading approvals...</div>`;

    const list = _approvals || [];
    const pending = list.filter(a => a.status === 'pending');
    const resolved = list.filter(a => a.status !== 'pending');

    return `
    <div class="sa-page" style="max-width:1000px">
      <div class="sa-page-title">
        <h1>${icon('check', 28)} Role Approval Queue</h1>
        <div class="sa-title-actions">
          <button class="btn btn-ghost btn-sm" onclick="window._aqRefresh()">↻ Refresh</button>
        </div>
      </div>

      <!-- ═══ PENDING ═══ -->
      <div class="sa-card" style="margin-bottom:1rem">
        <h3 style="margin:0 0 12px;display:flex;align-items:center;gap:8px">
          ⏳ Pending Approvals
          ${pending.length > 0 ? `<span style="background:rgba(249,115,22,0.15);color:#f97316;font-size:0.72rem;padding:2px 10px;border-radius:10px;font-weight:600">${pending.length}</span>` : ''}
        </h3>
        ${pending.length === 0 ? `
          <div style="text-align:center;padding:30px;color:var(--text-muted);font-size:0.82rem">
            ${icon('check', 28)}<br>No pending role approvals. All clear!
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:8px">
            ${pending.map(a => _renderApproval(a, true)).join('')}
          </div>
        `}
      </div>

      <!-- ═══ RESOLVED ═══ -->
      ${resolved.length > 0 ? `
        <div class="sa-card">
          <h3 style="margin:0 0 12px;display:flex;align-items:center;gap:8px">
            📋 Resolved
            <span style="font-size:0.7rem;color:var(--text-muted);font-weight:400">${resolved.length} items</span>
          </h3>
          <div style="display:flex;flex-direction:column;gap:6px;max-height:320px;overflow-y:auto">
            ${resolved.map(a => _renderApproval(a, false)).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function _renderApproval(a, showActions) {
    const statusMap = {
        pending: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', label: 'Pending', icon: '⏳' },
        approved: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Approved', icon: '✅' },
        rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Rejected', icon: '❌' },
    };
    const st = statusMap[a.status] || statusMap.pending;
    const time = a.created_at ? new Date(a.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const resolvedTime = a.resolved_at ? new Date(a.resolved_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    return `
    <div style="padding:14px 16px;background:${st.bg};border-radius:10px;border-left:3px solid ${st.color}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:1rem">${st.icon}</span>
            <span style="font-weight:700;color:${st.color};font-size:0.85rem">${(a.role_name || '').replace(/_/g, ' ').toUpperCase()}</span>
            <span style="font-size:0.68rem;padding:2px 8px;border-radius:8px;background:${st.color}20;color:${st.color};font-weight:600">${st.label}</span>
          </div>
          <div style="font-size:0.78rem;color:var(--text-secondary);display:flex;gap:16px;flex-wrap:wrap">
            <span>👤 Target: <strong>${a.target_user || 'Unknown'}</strong></span>
            <span>📩 Requested by: <strong>${a.requester_name || 'Unknown'}</strong></span>
            <span>🕐 ${time}</span>
          </div>
          ${a.reason ? `<div style="font-size:0.72rem;color:#94a3b8;margin-top:4px;font-style:italic">Reason: ${a.reason}</div>` : ''}
          ${resolvedTime && a.status !== 'pending' ? `<div style="font-size:0.68rem;color:#94a3b8;margin-top:2px">Resolved: ${resolvedTime}</div>` : ''}
          ${a.expires_at ? `<div style="font-size:0.68rem;color:#f59e0b;margin-top:2px">⏰ Expires: ${new Date(a.expires_at).toLocaleDateString()}</div>` : ''}
        </div>
        ${showActions ? `
          <div style="display:flex;gap:6px;align-items:center">
            <button class="btn btn-primary btn-sm" onclick="window._aqApprove('${a.id}')" style="font-size:0.75rem;padding:6px 14px">
              ✓ Approve
            </button>
            <button class="btn btn-ghost btn-sm" onclick="window._aqReject('${a.id}')" style="font-size:0.75rem;padding:6px 14px;color:#ef4444;border-color:#ef4444">
              ✕ Reject
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

window._aqRefresh = () => { _approvals = null; _loading = false; _load(); };

window._aqApprove = async (id) => {
    try {
        const res = await API.post(`/tenant/approvals/${id}/approve`);
        showToast(`✅ Role approved: ${res.role || 'Unknown'}`, 'success');
        _load();
    } catch (e) {
        const msg = e.response?.data?.error || e.message || 'Approval failed';
        showToast(`❌ ${msg}`, 'error');
    }
};

window._aqReject = async (id) => {
    const reason = prompt('Rejection reason (required):');
    if (!reason) return;
    try {
        await API.post(`/tenant/approvals/${id}/reject`, { reason });
        showToast('❌ Role assignment rejected', 'warning');
        _load();
    } catch (e) {
        const msg = e.response?.data?.error || e.message || 'Rejection failed';
        showToast(`❌ ${msg}`, 'error');
    }
};
