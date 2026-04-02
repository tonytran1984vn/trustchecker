/** Economic Logic — Mechanism Design, Game Theory, Sustainability */
import { State } from '../../core/state.js';
import { API } from '../../core/api.js';import { icon } from '../../core/icons.js';
import { escapeHTML as esc, escapeObj } from '../../utils/escape.js';
let D = {};
let _loading = false;
let _loaded = false;
async function load() {
    if (_loading || _loaded) return;
    _loading = true;
    try {
    const h = { 'Authorization': 'Bearer ' + State.token };
    D = await API.get('/economic-logic/framework').catch(() => ({}));
        _loaded = true;
        if (window.render) window.render();
    } catch (e) {
        console.error(e);
    } finally {
        _loading = false;
    }
}
export function render() {
    load(); const m = D.mechanism_design || {}; const g = D.game_theory || {}; const s = D.sustainability || {}; const v = D.value_fairness || {};
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('brain')} Economic Logic Engine</h1>
        <p style="color:#94a3b8;margin:4px 0 16px">Mechanism Design · Game Theory · Value Fairness · Sustainability</p></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Mechanisms', v: Object.keys(m).length || 4, c: '#8b5cf6', i: '⚙️' }, { l: 'Game Theory', v: Object.keys(g).length || 3, c: '#3b82f6', i: '♟️' }, { l: 'Fairness', v: Object.keys(v).length || 3, c: '#10b981', i: '⚖️' }, { l: 'Sustainability', v: Object.keys(s).length || 3, c: '#f59e0b', i: '🌱' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${esc(k.l)}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">⚙️ Mechanism Design</h3>
            ${Object.entries(m).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px"><div style="color:#8b5cf6;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 90)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">♟️ Game Theory</h3>
            ${Object.entries(g).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px"><div style="color:#3b82f6;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 90)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">⚖️ Value Fairness</h3>
            ${Object.entries(v).slice(0, 6).map(([k, vv]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px"><div style="color:#10b981;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(vv, 90)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">🌱 Sustainability</h3>
            ${Object.entries(s).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px"><div style="color:#f59e0b;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 90)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
