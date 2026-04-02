/** Incentive Architecture — Participants, Fee Topology, Moat, Carbon Market */
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
    D = await API.get('/incentive-arch/framework').catch(() => ({}));
        _loaded = true;
        if (window.render) window.render();
    } catch (e) {
        console.error(e);
    } finally {
        _loading = false;
    }
}
export function render() {
    load(); const p = D.participant_incentives || {}; const f = D.fee_topology || {}; const m = D.switching_moat || {}; const c = D.carbon_market || {};
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('tag')} Incentive Architecture</h1>
        <p style="color:#94a3b8;margin:4px 0 16px">Participant Incentives · Fee Topology · Switching Moat · Carbon Market</p></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Participants', v: Object.keys(p.participants || p).length || 6, c: '#10b981', i: '👥' }, { l: 'Fee Flows', v: Object.keys(f.flows || f).length || 5, c: '#3b82f6', i: '💸' }, { l: 'Moat Layers', v: Object.keys(m.layers || m).length || 5, c: '#f59e0b', i: '🏰' }, { l: 'Carbon', v: Object.keys(c).length || 4, c: '#8b5cf6', i: '🌱' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${esc(k.l)}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">👥 Participant Incentives</h3>
            ${Object.entries(p.participants || p).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #10b981"><div style="color:#10b981;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">🏰 Switching Moat</h3>
            ${Object.entries(m.layers || m).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #f59e0b"><div style="color:#f59e0b;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
    </div>
    <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">💸 Fee Topology</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px">
        ${Object.entries(f.flows || f).slice(0, 8).map(([k, v]) => `<div style="padding:8px;background:#0f172a;border-radius:6px"><div style="color:#3b82f6;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
