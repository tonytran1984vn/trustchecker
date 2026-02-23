/** Upgrade Governance — Change Classification, CAB Process, Rollback, Versioning */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
import { escapeHTML as esc, escapeObj } from '../../utils/escape.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    D = await fetch('/api/upgrade-gov/framework', { headers: h }).then(r => r.json()).catch(() => ({}));
}
export function render() {
    load(); const cls = D.classification || {}; const cab = D.cab_process || {}; const rb = D.rollback || {}; const ver = D.version_governance || D.versioning || {};
    const classes = cls.classes || cls;
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('workflow')} Upgrade Governance</h1>
        <p style="color:#94a3b8;margin:4px 0 16px">Change Classification · CAB Process · Rollback Protocol · Version Governance</p></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Classes', v: Object.keys(classes).length || 4, c: '#f59e0b', i: '📋' }, { l: 'CAB Phases', v: Object.keys(cab.phases || cab).length || 5, c: '#3b82f6', i: '🏗️' }, { l: 'Rollback', v: Object.keys(rb).length || 4, c: '#ef4444', i: '↩️' }, { l: 'Versioning', v: Object.keys(ver).length || 3, c: '#10b981', i: '📌' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${esc(k.l)}</div></div>`).join('')}
    </div>
    <div class="sa-card" style="margin-bottom:16px"><h3 style="margin:0 0 10px;color:#f1f5f9">📋 Change Classification</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px">
        ${Object.entries(classes).slice(0, 5).map(([k, v]) => { const color = k.includes('A') || k.includes('constitutional') ? '#ef4444' : k.includes('B') || k.includes('major') ? '#f59e0b' : k.includes('C') || k.includes('minor') ? '#3b82f6' : '#10b981'; return `<div style="padding:10px;background:#0f172a;border-radius:8px;border-left:3px solid ${color}"><div style="color:${color};font-weight:700;font-size:0.78rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#94a3b8;font-size:0.68rem;margin-top:4px">${escapeObj(v, 80)}</div></div>` }).join('') || '<div style="color:#64748b;padding:10px">Loading...</div>'}
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">🏗️ CAB Process</h3>
            ${Object.entries(cab.phases || cab).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #3b82f6"><div style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">↩️ Rollback Protocol</h3>
            ${Object.entries(rb).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #ef4444"><div style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
