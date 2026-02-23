/** Risk Intelligence Layer — Behavioral AI + Fraud Graph Dashboard */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const [behavior, links, patterns, dashboard] = await Promise.all([
        fetch('/api/risk-graph/behavior', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/risk-graph/hidden-links', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/risk-graph/patterns', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/risk-graph/dashboard', { headers: h }).then(r => r.json()).catch(() => ({}))
    ]);
    D = { behavior, links, patterns, dashboard };
}
export function render() {
    load(); const b = D.behavior; return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('activity')} Risk Intelligence Layer</h1><p style="color:#94a3b8;margin:4px 0 16px">Behavioral Risk Modeling + Fraud Graph + Link Analysis (AI-native)</p></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Risk Score', v: b?.risk_score || 0, c: b?.risk_level === 'critical' ? '#ef4444' : b?.risk_level === 'high' ? '#f59e0b' : '#10b981', i: '🎯' }, { l: 'Signals Detected', v: b?.signals?.length || 0, c: '#f59e0b', i: '<span class="status-icon status-warn" aria-label="Warning">!</span>' }, { l: 'Hidden Links', v: D.links?.total_links || 0, c: '#8b5cf6', i: '🔗' }, { l: 'Pattern Types', v: Object.keys(D.patterns?.patterns || {}).length || 6, c: '#3b82f6', i: '🧠' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:20px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${k.l}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:20px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">${icon('activity')} Behavioral Signals</h3>
            ${b?.signals?.length > 0 ? b.signals.map(s => `<div style="padding:8px;background:#0f172a;border-radius:6px;margin-bottom:6px;border-left:3px solid ${s.severity === 'critical' ? '#ef4444' : s.severity === 'high' ? '#f59e0b' : '#3b82f6'}"><div style="display:flex;justify-content:space-between"><span style="color:#f1f5f9;font-weight:600;font-size:0.82rem">${s.pattern.replace(/_/g, ' ')}</span><span style="padding:1px 6px;border-radius:4px;background:${s.severity === 'critical' ? '#ef444422' : '#f59e0b22'};color:${s.severity === 'critical' ? '#ef4444' : '#f59e0b'};font-size:0.68rem">${s.severity}</span></div><div style="color:#94a3b8;font-size:0.72rem;margin-top:2px">${s.detail}</div><div style="color:#64748b;font-size:0.68rem;margin-top:2px">Risk: +${s.score}</div></div>`).join('') : '<div style="text-align:center;padding:20px;color:#10b981"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> No behavioral anomalies detected</div>'}
            ${b?.recommendation ? `<div style="padding:6px 10px;background:rgba(16,185,129,0.05);border-radius:6px;margin-top:8px;font-size:0.78rem;color:#94a3b8">${b.recommendation}</div>` : ''}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">${icon('target')} Risk Gauge</h3>
            <div style="text-align:center;margin-bottom:12px"><div style="width:80px;height:80px;border-radius:50%;border:4px solid ${b?.risk_level === 'critical' ? '#ef4444' : b?.risk_level === 'high' ? '#f59e0b' : '#10b981'};display:flex;align-items:center;justify-content:center;margin:0 auto"><span style="font-size:26px;font-weight:700;color:${b?.risk_level === 'critical' ? '#ef4444' : b?.risk_level === 'high' ? '#f59e0b' : '#10b981'}">${b?.risk_score || 0}</span></div><div style="color:${b?.risk_level === 'low' ? '#10b981' : '#f59e0b'};font-weight:600;font-size:0.82rem;margin-top:4px;text-transform:uppercase">${b?.risk_level || '—'}</div></div>
            <div style="font-size:0.72rem;color:#94a3b8">Data Points:</div>
            ${b?.data_points ? Object.entries(b.data_points).map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:2px 4px;font-size:0.78rem"><span style="color:#64748b">${k}</span><span style="color:#f1f5f9;font-weight:600">${v}</span></div>`).join('') : ''}
        </div>
    </div>
    <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">${icon('workflow')} Detection Patterns</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${Object.entries(D.patterns?.patterns || {}).map(([k, v]) => `<div style="padding:10px;background:#0f172a;border-radius:8px"><div style="color:#f1f5f9;font-weight:600;font-size:0.78rem">${(v?.name || k).replace(/_/g, ' ')}</div><div style="color:#64748b;font-size:0.68rem;margin-top:2px">${v?.description || ''}</div><div style="color:#3b82f6;font-size:0.68rem;margin-top:2px">Weight: ${Math.round((v?.weight || 0) * 100)}%</div></div>`).join('')}</div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
