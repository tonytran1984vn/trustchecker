/** Compliance RegTech Dashboard — Auto-reports, Frameworks, CBAM */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const [report, frameworks, gaps, cbam] = await Promise.all([
        fetch('/api/compliance-regtech/report', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/compliance-regtech/frameworks', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/compliance-regtech/gaps', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/compliance-regtech/cbam-status', { headers: h }).then(r => r.json()).catch(() => ({}))
    ]);
    D = { report, frameworks, gaps, cbam };
}
export function render() {
    load(); const r = D.report; return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('shield')} Compliance Engine (RegTech)</h1><p style="color:#94a3b8;margin:4px 0 16px">Auto-generated Compliance Reports · Jurisdiction Rules · Regulatory Diff</p></div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Overall Readiness', v: (r?.overall_readiness_pct || 0) + '%', c: r?.overall_readiness_pct >= 75 ? '#10b981' : '#f59e0b', i: '📊' }, { l: 'Frameworks', v: r?.frameworks?.length || 0, c: '#3b82f6', i: '📋' }, { l: 'Gaps', v: D.gaps?.total_gaps || 0, c: '#ef4444', i: '<span class="status-icon status-warn" aria-label="Warning">!</span>' }, { l: 'CBAM Status', v: D.cbam?.cbam_affected ? 'Affected' : 'Clear', c: D.cbam?.cbam_affected ? '#f59e0b' : '#10b981', i: '🇪🇺' }, { l: 'Next Review', v: r?.next_review || '—', c: '#94a3b8', i: '📅' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:18px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${k.l}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:3fr 2fr;gap:16px;margin-bottom:20px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">${icon('scroll')} Framework Compliance</h3>
            ${r?.frameworks?.length > 0 ? `<table style="width:100%;border-collapse:collapse;font-size:0.78rem"><thead><tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.68rem;text-transform:uppercase"><th style="padding:4px;text-align:left">Framework</th><th style="padding:4px">Region</th><th style="padding:4px">Readiness</th><th style="padding:4px">Status</th></tr></thead><tbody>${r.frameworks.map(f => `<tr style="border-bottom:1px solid #1e293b"><td style="padding:6px;color:#f1f5f9;font-weight:500;font-size:0.72rem">${f.framework}</td><td style="padding:4px;text-align:center;color:#94a3b8">${f.region}</td><td style="padding:4px;text-align:center"><div style="background:#1e293b;border-radius:4px;height:8px;width:80px;display:inline-block;position:relative"><div style="position:absolute;left:0;top:0;height:100%;width:${f.readiness_pct}%;background:${f.readiness_pct >= 80 ? '#10b981' : f.readiness_pct >= 50 ? '#f59e0b' : '#ef4444'};border-radius:4px"></div></div><span style="font-size:0.68rem;color:#94a3b8;margin-left:4px">${f.readiness_pct}%</span></td><td style="padding:4px;text-align:center"><span style="padding:1px 6px;border-radius:4px;background:${f.status === 'compliant' ? '#10b98122' : f.status === 'partial' ? '#f59e0b22' : '#ef444422'};color:${f.status === 'compliant' ? '#10b981' : f.status === 'partial' ? '#f59e0b' : '#ef4444'};font-size:0.68rem">${f.status}</span></td></tr>`).join('')}</tbody></table>` : '<div style="text-align:center;padding:20px;color:#64748b">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">${icon('shield')} Compliance Gaps</h3>
            ${D.gaps?.gaps?.length > 0 ? D.gaps.gaps.map(g => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:2px solid #ef4444"><div style="color:#f1f5f9;font-size:0.72rem;font-weight:600">[${g.id}] ${g.requirement}</div><div style="color:#64748b;font-size:0.68rem">${g.framework}</div></div>`).join('') : '<div style="text-align:center;padding:20px;color:#10b981"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> No compliance gaps</div>'}
        </div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
