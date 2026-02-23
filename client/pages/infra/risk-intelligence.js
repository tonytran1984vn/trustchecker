/** Risk Intelligence Infrastructure Dashboard — Core Moat */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const [mrm, scenarios, sensitivity, resilience] = await Promise.all([
        fetch('/api/hardening/risk-intelligence/mrm', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/risk-intelligence/stress-scenarios', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/risk-intelligence/sensitivity', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/risk-intelligence/resilience', { headers: h }).then(r => r.json()).catch(() => ({}))
    ]);
    D = { mrm, scenarios, sensitivity, resilience };
}
export function render() {
    load(); const m = D.mrm; const r = D.resilience; const s = D.sensitivity; return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('activity')} Risk Intelligence Infrastructure</h1>
        <p style="color:#94a3b8;margin:4px 0 10px">MRM · Independent Validation · Stress Testing · Explainability · Bias Metrics</p>
        <div style="display:inline-block;padding:4px 12px;border-radius:6px;background:${r?.grade === 'A' ? '#10b98122' : r?.grade === 'B' ? '#3b82f622' : '#f59e0b22'};color:${r?.grade === 'A' ? '#10b981' : r?.grade === 'B' ? '#3b82f6' : '#f59e0b'};font-weight:700;font-size:0.82rem">Resilience: ${r?.grade || '—'} (${r?.resilience_score || 0}%)</div></div>

    <!-- MRM -->
    <h2 style="color:#f1f5f9;margin:0 0 6px;font-size:13px;border-bottom:1px solid #334155;padding-bottom:4px">① Model Risk Management (MRM)</h2>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:10px">
        ${[{ l: 'Model', v: m?.model_id || '—', c: '#3b82f6' }, { l: 'Type', v: m?.type || '—', c: '#8b5cf6' }, { l: 'Phase', v: m?.lifecycle?.current_phase || '—', c: '#10b981' }, { l: 'Review', v: m?.governance?.review_frequency || '—', c: '#f59e0b' }, { l: 'Next', v: m?.governance?.next_review || '—', c: '#94a3b8' }].map(k => `<div class="sa-card" style="text-align:center;padding:10px"><div style="font-size:13px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:8px">${k.l}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div class="sa-card"><h3 style="margin:0 0 6px;color:#f1f5f9;font-size:0.78rem">Model Assumptions</h3>
            ${(m?.assumptions || []).map((a, i) => `<div style="padding:2px 4px;color:#94a3b8;font-size:0.72rem;border-bottom:1px solid #1e293b"><span style="color:#3b82f6;font-weight:600">${i + 1}.</span> ${a}</div>`).join('')}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 6px;color:#f1f5f9;font-size:0.78rem">Known Limitations</h3>
            ${(m?.limitations || []).map(l => `<div style="padding:3px 4px;border-bottom:1px solid #1e293b"><div style="display:flex;justify-content:space-between"><span style="color:#f1f5f9;font-size:0.72rem">${l.id}</span><span style="padding:0 4px;background:${l.impact === 'high' ? '#ef444422' : l.impact === 'medium' ? '#f59e0b22' : '#10b98122'};color:${l.impact === 'high' ? '#ef4444' : l.impact === 'medium' ? '#f59e0b' : '#10b981'};font-size:8px;border-radius:3px">${l.impact}</span></div><div style="color:#94a3b8;font-size:0.68rem">${l.description}</div><div style="color:#64748b;font-size:8px">↳ ${l.mitigation}</div></div>`).join('')}
        </div>
    </div>
    <div class="sa-card" style="margin-bottom:14px"><h3 style="margin:0 0 6px;color:#f1f5f9;font-size:0.78rem">Performance Targets</h3>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px">${Object.entries(m?.performance_targets || {}).map(([k, v]) => `<div style="padding:8px;background:#0f172a;border-radius:6px;text-align:center"><div style="color:#f1f5f9;font-weight:700;font-size:14px">${typeof v === 'number' && v < 1 ? (v * 100).toFixed(0) + '%' : v}</div><div style="color:#64748b;font-size:8px">${k.replace(/_/g, ' ')}</div></div>`).join('')}</div>
    </div>

    <!-- Stress Testing -->
    <h2 style="color:#f1f5f9;margin:0 0 6px;font-size:13px;border-bottom:1px solid #334155;padding-bottom:4px">② Stress Testing & Sensitivity</h2>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:14px">
        <div class="sa-card"><h3 style="margin:0 0 6px;color:#f1f5f9;font-size:0.78rem">Stress Scenarios (${D.scenarios?.scenarios?.length || 0})</h3>
            ${(D.scenarios?.scenarios || []).map(sc => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid ${sc.severity === 'critical' ? '#ef4444' : sc.severity === 'high' ? '#f59e0b' : '#3b82f6'}"><div style="display:flex;justify-content:space-between"><span style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${sc.name}</span><span style="padding:0 4px;background:${sc.type === 'black_swan' ? '#ef444422' : sc.type === 'adversarial' ? '#8b5cf622' : '#f59e0b22'};color:${sc.type === 'black_swan' ? '#ef4444' : sc.type === 'adversarial' ? '#8b5cf6' : '#f59e0b'};font-size:8px;border-radius:3px">${sc.type}</span></div><div style="color:#94a3b8;font-size:0.68rem;margin-top:2px">${sc.description}</div><div style="color:#64748b;font-size:8px;margin-top:1px">Test: ${sc.model_test}</div></div>`).join('')}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 6px;color:#f1f5f9;font-size:0.78rem">Sensitivity Analysis</h3>
            ${(s?.analyses || []).map(a => `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid #1e293b"><span style="width:18px;text-align:center;color:#3b82f6;font-weight:700;font-size:0.72rem">#${a.sensitivity_rank}</span><span style="flex:1;color:#94a3b8;font-size:0.72rem">${a.factor.replace(/_/g, ' ')}</span><span style="padding:0 4px;background:${a.classification === 'high_sensitivity' ? '#ef444422' : '#10b98122'};color:${a.classification === 'high_sensitivity' ? '#ef4444' : '#10b981'};font-size:8px;border-radius:3px">${a.classification.replace(/_/g, ' ')}</span></div>`).join('')}
            ${s?.recommendation ? `<div style="margin-top:6px;padding:4px 6px;background:#0f172a;border-radius:4px;color:#f59e0b;font-size:8px">${s.recommendation}</div>` : ''}
        </div>
    </div>

    <!-- Resilience -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div class="sa-card"><h3 style="margin:0 0 6px;color:#f1f5f9;font-size:0.78rem">Model Resilience (${r?.resilience_score || 0}%)</h3>
            ${(r?.checks || []).map(c => `<div style="display:flex;align-items:center;gap:6px;padding:2px 0"><span style="font-size:0.82rem">${c.pass ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '<span class="status-icon status-fail" aria-label="Fail">✗</span>'}</span><span style="color:${c.pass ? '#94a3b8' : '#ef4444'};font-size:0.72rem;flex:1">${c.check}</span><span style="color:#64748b;font-size:0.68rem">w:${c.weight}</span></div>`).join('')}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 6px;color:#f1f5f9;font-size:0.78rem">Model Tiers</h3>
            ${(m?.tiers || []).map(t => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px"><div style="display:flex;justify-content:space-between"><span style="color:#3b82f6;font-weight:700;font-size:0.78rem">${t.tier}</span><span style="color:#f1f5f9;font-size:0.72rem">${t.name}</span></div><div style="display:flex;gap:8px;margin-top:2px"><span style="color:#64748b;font-size:0.68rem">Scope: ${t.scope}</span><span style="color:#64748b;font-size:0.68rem">Inputs: ${t.inputs}</span><span style="color:#64748b;font-size:0.68rem">↻ ${t.refresh}</span></div></div>`).join('')}
        </div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
