/** Human Governance Stress — Insider Collusion, GGC Capture, Founder Roadmap */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
import { escapeHTML as esc, escapeObj } from '../../utils/escape.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    D = await fetch('/api/human-gov/framework', { headers: h }).then(r => r.json()).catch(() => ({}));
}
export function render() {
    load(); const ins = D.insider_collusion || {}; const ggc = D.ggc_capture || {}; const bd = D.board_management || {}; const fr = D.founder_roadmap || {}; const comp = D.compensation_coi || {};
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('users')} Human Governance Stress</h1>
        <p style="color:#94a3b8;margin:4px 0 16px">Insider Collusion · GGC Capture · Board Protocol · Founder Power Roadmap</p>
        <div style="display:inline-block;padding:4px 10px;background:#ef444422;color:#ef4444;border-radius:6px;font-size:0.72rem;font-weight:600">🔒 L5 Super Admin Only</div></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Collusion Scenarios', v: Object.keys(ins.scenarios || ins).length || 4, c: '#ef4444', i: '🕵️' }, { l: 'Capture Scenarios', v: Object.keys(ggc.scenarios || ggc).length || 3, c: '#f59e0b', i: '👥' }, { l: 'Board Protocol', v: Object.keys(bd).length || 3, c: '#3b82f6', i: '🏛️' }, { l: 'Founder Phases', v: Object.keys(fr.phases || fr).length || 4, c: '#8b5cf6', i: '👤' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${esc(k.l)}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">🕵️ Insider Collusion</h3>
            ${Object.entries(ins.scenarios || ins).slice(0, 5).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #ef4444"><div style="color:#ef4444;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">👥 GGC Capture</h3>
            ${Object.entries(ggc.scenarios || ggc).slice(0, 5).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #f59e0b"><div style="color:#f59e0b;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
    </div>
    <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">👤 Founder Power Reduction Roadmap</h3>
        ${Object.entries(fr.phases || fr).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #8b5cf6"><div style="color:#8b5cf6;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 100)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
    </div>
</div>`;
}
export function renderPage() { return render(); }
