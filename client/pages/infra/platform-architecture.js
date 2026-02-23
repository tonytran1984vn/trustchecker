/** Platform Architecture — Simplification & Core Isolation Dashboard */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const [reg, dep, api, crit, cx, iso] = await Promise.all([
        fetch('/api/hardening/platform/module-registry', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/platform/dependency-graph', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/platform/api-surface', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/platform/critical-path', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/platform/complexity', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/hardening/platform/isolation', { headers: h }).then(r => r.json()).catch(() => ({}))
    ]);
    D = { reg, dep, api, crit, cx, iso };
}
const cc = c => c === 'core' ? '#ef4444' : c === 'extended' ? '#3b82f6' : '#10b981';
const cl = c => c === 'core' ? 'CORE' : c === 'extended' ? 'EXTENDED' : 'TOOLING';
export function render() {
    load();
    if (!D.reg?.total_modules) return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('layers')} Platform Architecture</h1></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${'<div class="infra-skeleton" style="min-height:120px"></div>'.repeat(4)}</div></div>`;
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('layers')} Platform Architecture</h1>
        <p style="color:#94a3b8;margin:4px 0 6px">Simplification & Core Isolation · ${D.reg?.total_modules || 12} Modules · ${D.api?.total_endpoints || 516} Endpoints</p>
        <div style="display:inline-flex;gap:6px;flex-wrap:wrap">
            <span style="padding:3px 10px;border-radius:4px;background:#ef444422;color:#ef4444;font-weight:700;font-size:0.78rem">Core: ${D.reg?.core?.count || 6}</span>
            <span style="padding:3px 10px;border-radius:4px;background:#3b82f622;color:#3b82f6;font-weight:700;font-size:0.78rem">Extended: ${D.reg?.extended?.count || 5}</span>
            <span style="padding:3px 10px;border-radius:4px;background:#10b98122;color:#10b981;font-weight:700;font-size:0.78rem">Tooling: ${D.reg?.tooling?.count || 1}</span>
            <span style="padding:3px 10px;border-radius:4px;background:#8b5cf622;color:#8b5cf6;font-weight:700;font-size:0.78rem">Critical Path: ${D.crit?.total_critical || 28} (${D.crit?.pct_of_total || 5}%)</span>
        </div></div>

    <!-- Module Registry -->
    <h2 style="color:#f1f5f9;margin:0 0 4px;font-size:0.78rem;border-bottom:1px solid #334155;padding-bottom:3px">Module Registry — Core / Extended / Tooling</h2>
    <div style="overflow-x:auto;margin-bottom:10px"><table style="width:100%;border-collapse:collapse;font-size:8px"><thead><tr style="border-bottom:2px solid #334155;color:#94a3b8"><th style="padding:3px;text-align:left">ID</th><th>Module</th><th>Class</th><th>Layer</th><th>EP</th><th>Weight</th><th>Removal Impact</th></tr></thead><tbody>${([...(D.reg?.core?.modules || []), ...(D.reg?.extended?.modules || []), ...(D.reg?.tooling?.modules || [])]).map(m => `<tr style="border-bottom:1px solid #1e293b"><td style="padding:2px;color:#64748b">${m.id}</td><td style="color:#f1f5f9;font-weight:600">${m.name.slice(0, 32)}</td><td style="text-align:center"><span style="padding:0 4px;background:${cc(m.classification)}22;color:${cc(m.classification)};font-size:7px;border-radius:2px">${cl(m.classification)}</span></td><td style="color:#64748b;text-align:center">${m.layer}</td><td style="text-align:center;color:#f1f5f9">${m.endpoints}</td><td style="text-align:center"><span style="color:${m.infrastructure_weight >= 9 ? '#ef4444' : m.infrastructure_weight >= 7 ? '#f59e0b' : '#10b981'}">${m.infrastructure_weight}/10</span></td><td style="color:${m.removal_impact.startsWith('FATAL') ? '#ef4444' : m.removal_impact.startsWith('CRITICAL') ? '#f59e0b' : '#3b82f6'};font-size:7px">${m.removal_impact.slice(0, 30)}</td></tr>`).join('')}</tbody></table></div>

    <!-- Dependency Graph + Critical Path -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Dependency Chains</h3>
            <div style="padding:3px 6px;background:#ef444412;border-radius:3px;margin-bottom:3px;color:#ef4444;font-size:8px;font-family:monospace">Core: ${D.dep?.core_chain || ''}</div>
            <div style="padding:3px 6px;background:#3b82f612;border-radius:3px;margin-bottom:3px;color:#3b82f6;font-size:8px;font-family:monospace">Governance: ${D.dep?.governance_chain || ''}</div>
            <div style="padding:3px 6px;background:#10b98112;border-radius:3px;margin-bottom:3px;color:#10b981;font-size:8px;font-family:monospace">Carbon: ${D.dep?.carbon_chain || ''}</div>
            ${(D.dep?.edges || []).slice(0, 8).map(e => `<div style="padding:1px 0;border-bottom:1px solid #1e293b;color:#64748b;font-size:7px"><span style="color:#94a3b8">${e.from}→${e.to}</span> ${e.label}</div>`).join('')}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Critical Path (${D.crit?.total_critical || 28} EP)</h3>
            <div style="display:flex;gap:4px;margin-bottom:4px"><span style="padding:2px 6px;background:#ef444422;color:#ef4444;font-size:8px;border-radius:2px">P0: ${D.crit?.p0?.count || 0}</span><span style="padding:2px 6px;background:#f59e0b22;color:#f59e0b;font-size:8px;border-radius:2px">P1: ${D.crit?.p1?.count || 0}</span></div>
            ${(D.crit?.p0?.endpoints || []).slice(0, 10).map(e => `<div style="padding:1px 0;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:7px"><span style="color:#ef4444;font-weight:700">P0</span> <span style="color:#64748b">${e.method}</span> ${e.description.slice(0, 40)}</div>`).join('')}
        </div>
    </div>

    <!-- API Surface + Complexity -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">API Surface (${D.api?.total_endpoints || 516} EP)</h3>
            ${D.api?.classification ? Object.entries(D.api.classification).map(([k, v]) => `<div style="display:flex;align-items:center;gap:4px;padding:2px 0;border-bottom:1px solid #1e293b"><span style="flex:1;color:#f1f5f9;font-size:8px;text-transform:capitalize">${k.replace(/_/g, ' ')}</span><span style="color:#3b82f6;font-weight:700;font-size:0.68rem">${v.count}</span></div>`).join('') : ''}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#f1f5f9;font-size:0.72rem">Complexity Scorecard</h3>
            ${(D.cx?.metrics || []).map(m => `<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #1e293b"><span style="color:#94a3b8;font-size:7px">${m.metric}</span><span style="color:#f1f5f9;font-size:8px;font-weight:600">${m.value}</span><span style="color:${m.assessment.includes('HIGH') ? '#ef4444' : m.assessment.includes('GOOD') || m.assessment.includes('OK') ? '#10b981' : '#f59e0b'};font-size:6px">${m.assessment.slice(0, 20)}</span></div>`).join('')}
        </div>
    </div>

    <!-- Auditor + Investor Answers -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#ef4444;font-size:0.68rem">🔍 Auditor: "${D.cx?.auditor_answer?.question || ''}"</h3>
            <div style="color:#94a3b8;font-size:8px">${D.cx?.auditor_answer?.answer || ''}</div>
        </div>
        <div class="sa-card"><h3 style="margin:0 0 4px;color:#3b82f6;font-size:0.68rem">💼 Investor: "${D.cx?.investor_answer?.question || ''}"</h3>
            <div style="color:#94a3b8;font-size:8px">${D.cx?.investor_answer?.answer || ''}</div>
        </div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
