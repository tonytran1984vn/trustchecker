/** API Economy Dashboard — Gateway, SDK Keys, Marketplace */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const [keys, usage, marketplace, tiers] = await Promise.all([
        fetch('/api/api-economy/keys', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/api-economy/usage', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/api-economy/marketplace', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/api-economy/tiers', { headers: h }).then(r => r.json()).catch(() => ({}))
    ]);
    D = { keys, usage, marketplace, tiers };
}
export function render() {
    load(); return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('code')} API Economy Layer</h1><p style="color:#94a3b8;margin:4px 0 16px">Public API Gateway · SDK Keys · Data Marketplace</p>
        <button onclick="window.apiShowKey()" style="padding:8px 16px;background:#10b981;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">${icon('plus')} Generate API Key</button></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Total Keys', v: D.keys?.total || 0, c: '#3b82f6', i: '🔑' }, { l: 'Active', v: D.usage?.active_keys || 0, c: '#10b981', i: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' }, { l: 'Marketplace Items', v: D.marketplace?.categories?.length || 6, c: '#8b5cf6', i: '🏪' }, { l: 'SDK Platforms', v: D.marketplace?.sdk_platforms?.length || 5, c: '#f59e0b', i: '📦' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:20px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${k.l}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">${icon('code')} API Keys</h3>
            ${D.keys?.keys?.length > 0 ? `<table style="width:100%;border-collapse:collapse;font-size:0.78rem"><thead><tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.68rem;text-transform:uppercase"><th style="padding:4px;text-align:left">Key</th><th style="padding:4px">App</th><th style="padding:4px">Tier</th><th style="padding:4px">Status</th></tr></thead><tbody>${D.keys.keys.map(k => `<tr style="border-bottom:1px solid #1e293b"><td style="padding:4px;color:#3b82f6;font-family:monospace;font-size:0.68rem">${(k.api_key || '').slice(0, 20)}…</td><td style="padding:4px;text-align:center;color:#94a3b8;font-size:0.72rem">${k.app_name || '—'}</td><td style="padding:4px;text-align:center;color:#f59e0b;font-size:0.72rem">${k.tier}</td><td style="padding:4px;text-align:center"><span style="padding:1px 6px;border-radius:4px;background:${k.status === 'active' ? '#10b98122' : '#ef444422'};color:${k.status === 'active' ? '#10b981' : '#ef4444'};font-size:0.68rem">${k.status}</span></td></tr>`).join('')}</tbody></table>` : '<div style="text-align:center;padding:20px;color:#64748b">No API keys — Generate one above</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">${icon('barChart')} Data Marketplace</h3>
            ${D.marketplace?.categories?.map(c => `<div style="padding:8px;background:#0f172a;border-radius:6px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center"><div><div style="color:#f1f5f9;font-weight:600;font-size:0.78rem">${c.name}</div><div style="color:#64748b;font-size:0.68rem">${c.endpoints} endpoints</div></div><span style="color:#10b981;font-weight:700;font-size:0.78rem">${c.pricing}</span></div>`).join('') || ''}
        </div>
    </div>
    <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">${icon('barChart')} API Tiers</h3>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">${Object.entries(D.tiers?.tiers || {}).map(([k, v]) => `<div style="padding:12px;background:#0f172a;border-radius:8px;text-align:center;border:1px solid ${k === 'enterprise' ? '#8b5cf633' : k === 'infrastructure' ? '#f59e0b33' : '#334155'}"><div style="color:#f1f5f9;font-weight:700;font-size:13px">${v?.name || k}</div><div style="color:#10b981;font-weight:700;font-size:16px;margin:4px 0">$${v?.price_usd || 0}</div><div style="color:#64748b;font-size:0.68rem">${v?.rate_limit || 0} req/min</div><div style="color:#64748b;font-size:0.68rem">${v?.daily_limit === -1 ? 'Unlimited' : v?.daily_limit || 0} /day</div></div>`).join('')}</div>
    </div>
    <div id="ak-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:1000;align-items:center;justify-content:center"><div style="background:#1e293b;border-radius:16px;padding:24px;width:420px;border:1px solid #334155"><h3 style="margin:0 0 16px;color:#f1f5f9">Generate API Key</h3><input id="ak-name" placeholder="App Name" value="My App" style="width:100%;padding:8px;background:#0f172a;color:#f1f5f9;border:1px solid #334155;border-radius:6px;margin-bottom:8px"><select id="ak-tier" style="width:100%;padding:8px;background:#0f172a;color:#f1f5f9;border:1px solid #334155;border-radius:6px;margin-bottom:8px"><option>free</option><option>starter</option><option>professional</option><option>enterprise</option></select><div id="ak-res" style="display:none;padding:10px;background:#0f172a;border-radius:6px;margin-bottom:10px;font-size:0.72rem;color:#94a3b8;word-break:break-all"></div><div style="display:flex;gap:8px"><button onclick="window.apiGenKey()" style="flex:1;padding:10px;background:#10b981;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">Generate</button><button onclick="document.getElementById('ak-modal').style.display='none'" style="padding:10px 16px;background:#334155;color:#f1f5f9;border:none;border-radius:8px;cursor:pointer">Close</button></div></div></div>
</div>`;
}
export function renderPage() { return render(); }
window.apiShowKey = () => { document.getElementById('ak-modal').style.display = 'flex'; };
window.apiGenKey = async () => { const h = { 'Authorization': 'Bearer ' + State.token, 'Content-Type': 'application/json' }; const r = await fetch('/api/api-economy/keys', { method: 'POST', headers: h, body: JSON.stringify({ app_name: document.getElementById('ak-name').value, tier: document.getElementById('ak-tier').value }) }).then(r => r.json()); const el = document.getElementById('ak-res'); el.style.display = 'block'; el.innerHTML = r.api_key ? `<div style="color:#10b981;font-weight:700"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Key: ${r.api_key}</div><div style="color:#f59e0b;margin-top:4px">Secret: ${r.api_secret}</div><div style="color:#ef4444;font-size:0.68rem;margin-top:4px"><span class="status-icon status-warn" aria-label="Warning">!</span> Save secret now — not shown again</div>` : `<div style="color:#ef4444">${r.error || 'Failed'}</div>`; };
