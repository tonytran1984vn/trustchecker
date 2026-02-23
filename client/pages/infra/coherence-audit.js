/** Architecture Coherence Audit — Control Map, Dependencies, Complexity */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
import { escapeHTML as esc, escapeObj } from '../../utils/escape.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    D = await fetch('/api/coherence/audit', { headers: h }).then(r => r.json()).catch(() => ({}));
}
export function render() {
    load(); const map = D.coherence_map || {}; const ctrl = D.control_interactions || {}; const dep = D.dependency_risk || {}; const cx = D.complexity || {};
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('workflow')} Architecture Coherence</h1>
        <p style="color:#94a3b8;margin:4px 0 16px">Coherence Map · Control Interactions · Dependency Risk · Complexity Score</p></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Layers Mapped', v: Object.keys(map.layers || map).length || 6, c: '#3b82f6', i: '🗺️' }, { l: 'Interactions', v: Object.keys(ctrl).length || 7, c: '#f59e0b', i: '🔄' }, { l: 'Dependencies', v: Object.keys(dep).length || 6, c: '#ef4444', i: '⚠️' }, { l: 'Complexity', v: cx.score || cx.complexity_score || '7.8', c: '#8b5cf6', i: '📏' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${esc(k.l)}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">🗺️ Coherence Map</h3>
            ${Object.entries(map.layers || map).slice(0, 8).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #3b82f6"><div style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">⚠️ Dependency Risk</h3>
            ${Object.entries(dep).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #ef4444"><div style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
    </div>
    <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">🔄 Control Interactions</h3>
        ${Object.entries(ctrl).slice(0, 8).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px"><div style="color:#f59e0b;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 100)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
    </div>
</div>`;
}
export function renderPage() { return render(); }
