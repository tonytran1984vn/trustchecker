/** Carbon Registry — Cross-Jurisdiction Dashboard */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
let D = {};
let _loading = false;
async function load() {
    if (_loading) return;
    _loading = true;
    const [jur, proto, cm, fee, rev, def, stats] = await Promise.all([
        API.get('/hardening/carbon-registry/jurisdictions').catch(() => ({})),
        API.get('/hardening/carbon-registry/protocol').catch(() => ({})),
        API.get('/hardening/carbon-registry/compliance-matrix').catch(() => ({})),
        API.get('/hardening/carbon-registry/fee-model').catch(() => ({})),
        API.get('/hardening/carbon-registry/revenue-projection').catch(() => ({})),
        API.get('/hardening/carbon-registry/defensibility').catch(() => ({})),
        API.get('/hardening/carbon-registry/stats').catch(() => ({}))
    ]);
    D = { jur, proto, cm, fee, rev, def, stats };
    _loading = false;
    // Re-render only if this tab is still active
    setTimeout(() => {
        const active = document.querySelector('.ws-tab.active');
        if (active && active.getAttribute('data-tab') === 'registry') {
            const ws = document.querySelector('.ws-content');
            if (ws) ws.innerHTML = render();
        }
    }, 50);
}

const sc = s => s === 'mature' ? '#10b981' : s === 'developing' || s === 'mixed' ? '#f59e0b' : '#3b82f6';
const mc = s => s >= 4 ? '#10b981' : s >= 3 ? '#3b82f6' : s >= 2 ? '#f59e0b' : '#ef4444';
const cs = v => v === 'full' || v === 'required' || v === 'strict' || v === 'mandatory' ? '#10b981' : v === 'partial' || v === 'innovative' || v === 'article_6' || v === 'article_6.2' || v === 'sec_rules' ? '#f59e0b' : v === 'emerging' || v === 'planned' || v === 'optional' || v === 'bilateral' || v === 'cbam' || v === 'voluntary' ? '#3b82f6' : '#64748b';
export function render() {
    load();
    if (!D.jur?.total) return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('globe')} Carbon Registry</h1></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
        ${'<div class="infra-skeleton" style="min-height:120px"></div>'.repeat(4)}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">${'<div class="infra-skeleton" style="min-height:220px"></div>'.repeat(2)}</div></div>`;
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('globe')} Carbon Registry — Cross-Jurisdiction</h1>
        <p style="color:#94a3b8;margin:4px 0 10px;font-size:0.9rem">Compliance Rail · Settlement Layer · Economic Defensibility</p>
        <div style="display:inline-flex;gap:8px;flex-wrap:wrap">
            <span style="padding:4px 12px;border-radius:6px;background:#10b98122;color:#10b981;font-weight:700;font-size:0.85rem">Jurisdictions: ${D.jur?.total || 4}</span>
            <span style="padding:4px 12px;border-radius:6px;background:#3b82f622;color:#3b82f6;font-weight:700;font-size:0.85rem">Protocol: ${D.proto?.total_states || 8} states</span>
            <span style="padding:4px 12px;border-radius:6px;background:#8b5cf622;color:#8b5cf6;font-weight:700;font-size:0.85rem">Moat: ${D.def?.overall_moat || '—'}</span>
        </div></div>

    <!-- Jurisdictions -->
    <h2 style="color:#f1f5f9;margin:16px 0 8px;font-size:1rem;border-bottom:1px solid #334155;padding-bottom:6px">Jurisdiction Registry</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
        ${(D.jur?.jurisdictions || []).map(j => `<div class="sa-card" style="padding:14px">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                <span style="color:#f1f5f9;font-weight:700;font-size:1.1rem">${j.code}</span>
                <span style="padding:2px 8px;background:${sc(j.status)}22;color:${sc(j.status)};font-size:0.78rem;border-radius:4px;font-weight:600">${j.status}</span>
            </div>
            <div style="color:#94a3b8;font-size:0.82rem;margin-bottom:4px">${j.regulatory_body}</div>
            <div style="color:#64748b;font-size:0.8rem;margin-bottom:6px">${j.framework}</div>
            <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="color:#10b981;font-size:1rem;font-weight:700">$${j.avg_credit_price_usd}/t</span>
                <span style="color:#64748b;font-size:0.82rem">${(j.annual_volume_tco2e / 1e6).toFixed(0)}M tCO₂e</span>
            </div>
        </div>`).join('')}
    </div>

    <!-- Protocol + Compliance -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
        <div class="sa-card" style="padding:16px"><h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.95rem">Registry Protocol (${D.proto?.total_states || 8} States)</h3>
            ${(D.proto?.states || []).map((s, i) => `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #1e293b;align-items:center">
                <span style="width:28px;height:28px;border-radius:50%;background:#3b82f622;color:#3b82f6;font-size:0.82rem;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">${i}</span>
                <div style="flex:1">
                    <div style="color:#f1f5f9;font-size:0.88rem;font-weight:600">${s.name}</div>
                    <div style="color:#64748b;font-size:0.8rem">${s.description.slice(0, 60)}</div>
                </div>
                <span style="color:#f59e0b;font-size:0.82rem;font-weight:600">${s.sla}</span>
            </div>`).join('')}
        </div>
        <div class="sa-card" style="padding:16px"><h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.95rem">Compliance Matrix</h3>
            <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.82rem">
                <thead><tr style="border-bottom:2px solid #334155;color:#94a3b8">
                    <th style="text-align:left;padding:6px">Requirement</th>
                    ${(D.cm?.jurisdictions || []).map(j => `<th style="text-align:center;padding:6px">${j}</th>`).join('')}
                </tr></thead>
                <tbody>${(D.cm?.requirements || []).map(r => `<tr style="border-bottom:1px solid #1e293b">
                    <td style="padding:6px;color:#94a3b8">${r.requirement}</td>
                    ${(D.cm?.jurisdictions || []).map(j => `<td style="text-align:center;padding:6px">
                        <span style="color:${cs(r[j.toLowerCase()])};font-size:0.8rem;font-weight:600">${r[j.toLowerCase()]}</span>
                    </td>`).join('')}
                </tr>`).join('')}</tbody>
            </table></div>
        </div>
    </div>

    <!-- Fee Model + Revenue -->
    <div style="display:grid;grid-template-columns:3fr 2fr;gap:14px;margin-bottom:16px">
        <div class="sa-card" style="padding:16px"><h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.95rem">Fee Model — Transaction Infrastructure</h3>
            ${(D.fee?.revenue_streams || []).map(f => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #1e293b">
                <span style="color:#f1f5f9;font-size:0.85rem">${f.name}</span>
                <span style="padding:2px 8px;background:${f.type === 'per_transaction' || f.type === 'per_credit' || f.type === 'per_transfer' || f.type === 'per_retirement' ? '#10b98122' : '#3b82f622'};color:${f.type.startsWith('per') ? '#10b981' : '#3b82f6'};font-size:0.78rem;border-radius:4px">${f.type}</span>
                <span style="color:#f59e0b;font-size:0.88rem;font-weight:600">${f.rate}</span>
            </div>`).join('')}
        </div>
        <div class="sa-card" style="padding:16px"><h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.95rem">Revenue Projection</h3>
            <div style="text-align:center;padding:8px"><div style="font-size:26px;font-weight:800;color:#10b981">$${D.rev?.total_annual ? Math.round(D.rev.total_annual / 1000) + 'K' : '—'}</div><div style="color:#94a3b8;font-size:0.85rem">Annual Revenue</div></div>
            <div style="display:flex;justify-content:center;gap:20px;margin:8px 0">
                <div style="text-align:center"><div style="font-size:18px;font-weight:700;color:#10b981">${D.rev?.transaction_revenue_pct || 0}%</div><div style="color:#64748b;font-size:0.82rem">Transaction</div></div>
                <div style="text-align:center"><div style="font-size:18px;font-weight:700;color:#3b82f6">${D.rev?.subscription_revenue_pct || 0}%</div><div style="color:#64748b;font-size:0.82rem">Subscription</div></div>
            </div>
            <div style="padding:6px 10px;background:${D.rev?.infrastructure_ratio === 'Infrastructure' ? '#10b98112' : '#f59e0b12'};border-radius:6px;text-align:center;color:${D.rev?.infrastructure_ratio === 'Infrastructure' ? '#10b981' : '#f59e0b'};font-size:0.85rem;font-weight:700">${D.rev?.infrastructure_ratio || '—'}</div>
            ${(D.rev?.streams || []).slice(0, 5).map(s => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e293b">
                <span style="color:#94a3b8;font-size:0.82rem">${s.name}</span>
                <span style="color:#f1f5f9;font-size:0.82rem;font-weight:600">$${(s.revenue / 1000).toFixed(0)}K (${s.pct}%)</span>
            </div>`).join('')}
        </div>
    </div>

    <!-- Defensibility Moat -->
    <div class="sa-card" style="margin-bottom:16px;padding:16px"><h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.95rem">Economic Defensibility Moat: ${D.def?.overall_moat || '—'} — ${D.def?.assessment || ''}</h3>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${(D.def?.moat_pillars || []).map(p => `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#0f172a;border-radius:6px">
            <span style="width:10px;height:10px;border-radius:50%;background:${mc(p.score)};flex-shrink:0"></span>
            <div style="flex:1">
                <div style="color:#f1f5f9;font-size:0.85rem;font-weight:600">${p.pillar}</div>
                <div style="color:#64748b;font-size:0.8rem">${p.current.slice(0, 55)}</div>
            </div>
            <div style="width:60px;background:#1e293b;border-radius:3px;height:6px"><div style="height:100%;width:${p.score / p.max * 100}%;background:${mc(p.score)};border-radius:3px"></div></div>
            <span style="color:#f1f5f9;font-size:0.85rem;width:36px;text-align:right;font-weight:600">${p.score}/${p.max}</span>
        </div>`).join('')}</div>
        <div style="margin-top:8px;padding:6px 10px;background:#8b5cf612;border-radius:6px;color:#8b5cf6;font-size:0.85rem">${D.def?.gap_to_infrastructure || ''}</div>
    </div>

    <!-- Moat Analysis -->
    <div class="sa-card" style="padding:16px"><h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.95rem">Moat Analysis</h3>
        ${D.fee?.moat_analysis ? Object.entries(D.fee.moat_analysis).map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1e293b">
            <span style="color:#94a3b8;font-size:0.85rem;text-transform:capitalize">${k.replace(/_/g, ' ')}</span>
            <span style="color:${v.startsWith('HIGH') ? '#10b981' : v.startsWith('MEDIUM') ? '#f59e0b' : '#3b82f6'};font-size:0.85rem;font-weight:600">${v.split('—')[0]}</span>
        </div>`).join('') : ''}
    </div>

</div>`;
}
export function renderPage() { return render(); }
