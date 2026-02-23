/** ERCM v1.0 — Enterprise Risk & Control Map Dashboard */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const [tl, gov, reg, hm, cm, ra, bd, ct, gap, mat] = await Promise.all([
        fetch('/api/hardening/ercm/three-lines', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/ercm/governance-bodies', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/ercm/risk-registry', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/ercm/heatmap', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/ercm/control-matrix', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/ercm/risk-appetite', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/ercm/board-dashboard', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/ercm/control-tests', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/ercm/ipo-gap', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/ercm/maturity', { headers: h }).then(r => r.json()).catch(() => ({}))
    ]);
    D = { tl, gov, reg, hm, cm, ra, bd, ct, gap, mat };
}
const zc = z => z === 'critical' ? '#ef4444' : z === 'high' ? '#f59e0b' : z === 'medium' ? '#3b82f6' : '#10b981';
const sc = s => s >= 15 ? '#ef4444' : s >= 8 ? '#f59e0b' : s >= 4 ? '#3b82f6' : '#10b981';
export function render() {
    load(); const bd = D.bd; const mat = D.mat;
    if (!mat) return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('activity')} Enterprise Risk & Control Map</h1></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${'<div class="infra-skeleton" style="min-height:120px"></div>'.repeat(4)}</div></div>`;
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('activity')} Enterprise Risk & Control Map</h1>
        <p style="color:#94a3b8;margin:4px 0 6px">COSO ERM · Three Lines · IPO-Grade · 7 Domains · 32 Risks</p>
        <div style="display:inline-flex;gap:6px;flex-wrap:wrap">
            <span style="padding:3px 10px;border-radius:4px;background:#3b82f622;color:#3b82f6;font-weight:700;font-size:0.78rem">Maturity: ${mat?.overall || 'L3.6/5'}</span>
            <span style="padding:3px 10px;border-radius:4px;background:${D.cm?.ipo_ready ? '#10b98122' : '#f59e0b22'};color:${D.cm?.ipo_ready ? '#10b981' : '#f59e0b'};font-weight:700;font-size:0.78rem">Controls: ${D.cm?.ipo_ready ? 'IPO Ready' : 'Near IPO'}</span>
            <span style="padding:3px 10px;border-radius:4px;background:#8b5cf622;color:#8b5cf6;font-weight:700;font-size:0.78rem">Risks: ${D.reg?.total_risks || 32}</span>
        </div></div>

    <!-- Three Lines + Governance -->
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;margin-bottom:10px">
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Three Lines of Defense</h3>
            ${['line1', 'line2', 'line3'].map(k => { const l = D.tl?.[k]; return l ? `<div style="margin-bottom:4px"><div style="color:#3b82f6;font-size:0.68rem;font-weight:700;margin-bottom:2px">${l.name}</div>${(l.roles || []).map(r => `<div style="display:flex;justify-content:space-between;padding:1px 4px;border-bottom:1px solid #1e293b"><span style="color:#f1f5f9;font-size:8px">${r.role}</span><span style="color:#64748b;font-size:7px">${r.responsibility.slice(0, 45)}</span></div>`).join('')}</div>` : ''; }).join('')}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Governance Bodies</h3>
            ${(D.gov?.bodies || []).map(b => `<div style="padding:4px;background:#0f172a;border-radius:3px;margin-bottom:3px"><div style="display:flex;justify-content:space-between"><span style="color:#f1f5f9;font-size:0.68rem;font-weight:600">${b.name}</span><span style="color:#3b82f6;font-size:7px">${b.cadence}</span></div><div style="color:#64748b;font-size:7px">Chair: ${b.chair} · ${b.members} members</div></div>`).join('')}
        </div>
    </div>

    <!-- Board Dashboard: Top Risks + Domain Scores -->
    <h2 style="color:#f1f5f9;margin:0 0 4px;font-size:0.78rem;border-bottom:1px solid #334155;padding-bottom:3px">Board-Level Risk Dashboard</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px">
        ${[{ l: 'Critical', v: bd?.risk_count?.critical || 0, c: '#ef4444' }, { l: 'High', v: bd?.risk_count?.high || 0, c: '#f59e0b' }, { l: 'Medium', v: bd?.risk_count?.medium || 0, c: '#3b82f6' }, { l: 'Low', v: bd?.risk_count?.low || 0, c: '#10b981' }].map(k => `<div class="sa-card" style="text-align:center;padding:8px"><div style="font-size:20px;font-weight:800;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:8px">${k.l} Risk</div></div>`).join('')}
    </div>

    <div style="display:grid;grid-template-columns:3fr 2fr;gap:10px;margin-bottom:10px">
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Top 10 Residual Risks</h3>
            ${(bd?.top_10_residual_risks || []).map((r, i) => `<div style="display:flex;align-items:center;gap:4px;padding:2px 0;border-bottom:1px solid #1e293b"><span style="width:16px;color:${sc(r.score)};font-weight:700;font-size:0.68rem">${i + 1}</span><span style="width:36px;color:${sc(r.score)};font-weight:600;font-size:0.68rem">${r.id}</span><span style="flex:1;color:#94a3b8;font-size:8px">${r.description}</span><span style="padding:0 4px;background:${sc(r.score)}22;color:${sc(r.score)};font-size:0.68rem;border-radius:2px;font-weight:700">${r.score}</span></div>`).join('')}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Domain Scores vs Appetite</h3>
            ${(bd?.domain_scores || []).map(d => `<div style="display:flex;align-items:center;gap:4px;padding:3px 0;border-bottom:1px solid #1e293b"><span style="flex:1;color:#f1f5f9;font-size:0.68rem">${d.domain}</span><div style="width:70px;background:#0f172a;border-radius:2px;height:5px;position:relative"><div style="height:100%;width:${Math.min(100, d.avg_score / d.appetite_max * 100)}%;background:${d.breached ? '#ef4444' : '#10b981'};border-radius:2px"></div></div><span style="color:${d.breached ? '#ef4444' : '#10b981'};font-size:0.68rem;width:35px;text-align:right">${d.avg_score}/${d.appetite_max}</span>${d.breached ? `<span class="infra-badge infra-badge--danger">${icon('alert-triangle')}</span>` : ''}</div>`).join('')}
        </div>
    </div>

    <!-- Heatmap Zones + Control Matrix -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Risk Heatmap Zones</h3>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:6px">${[{ l: 'Critical', v: D.hm?.zones?.critical || 0, c: '#ef4444' }, { l: 'High', v: D.hm?.zones?.high || 0, c: '#f59e0b' }, { l: 'Medium', v: D.hm?.zones?.medium || 0, c: '#3b82f6' }, { l: 'Low', v: D.hm?.zones?.low || 0, c: '#10b981' }].map(k => `<div style="padding:6px;background:${k.c}15;border:1px solid ${k.c}44;border-radius:4px;text-align:center"><div style="font-size:16px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:7px">${k.l}</div></div>`).join('')}</div>
            <div style="color:#64748b;font-size:7px;padding:3px;background:#0f172a;border-radius:3px;font-family:monospace">Score = Likelihood(1-5) × Impact(1-5) × CE(0.5|1.0|1.5)</div>
        </div>
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Control Classification</h3>
            ${D.cm?.breakdown ? Object.entries(D.cm.breakdown).map(([k, v]) => `<div style="margin-bottom:4px"><div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="color:#f1f5f9;font-size:0.68rem;text-transform:capitalize">${k}</span><span style="color:#94a3b8;font-size:8px">${v.pct}% (target: ${v.target})</span></div><div style="background:#0f172a;border-radius:3px;height:6px"><div style="height:100%;width:${v.pct}%;background:${k === 'preventive' ? '#10b981' : k === 'detective' ? '#3b82f6' : '#f59e0b'};border-radius:3px"></div></div></div>`).join('') : ''}
        </div>
    </div>

    <!-- Risk Appetite + Control Tests -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Risk Appetite Statement</h3>
            ${(D.ra?.appetite || []).map(a => `<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #1e293b"><span style="color:#f1f5f9;font-size:8px">${a.domain}</span><span style="padding:0 4px;background:${a.tolerance.includes('Very Low') ? '#10b98122' : a.tolerance.includes('Low') ? '#3b82f622' : a.tolerance.includes('High') ? '#f59e0b22' : '#94a3b822'};color:${a.tolerance.includes('Very Low') ? '#10b981' : a.tolerance.includes('Low') ? '#3b82f6' : a.tolerance.includes('High') ? '#f59e0b' : '#94a3b8'};font-size:7px;border-radius:2px">${a.tolerance}</span><span style="color:#64748b;font-size:7px">max:${a.max_residual}</span></div>`).join('')}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Control Testing (${D.ct?.total_quarterly || 6}Q + ${D.ct?.total_annual || 3}A)</h3>
            <div style="color:#3b82f6;font-size:8px;margin-bottom:3px">Quarterly:</div>
            ${(D.ct?.quarterly || []).map(t => `<div style="padding:1px 0;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:7px"><span style="color:#f1f5f9;font-weight:600">${t.id}</span> ${t.test}</div>`).join('')}
            <div style="color:#f59e0b;font-size:8px;margin:3px 0 2px">Annual:</div>
            ${(D.ct?.annual || []).map(t => `<div style="padding:1px 0;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:7px"><span style="color:#f1f5f9;font-weight:600">${t.id}</span> ${t.test}</div>`).join('')}
        </div>
    </div>

    <!-- IPO Gap + Maturity -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">IPO Gap Analysis (${D.gap?.closed || 0}/${D.gap?.gaps?.length || 6})</h3>
            <div style="background:#0f172a;border-radius:4px;height:6px;margin-bottom:4px"><div style="height:100%;width:${D.gap?.completeness_pct || 0}%;background:${(D.gap?.completeness_pct || 0) >= 80 ? '#10b981' : '#f59e0b'};border-radius:4px"></div></div>
            ${(D.gap?.gaps || []).map(g => `<div style="display:flex;align-items:center;gap:4px;padding:2px 0"><span class="infra-badge ${g.status === 'implemented' ? 'infra-badge--success' : 'infra-badge--warning'}">${g.status === 'implemented' ? icon('check-circle') : icon('clock')}</span><span style="color:${g.status === 'implemented' ? '#94a3b8' : '#f59e0b'};font-size:0.68rem">${g.item}</span></div>`).join('')}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Domain Maturity</h3>
            ${D.mat?.domains ? Object.entries(D.mat.domains).map(([k, v]) => `<div style="display:flex;align-items:center;gap:4px;padding:2px 0;border-bottom:1px solid #1e293b"><span style="flex:1;color:#94a3b8;font-size:8px">${k}</span><div style="width:60px;background:#0f172a;border-radius:2px;height:5px"><div style="height:100%;width:${v.score / 5 * 100}%;background:${v.score >= 4 ? '#10b981' : v.score >= 3 ? '#3b82f6' : '#f59e0b'};border-radius:2px"></div></div><span style="color:#f1f5f9;font-size:8px">${v.score}/5</span></div>`).join('') : ''}
        </div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
