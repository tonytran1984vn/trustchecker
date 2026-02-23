/** MRMF v2.0 — Enterprise-Native Model Risk Management Dashboard */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const [inv, mdlc, stressLib, ivu, mhi, residual, health, maturity, mcp, mrc, auditPkg] = await Promise.all([
        fetch('/api/hardening/mrmf/inventory', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/mrmf/mdlc', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/mrmf/stress-library', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/mrmf/ivu', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/mrmf/mhi', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/mrmf/residual-risk', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/mrmf/health', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/mrmf/maturity', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/mrmf/material-change-policy', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/mrmf/mrc', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/mrmf/audit-package', { headers: h }).then(r => r.json()).catch(() => ({}))
    ]);
    D = { inv, mdlc, stressLib, ivu, mhi, residual, health, maturity, mcp, mrc, auditPkg };
}
const tc = v => v >= 80 ? '#10b981' : v >= 50 ? '#f59e0b' : '#ef4444';
const ic = c => c === 'Critical' ? '#ef4444' : c === 'High' ? '#f59e0b' : c === 'Medium' ? '#3b82f6' : '#10b981';
export function render() {
    load(); const m = D.mhi; const r = D.residual; const mt = D.maturity;
    const loading = !mt;
    if (loading) return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('shield')} MRMF v2.0</h1></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${'<div class="infra-skeleton" style="min-height:120px"></div>'.repeat(4)}</div></div>`;
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('shield')} MRMF v2.0 — Enterprise-Native</h1>
        <p style="color:#94a3b8;margin:4px 0 8px">6 Pillars · SOC 2 · ISO 27001 · SR 11-7 · Big4 Ready</p>
        <div style="display:inline-flex;gap:6px;flex-wrap:wrap">
            <span style="padding:3px 10px;border-radius:4px;background:#3b82f622;color:#3b82f6;font-weight:700;font-size:0.78rem">MRMF: ${mt?.current || 'L4'}</span>
            <span style="padding:3px 10px;border-radius:4px;background:${tc(m?.mhi_score)}22;color:${tc(m?.mhi_score)};font-weight:700;font-size:0.78rem">MHI: ${m?.mhi_score || '—'} (${m?.grade || '—'})</span>
            <span style="padding:3px 10px;border-radius:4px;background:${r?.grade === 'Controlled' ? '#10b98122' : '#f59e0b22'};color:${r?.grade === 'Controlled' ? '#10b981' : '#f59e0b'};font-weight:700;font-size:0.78rem">Residual: ${r?.score || '—'}% (${r?.grade || '—'})</span>
        </div></div>

    <!-- Maturity Ladder -->
    <div class="sa-card" style="margin-bottom:10px"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.82rem">Maturity Ladder</h3>
        <div style="display:flex;gap:4px">${(mt?.levels || []).map(l => `<div style="flex:1;padding:6px;background:${l.status ? '#10b98110' : '#1e293b'};border:1px solid ${l.status ? '#10b981' : '#334155'};border-radius:4px;text-align:center"><div class="infra-badge ${l.status ? 'infra-badge--success' : 'infra-badge--neutral'}">${l.status ? icon('check-circle') : '—'}</div><div style="color:${l.status ? '#10b981' : '#64748b'};font-weight:700;font-size:0.72rem">${l.level}</div><div style="color:#94a3b8;font-size:8px">${l.name}</div></div>`).join('')}</div>
    </div>

    <!-- P1: Model Inventory -->
    <h2 style="color:#f1f5f9;margin:0 0 4px;font-size:0.78rem;border-bottom:1px solid #334155;padding-bottom:3px">P1 · Model Inventory & Classification</h2>
    <div style="overflow-x:auto;margin-bottom:10px"><table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:2px solid #334155;color:#94a3b8"><th style="padding:6px;text-align:left">Model</th><th>Class</th><th>Lock</th><th>Auto</th><th>Dual IVU</th><th>Inputs</th><th>Refresh</th><th>Status</th></tr></thead><tbody>${(D.inv?.models || []).map(m => `<tr style="border-bottom:1px solid #1e293b"><td style="padding:4px;color:#3b82f6;font-weight:600">${m.model_type || m.name}</td><td style="text-align:center"><span class="infra-badge ${m.impact_class === 'Critical' ? 'infra-badge--danger' : m.impact_class === 'High' ? 'infra-badge--warning' : m.impact_class === 'Medium' ? 'infra-badge--info' : 'infra-badge--success'}">${m.impact_class}</span></td><td style="text-align:center">${m.lock_capable ? icon('lock') : '—'}</td><td style="text-align:center">${m.auto_decision ? icon('zap') : '—'}</td><td style="text-align:center">${m.dual_validation ? icon('users') : '—'}</td><td style="text-align:center;color:#f1f5f9">${m.inputs}</td><td style="color:#64748b;text-align:center">${m.refresh}</td><td style="text-align:center"><span class="infra-badge infra-badge--warning">${m.validation_status || m.status || '—'}</span></td></tr>`).join('')}</tbody></table></div>

    <!-- P2 + P3: MDLC + Stress -->
    <div style="display:grid;grid-template-columns:3fr 2fr;gap:10px;margin-bottom:10px">
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">P2 · MDLC 10-Step Pipeline</h3>
            ${(D.mdlc?.steps || []).map(s => `<div style="display:flex;align-items:center;gap:4px;padding:2px 0;border-bottom:1px solid #1e293b"><span style="width:16px;height:16px;border-radius:50%;background:#3b82f622;color:#3b82f6;font-size:8px;display:flex;align-items:center;justify-content:center;font-weight:700">${s.step}</span><span style="flex:1;color:#f1f5f9;font-size:0.68rem">${s.name}</span><span style="color:#64748b;font-size:7px">${s.layer}</span></div>`).join('')}
            <div style="margin-top:4px;padding:3px 6px;background:#3b82f615;border-radius:3px;color:#3b82f6;font-size:8px">v2.0: Added Step 7 (180-day replay) + Step 10 (6-eyes deploy)</div>
        </div>
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">P3 · Stress Test Library (${D.stressLib?.total || 6})</h3>
            ${(D.stressLib?.tests || []).map(t => `<div style="padding:3px;background:#0f172a;border-radius:3px;margin-bottom:3px;border-left:2px solid ${t.auto_freeze ? '#ef4444' : '#f59e0b'}"><div style="display:flex;justify-content:space-between"><span style="color:#f1f5f9;font-size:8px;font-weight:600">${t.name}</span><span style="font-size:7px;color:${t.auto_freeze ? '#ef4444' : '#f59e0b'}">${t.auto_freeze ? 'AUTO-FREEZE' : 'manual'}</span></div><div style="color:#64748b;font-size:7px">${t.scenario.slice(0, 60)}…</div><div style="color:#94a3b8;font-size:7px;margin-top:1px">Fallback: ${t.fallback.slice(0, 50)}</div></div>`).join('')}
        </div>
    </div>

    <!-- P4 + P5: IVU + MHI -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">P4 · IVU Checklist + MVR</h3>
            <div style="padding:3px 6px;background:#f59e0b12;border-radius:3px;margin-bottom:4px;color:#f59e0b;font-size:8px">MRO ≠ ML Lead ≠ Risk Owner · 180-day replay</div>
            ${(D.ivu?.checklist || []).map(c => `<div style="display:flex;align-items:center;gap:4px;padding:1px 0;border-bottom:1px solid #1e293b"><span style="color:${c.critical ? '#ef4444' : '#3b82f6'};font-size:0.68rem;width:40px;font-weight:600">${c.id}</span><span style="flex:1;color:#94a3b8;font-size:8px">${c.check}</span>${c.critical ? '<span style="padding:0 3px;background:#ef444422;color:#ef4444;font-size:6px;border-radius:2px">CRIT</span>' : ''}</div>`).join('')}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">P5 · Model Health Index (MHI)</h3>
            <div style="text-align:center;padding:6px"><div style="font-size:28px;font-weight:800;color:${tc(m?.mhi_score)}">${m?.mhi_score || '—'}</div><div style="color:#94a3b8;font-size:8px">MHI Score (Grade: ${m?.grade || '—'})</div></div>
            ${(m?.factors || []).map(f => `<div style="display:flex;align-items:center;gap:4px;padding:1px 0;border-bottom:1px solid #1e293b"><span style="flex:1;color:#94a3b8;font-size:8px">${f.factor}</span><div style="width:60px;background:#0f172a;border-radius:2px;height:5px"><div style="height:100%;width:${Math.min(100, f.normalized)}%;background:${tc(f.normalized)};border-radius:2px"></div></div><span style="color:#f1f5f9;font-size:8px;width:28px;text-align:right">${f.normalized}</span></div>`).join('')}
        </div>
    </div>

    <!-- Residual Risk + Drift -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Residual Risk Score</h3>
            <div style="text-align:center;padding:6px"><div style="font-size:24px;font-weight:800;color:${r?.grade === 'Controlled' ? '#10b981' : r?.grade === 'Moderate' ? '#f59e0b' : '#ef4444'}">${r?.score || '—'}%</div><div style="color:#94a3b8;font-size:8px">${r?.grade || '—'} ${r?.cro_review_required ? '<span class="status-icon status-warn" aria-label="Warning">!</span> CRO Review Required' : ''}</div></div>
            <div style="color:#64748b;font-size:7px;padding:3px;background:#0f172a;border-radius:3px;margin-top:4px;font-family:monospace">${r?.formula || ''}</div>
            ${r?.inputs ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-top:4px">${Object.entries(r.inputs).slice(0, 6).map(([k, v]) => `<div style="padding:2px;background:#0f172a;border-radius:3px;text-align:center"><div style="color:#f1f5f9;font-size:0.72rem;font-weight:700">${v}</div><div style="color:#64748b;font-size:6px">${k.replace(/_/g, ' ')}</div></div>`).join('')}</div>` : ''}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Drift Escalation Policy</h3>
            ${(D.health?.drift_policy || []).map(d => `<div style="display:flex;align-items:center;gap:4px;padding:3px;border-bottom:1px solid #1e293b"><span style="padding:1px 5px;background:${d.level === 'critical' ? '#ef444422' : d.level === 'major' ? '#f59e0b22' : d.level === 'moderate' ? '#3b82f622' : '#10b98122'};color:${d.level === 'critical' ? '#ef4444' : d.level === 'major' ? '#f59e0b' : d.level === 'moderate' ? '#3b82f6' : '#10b981'};font-size:8px;border-radius:2px;width:50px;text-align:center">${d.level}</span><span style="flex:1;color:#94a3b8;font-size:8px">${d.action}</span><span style="color:#64748b;font-size:7px">${d.auto_action}</span></div>`).join('')}
        </div>
    </div>

    <!-- P6: Governance -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.78rem">P6 · Material Change (6-Eyes)</h3>
            ${(D.mcp?.triggers || []).map(t => `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #1e293b"><span style="color:#94a3b8;font-size:0.68rem;flex:1">${t.trigger}</span><span class="infra-badge infra-badge--danger">${t.eyes} ${icon('eye')}</span></div>`).join('')}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">MRC Committee</h3>
            ${(D.mrc?.charter?.members || []).map(m => `<div style="display:flex;justify-content:space-between;padding:1px 0;border-bottom:1px solid #1e293b"><span style="color:#f1f5f9;font-size:8px">${m.role}</span><span style="color:#64748b;font-size:7px">${m.title}</span>${m.veto ? '<span style="padding:0 2px;background:#ef444422;color:#ef4444;font-size:6px;border-radius:2px">VETO</span>' : ''}</div>`).join('')}
            <div style="margin-top:3px;color:#3b82f6;font-size:7px">Cadence: ${D.mrc?.charter?.cadence || 'monthly'} · Quorum: ${D.mrc?.charter?.quorum || 4}</div>
        </div>
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Audit Package (${D.auditPkg?.completeness || '0/10'})</h3>
            <div style="background:#0f172a;border-radius:4px;height:6px;margin-bottom:4px"><div style="height:100%;width:${D.auditPkg?.completeness_pct || 0}%;background:${tc(D.auditPkg?.completeness_pct || 0)};border-radius:4px"></div></div>
            ${(D.auditPkg?.artifacts || []).map(a => `<div style="display:flex;align-items:center;gap:3px;padding:2px 0"><span class="infra-badge ${a.status === 'available' ? 'infra-badge--success' : a.status === 'pending' ? 'infra-badge--warning' : 'infra-badge--danger'}">${a.status === 'available' ? icon('check-circle') : a.status === 'pending' ? icon('clock') : icon('x-circle')}</span><span style="color:#94a3b8;font-size:0.68rem">${a.name}</span></div>`).join('')}
        </div>
    </div>

    <!-- Gap Map -->
    <div class="sa-card" style="margin-top:10px"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Gap Map (v1.0 → v2.0)</h3>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">${(mt?.gap_map || []).map(g => `<div style="padding:3px;background:#0f172a;border-radius:3px"><div style="color:#f1f5f9;font-size:8px;font-weight:600">${g.component}</div><div style="color:${g.gap === '—' ? '#10b981' : '#3b82f6'};font-size:7px">${g.current} ${g.gap !== '—' ? '→ ' + g.gap : ''}</div></div>`).join('')}</div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
