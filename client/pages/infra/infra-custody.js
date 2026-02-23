/** Infrastructure Custody Dashboard — Security, Keys, Governance Matrix */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const [sec, keys, dr, sop, boundary] = await Promise.all([
        fetch('/api/infra-custody/security', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/infra-custody/keys', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/infra-custody/disaster-recovery', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/infra-custody/separation-of-powers', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/infra-custody/boundary', { headers: h }).then(r => r.json()).catch(() => ({}))
    ]);
    D = { sec, keys, dr, sop, boundary };
}
export function render() {
    load(); const s = D.sec; const sp = D.sop; return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('shield')} Infrastructure Custody (IT Layer)</h1>
        <p style="color:#94a3b8;margin:4px 0 12px">Cryptographic Custodian · Integrity Protector · Zero-Trust</p>
        <div style="display:inline-block;padding:4px 12px;border-radius:6px;background:${s?.score >= 80 ? '#10b98122' : '#f59e0b22'};color:${s?.score >= 80 ? '#10b981' : '#f59e0b'};font-weight:700;font-size:0.82rem">Security: ${s?.grade || '—'} (${s?.score || 0}%)</div></div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">
        ${[{ l: 'Security Score', v: (s?.score || 0) + '%', c: s?.score >= 80 ? '#10b981' : '#f59e0b', i: '🛡️' }, { l: 'Checks Passed', v: `${s?.summary?.passed || 0}/${s?.summary?.total || 0}`, c: '#3b82f6', i: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' }, { l: 'Critical Fails', v: s?.summary?.critical_failed || 0, c: '#ef4444', i: '<span class="status-icon status-warn" aria-label="Warning">!</span>' }, { l: 'Keys Active', v: D.keys?.total_keys || 0, c: '#8b5cf6', i: '🔑' }, { l: 'DR Score', v: (D.dr?.readiness_score || 0) + '%', c: '#f59e0b', i: '🔄' }].map(k => `<div class="sa-card" style="text-align:center;padding:12px"><div style="font-size:16px">${k.i}</div><div style="font-size:18px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${k.l}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="sa-card"><h3 style="margin:0 0 8px;color:#f1f5f9">Security Posture (12 Checks)</h3>
            ${(s?.checks || []).map(c => `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid #1e293b"><span style="font-size:0.82rem">${c.status ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '<span class="status-icon status-fail" aria-label="Fail">✗</span>'}</span><span style="color:#94a3b8;font-size:0.72rem;flex:1">${c.check}</span><span style="color:#64748b;font-size:0.68rem">${c.category}</span>${c.critical ? '<span style="padding:0 4px;background:#ef444422;color:#ef4444;font-size:8px;border-radius:3px">CRIT</span>' : ''}</div>`).join('')}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 8px;color:#f1f5f9">Key Management</h3>
            ${(D.keys?.keys || []).map(k => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px"><div style="display:flex;justify-content:space-between"><span style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${k.key_id}</span><span style="color:#10b981;font-size:0.68rem">${k.type}</span></div><div style="color:#64748b;font-size:0.68rem">${k.purpose}</div><div style="color:#94a3b8;font-size:0.68rem;margin-top:2px">Next rotation: ${(k.next_rotation || '').slice(0, 10)}</div></div>`).join('')}
            <div style="margin-top:6px;padding:4px 8px;background:#0f172a;border-radius:4px;font-size:0.72rem;color:#f59e0b"><span class="status-icon status-warn" aria-label="Warning">!</span> Keys due rotation (7d): ${D.keys?.keys_due_rotation || 0}</div>
        </div>
    </div>
    <div class="sa-card" style="margin-bottom:16px"><h3 style="margin:0 0 8px;color:#f1f5f9">${icon('shield')} Separation of Powers — Governance Matrix</h3>
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.72rem"><thead><tr style="border-bottom:2px solid #334155;color:#94a3b8;font-size:0.68rem;text-transform:uppercase"><th style="padding:6px;text-align:left">Function</th><th style="padding:6px">Ops</th><th style="padding:6px">Compliance</th><th style="padding:6px">IT</th><th style="padding:6px">Risk</th><th style="padding:6px">Admin Co</th><th style="padding:6px">Super Admin</th></tr></thead><tbody>${Object.entries(sp?.governance_matrix || {}).map(([fn, roles]) => `<tr style="border-bottom:1px solid #1e293b"><td style="padding:6px;color:#f1f5f9;font-weight:600">${fn.replace(/_/g, ' ')}</td>${['ops', 'compliance', 'it', 'risk', 'admin_company', 'super_admin'].map(r => `<td style="padding:6px;text-align:center;color:${roles[r] === 'enforce' || roles[r] === 'approve' || roles[r] === 'approve_global' ? '#10b981' : roles[r] === 'monitor' || roles[r] === 'audit' ? '#3b82f6' : roles[r] === 'secure' || roles[r] === 'host' ? '#8b5cf6' : '#f59e0b'};font-size:0.68rem">${(roles[r] || '—').replace(/_/g, ' ')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <div style="margin-top:8px;padding:8px;background:#0f172a;border-radius:6px"><div style="color:${sp?.no_single_point_of_control ? '#10b981' : '#ef4444'};font-weight:700;font-size:0.78rem">${sp?.no_single_point_of_control ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> No single point of control — verified' : '<span class="status-icon status-fail" aria-label="Fail">✗</span> Single point of control detected!'}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="sa-card"><h3 style="margin:0 0 8px;color:#f1f5f9">Collapse Points (Must Block)</h3>
            ${(sp?.collapse_points || []).map(c => `<div style="display:flex;align-items:center;gap:6px;padding:3px 0"><span style="font-size:0.82rem">${c.enforced ? '<span class="status-dot green"></span>' : '<span class="status-dot red"></span>'}</span><span style="color:#f1f5f9;font-size:0.72rem">${c.risk}</span><span style="padding:0 4px;background:${c.enforced ? '#10b98122' : '#ef444422'};color:${c.enforced ? '#10b981' : '#ef4444'};font-size:8px;border-radius:3px">${c.status}</span></div>`).join('')}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 8px;color:#f1f5f9">Disaster Recovery</h3>
            ${D.dr ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${[{ l: 'RPO', v: D.dr.rpo_hours + 'h' }, { l: 'RTO', v: D.dr.rto_hours + 'h' }, { l: 'Backup', v: D.dr.backup?.frequency || '—' }, { l: 'Encrypted', v: D.dr.backup?.encrypted ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '<span class="status-icon status-fail" aria-label="Fail">✗</span>' }, { l: 'Offsite', v: D.dr.backup?.offsite ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '<span class="status-icon status-fail" aria-label="Fail">✗</span>' }, { l: 'Last Drill', v: (D.dr.failover?.last_drill || '').slice(0, 10) }].map(m => `<div style="padding:6px;background:#0f172a;border-radius:4px;text-align:center"><div style="color:#f1f5f9;font-weight:700;font-size:0.82rem">${m.v}</div><div style="color:#64748b;font-size:0.68rem">${m.l}</div></div>`).join('')}</div>` : ''}
        </div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
