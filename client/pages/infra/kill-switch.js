/** Kill-Switch & Circuit Breakers Dashboard + Agentic Controls */
import { State } from '../../core/state.js';
import { API } from '../../core/api.js';
import { icon } from '../../core/icons.js';
import { escapeHTML as esc, escapeObj } from '../../utils/escape.js';

let D = {};
let agentic = { mode: 'shadow', killSwitchActive: false, canaryRatePct: 5, canarySeed: '', cooldownActive: false };
let loaded = false;
let _loading = false;
async function load() {
    if (loaded || _loading) return;
    _loading = true;
    try {
        const [arch, ag] = await Promise.all([
            API.get('/killswitch/architecture').catch(() => ({})),
            API.get('/crisis/agentic-config').catch(() => ({}))
        ]);
        D = arch || {};
        agentic = ag && ag.mode ? ag : agentic;
        loaded = true;
        _loading = false;
        if (window.render) window.render();
    } catch (e) {
        _loading = false;
        console.error(e);
    }
}

window.toggleAgenticKS = async function(active) {
    if(!confirm(`Are you sure you want to turn ${active ? 'ON' : 'OFF'} the Agentic Kill Switch?`)) return;
    try {
        const res = await API.post('/crisis/agentic-config/toggle-kill-switch', { active });
        agentic.killSwitchActive = res.state.killSwitchActive;
        agentic.killSwitchCooldownUntil = res.state.killSwitchCooldownUntil;
        agentic.cooldownActive = res.state.cooldownActive || false;
        agentic.canarySeed = res.state.canarySeed || agentic.canarySeed;
        if (window.render) window.render();
    } catch(e) {
        alert('Failed to toggle kill switch: ' + e.message);
    }
}

window.updateCanaryRate = async function(pct) {
    try {
        const res = await API.post('/crisis/agentic-config/update-canary', { pct: parseInt(pct) });
        if (res.error) {
            alert('Invalid canary rate: ' + res.error);
            return;
        }
        agentic.canaryRatePct = res.state.canaryRatePct;
        agentic.canarySeed = res.state.canarySeed || agentic.canarySeed;
        document.getElementById('canaryVal').innerText = agentic.canaryRatePct + '%';
    } catch(e) {
        alert('Failed to update canary rate: ' + e.message);
    }
}

// BUG-4: Reset loaded flag on page re-init (role switch, re-navigation)
export function initPage() {
    loaded = false;
}

export function render() {
    load();
    const sw = D.switches?.switches || D.kill_switches?.switches || D.switches || []; 
    const cb = D.circuit_breakers?.breakers || D.circuit_breakers || []; 
    const esc2 = D.escalation?.levels || D.escalation?.ladder || D.escalation || [];
    
    const cooldownBadge = agentic.cooldownActive
        ? `<span style="font-size:0.68rem; padding:2px 8px; border-radius:12px; background:#f59e0b22; color:#f59e0b; font-weight:bold; margin-left:8px;">\u23F3 COOLDOWN ACTIVE</span>`
        : '';

    const agBoard = `
        <div class="sa-card" style="margin-bottom:20px; border: 2px solid ${agentic.killSwitchActive ? '#ef4444' : agentic.cooldownActive ? '#f59e0b' : '#3b82f6'}; background: #0f172a;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h3 style="margin:0 0 5px; color:#f1f5f9; display:flex; align-items:center; gap:8px;">
                        ${icon('cpu')} Agentic AI Control Board
                        <span style="font-size:0.75rem; padding:2px 8px; border-radius:12px; background:#1e293b; color:#94a3b8; text-transform:uppercase; font-weight:bold;">Mode: ${esc(agentic.mode)}</span>
                        ${cooldownBadge}
                    </h3>
                    <p style="margin:0; font-size:0.8rem; color:#64748b;">Manage realtime AI boundaries without rebooting the system.</p>
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
                <div style="background:#1e293b; padding:15px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:700; color:#f1f5f9; font-size:16px;">Agentic Kill Switch</div>
                        <div style="font-size:0.75rem; color:#94a3b8; margin-top:4px;">Immediately force-drops all proposals.</div>
                    </div>
                    <div>
                        <button onclick="window.toggleAgenticKS(${!agentic.killSwitchActive})" style="padding:10px 20px; font-weight:700; cursor:pointer; border:none; border-radius:4px; background:${agentic.killSwitchActive ? '#ef4444' : '#10b981'}; color:#fff; transition:0.2s;">
                            ${agentic.killSwitchActive ? 'DEACTIVATE' : 'ACTIVATE'}
                        </button>
                    </div>
                </div>

                <div style="background:#1e293b; padding:15px; border-radius:8px;">
                     <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <div>
                            <div style="font-weight:700; color:#f1f5f9; font-size:16px;">Canary Strategy</div>
                            <div style="font-size:0.75rem; color:#94a3b8;">Hash-based deterministic exposure \u00B7 Seed: <code style="color:#60a5fa">${esc(agentic.canarySeed || '\u2014')}</code></div>
                        </div>
                        <div id="canaryVal" style="font-size:1.5rem; font-weight:700; color:#3b82f6;">${agentic.canaryRatePct}%</div>
                    </div>
                    <input type="range" class="sa-slider" min="0" max="100" value="${agentic.canaryRatePct}" onchange="window.updateCanaryRate(this.value)" style="width:100%;">
                </div>
            </div>
        </div>
    `;

    return `
<div class="sa-page kill-switch-page">
    <div class="sa-page-title"><h1>${icon('alertTriangle')} Systemic Kill-Switch Architecture</h1>
        <p style="color:#94a3b8;margin:4px 0 16px">Emergency Stops \u00B7 Circuit Breakers \u00B7 Agentic AI \u00B7 Escalation</p></div>
    
    ${agBoard}

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Kill Switches', v: Array.isArray(sw) ? sw.length : Object.keys(sw).length, c: '#ef4444', i: '\uD83D\uDED1' }, { l: 'Circuit Breakers', v: Array.isArray(cb) ? cb.length : Object.keys(cb).length, c: '#f59e0b', i: '\u26A1' }, { l: 'Escalation Tiers', v: Array.isArray(esc2) ? esc2.length : Object.keys(esc2).length, c: '#3b82f6', i: '\uD83D\uDCF6' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${esc(k.l)}</div></div>`).join('')}
    </div>
    <div class="sa-card" style="margin-bottom:16px"><h3 style="margin:0 0 10px;color:#f1f5f9">\uD83D\uDED1 Classic Kill Switches</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px">
        ${(Array.isArray(sw) ? sw : Object.entries(sw).map(([k, v]) => ({ id: k, ...(typeof v === 'object' ? v : { description: v }) }))).map(s => `<div style="padding:10px;background:#0f172a;border-radius:8px;border-left:3px solid #ef4444"><div style="color:#ef4444;font-weight:700;font-size:0.78rem">${esc(s.id || '')} ${esc(s.name || 'Switch')}</div><div style="color:#94a3b8;font-size:0.68rem;margin-top:4px">${esc(s.scope || s.description || s.trigger || '')}</div>${s.duration ? `<div style="color:#f59e0b;font-size:0.65rem;margin-top:2px">${esc(s.duration)}</div>` : ''}</div>`).join('') || '<div style="color:#64748b;padding:10px">Loading...</div>'}
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">\u26A1 Circuit Breakers</h3>
            ${(Array.isArray(cb) ? cb : Object.entries(cb).map(([k, v]) => ({ id: k, ...(typeof v === 'object' ? v : { description: v }) }))).map(b => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #f59e0b"><div style="color:#f1f5f9;font-weight:600;font-size:0.72rem">${esc(b.id || b.name || 'Breaker')}</div><div style="color:#64748b;font-size:0.68rem">${esc(b.metric || b.trigger || b.description || '')} ${b.threshold ? '→ ' + esc(b.threshold) : ''}</div>${b.action ? `<div style="color:#f59e0b;font-size:0.62rem;margin-top:2px">${esc(b.action)}</div>` : ''}</div>`).join('') || '<div style="color:#64748b;padding:10px">Loading...</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">\uD83D\uDCF6 Escalation Ladder</h3>
            ${(Array.isArray(esc2) ? esc2 : Object.entries(esc2).map(([k, v]) => ({ tier: k, ...(typeof v === 'object' ? v : { action: v }) }))).map((e, i) => `<div style="padding:6px;background:#0f172a;border-radius:4px;margin-bottom:4px;border-left:3px solid #3b82f6"><div style="color:#3b82f6;font-weight:600;font-size:0.72rem">${esc(e.level || e.tier || e.name || 'Tier ' + (i+1))}</div><div style="color:#64748b;font-size:0.68rem">${esc(e.description || e.action || '')}</div>${e.response_time ? `<div style="color:#94a3b8;font-size:0.62rem;margin-top:2px">SLA: ${esc(e.response_time)}</div>` : ''}</div>`).join('') || '<div style="color:#64748b;padding:10px">Loading...</div>'}
        </div>
    </div>
</div>
<style>
.sa-slider {
    -webkit-appearance: none;
    appearance: none;
    height: 8px;
    background: #334155;
    outline: none;
    border-radius: 4px;
}
.sa-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    background: #3b82f6;
    cursor: pointer;
    border-radius: 50%;
}
</style>
`;
}
export function renderPage() { return render(); }
