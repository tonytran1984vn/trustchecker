/** Data Ownership — Ownership Rights, Exit Protocol, Merkle Export, Sovereignty */
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
    D = await API.get('/data-ownership/framework').catch(() => ({}));
        _loaded = true;
        if (window.render) window.render();
    } catch (e) {
        console.error(e);
    } finally {
        _loading = false;
    }
}
export function render() {
    load(); const own = D.ownership || {}; const exit = D.exit_protocol || {}; const me = D.merkle_export || {}; const sov = D.sovereignty || {};
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('lock')} Data Ownership</h1>
        <p style="color:#94a3b8;margin:4px 0 16px">Ownership Rights · Exit Protocol · Merkle Export · Sovereignty Zones</p></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Ownership', v: Object.keys(own.rights || own).length || 5, c: '#3b82f6', i: '📋' }, { l: 'Exit Protocol', v: Object.keys(exit.phases || exit).length || 4, c: '#f59e0b', i: '🚪' }, { l: 'Sovereignty', v: Object.keys(sov.zones || sov).length || 4, c: '#10b981', i: '🌍' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${esc(k.l)}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">📋 Ownership Rights</h3>
            ${Object.entries(own.rights || own).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #3b82f6"><div style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">🚪 Exit Protocol</h3>
            ${Object.entries(exit.phases || exit).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #f59e0b"><div style="color:#f59e0b;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">🔗 Merkle Proof Export</h3>
            ${Object.entries(me).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px"><div style="color:#8b5cf6;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">🌍 Sovereignty Zones</h3>
            ${Object.entries(sov.zones || sov).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #10b981"><div style="color:#10b981;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
