/** Forensic Logic — Evidence Chain, Investigation, Tamper Detection */
import { State } from '../../core/state.js';
import { API } from '../../core/api.js';import { icon } from '../../core/icons.js';
import { escapeHTML as esc, escapeObj } from '../../utils/escape.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    D = await API.get('/forensic/framework').catch(() => ({}));
}
export function render() {
    load(); const e = D.evidence_chain || {}; const inv = D.investigation || {}; const t = D.tamper_detection || {}; const r = D.regulatory_evidence || {};
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('search')} Forensic Logic Engine</h1>
        <p style="color:#94a3b8;margin:4px 0 16px">Evidence Chain · Investigation Protocol · Tamper Detection · Regulatory Evidence</p></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Evidence Chain', v: Object.keys(e).length || 4, c: '#ef4444', i: '🔗' }, { l: 'Investigation', v: Object.keys(inv).length || 5, c: '#f59e0b', i: '🔍' }, { l: 'Tamper Detect', v: Object.keys(t).length || 3, c: '#8b5cf6', i: '🛡️' }, { l: 'Regulatory', v: Object.keys(r).length || 4, c: '#10b981', i: '📜' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${esc(k.l)}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">🔗 Evidence Chain</h3>
            ${Object.entries(e).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #ef4444"><div style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 90)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">🛡️ Tamper Detection</h3>
            ${Object.entries(t).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #8b5cf6"><div style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 90)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
    </div>
    <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">🔍 Investigation Protocol</h3>
        ${Object.entries(inv).slice(0, 8).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px"><div style="color:#f59e0b;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 100)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
    </div>
</div>`;
}
export function renderPage() { return render(); }
