/** Governance Dashboard — DAO Advisory, Proposals, Multi-Sig */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const [proposals, roles] = await Promise.all([
        fetch('/api/governance/proposals', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/governance/roles', { headers: h }).then(r => r.json()).catch(() => ({}))
    ]);
    D = { proposals, roles };
}
export function render() {
    load(); const p = D.proposals; return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('shield')} Governance Layer</h1>
        <p style="color:#94a3b8;margin:4px 0 16px">DAO Advisory Council · Multi-Sig · Proposal Voting</p>
        <button onclick="window.govShowNew()" style="padding:8px 16px;background:#8b5cf6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">${icon('plus')} New Proposal</button></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Total', v: p?.total_proposals || 0, c: '#3b82f6', i: '📋' }, { l: 'Open', v: p?.by_status?.open || 0, c: '#f59e0b', i: '🗳️' }, { l: 'Approved', v: p?.by_status?.approved || 0, c: '#10b981', i: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' }, { l: 'Rejected', v: p?.by_status?.rejected || 0, c: '#ef4444', i: '<span class="status-icon status-fail" aria-label="Fail">✗</span>' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${k.l}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:20px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">Recent Proposals</h3>
            ${p?.recent_proposals?.length > 0 ? p.recent_proposals.map(pr => `<div style="padding:8px;background:#0f172a;border-radius:6px;margin-bottom:6px;border-left:3px solid ${pr.status === 'approved' ? '#10b981' : pr.status === 'rejected' ? '#ef4444' : '#f59e0b'}"><div style="display:flex;justify-content:space-between"><span style="color:#f1f5f9;font-weight:600;font-size:0.82rem">${pr.title || pr.proposal_id}</span><span style="padding:1px 6px;border-radius:4px;background:${pr.status === 'approved' ? '#10b98122' : pr.status === 'rejected' ? '#ef444422' : '#f59e0b22'};color:${pr.status === 'approved' ? '#10b981' : pr.status === 'rejected' ? '#ef4444' : '#f59e0b'};font-size:0.68rem">${pr.status}</span></div><div style="color:#94a3b8;font-size:0.72rem;margin-top:2px">${pr.type || ''} · ${(pr.created_at || '').slice(0, 10)}</div></div>`).join('') : '<div style="text-align:center;padding:20px;color:#64748b">No proposals yet</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">Governance Roles</h3>
            ${Object.entries(D.roles?.roles || {}).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px"><div style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${v?.name || k}</div><div style="color:#64748b;font-size:0.68rem">${v?.description || ''}</div><div style="color:#3b82f6;font-size:0.68rem">Weight: ${v?.voting_weight || 1}</div></div>`).join('')}
        </div>
    </div>
    <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">Proposal Types</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${Object.entries(D.roles?.proposal_types || {}).map(([k, v]) => `<div style="padding:10px;background:#0f172a;border-radius:8px"><div style="color:#f1f5f9;font-weight:600;font-size:0.78rem">${v?.name || k}</div><div style="display:flex;gap:8px;margin-top:4px"><span style="color:#f59e0b;font-size:0.68rem">Quorum: ${v?.quorum || 0}</span><span style="color:#3b82f6;font-size:0.68rem">${v?.sod_eyes || 0}-eyes</span><span style="color:#94a3b8;font-size:0.68rem">${v?.cooldown_hours || 0}h cool</span></div></div>`).join('')}</div>
    </div>
    <div id="gov-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:1000;align-items:center;justify-content:center"><div style="background:#1e293b;border-radius:16px;padding:24px;width:420px;border:1px solid #334155"><h3 style="margin:0 0 16px;color:#f1f5f9">New Proposal</h3><select id="gov-type" style="width:100%;padding:8px;background:#0f172a;color:#f1f5f9;border:1px solid #334155;border-radius:6px;margin-bottom:8px">${['policy_change', 'credit_mint_batch', 'baseline_update', 'auditor_appointment', 'emergency_halt', 'registry_bridge'].map(t => `<option value="${t}">${t.replace(/_/g, ' ')}</option>`).join('')}</select><input id="gov-title" placeholder="Title" style="width:100%;padding:8px;background:#0f172a;color:#f1f5f9;border:1px solid #334155;border-radius:6px;margin-bottom:8px"><textarea id="gov-desc" placeholder="Description" rows="3" style="width:100%;padding:8px;background:#0f172a;color:#f1f5f9;border:1px solid #334155;border-radius:6px;margin-bottom:10px"></textarea><div id="gov-res" style="display:none;padding:8px;background:#0f172a;border-radius:6px;margin-bottom:8px;font-size:0.72rem;color:#94a3b8"></div><div style="display:flex;gap:8px"><button onclick="window.govCreate()" style="flex:1;padding:10px;background:#8b5cf6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">Submit</button><button onclick="document.getElementById('gov-modal').style.display='none'" style="padding:10px 16px;background:#334155;color:#f1f5f9;border:none;border-radius:8px;cursor:pointer">Close</button></div></div></div>
</div>`;
}
export function renderPage() { return render(); }
window.govShowNew = () => { document.getElementById('gov-modal').style.display = 'flex'; };
window.govCreate = async () => { const h = { 'Authorization': 'Bearer ' + State.token, 'Content-Type': 'application/json' }; const r = await fetch('/api/governance/proposals', { method: 'POST', headers: h, body: JSON.stringify({ type: document.getElementById('gov-type').value, title: document.getElementById('gov-title').value, description: document.getElementById('gov-desc').value }) }).then(r => r.json()); const el = document.getElementById('gov-res'); el.style.display = 'block'; el.innerHTML = r.proposal_id ? `<div style="color:#10b981;font-weight:700"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> ${r.proposal_id}</div>` : `<div style="color:#ef4444">${r.error || 'Failed'}</div>`; };
