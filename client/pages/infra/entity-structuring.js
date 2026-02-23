/** Entity Structuring — Legal Architecture, Inter-Entity, External Trust */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
import { escapeHTML as esc, escapeObj } from '../../utils/escape.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    D = await fetch('/api/entity/framework', { headers: h }).then(r => r.json()).catch(() => ({}));
}
export function render() {
    load(); const arch = D.entity_architecture || {}; const inter = D.inter_entity || {}; const ext = D.external_trust || {};
    const entities = arch.entities || arch || {};
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('building')} Entity Structuring</h1>
        <p style="color:#94a3b8;margin:4px 0 16px">Legal Entity Architecture · Inter-Entity Contracts · External Trust Validation</p></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Legal Entities', v: Object.keys(entities).length || 7, c: '#3b82f6', i: '🏢' }, { l: 'Contracts', v: Object.keys(inter.contracts || inter).length || 6, c: '#f59e0b', i: '📜' }, { l: 'Trust Partners', v: Object.keys(ext.partners || ext).length || 5, c: '#10b981', i: '🤝' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${esc(k.l)}</div></div>`).join('')}
    </div>
    <div class="sa-card" style="margin-bottom:16px"><h3 style="margin:0 0 10px;color:#f1f5f9">🏢 Legal Entity Architecture</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px">
        ${Object.entries(entities).slice(0, 7).map(([k, v]) => `<div style="padding:10px;background:#0f172a;border-radius:8px;border-left:3px solid #3b82f6"><div style="color:#3b82f6;font-weight:700;font-size:0.78rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#94a3b8;font-size:0.68rem;margin-top:4px">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b;padding:10px">Loading...</div>'}
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">📜 Inter-Entity Contracts</h3>
            ${Object.entries(inter.contracts || inter).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #f59e0b"><div style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">🤝 External Trust Validation</h3>
            ${Object.entries(ext.partners || ext).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #10b981"><div style="color:#10b981;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b">Loading...</div>'}
        </div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
