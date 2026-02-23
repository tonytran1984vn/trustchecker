/** Green Finance Dashboard — Carbon-Backed Financing, Credit Scoring */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
let D = {};
let _loading = false;
let _loaded = false;
async function load() {
    if (_loading || _loaded) return;
    _loading = true;
    const [score, collateral, instruments, dashboard] = await Promise.all([
        API.get('/green-finance/credit-score').catch(() => ({})),
        API.get('/green-finance/collateral').catch(() => ({})),
        API.get('/green-finance/instruments').catch(() => ({})),
        API.get('/green-finance/dashboard').catch(() => ({}))
    ]);
    D = { score, collateral, instruments, dashboard };
    _loaded = true;
    _loading = false;
    // Targeted DOM update — only update green finance content
    setTimeout(() => {
        const el = document.getElementById('green-finance-root');
        if (el) el.innerHTML = renderContent();
    }, 50);
}

function renderContent() {
    const s = D.score; const c = D.collateral; return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('coins')} Green Finance Layer</h1><p style="color:#94a3b8;margin:4px 0 16px">Carbon-Backed Financing · Green Credit Scoring · Sustainable Finance</p></div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'Green Score', v: s?.green_score || 0, c: s?.green_score >= 60 ? '#10b981' : '#f59e0b', i: '📊' }, { l: 'Grade', v: s?.green_grade || '—', c: '#8b5cf6', i: '🏅' }, { l: 'Effective Rate', v: (s?.financing?.effective_rate_pct || 0) + '%', c: '#3b82f6', i: '💰' }, { l: 'Collateral Value', v: '$' + (c?.collateral_value_usd || 0).toLocaleString(), c: '#10b981', i: '🏦' }, { l: 'Max Borrowing', v: '$' + (c?.max_borrowing_usd || 0).toLocaleString(), c: '#f59e0b', i: '📈' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:18px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${k.l}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">${icon('barChart')} Green Credit Score Factors</h3>
            ${s?.factors?.map(f => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><div style="width:130px;color:#94a3b8;font-size:0.78rem">${f.factor}</div><div style="flex:1;background:#1e293b;border-radius:4px;height:10px;position:relative"><div style="position:absolute;left:0;top:0;height:100%;width:${f.value}%;background:${f.value >= 70 ? '#10b981' : f.value >= 40 ? '#f59e0b' : '#ef4444'};border-radius:4px"></div></div><span style="color:#f1f5f9;font-weight:600;font-size:0.72rem;width:30px;text-align:right">${f.value}</span></div>`).join('') || '<div style="color:#64748b;font-size:0.78rem">Loading score factors...</div>'}
            ${s?.financing ? `<div style="margin-top:12px;padding:8px;background:#0f172a;border-radius:6px"><div style="color:#94a3b8;font-size:0.72rem">Financing Rate Impact</div><div style="display:flex;gap:12px;margin-top:4px"><span style="color:#64748b;font-size:0.78rem">Base: ${s.financing.base_rate_pct}%</span><span style="color:${s.financing.green_discount_pct < 0 ? '#10b981' : '#ef4444'};font-size:0.78rem;font-weight:700">Discount: ${s.financing.green_discount_pct}%</span><span style="color:#f1f5f9;font-size:0.78rem;font-weight:700">\u2192 ${s.financing.effective_rate_pct}%</span></div></div>` : ''}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">${icon('coins')} Carbon Collateral</h3>
            ${c?.total_tCO2e ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px"><div style="padding:10px;background:#0f172a;border-radius:6px;text-align:center"><div style="color:#10b981;font-weight:700;font-size:16px">${c.total_tCO2e}</div><div style="color:#64748b;font-size:0.68rem">tCO\u2082e</div></div><div style="padding:10px;background:#0f172a;border-radius:6px;text-align:center"><div style="color:#f59e0b;font-weight:700;font-size:16px">$${c.spot_price_usd}/t</div><div style="color:#64748b;font-size:0.68rem">Spot Price</div></div><div style="padding:10px;background:#0f172a;border-radius:6px;text-align:center"><div style="color:#94a3b8;font-weight:700;font-size:16px">${c.haircut_pct}%</div><div style="color:#64748b;font-size:0.68rem">Haircut</div></div><div style="padding:10px;background:#0f172a;border-radius:6px;text-align:center"><div style="color:#8b5cf6;font-weight:700;font-size:16px">${c.total_credits}</div><div style="color:#64748b;font-size:0.68rem">Credits</div></div></div>` : '<div style="color:#64748b;font-size:0.78rem">Loading collateral data...</div>'}
        </div>
    </div>
    <div class="sa-card"><h3 style="margin:0 0 10px;color:#f1f5f9">${icon('target')} Green Finance Instruments</h3>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">${D.instruments?.instruments?.map(i => `<div style="padding:12px;background:#0f172a;border-radius:8px;text-align:center"><div style="color:#f1f5f9;font-weight:600;font-size:0.78rem">${i.name}</div><div style="color:#64748b;font-size:0.68rem;margin-top:4px">${i.description}</div><div style="color:#10b981;font-size:0.68rem;margin-top:4px">Min Score: ${i.min_score}</div></div>`).join('') || '<div style="color:#64748b;font-size:0.78rem">Loading instruments...</div>'}</div>
    </div>
</div>`;
}

export function render() {
    load();
    return `<div id="green-finance-root">${renderContent()}</div>`;
}
export function renderPage() { return render(); }
