/**
 * Platform Admin - Predictive Ops Cockpit
 * Dark Military Aesthetic Dashboard (Institutional Heroism)
 */
import { API } from '../../core/api.js';
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

let data = null;
let loading = false;
let lastLoad = 0;

export async function preload() {
    if (loading) return;
    loading = true;
    try {
        const [canary, proposals, diffs, policyStats] = await Promise.all([
            API.get('/ops-intelligence/canary/status'),
            API.get('/ops-intelligence/proposals'),
            API.get('/ops-intelligence/diffs'),
            API.get('/ops-intelligence/policy-stats'),
        ]);

        data = { canary: canary.value || canary, proposals: proposals?.value?.proposals || proposals?.proposals || [], diffs: diffs?.value || diffs || {}, policyStats: policyStats?.value?.stats || policyStats?.stats || [] };
        lastLoad = Date.now();
    } catch (e) {
        console.error('[OpsCockpit] Error loading data', e);
        data = { canary: {}, proposals: [], diffs: { diffs: [], stats: [] }, policyStats: [] };
    }
    loading = false;
    // Targeted DOM patch — only update page content, NOT full app (prevents sidebar/header flicker)
    const pageBody = document.querySelector('.page-body');
    if (pageBody && State.page === 'sa-predictive-ops') {
        pageBody.innerHTML = renderPage();
    } else if (typeof window.render === 'function') {
        window.render();
    }
}

window.opsApprove = async function(id) {
    if (!confirm('Approve this autonomous action?')) return;
    
    // Optimistic DOM update
    const el = document.getElementById('prop-' + id);
    if (el) {
        el.style.transition = 'all 0.3s ease';
        el.style.opacity = '0';
        el.style.transform = 'translateY(-10px)';
        setTimeout(() => el.remove(), 300);
    }
    if (data && data.proposals) {
        data.proposals = data.proposals.filter(p => p.id !== id);
    }

    try {
        await API.post(`/ops-intelligence/proposals/${id}/approve`);
        API.get('/ops-intelligence/proposals', { noCache: true }).then(res => {
            if (data) data.proposals = res?.value?.proposals || res?.proposals || [];
        });
    } catch(e) { 
        alert('Approval failed: ' + e.message); 
        if (typeof window.render === 'function') window.render();
    }
};

window.opsReject = async function(id) {
    if (!confirm('Reject this proposal?')) return;
    
    // Optimistic DOM update
    const el = document.getElementById('prop-' + id);
    if (el) {
        el.style.transition = 'all 0.3s ease';
        el.style.opacity = '0';
        el.style.transform = 'translateY(-10px)';
        setTimeout(() => el.remove(), 300);
    }
    if (data && data.proposals) {
        data.proposals = data.proposals.filter(p => p.id !== id);
    }

    try {
        await API.post(`/ops-intelligence/proposals/${id}/reject`);
        API.get('/ops-intelligence/proposals', { noCache: true }).then(res => {
            if (data) data.proposals = res?.value?.proposals || res?.proposals || [];
        });
    } catch(e) { 
        alert('Rejection failed: ' + e.message); 
        if (typeof window.render === 'function') window.render();
    }
};

window.opsEngageKillSwitch = async function() {
    if (!confirm('CRITICAL WARNING: You are about to engage the P0 Kill Switch.\n\nAll traffic will route to rule-based fallback.\nCanary models will be sidelined.\n\nProceed?')) return;
    try {
        await API.post('/ops-intelligence/canary/kill-switch', { reason: 'Manual Executive Override' });
        preload();
    } catch (e) { alert('Kill switch engagement failed: ' + e.message); }
};

export function initPage() {
    if (!document.getElementById('predictive-ops-style')) {
        const style = document.createElement('style');
        style.id = 'predictive-ops-style';
        style.innerHTML = `
        .cockpit { font-family: 'Inter', var(--font-primary, sans-serif); color: #e2e8f0; }
        .cp-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
        .cp-title { font-size:1.6rem; font-weight:800; display:flex; align-items:center; gap:12px; color:#fff; text-transform:uppercase; letter-spacing:1px; }
        .cp-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
        .cp-card { background:#0f172a; border:1px solid #1e293b; border-radius:12px; overflow:hidden; position:relative; box-shadow:0 8px 32px rgba(0,0,0,0.5); }
        .cp-card::before { content:''; position:absolute; top:0; left:0; right:0; height:4px; background:linear-gradient(90deg, #3b82f6, #0ea5e9); }
        .cp-card.danger::before { background:linear-gradient(90deg, #ef4444, #b91c1c); }
        .cp-card.amber::before { background:linear-gradient(90deg, #f59e0b, #d97706); }
        .cp-card-hd { padding:16px 20px; border-bottom:1px solid #1e293b; display:flex; justify-content:space-between; align-items:center; }
        .cp-card-label { font-size:0.8rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; }
        .cp-card-bd { padding:20px; }
        .ks-container { display:flex; align-items:center; justify-content:space-between; }
        .ks-status { text-align:center; flex:1; }
        .ks-dial { width:120px; height:120px; border-radius:50%; border:12px solid #10b981; display:flex; align-items:center; justify-content:center; margin:0 auto; font-size:1.4rem; font-weight:900; color:#fff; font-family:'JetBrains Mono',monospace; text-shadow:0 0 10px #10b981; transition:all 0.3s; }
        .ks-dial.engaged { border-color:#ef4444; text-shadow:0 0 10px #ef4444; }
        .ks-btn { background:#b91c1c; color:#fff; border:none; padding:16px 32px; border-radius:8px; font-weight:800; font-size:1rem; cursor:pointer; text-transform:uppercase; box-shadow:0 4px 15px rgba(239,68,68,0.4); border-bottom:4px solid #7f1d1d; transition:all 0.1s; }
        .ks-btn:hover { background:#dc2626; transform:translateY(2px); border-bottom-width:2px; margin-top:2px; }
        .ks-btn:active { transform:translateY(4px); border-bottom-width:0px; margin-top:4px; }
        .prop-item { background:#1e293b; padding:14px; border-radius:8px; margin-bottom:12px; border-left:4px solid #3b82f6; display:flex; justify-content:space-between; align-items:center; }
        .prop-item.high { border-left-color:#ef4444; }
        .prop-item.medium { border-left-color:#f59e0b; }
        .prop-act { font-weight:700; color:#fff; font-family:'JetBrains Mono',monospace; }
        .prop-cause { font-size:0.75rem; color:#94a3b8; margin-top:4px; }
        .btn-sm { padding:6px 14px; border-radius:6px; font-size:0.7rem; font-weight:700; cursor:pointer; text-transform:uppercase; border:none; }
        .bs-appr { background:rgba(16,185,129,0.15); color:#34d399; }
        .bs-appr:hover { background:rgba(16,185,129,0.3); }
        .bs-rej { background:rgba(239,68,68,0.15); color:#f87171; }
        .bs-rej:hover { background:rgba(239,68,68,0.3); }
        .tbl { width:100%; border-collapse:collapse; font-size:0.75rem; }
        .tbl th { text-align:left; padding:8px 0; color:#64748b; font-weight:600; text-transform:uppercase; border-bottom:1px solid #1e293b; }
        .tbl td { padding:10px 0; border-bottom:1px solid #1e293b; color:#cbd5e1; font-family:'JetBrains Mono',monospace; }
        .dt-drift { color:#fbbf24; }
        .dt-regression { color:#ef4444; }
        .dt-match { color:#94a3b8; }
        .dt-improve { color:#34d399; }
        `;
        document.head.appendChild(style);
    }
}

export function renderPage() {
    const role = State?.user?.active_role || State?.user?.role || '';
    const userType = State?.user?.user_type || '';
    if (userType !== 'platform' && role !== 'super_admin') {
        return `<div class="empty-state">🔒 Institutional Access Denied. Super Admin only.</div>`;
    }

    if (!loading && (Date.now() - lastLoad > 15000)) { preload(); }
    if (loading && !data) return `<div style="padding:80px;text-align:center"><div class="spinner"></div></div>`;

    const d = data || { canary: {}, proposals: [], diffs:{diffs:[]}, policyStats: [] };
    const pendingProps = d.proposals.filter(p => p.status === 'PENDING').slice(0, 5);
    const ks = d.canary.kill_switch_engaged;

    return `

    <div class="cockpit">
        <div class="cp-header">
            <div class="cp-title">⚙️ Predictive Ops Control Plane</div>
            <div style="color:#64748b;font-size:0.8rem;display:flex;align-items:center;gap:8px;"><span style="width:8px;height:8px;background:#34d399;border-radius:50%;display:inline-block;box-shadow:0 0 8px #34d399"></span> L5 Causal Core Active</div>
        </div>

        <div class="cp-grid" style="grid-template-columns: 4fr 6fr;">
            <!-- Kill Switch -->
            <div class="cp-card ${ks ? 'danger' : ''}">
                <div class="cp-card-hd"><div class="cp-card-label">Governance Mode & Canary</div></div>
                <div class="cp-card-bd ks-container">
                    <div class="ks-status">
                        <div style="font-size:0.8rem;color:#94a3b8;margin-bottom:10px;text-transform:uppercase">Routing Traffic</div>
                        <div class="ks-dial ${ks ? 'engaged' : ''}">${ks ? '0%' : (d.canary.canary_percentage + '%')}</div>
                        <div style="margin-top:12px;font-size:0.8rem;color:${ks ? '#ef4444' : '#34d399'};font-weight:700;">${ks ? 'P0 LOCKOUT ENGAGED' : 'STANDARD AUTONOMY'}</div>
                    </div>
                    <div style="text-align:right">
                        ${ks ? '<div style="color:#ef4444;font-weight:800;font-size:1.1rem;width:200px">Manual override active. CLI required to reset.</div>' : '<button class="ks-btn" onclick="opsEngageKillSwitch()">Engage P0 Kill Switch</button>'}
                        <div style="margin-top:20px;font-size:0.75rem;color:#64748b;width:200px;line-height:1.4">Halts all AI deployment. Reroutes to deterministic fallback rules instantly. (O(1) execution).</div>
                    </div>
                </div>
            </div>

            <!-- Approval Inbox -->
            <div class="cp-card amber">
                <div class="cp-card-hd">
                    <div class="cp-card-label">Governance Inbox ${pendingProps.length > 0 ? '<span style="background:#f59e0b;color:#000;padding:2px 8px;border-radius:12px;margin-left:8px">' + pendingProps.length + ' PENDING</span>' : ''}</div>
                </div>
                <div class="cp-card-bd" style="max-height:220px;overflow-y:auto;padding-right:10px">
                    ${pendingProps.length === 0 ? '<div style="text-align:center;padding:30px;color:#64748b">No active autonomous actions awaiting approval.</div>' : ''}
                    ${pendingProps.map(p => `
                        <div class="prop-item ${p.risk_tier.toLowerCase()}" id="prop-${p.id}">
                            <div>
                                <div class="prop-act">${p.action} <span style="font-size:0.7rem;color:#64748b;background:#0f172a;padding:2px 6px;border-radius:4px;margin-left:6px">${p.risk_tier}</span></div>
                                <div class="prop-cause">Cause: ${p.root_cause} (Conf: ${Math.round(p.confidence*100)}%)</div>
                            </div>
                            <div style="display:flex;gap:8px;">
                                <button class="btn-sm bs-appr" onclick="opsApprove('${p.id}')">Approve</button>
                                <button class="btn-sm bs-rej" onclick="opsReject('${p.id}')">Reject</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div class="cp-grid">
            <!-- Diff Lab -->
            <div class="cp-card">
                <div class="cp-card-hd"><div class="cp-card-label">Decision Lab (A/B Replay)</div></div>
                <div class="cp-card-bd" style="max-height:300px;overflow-y:auto">
                    <table class="tbl">
                        <tr><th>Time System</th><th>Metric</th><th>Delta</th><th>Diff Spec</th></tr>
                        ${(d.diffs.diffs || []).slice(0,8).map(df => {
                            let clz = 'dt-match';
                            if (df.diff_type==='DRIFT') clz='dt-drift';
                            if (df.diff_type==='REGRESSION') clz='dt-regression';
                            if (df.diff_type==='IMPROVEMENT') clz='dt-improve';
                            return `<tr>
                                <td>${new Date(df.ts).toLocaleTimeString()}</td>
                                <td>${df.metric_name}</td>
                                <td class="${df.score_delta < 0 ? 'dt-regression' : 'dt-improve'}">${df.score_delta > 0 ? '+'+df.score_delta : df.score_delta}</td>
                                <td class="${clz}">${df.diff_type}</td>
                            </tr>`;
                        }).join('')}
                    </table>
                    ${(!d.diffs.diffs || d.diffs.diffs.length === 0) ? '<div style="text-align:center;padding:20px;color:#64748b">No diff results recorded yet.</div>' : ''}
                </div>
            </div>

            <!-- RL Policy Tuning -->
            <div class="cp-card">
                <div class="cp-card-hd"><div class="cp-card-label">Policy Learning Matrix (MAB)</div></div>
                <div class="cp-card-bd" style="max-height:300px;overflow-y:auto">
                    <table class="tbl">
                        <tr><th>Policy</th><th>Samples</th><th>Success Rate</th><th>Last Penalty</th></tr>
                        ${(d.policyStats || []).map(ps => `
                            <tr>
                                <td>${ps.policy_id}</td>
                                <td>${ps.sample_size}</td>
                                <td style="color:${ps.success_rate > 0.8 ? '#34d399' : '#fbbf24'}">${Math.round(ps.success_rate*100)}%</td>
                                <td>${ps.last_cluster_size > 0 ? '<span style="color:#ef4444">-LogDecay Alert</span>' : '<span style="color:#64748b">Stable</span>'}</td>
                            </tr>
                        `).join('')}
                    </table>
                    ${(!d.policyStats || d.policyStats.length === 0) ? '<div style="text-align:center;padding:20px;color:#64748b">MAB engine gathering initial state...</div>' : ''}
                </div>
            </div>
        </div>
    </div>`;
}
