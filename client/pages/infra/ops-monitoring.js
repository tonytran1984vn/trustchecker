/** Ops Monitoring Dashboard — Pipeline Health, Incidents, Runbooks */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const [health, incidents, runbooks, boundary] = await Promise.all([
        fetch('/api/ops/health', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/ops/incidents', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/ops/runbooks', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/ops/boundary', { headers: h }).then(r => r.json()).catch(() => ({}))
    ]);
    D = { health, incidents, runbooks, boundary };
}
const sevColor = s => s === 'critical' ? '#ef4444' : s === 'warning' || s === 'degraded' ? '#f59e0b' : '#10b981';
export function render() {
    load(); const hl = D.health; return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('activity')} Ops Monitoring (Execution Stabilizer)</h1>
        <p style="color:#94a3b8;margin:4px 0 12px">SLO-based Pipeline Health · Incident Response · Runbooks</p>
        <div style="display:inline-block;padding:4px 12px;border-radius:6px;background:${sevColor(hl?.overall)}22;color:${sevColor(hl?.overall)};font-weight:700;font-size:0.82rem">${(hl?.overall || 'loading').toUpperCase()}</div></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
        ${[{ l: 'SLO Checks', v: hl?.checks?.length || 8, c: '#3b82f6', i: '📊' }, { l: 'Healthy', v: hl?.summary?.healthy || 0, c: '#10b981', i: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' }, { l: 'Warning', v: hl?.summary?.warning || 0, c: '#f59e0b', i: '<span class="status-icon status-warn" aria-label="Warning">!</span>' }, { l: 'Critical', v: hl?.summary?.critical || 0, c: '#ef4444', i: '<span class="status-dot red"></span>' }].map(k => `<div class="sa-card" style="text-align:center;padding:12px"><div style="font-size:18px">${k.i}</div><div style="font-size:20px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${k.l}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px">
        <div class="sa-card"><h3 style="margin:0 0 8px;color:#f1f5f9">Pipeline SLO Monitor</h3>
            ${(hl?.checks || []).map(c => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #1e293b"><div style="width:180px;color:#94a3b8;font-size:0.78rem">${c.metric}</div><div style="flex:1;background:#1e293b;border-radius:4px;height:8px;position:relative"><div style="position:absolute;left:0;top:0;height:100%;width:${Math.min(100, c.status === 'healthy' ? 100 : c.status === 'warning' ? 70 : 30)}%;background:${sevColor(c.status)};border-radius:4px"></div></div><span style="color:#f1f5f9;font-size:0.72rem;width:60px;text-align:right">${c.actual}${c.unit}</span><span style="padding:1px 6px;border-radius:4px;background:${sevColor(c.status)}22;color:${sevColor(c.status)};font-size:8px;width:50px;text-align:center">${c.status}</span></div>`).join('')}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 8px;color:#f1f5f9">Ops Boundary</h3>
            <div style="font-size:0.72rem;color:#10b981;font-weight:600;margin-bottom:4px"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> CAN DO:</div>
            ${(D.boundary?.can_do || []).map(a => `<div style="color:#94a3b8;font-size:0.72rem;padding:1px 0">• ${a}</div>`).join('')}
            <div style="font-size:0.72rem;color:#ef4444;font-weight:600;margin:8px 0 4px">🚫 CANNOT DO:</div>
            ${(D.boundary?.cannot_do || []).map(a => `<div style="color:#64748b;font-size:0.72rem;padding:1px 0">• ${a.action}</div>`).join('')}
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="sa-card"><h3 style="margin:0 0 8px;color:#f1f5f9">Recent Incidents</h3>
            ${D.incidents?.incidents?.length > 0 ? D.incidents.incidents.map(i => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid ${i.severity === 'SEV1' ? '#ef4444' : i.severity === 'SEV2' ? '#f59e0b' : '#3b82f6'}"><div style="display:flex;justify-content:space-between"><span style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${i.title}</span><span style="color:${i.severity === 'SEV1' ? '#ef4444' : '#f59e0b'};font-size:0.68rem">${i.severity}</span></div><div style="color:#64748b;font-size:0.68rem">${i.status} · ${(i.created_at || '').slice(0, 16)}</div></div>`).join('') : '<div style="text-align:center;padding:16px;color:#10b981;font-size:0.78rem"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> No active incidents</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 8px;color:#f1f5f9">Runbooks</h3>
            ${Object.entries(D.runbooks?.runbooks || {}).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px"><div style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${v.name}</div><div style="color:#64748b;font-size:0.68rem">${v.severity} · ${v.steps?.length || 0} steps · Audit: ${v.requires_audit ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '<span class="status-icon status-fail" aria-label="Fail">✗</span>'}</div></div>`).join('')}
        </div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
