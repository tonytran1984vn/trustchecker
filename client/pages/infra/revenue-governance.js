/** Revenue Governance — Pricing Authority, Settlement, Fees */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
import { escapeHTML as esc, escapeObj } from '../../utils/escape.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const [map] = await Promise.all([
        fetch('/api/revenue-gov/map', { headers: h }).then(r => r.json()).catch(() => ({})),
    ]);
    D = map;
}
export function render() {
    load(); const p = D.pricing_authority || {}; const s = D.settlement_control || {}; const f = D.fee_governance || {};
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('barChart')} Revenue Governance</h1>
        <p style="color:#94a3b8;margin:4px 0 16px">Pricing Authority · Settlement Controls · Fee Governance</p></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Pricing Tiers', v: Object.keys(p.tiers || {}).length || 5, c: '#3b82f6', i: '💰' }, { l: 'Settlement Rules', v: Object.keys(s).length || 4, c: '#10b981', i: '🏦' }, { l: 'Fee Categories', v: Object.keys(f).length || 6, c: '#f59e0b', i: '📊' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${esc(k.l)}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">Pricing Authority</h3>
            ${Object.entries(p.tiers || p).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px"><div style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(k)}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b;padding:10px">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">Settlement Control</h3>
            ${Object.entries(s).slice(0, 6).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px"><div style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 80)}</div></div>`).join('') || '<div style="color:#64748b;padding:10px">Loading...</div>'}
        </div>
    </div>
    <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">Fee Governance</h3>
        ${Object.entries(f).slice(0, 8).map(([k, v]) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #f59e0b"><div style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(k.replace(/_/g, ' '))}</div><div style="color:#64748b;font-size:0.68rem">${escapeObj(v, 100)}</div></div>`).join('') || '<div style="color:#64748b;padding:10px">Loading...</div>'}
    </div>
</div>`;
}
export function renderPage() { return render(); }
