/** Jurisdiction Logic — Conflicts, Liability, Governing Law */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
import { escapeHTML as esc, escapeObj } from '../../utils/escape.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    D = await fetch('/api/jurisdiction-logic/framework', { headers: h }).then(r => r.json()).catch(() => ({}));
}
export function render() {
    load(); const c = D.conflict_resolution || {}; const a = D.arbitrage_prevention || {}; const l = D.liability || {}; const g = D.governing_law || {};
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('globe')} Jurisdiction Logic</h1>
        <p style="color:#94a3b8;margin:4px 0 16px">Conflict Resolution · Arbitrage Prevention · Liability Map · Governing Law</p></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Conflicts', v: Object.keys(c).length || 4, c: '#ef4444', i: '⚖️' }, { l: 'Arbitrage', v: Object.keys(a).length || 3, c: '#f59e0b', i: '🚫' }, { l: 'Liability', v: Object.keys(l).length || 4, c: '#3b82f6', i: '📋' }, { l: 'Governing Law', v: Object.keys(g).length || 3, c: '#10b981', i: '🏛️' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${esc(k.l)}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">⚖️ Conflict Resolution</h3>
            ${Object.entries(c).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px"><div style="color:#ef4444;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 90)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">📋 Liability Map</h3>
            ${Object.entries(l).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px"><div style="color:#3b82f6;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 90)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
    </div>
    <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">🏛️ Governing Law & Enforcement</h3>
        ${Object.entries(g).slice(0, 8).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #10b981"><div style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 100)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
    </div>
</div>`;
}
export function renderPage() { return render(); }
