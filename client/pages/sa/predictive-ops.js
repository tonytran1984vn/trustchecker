/**
 * Platform Admin - Predictive Ops Cockpit
 * Theme-aware dashboard using CSS variables from design system
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
        .cockpit { font-family: var(--font-primary, 'Inter', sans-serif); color: var(--text-primary); }
        .cp-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
        .cp-title { font-size:1.4rem; font-weight:800; display:flex; align-items:center; gap:10px; }
        .cp-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
        .cp-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg, 16px); overflow:hidden; position:relative; box-shadow:var(--shadow-md); transition:var(--transition); }
        .cp-card:hover { box-shadow:var(--shadow-lg); }
        .cp-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--gradient-accent); }
        .cp-card.danger::before { background:linear-gradient(90deg, var(--color-danger), #b91c1c); }
        .cp-card.amber::before { background:linear-gradient(90deg, var(--amber), #d97706); }
        .cp-card-hd { padding:16px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; }
        .cp-card-label { font-size:0.75rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:1px; }
        .cp-card-bd { padding:20px; }
        .ks-container { display:flex; align-items:center; justify-content:space-between; gap:24px; }
        .ks-status { text-align:center; flex:1; }
        .ks-dial { width:120px; height:120px; border-radius:50%; border:10px solid var(--color-success); display:flex; align-items:center; justify-content:center; margin:0 auto; font-size:1.4rem; font-weight:900; color:var(--text-primary); font-family:var(--font-mono, 'JetBrains Mono',monospace); transition:all 0.3s; }
        .ks-dial.engaged { border-color:var(--color-danger); }
        .ks-btn { background:var(--color-danger, #b91c1c); color:#fff; border:none; padding:14px 28px; border-radius:var(--radius-md, 10px); font-weight:800; font-size:0.9rem; cursor:pointer; text-transform:uppercase; box-shadow:0 4px 15px var(--color-danger-bg, rgba(239,68,68,0.3)); transition:var(--transition-fast); letter-spacing:0.5px; }
        .ks-btn:hover { opacity:0.9; transform:translateY(-1px); }
        .ks-btn:active { transform:translateY(1px); }
        .prop-item { background:var(--bg-card-hover); padding:14px 16px; border-radius:var(--radius-md, 10px); margin-bottom:10px; border-left:4px solid var(--color-info, #3b82f6); display:flex; justify-content:space-between; align-items:center; transition:var(--transition-fast); }
        .prop-item:hover { box-shadow:var(--shadow-sm); }
        .prop-item.high { border-left-color:var(--color-danger); }
        .prop-item.medium { border-left-color:var(--amber); }
        .prop-act { font-weight:700; color:var(--text-primary); font-family:var(--font-mono, 'JetBrains Mono',monospace); font-size:0.85rem; }
        .prop-cause { font-size:0.72rem; color:var(--text-secondary); margin-top:4px; }
        .prop-tier-badge { font-size:0.65rem; color:var(--text-muted); background:var(--bg-input); padding:2px 8px; border-radius:4px; margin-left:6px; }
        .btn-sm { padding:6px 14px; border-radius:6px; font-size:0.7rem; font-weight:700; cursor:pointer; text-transform:uppercase; border:none; transition:var(--transition-fast); }
        .bs-appr { background:var(--color-success-bg); color:var(--color-success-text); }
        .bs-appr:hover { background:var(--color-success); color:#fff; }
        .bs-rej { background:var(--color-danger-bg); color:var(--color-danger-text); }
        .bs-rej:hover { background:var(--color-danger); color:#fff; }
        .tbl { width:100%; border-collapse:collapse; font-size:0.78rem; }
        .tbl th { text-align:left; padding:10px 8px; color:var(--text-secondary); font-weight:600; text-transform:uppercase; font-size:0.7rem; letter-spacing:0.5px; border-bottom:1px solid var(--border); }
        .tbl td { padding:10px 8px; border-bottom:1px solid var(--border); color:var(--text-primary); font-family:var(--font-mono, 'JetBrains Mono',monospace); font-size:0.78rem; }
        .tbl tr:hover td { background:var(--bg-card-hover); }
        .dt-drift { color:var(--amber); }
        .dt-regression { color:var(--color-danger-text); }
        .dt-match { color:var(--text-muted); }
        .dt-improve { color:var(--color-success-text); }
        .cp-empty { text-align:center; padding:30px; color:var(--text-muted); font-size:0.85rem; }
        .cp-status-dot { width:8px; height:8px; border-radius:50%; display:inline-block; }
        .cp-status-dot.active { background:var(--color-success); box-shadow:0 0 8px var(--color-success); }
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
    if (loading && !data) return `<div style="display:flex;align-items:center;justify-content:center;padding:80px;flex-direction:column;gap:16px">
        <div style="width:48px;height:48px;border:4px solid var(--border);border-top-color:var(--cyan);border-radius:50%;animation:spin 0.8s linear infinite"></div>
        <p style="color:var(--text-secondary);font-size:0.85rem">Loading Ops Cockpit...</p>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>`;

    const d = data || { canary: {}, proposals: [], diffs:{diffs:[]}, policyStats: [] };
    const pendingProps = d.proposals.filter(p => p.status === 'PENDING').slice(0, 5);
    const ks = d.canary.kill_switch_engaged;
    const canaryPct = d.canary.canary_percentage ?? 0;

    return `
    <div class="cockpit">
        <div class="cp-header">
            <div class="cp-title">⚙️ Predictive Ops Control Plane</div>
            <div style="color:var(--text-secondary);font-size:0.8rem;display:flex;align-items:center;gap:8px;"><span class="cp-status-dot active"></span> L5 Causal Core Active</div>
        </div>

        <div class="cp-grid" style="grid-template-columns: 4fr 6fr;">
            <!-- Kill Switch -->
            <div class="cp-card ${ks ? 'danger' : ''}">
                <div class="cp-card-hd"><div class="cp-card-label">Governance Mode & Canary</div></div>
                <div class="cp-card-bd ks-container">
                    <div class="ks-status">
                        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Routing Traffic</div>
                        <div class="ks-dial ${ks ? 'engaged' : ''}">${ks ? '0%' : canaryPct + '%'}</div>
                        <div style="margin-top:12px;font-size:0.8rem;color:${ks ? 'var(--color-danger-text)' : 'var(--color-success-text)'};font-weight:700;">${ks ? 'P0 LOCKOUT ENGAGED' : 'STANDARD AUTONOMY'}</div>
                    </div>
                    <div style="text-align:right">
                        ${ks ? '<div style="color:var(--color-danger-text);font-weight:800;font-size:1rem;width:200px">Manual override active. CLI required to reset.</div>' : '<button class="ks-btn" onclick="opsEngageKillSwitch()">Engage P0 Kill Switch</button>'}
                        <div style="margin-top:16px;font-size:0.72rem;color:var(--text-muted);width:200px;line-height:1.5">Halts all AI deployment. Reroutes to deterministic fallback rules instantly.</div>
                    </div>
                </div>
            </div>

            <!-- Approval Inbox -->
            <div class="cp-card amber">
                <div class="cp-card-hd">
                    <div class="cp-card-label">Governance Inbox ${pendingProps.length > 0 ? '<span style="background:var(--amber);color:#000;padding:2px 8px;border-radius:12px;margin-left:8px;font-size:0.7rem">' + pendingProps.length + ' PENDING</span>' : ''}</div>
                </div>
                <div class="cp-card-bd" style="max-height:220px;overflow-y:auto;padding-right:10px">
                    ${pendingProps.length === 0 ? '<div class="cp-empty">No active autonomous actions awaiting approval.</div>' : ''}
                    ${pendingProps.map(p => `
                        <div class="prop-item ${p.risk_tier.toLowerCase()}" id="prop-${p.id}">
                            <div>
                                <div class="prop-act">${p.action} <span class="prop-tier-badge">${p.risk_tier}</span></div>
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
                    ${(!d.diffs.diffs || d.diffs.diffs.length === 0) ? '<div class="cp-empty">No diff results recorded yet.</div>' : ''}
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
                                <td style="color:${ps.success_rate > 0.8 ? 'var(--color-success-text)' : 'var(--color-warning-text)'};">${Math.round(ps.success_rate*100)}%</td>
                                <td>${ps.last_cluster_size > 0 ? '<span style="color:var(--color-danger-text)">-LogDecay Alert</span>' : '<span style="color:var(--text-muted)">Stable</span>'}</td>
                            </tr>
                        `).join('')}
                    </table>
                    ${(!d.policyStats || d.policyStats.length === 0) ? '<div class="cp-empty">MAB engine gathering initial state...</div>' : ''}
                </div>
            </div>
        </div>
    </div>`;
}
