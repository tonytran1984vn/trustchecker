/** L3→L4 Hardening Dashboard — Risk Model Gov + SA Constraints + Observability */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
let D = {};
let _loading = false;
let _loaded = false;
async function load() {
    if (_loading || _loaded) return;
    _loading = true;
    const [model, drift, pending, overrides, sa, saAudit, sys, alerts, sla, errors] = await Promise.all([
        API.get('/hardening/risk-model/active').catch(() => ({})),
        API.get('/hardening/risk-model/drift').catch(() => ({})),
        API.get('/hardening/risk-model/pending').catch(() => ({})),
        API.get('/hardening/risk-model/overrides').catch(() => ({})),
        API.get('/hardening/sa/dashboard').catch(() => ({})),
        API.get('/hardening/sa/audit').catch(() => ({})),
        API.get('/hardening/observability/health').catch(() => ({})),
        API.get('/hardening/observability/alerts').catch(() => ({})),
        API.get('/hardening/observability/sla').catch(() => ({})),
        API.get('/hardening/observability/errors').catch(() => ({}))
    ]);
    D = { model, drift, pending, overrides, sa, saAudit, sys, alerts, sla, errors };
    _loaded = true;
    _loading = false;
    setTimeout(() => {
        const el = document.getElementById('hardening-root');
        if (el) el.innerHTML = renderContent();
    }, 50);
}
const sc = (v, g, y) => v >= g ? '#10b981' : v >= y ? '#f59e0b' : '#ef4444';
function renderContent() {
    const m = D.model; const d = D.drift; const s = D.sys; const sa = D.sa;
    if (!m?.version_id && !sa?.forbidden_actions) return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('shield')} L3→L4 Hardening Dashboard</h1><p style="color:#94a3b8;margin:4px 0 10px">Risk Model Governance · Super Admin Constraints · Real Observability</p></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${'<div class="infra-skeleton" style="min-height:120px"></div>'.repeat(4)}</div></div>`;
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('shield')} L3→L4 Hardening Dashboard</h1>
        <p style="color:#94a3b8;margin:4px 0 10px">Risk Model Governance · Super Admin Constraints · Real Observability</p></div>

    <!-- Section: Risk Model Governance -->
    <h2 style="color:#f1f5f9;margin:0 0 8px;font-size:14px;border-bottom:1px solid #334155;padding-bottom:4px">① Risk Model Governance</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px">
        ${[{ l: 'Active Model', v: m?.version_id || 'bootstrap', c: '#3b82f6', i: '🧠' }, { l: 'Drift', v: d?.drifted ? '<span class="status-icon status-warn" aria-label="Warning">!</span> DRIFTED' : '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Stable', c: d?.drifted ? '#ef4444' : '#10b981', i: '📈' }, { l: 'Pending Changes', v: D.pending?.pending || 0, c: '#f59e0b', i: '🔄' }, { l: 'Overrides', v: D.overrides?.total || 0, c: '#8b5cf6', i: '📝' }].map(k => `<div class="sa-card" style="text-align:center;padding:12px"><div style="font-size:16px">${k.i}</div><div style="font-size:16px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.68rem">${k.l}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div class="sa-card"><h3 style="margin:0 0 6px;color:#f1f5f9;font-size:0.82rem">Frozen Weights (${m?.version_id || 'bootstrap'})</h3>
            ${Object.entries(m?.weights || {}).map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:2px 4px;border-bottom:1px solid #1e293b"><span style="color:#94a3b8;font-size:0.72rem">${k.replace(/_/g, ' ')}</span><span style="color:#f1f5f9;font-weight:700;font-size:0.72rem">${Math.round(v * 100)}%</span></div>`).join('')}
            ${m?.status === 'bootstrap' ? '<div style="margin-top:6px;padding:4px 8px;background:#f59e0b22;border-radius:4px;color:#f59e0b;font-size:0.68rem"><span class="status-icon status-warn" aria-label="Warning">!</span> Bootstrap weights — not governance-approved yet</div>' : '<div style="margin-top:6px;padding:4px 8px;background:#10b98122;border-radius:4px;color:#10b981;font-size:0.68rem"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Weights frozen + hash-verified</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 6px;color:#f1f5f9;font-size:0.82rem">Drift Detection</h3>
            ${d?.status === 'insufficient_data' ? `<div style="text-align:center;padding:12px;color:#64748b;font-size:0.78rem">${d.message} (${d.samples} samples)</div>` : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div style="padding:8px;background:#0f172a;border-radius:6px;text-align:center"><div style="color:#94a3b8;font-size:0.68rem">Baseline Mean</div><div style="color:#f1f5f9;font-weight:700">${d?.baseline?.mean || '—'}</div></div><div style="padding:8px;background:#0f172a;border-radius:6px;text-align:center"><div style="color:#94a3b8;font-size:0.68rem">Recent Mean</div><div style="color:${d?.drifted ? '#ef4444' : '#f1f5f9'};font-weight:700">${d?.recent?.mean || '—'}</div></div><div style="padding:8px;background:#0f172a;border-radius:6px;text-align:center"><div style="color:#94a3b8;font-size:0.68rem">Mean Shift</div><div style="color:${d?.shift?.mean_shift > 10 ? '#ef4444' : '#10b981'};font-weight:700">${d?.shift?.mean_shift || 0}</div></div><div style="padding:8px;background:#0f172a;border-radius:6px;text-align:center"><div style="color:#94a3b8;font-size:0.68rem">Variance Shift</div><div style="color:${d?.shift?.variance_shift > 5 ? '#ef4444' : '#10b981'};font-weight:700">${d?.shift?.variance_shift || 0}</div></div></div>`}
            ${d?.recommendation ? `<div style="margin-top:6px;padding:4px 8px;background:#0f172a;border-radius:4px;color:#94a3b8;font-size:0.68rem">${d.recommendation}</div>` : ''}
        </div>
    </div>

    <!-- Section: Super Admin Constraints -->
    <h2 style="color:#f1f5f9;margin:0 0 8px;font-size:14px;border-bottom:1px solid #334155;padding-bottom:4px">② Super Admin Constraints</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div class="sa-card"><h3 style="margin:0 0 6px;color:#f1f5f9;font-size:0.82rem">🚫 Forbidden Actions (NEVER)</h3>
            ${(sa?.forbidden_actions || []).length > 0 ? (sa.forbidden_actions).map(f => `<div style="display:flex;align-items:center;gap:6px;padding:2px 0"><span style="color:#ef4444;font-size:0.82rem"><span class="status-icon status-fail" aria-label="Fail">✗</span></span><span style="color:#f1f5f9;font-size:0.72rem">${f.action}</span></div>`).join('') : '<div style="text-align:center;padding:16px;color:#64748b;font-size:0.78rem">🔒 Access restricted to Super Admin</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 6px;color:#f1f5f9;font-size:0.82rem"><span class="status-icon status-warn" aria-label="Warning">!</span> Restricted Actions (Rate-Limited + Dual-Approval)</h3>
            ${Object.keys(sa?.restricted_actions || {}).length > 0 ? Object.entries(sa.restricted_actions).map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:2px 4px;border-bottom:1px solid #1e293b"><span style="color:#94a3b8;font-size:0.72rem">${k.replace(/_/g, ' ')}</span><span style="color:${v.daily_limit === 0 ? '#ef4444' : '#f59e0b'};font-size:0.68rem">${v.daily_limit === 0 ? 'FORBIDDEN' : v.daily_limit + '/day'}</span><span style="color:#3b82f6;font-size:0.68rem">${v.requires || 'self'}</span></div>`).join('') : '<div style="text-align:center;padding:16px;color:#64748b;font-size:0.78rem">🔒 Access restricted to Super Admin</div>'}
        </div>
    </div>

    <!-- Section: Observability (Real Metrics) -->
    <h2 style="color:#f1f5f9;margin:0 0 8px;font-size:14px;border-bottom:1px solid #334155;padding-bottom:4px">③ Observability (Real Metrics)</h2>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:12px">
        ${[{ l: 'Heap Used', v: (s?.memory?.heap_used_mb || 0) + 'MB', c: sc(100 - s?.memory?.heap_usage_pct, 50, 20), i: '💾' }, { l: 'Heap %', v: (s?.memory?.heap_usage_pct || 0) + '%', c: sc(100 - s?.memory?.heap_usage_pct, 50, 20), i: '📊' }, { l: 'CPU Cores', v: s?.cpu?.cores || 0, c: '#3b82f6', i: '⚙️' }, { l: 'P95 Response', v: (s?.requests?.p95_ms || 0) + 'ms', c: sc(3000 - s?.requests?.p95_ms, 1500, 0), i: '⏱️' }, { l: 'Error Rate', v: (s?.requests?.error_rate_pct || 0) + '%', c: sc(5 - s?.requests?.error_rate_pct, 4, 0), i: '<span class="status-icon status-warn" aria-label="Warning">!</span>' }, { l: 'Uptime', v: s?.process?.uptime_human || '—', c: '#10b981', i: '<span class="status-dot green"></span>' }].map(k => `<div class="sa-card" style="text-align:center;padding:10px"><div style="font-size:14px">${k.i}</div><div style="font-size:14px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:8px">${k.l}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="sa-card"><h3 style="margin:0 0 6px;color:#f1f5f9;font-size:0.82rem">Request Metrics (5min)</h3>
            ${s?.requests ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${[{ l: 'Requests', v: s.requests.last_5min }, { l: 'P50', v: s.requests.p50_ms + 'ms' }, { l: 'Total Tracked', v: s.requests.total_tracked }].map(m => `<div style="padding:6px;background:#0f172a;border-radius:4px;text-align:center"><div style="color:#f1f5f9;font-weight:700;font-size:13px">${m.v}</div><div style="color:#64748b;font-size:8px">${m.l}</div></div>`).join('')}</div>` : ''}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 6px;color:#f1f5f9;font-size:0.82rem">Error Breakdown (1h)</h3>
            ${D.errors?.total_errors > 0 ? D.errors.by_path.slice(0, 5).map(e => `<div style="display:flex;justify-content:space-between;padding:2px 4px;border-bottom:1px solid #1e293b"><span style="color:#94a3b8;font-size:0.72rem;font-family:monospace">${e.path}</span><span style="color:#ef4444;font-weight:700;font-size:0.72rem">${e.count}</span></div>`).join('') : '<div style="text-align:center;padding:12px;color:#10b981;font-size:0.72rem"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> No errors in last hour</div>'}
        </div>
    </div>
</div>`;
}
export function render() {
    _loaded = false; _loading = false;
    load();
    return `<div id="hardening-root">${renderContent()}</div>`;
}
export function renderPage() { return render(); }
