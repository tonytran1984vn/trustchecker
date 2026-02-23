/** Infrastructure Metrics — Network/Operational/Financial/Governance KPIs, Composite Score */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
import { escapeHTML as esc, escapeObj } from '../../utils/escape.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    D = await fetch('/api/infra-metrics/framework', { headers: h }).then(r => r.json()).catch(() => ({}));
}
function scoreColor(s) { if (s >= 80) return '#10b981'; if (s >= 60) return '#f59e0b'; return '#ef4444'; }
export function render() {
    load();
    const net = D.network_metrics || D.network || {}; const ops = D.operational_metrics || D.operational || {};
    const fin = D.financial_metrics || D.financial || {}; const gov = D.governance_surveillance || D.governance || {};
    const composite = D.composite_score || D.composite || {};
    const cscore = composite.score || composite.composite_score || 0;
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('zap')} Infrastructure Metrics v2.0</h1>
        <p style="color:#94a3b8;margin:4px 0 16px">21 KPIs · Network · Operational · Financial · Governance Surveillance</p></div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Composite', v: cscore || '—', c: scoreColor(cscore), i: '📊' }, { l: 'Network', v: Object.keys(net.kpis || net).length || 5, c: '#3b82f6', i: '🌐' }, { l: 'Operational', v: Object.keys(ops.kpis || ops).length || 5, c: '#10b981', i: '⚙️' }, { l: 'Financial', v: Object.keys(fin.kpis || fin).length || 5, c: '#f59e0b', i: '💰' }, { l: 'Governance', v: Object.keys(gov.kpis || gov).length || 6, c: '#8b5cf6', i: '🏛️' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${esc(k.l)}</div></div>`).join('')}
    </div>
    ${cscore ? `<div class="sa-card" style="margin-bottom:16px"><h3 style="margin:0 0 10px;color:#f1f5f9">📊 Composite Infrastructure Score</h3>
        <div style="background:#0f172a;border-radius:8px;height:24px;overflow:hidden;margin-bottom:8px"><div style="height:100%;width:${Math.min(cscore, 100)}%;background:linear-gradient(90deg,${scoreColor(cscore)},${scoreColor(cscore)}88);border-radius:8px;transition:width 0.5s"></div></div>
        <div style="display:flex;justify-content:space-between;color:#94a3b8;font-size:0.72rem"><span>Score: <strong style="color:${scoreColor(cscore)}">${esc(String(cscore))}/100</strong></span><span>${esc(composite.grade || composite.rating || '')}</span></div>
    </div>`: ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">🌐 Network Metrics</h3>
            ${Object.entries(net.kpis || net).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #3b82f6"><div style="display:flex;justify-content:space-between"><span style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</span>${v.target ? `<span style="color:#64748b;font-size:0.65rem">Target: ${esc(String(v.target))}</span>` : ''}</div>${v.description ? `<div style="color:#64748b;font-size:0.66rem">${esc(v.description)}</div>` : ''}</div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">⚙️ Operational Metrics</h3>
            ${Object.entries(ops.kpis || ops).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #10b981"><div style="display:flex;justify-content:space-between"><span style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</span>${v.target ? `<span style="color:#64748b;font-size:0.65rem">Target: ${esc(String(v.target))}</span>` : ''}</div>${v.description ? `<div style="color:#64748b;font-size:0.66rem">${esc(v.description)}</div>` : ''}</div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">💰 Financial Metrics</h3>
            ${Object.entries(fin.kpis || fin).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #f59e0b"><div style="display:flex;justify-content:space-between"><span style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</span>${v.target ? `<span style="color:#64748b;font-size:0.65rem">Target: ${esc(String(v.target))}</span>` : ''}</div>${v.description ? `<div style="color:#64748b;font-size:0.66rem">${esc(v.description)}</div>` : ''}</div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">🏛️ Governance Surveillance</h3>
            ${Object.entries(gov.kpis || gov).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #8b5cf6"><div style="display:flex;justify-content:space-between"><span style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</span>${v.target ? `<span style="color:#64748b;font-size:0.65rem">Target: ${esc(String(v.target))}</span>` : ''}</div>${v.description ? `<div style="color:#64748b;font-size:0.66rem">${esc(v.description)}</div>` : ''}</div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
