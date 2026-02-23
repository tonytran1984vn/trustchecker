/** Operational Playbook — Drill Scenarios, Schedule, Post-Mortem */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
import { escapeHTML as esc, escapeObj } from '../../utils/escape.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    D = await fetch('/api/playbook/full', { headers: h }).then(r => r.json()).catch(() => ({}));
}
export function render() {
    load(); const drills = D.drill_scenarios || D.drills || []; const sched = D.schedule || {}; const pm = D.post_mortem || {};
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('shield')} Operational Playbook</h1>
        <p style="color:#94a3b8;margin:4px 0 16px">Crisis Drills · Schedule · Post-Mortem Template</p></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Drill Scenarios', v: Array.isArray(drills) ? drills.length : Object.keys(drills).length || 6, c: '#ef4444', i: '🚨' }, { l: 'Annual Schedule', v: Object.keys(sched).length || 4, c: '#3b82f6', i: '📅' }, { l: 'Post-Mortem', v: Object.keys(pm).length || 5, c: '#10b981', i: '📝' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${esc(k.l)}</div></div>`).join('')}
    </div>
    <div class="sa-card" style="margin-bottom:16px"><h3 style="margin:0 0 10px;color:#f1f5f9">🚨 Drill Scenarios</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:8px">
        ${(Array.isArray(drills) ? drills : Object.entries(drills).map(([k, v]) => ({ id: k, ...(typeof v === 'object' ? v : { name: v }) }))).map(d => `<div style="padding:10px;background:#0f172a;border-radius:8px;border-left:3px solid #ef4444"><div style="color:#ef4444;font-weight:700;font-size:0.78rem">${esc(d.id || d.name || 'Drill')}</div><div style="color:#94a3b8;font-size:0.68rem;margin-top:4px">${esc(d.description || d.scenario || d.objective || '')}</div>${d.duration ? `<div style="color:#f59e0b;font-size:0.65rem;margin-top:2px">Duration: ${esc(d.duration)}</div>` : ''}</div>`).join('') || '<div style="color:#64748b;padding:10px">Loading...</div>'}
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">📅 Annual Schedule</h3>
            ${Object.entries(sched).slice(0, 8).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px"><div style="color:#3b82f6;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">📝 Post-Mortem Template</h3>
            ${Object.entries(pm).slice(0, 8).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px"><div style="color:#10b981;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
