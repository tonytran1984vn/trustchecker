/** Institutional Engine — 4 Pillars Dashboard */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const [ra, breach, bd, charter, plan, exposure, capital, mat] = await Promise.all([
        fetch('/api/hardening/institutional/risk-appetite', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/institutional/appetite-breach', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/institutional/board-dashboard', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/institutional/audit-charter', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/institutional/audit-plan', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/institutional/exposure', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/institutional/economic-capital', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/institutional/maturity', { headers: h }).then(r => r.json()).catch(() => ({}))
    ]);
    D = { ra, breach, bd, charter, plan, exposure, capital, mat };
}
const rc = r => r === 'red' ? '#ef4444' : r === 'amber' ? '#f59e0b' : '#10b981';
const gc = g => g === 'Strong' || g === 'Adequate' ? '#10b981' : g === 'Watch' ? '#f59e0b' : '#ef4444';
export function render() {
    load(); const bd = D.bd; const cap = D.capital; const mat = D.mat;
    if (!mat) return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('trending-up')} Institutional Engine</h1></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${'<div class="infra-skeleton" style="min-height:120px"></div>'.repeat(4)}</div></div>`;
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('trending-up')} Institutional Engine — 4 Pillars</h1>
        <p style="color:#94a3b8;margin:4px 0 6px">Trust & Carbon Infrastructure Operator · Not SaaS Vendor</p>
        <div style="display:inline-flex;gap:6px;flex-wrap:wrap">
            <span style="padding:3px 10px;border-radius:4px;background:#8b5cf622;color:#8b5cf6;font-weight:700;font-size:0.78rem">Maturity: ${mat?.overall || '—'}</span>
            <span style="padding:3px 10px;border-radius:4px;background:${bd?.summary?.overall === 'SATISFACTORY' ? '#10b98122' : '#f59e0b22'};color:${bd?.summary?.overall === 'SATISFACTORY' ? '#10b981' : '#f59e0b'};font-weight:700;font-size:0.78rem">Board: ${bd?.summary?.overall || '—'}</span>
            <span style="padding:3px 10px;border-radius:4px;background:${gc(cap?.coverage_grade)}22;color:${gc(cap?.coverage_grade)};font-weight:700;font-size:0.78rem">Capital: ${cap?.coverage_ratio || '—'}% (${cap?.coverage_grade || '—'})</span>
        </div></div>

    <!-- I. Risk Appetite: Zero Tolerance + Domain -->
    <h2 style="color:#f1f5f9;margin:0 0 4px;font-size:0.78rem;border-bottom:1px solid #334155;padding-bottom:3px">I · Risk Appetite Statement</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#ef4444;font-size:0.78rem">${icon('alert-triangle')} Zero Tolerance</h3>
            ${(D.ra?.zero_tolerance || []).map(z => `<div style="padding:4px;background:#ef444408;border-left:2px solid #ef4444;margin-bottom:3px;border-radius:0 3px 3px 0"><div style="color:#f1f5f9;font-size:0.72rem;font-weight:600">${z.item}</div><div style="color:#64748b;font-size:8px">${z.enforcement.slice(0, 80)}</div></div>`).join('')}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Domain Appetite</h3>
            ${(D.ra?.domain_appetite || []).map(a => `<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #1e293b"><span style="color:#f1f5f9;font-size:8px">${a.domain}</span><span style="padding:0 5px;background:${a.appetite.includes('Very Low') ? '#10b98122' : a.appetite.includes('Low') ? '#3b82f622' : a.appetite.includes('Conservative') ? '#3b82f622' : '#f59e0b22'};color:${a.appetite.includes('Very Low') ? '#10b981' : a.appetite.includes('Low') ? '#3b82f6' : a.appetite.includes('Conservative') ? '#3b82f6' : '#f59e0b'};font-size:7px;border-radius:2px">${a.appetite}</span><span style="color:#64748b;font-size:7px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.threshold.slice(0, 35)}</span></div>`).join('')}
            ${D.breach?.all_clear !== undefined ? `<div style="margin-top:4px;padding:3px 6px;background:${D.breach.all_clear ? '#10b98112' : '#ef444412'};border-radius:3px;color:${D.breach.all_clear ? '#10b981' : '#ef4444'};font-size:8px;font-weight:700">${D.breach.all_clear ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> All Clear — No Breaches' : '<span class="status-icon status-warn" aria-label="Warning">!</span> ' + D.breach.breaches + ' Appetite Breach(es)'}</div>` : ''}
        </div>
    </div>

    <!-- II. Board Dashboard: 4 Layers × 4 KPIs -->
    <h2 style="color:#f1f5f9;margin:0 0 4px;font-size:0.78rem;border-bottom:1px solid #334155;padding-bottom:3px">II · Board Risk Dashboard (${bd?.summary?.total_kpis || 16} KPIs)</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:6px">
        ${[{ l: 'Red', v: bd?.summary?.red || 0, c: '#ef4444' }, { l: 'Amber', v: bd?.summary?.amber || 0, c: '#f59e0b' }, { l: 'Green', v: bd?.summary?.green || 0, c: '#10b981' }].map(k => `<div style="text-align:center;padding:4px;background:${k.c}10;border:1px solid ${k.c}33;border-radius:4px"><div style="font-size:16px;font-weight:800;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:7px">${k.l}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px">
        ${bd?.layers ? Object.entries(bd.layers).map(([key, layer]) => `<div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.68rem">${layer.name}</h3>${(layer.kpis || []).map(k => `<div style="display:flex;align-items:center;gap:4px;padding:2px 0;border-bottom:1px solid #1e293b"><span style="width:8px;height:8px;border-radius:50%;background:${rc(k.rag)}"></span><span style="flex:1;color:#94a3b8;font-size:8px">${k.name}</span><span style="color:#f1f5f9;font-size:0.68rem;font-weight:700">${k.actual}${k.unit === '%' ? '%' : k.unit === 'index' ? '' : ''}</span><span style="color:#64748b;font-size:6px">${k.trend?.direction || ''}</span></div>`).join('')}</div>`).join('') : ''}
    </div>

    <!-- III. Internal Audit Charter + Plan -->
    <h2 style="color:#f1f5f9;margin:0 0 4px;font-size:0.78rem;border-bottom:1px solid #334155;padding-bottom:3px">III · Internal Audit Charter (IPO-Grade)</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Charter Independence</h3>
            <div style="padding:3px 6px;background:#ef444412;border-radius:3px;margin-bottom:4px;color:#ef4444;font-size:8px;font-weight:700">Reports to: ${D.charter?.reporting_line || 'Audit Committee'} — NOT CEO</div>
            ${(D.charter?.independence || []).map(r => `<div style="padding:1px 0;color:#94a3b8;font-size:7px;border-bottom:1px solid #1e293b">• ${r}</div>`).join('')}
            <div style="margin-top:4px;color:#3b82f6;font-size:8px;font-weight:600">Audit Scopes:</div>
            ${(D.charter?.scope || []).map(s => `<div style="display:flex;justify-content:space-between;padding:1px 0;border-bottom:1px solid #1e293b"><span style="color:#f1f5f9;font-size:7px">${s.id} ${s.area}</span><span style="color:#64748b;font-size:6px">${s.frequency}</span></div>`).join('')}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Audit Cycles</h3>
            ${(D.charter?.cycles || []).map(c => `<div style="padding:4px;background:#0f172a;border-radius:3px;margin-bottom:3px;border-left:2px solid ${c.type.includes('Surprise') ? '#ef4444' : c.type.includes('Annual') ? '#f59e0b' : '#3b82f6'}"><div style="color:#f1f5f9;font-size:0.68rem;font-weight:600">${c.type}</div><div style="color:#64748b;font-size:7px">${c.scope}</div><div style="color:#94a3b8;font-size:7px">SLA: ${c.sla}</div></div>`).join('')}
            <div style="margin-top:4px;color:#3b82f6;font-size:8px;font-weight:600">Audit Plan:</div>
            ${(D.plan?.plan || []).map(p => `<div style="display:flex;justify-content:space-between;padding:1px 0;border-bottom:1px solid #1e293b"><span style="color:#f1f5f9;font-size:7px">${p.quarter}</span><span style="color:#94a3b8;font-size:7px">${p.focused_areas.join(', ').slice(0, 40)}</span></div>`).join('')}
        </div>
    </div>

    <!-- IV. Risk Capital Allocation -->
    <h2 style="color:#f1f5f9;margin:0 0 4px;font-size:0.78rem;border-bottom:1px solid #334155;padding-bottom:3px">IV · Risk Capital Allocation</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">
        <div class="sa-card" style="text-align:center">
            <div style="color:#94a3b8;font-size:8px;margin-bottom:2px">Current Capital</div>
            <div style="font-size:22px;font-weight:800;color:#3b82f6">${cap?.board_view?.current_risk_capital || '—'}</div>
        </div>
        <div class="sa-card" style="text-align:center">
            <div style="color:#94a3b8;font-size:8px;margin-bottom:2px">Required Capital</div>
            <div style="font-size:22px;font-weight:800;color:#f59e0b">${cap?.board_view?.required_risk_capital || '—'}</div>
        </div>
        <div class="sa-card" style="text-align:center">
            <div style="color:#94a3b8;font-size:8px;margin-bottom:2px">Coverage Ratio</div>
            <div style="font-size:22px;font-weight:800;color:${gc(cap?.coverage_grade)}">${cap?.board_view?.coverage || '—'}</div>
            <div style="color:${gc(cap?.coverage_grade)};font-size:8px">${cap?.board_view?.grade || ''}</div>
        </div>
    </div>

    <div style="display:grid;grid-template-columns:3fr 2fr;gap:10px;margin-bottom:10px">
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Exposure by Domain (Stressed)</h3>
            ${(cap?.by_domain || []).map(d => `<div style="display:flex;align-items:center;gap:4px;padding:2px 0;border-bottom:1px solid #1e293b"><span style="color:#f1f5f9;font-size:8px;flex:1;font-weight:600">${d.domain}</span><span style="color:#f59e0b;font-size:0.68rem;font-weight:700">$${(d.exposure / 1000).toFixed(0)}K</span><span style="color:#64748b;font-size:7px">${d.buffer}</span></div>`).join('')}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Stress Scenarios</h3>
            ${cap?.scenarios ? Object.entries(cap.scenarios).map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #1e293b"><span style="color:#f1f5f9;font-size:0.68rem;text-transform:capitalize">${k}</span><span style="color:#94a3b8;font-size:8px">×${v.factor}</span><span style="color:#f59e0b;font-size:0.68rem;font-weight:700">$${(v.exposure / 1000).toFixed(0)}K</span></div>`).join('') : ''}
        </div>
    </div>

    <!-- Maturity -->
    <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Institutional Maturity: ${mat?.overall || '—'} — ${mat?.label || ''}</h3>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px">${(mat?.dimensions || []).map(d => `<div style="display:flex;align-items:center;gap:4px;padding:2px 0;border-bottom:1px solid #1e293b"><span style="flex:1;color:#94a3b8;font-size:8px">${d.dimension}</span><div style="width:50px;background:#0f172a;border-radius:2px;height:5px"><div style="height:100%;width:${d.score / d.max * 100}%;background:${d.score >= 4 ? '#10b981' : d.score >= 3 ? '#3b82f6' : '#f59e0b'};border-radius:2px"></div></div><span style="color:#f1f5f9;font-size:8px">${d.score}/${d.max}</span></div>`).join('')}</div>
        <div style="margin-top:4px;padding:3px 6px;background:#8b5cf612;border-radius:3px;color:#8b5cf6;font-size:8px">${mat?.gap_to_infra || ''}</div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
