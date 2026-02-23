/** Kill-Switch & Circuit Breakers Dashboard */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
import { escapeHTML as esc, escapeObj } from '../../utils/escape.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const [arch] = await Promise.all([
        fetch('/api/killswitch/architecture', { headers: h }).then(r => r.json()).catch(() => ({})),
    ]);
    D = arch;
}
export function render() {
    load(); const sw = D.kill_switches?.switches || D.kill_switches || []; const cb = D.circuit_breakers?.breakers || D.circuit_breakers || []; const esc2 = D.escalation?.ladder || D.escalation || [];
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('alertTriangle')} Kill-Switch Architecture</h1>
        <p style="color:#94a3b8;margin:4px 0 16px">Emergency Stops · Circuit Breakers · Escalation Ladder</p></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Kill Switches', v: Array.isArray(sw) ? sw.length : Object.keys(sw).length, c: '#ef4444', i: '🛑' }, { l: 'Circuit Breakers', v: Array.isArray(cb) ? cb.length : Object.keys(cb).length, c: '#f59e0b', i: '⚡' }, { l: 'Escalation Tiers', v: Array.isArray(esc2) ? esc2.length : Object.keys(esc2).length, c: '#3b82f6', i: '📶' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${esc(k.l)}</div></div>`).join('')}
    </div>
    <div class="sa-card" style="margin-bottom:16px"><h3 style="margin:0 0 10px;color:#f1f5f9">🛑 Kill Switches</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px">
        ${(Array.isArray(sw) ? sw : Object.entries(sw).map(([k, v]) => ({ id: k, ...(typeof v === 'object' ? v : { description: v }) }))).map(s => `<div style="padding:10px;background:#0f172a;border-radius:8px;border-left:3px solid #ef4444"><div style="color:#ef4444;font-weight:700;font-size:0.78rem">${esc(s.id || s.name || 'Switch')}</div><div style="color:#94a3b8;font-size:0.68rem;margin-top:4px">${esc(s.description || s.trigger || '')}</div>${s.authority ? `<div style="color:#f59e0b;font-size:0.65rem;margin-top:2px">Authority: ${esc(s.authority)}</div>` : ''}</div>`).join('') || '<div style="color:#64748b;padding:10px">Loading...</div>'}
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">⚡ Circuit Breakers</h3>
            ${(Array.isArray(cb) ? cb : Object.entries(cb).map(([k, v]) => ({ id: k, ...(typeof v === 'object' ? v : { description: v }) }))).map(b => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #f59e0b"><div style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(b.id || b.name || 'Breaker')}</div><div style="color:#64748b;font-size:0.68rem">${esc(b.trigger || b.description || '')}</div></div>`).join('') || '<div style="color:#64748b;padding:10px">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">📶 Escalation Ladder</h3>
            ${(Array.isArray(esc2) ? esc2 : Object.entries(esc2).map(([k, v]) => ({ tier: k, ...(typeof v === 'object' ? v : { action: v }) }))).map((e, i) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #3b82f6"><div style="color:#3b82f6;font-weight:600;font-size:0.72rem">Tier ${i + 1}: ${esc(e.tier || e.name || '')}</div><div style="color:#64748b;font-size:0.68rem">${esc(e.action || e.description || '')}</div></div>`).join('') || '<div style="color:#64748b;padding:10px">Loading...</div>'}
        </div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
