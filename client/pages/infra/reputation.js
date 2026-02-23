/** Reputation & Market Signaling Dashboard */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
let D = {};
async function load() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const [trust, transparency, carbon] = await Promise.all([
        fetch('/api/reputation/trust-score', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/reputation/transparency', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('/api/reputation/carbon-integrity', { headers: h }).then(r => r.json()).catch(() => ({}))
    ]);
    D = { trust, transparency, carbon };
}
function gauge(val, color, label, grade) {
    return `<div class="sa-card" style="text-align:center;padding:20px;border-top:3px solid ${color}">
        <div style="font-size:0.78rem;color:#94a3b8;margin-bottom:4px">${label}</div>
        <div style="width:80px;height:80px;border-radius:50%;border:4px solid ${color};display:flex;align-items:center;justify-content:center;margin:0 auto">
            <span style="font-size:26px;font-weight:700;color:${color}">${val}</span>
        </div>
        <div style="color:${color};font-weight:700;font-size:14px;margin-top:6px">${grade}</div>
    </div>`;
}
export function render() {
    load(); const t = D.trust; const ti = D.transparency; const ci = D.carbon; return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('barChart')} Reputation & Market Signaling</h1>
        <p style="color:#94a3b8;margin:4px 0 16px">Trust Score · Transparency Index · Carbon Integrity</p></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
        ${gauge(t?.trust_score || 0, '#3b82f6', 'Company Trust Score', t?.trust_grade || '—')}
        ${gauge(ti?.index || 0, '#10b981', 'Transparency Index', ti?.grade || '—')}
        ${gauge(ci?.integrity_score || 0, '#8b5cf6', 'Carbon Integrity', ci?.grade || '—')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">Trust Dimensions</h3>
            ${(t?.dimensions || []).map(d => `<div style="display:flex;align-items:center;gap:8px;padding:3px 0">
                <div style="width:140px;color:#94a3b8;font-size:0.78rem">${d.name}</div>
                <div style="flex:1;background:#1e293b;border-radius:4px;height:8px;position:relative">
                    <div style="position:absolute;left:0;top:0;height:100%;width:${d.value}%;background:#3b82f6;border-radius:4px"></div>
                </div><span style="color:#f1f5f9;font-size:0.72rem;width:25px;text-align:right">${d.value}</span>
            </div>`).join('')}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">Carbon Integrity Factors</h3>
            ${(ci?.factors || []).map(f => `<div style="display:flex;align-items:center;gap:8px;padding:3px 0">
                <div style="width:140px;color:#94a3b8;font-size:0.78rem">${f.name}</div>
                <div style="flex:1;background:#1e293b;border-radius:4px;height:8px;position:relative">
                    <div style="position:absolute;left:0;top:0;height:100%;width:${f.score}%;background:#8b5cf6;border-radius:4px"></div>
                </div><span style="color:#f1f5f9;font-size:0.72rem;width:25px;text-align:right">${f.score}</span>
            </div>`).join('')}
        </div>
    </div>
</div>`;
}
export function renderPage() { return render(); }
