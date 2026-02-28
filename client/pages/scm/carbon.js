/**
 * TrustChecker – Carbon Passport v3.0 Dashboard
 * Cross-Cutting ESG Governance Intelligence
 */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let carbon = { scope: null, leaderboard: null, report: null, risk: null, regulatory: null, maturity: null, flow: null, roleMatrix: null, benchmark: null };
let _carbonFetching = false;
let _carbonLoaded = false;
let _bmPage = 0;
let _bmPageSize = 5;

async function fetchCarbonData() {
    if (_carbonFetching || _carbonLoaded) return;
    _carbonFetching = true;
    try {
        const [scope, leaderboard, report, risk, regulatory, maturity, flow, roleMatrix, benchmark] = await Promise.all([
            API.get('/scm/carbon/scope').catch(() => null),
            API.get('/scm/carbon/leaderboard').catch(() => null),
            API.get('/scm/carbon/report').catch(() => null),
            API.get('/scm/carbon/risk-factors').catch(() => null),
            API.get('/scm/carbon/regulatory').catch(() => null),
            API.get('/scm/carbon/maturity').catch(() => null),
            API.get('/scm/carbon/governance-flow').catch(() => null),
            API.get('/scm/carbon/role-matrix').catch(() => null),
            API.get('/scm/carbon/benchmark').catch(() => null)
        ]);
        carbon = { scope, leaderboard, report, risk, regulatory, maturity, flow, roleMatrix, benchmark };
        _carbonLoaded = true;
        // Targeted DOM update — only update the carbon page content, not the whole app
        setTimeout(() => {
            const el = document.getElementById('carbon-passport-root');
            if (el) el.innerHTML = renderContent();
        }, 50);
    } catch (e) { console.error('Carbon fetch error:', e); }
    _carbonFetching = false;
}

function maturityGauge(level) {
    const pct = (level / 5) * 100;
    const colors = ['#6b7280', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899'];
    const c = colors[level] || '#6b7280';
    return `<div style="text-align:center"><svg width="160" height="110" viewBox="0 0 200 130">
        <path class="cb-track" d="M 20 120 A 80 80 0 0 1 180 120" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round" style="color:#1e293b"/>
        <path d="M 20 120 A 80 80 0 0 1 180 120" fill="none" stroke="${c}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${pct * 2.51} 251" style="transition:stroke-dasharray 1s ease"/>
        <text x="100" y="85" text-anchor="middle" fill="${c}" font-size="30" font-weight="bold">L${level}</text>
        <text x="100" y="115" text-anchor="middle" fill="#94a3b8" font-size="11">of 5</text>
    </svg></div>`;
}

function permCell(val) {
    if (val === true) return '<span style="color:#10b981"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span></span>';
    if (val === false) return '<span style="color:#475569">—</span>';
    return `<span style="color:#f59e0b;font-size:0.72rem">${val}</span>`;
}

export function render() {
    fetchCarbonData();
    return `<div id="carbon-passport-root">${renderContent()}</div>`;
}

function renderContent() {
    const { scope: sc, leaderboard: lb, report: rpt, risk, regulatory: reg, maturity: mat, flow, roleMatrix: rm, benchmark: bm } = carbon;

    return `
    <div class="sa-page">
        <div class="sa-page-title">
            <h1>${icon('barChart')} Carbon Passport (v3.0)</h1>
            <p style="color:#94a3b8;margin:4px 0 16px">Cross-Cutting ESG Governance Intelligence — GHG Protocol + DEFRA 2025</p>
            <div class="sa-page-actions">
                <button onclick="window.refreshCarbon()" style="padding:8px 16px;background:#10b981;color:#fff;border:none;border-radius:8px;cursor:pointer">${icon('workflow')} Refresh</button>
            </div>
        </div>

        <!-- ═════ KPI CARDS ═════ -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
            <div class="sa-card" style="text-align:center;padding:20px">
                <div style="font-size:28px">🌍</div>
                <div style="font-size:24px;font-weight:700;color:#10b981;margin:4px 0">${sc?.total_emissions_kgCO2e || 0}</div>
                <div style="color:#94a3b8;font-size:0.82rem">Total kgCO₂e</div>
            </div>
            <div class="sa-card" style="text-align:center;padding:20px">
                <div style="font-size:28px">📦</div>
                <div style="font-size:24px;font-weight:700;color:#3b82f6;margin:4px 0">${sc?.products_assessed || 0}</div>
                <div style="color:#94a3b8;font-size:0.82rem">Products Assessed</div>
            </div>
            <div class="sa-card" style="text-align:center;padding:20px">
                <div style="font-size:28px">🎯</div>
                <div style="font-size:24px;font-weight:700;color:#f59e0b;margin:4px 0">${sc?.reduction_targets?.paris_aligned_2030 || 0}</div>
                <div style="color:#94a3b8;font-size:0.82rem">2030 Target kgCO₂e</div>
            </div>
            <div class="sa-card" style="text-align:center;padding:20px">
                <div style="font-size:28px">📊</div>
                <div style="font-size:24px;font-weight:700;color:#8b5cf6;margin:4px 0">${rpt?.overall_esg_grade || 'N/A'}</div>
                <div style="color:#94a3b8;font-size:0.82rem">ESG Grade</div>
            </div>
        </div>

        <!-- ═════ GOVERNANCE FLOW ═════ -->
        <div class="sa-card" style="margin-bottom:20px">
            <h3 style="margin:0 0 16px;color:#f1f5f9">${icon('workflow')} Carbon Governance Flow</h3>
            ${flow?.flow ? `
            <div style="display:flex;align-items:stretch;gap:4px;overflow-x:auto;padding:8px 0">
                ${flow.flow.map((s, i) => `
                    <div style="flex:1;min-width:140px;text-align:center">
                        <div class="cb-flow-card" style="border:2px solid ${['#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#3b82f6'][i]};border-radius:12px;padding:14px 10px">
                            <div style="font-size:24px;margin-bottom:6px">${s.icon}</div>
                            <div style="color:#f1f5f9;font-weight:700;font-size:0.82rem;margin-bottom:4px">${s.name}</div>
                            <div style="color:${['#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#3b82f6'][i]};font-size:0.72rem;font-style:italic">${s.layer}</div>
                            <div style="margin-top:6px;text-align:left">${s.components.map(c => `<div style="color:#94a3b8;font-size:0.72rem">• ${c}</div>`).join('')}</div>
                        </div>
                        ${i < flow.flow.length - 1 ? '<div style="color:#475569;font-size:18px;margin-top:8px">→</div>' : ''}
                    </div>
                `).join('')}
            </div>
            <div style="text-align:center;margin-top:10px;color:#94a3b8;font-size:0.78rem;font-style:italic">${flow.principle || ''}</div>
            ` : '<div style="text-align:center;padding:20px;color:#64748b">Loading...</div>'}
        </div>

        <!-- ═════ ROW: SCOPE + RISK FACTORS ═════ -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">

            <!-- SCOPE 1/2/3 -->
            <div class="sa-card">
                <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('barChart')} Scope 1 / 2 / 3 Breakdown</h3>
                ${sc ? `
                <div style="display:grid;gap:10px">
                    ${[
                ['Scope 1 — Manufacturing', sc.scope_1, '#ef4444'],
                ['Scope 2 — Energy/Warehousing', sc.scope_2, '#f59e0b'],
                ['Scope 3 — Transport', sc.scope_3, '#3b82f6']
            ].map(([label, data, color]) => `
                        <div class="cb-inner" style="padding:14px;border-radius:10px;border-left:4px solid ${color}">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                                <span style="color:#f1f5f9;font-weight:600;font-size:13px">${label}</span>
                                <span style="color:${color};font-weight:700;font-size:16px">${data?.total || 0} <span style="font-size:0.78rem;color:#94a3b8">kgCO₂e</span></span>
                            </div>
                            <div class="cb-track" style="border-radius:4px;height:8px"><div style="width:${data?.pct || 0}%;height:100%;background:${color};border-radius:4px;transition:width 1s ease"></div></div>
                            <div style="text-align:right;color:#64748b;font-size:0.78rem;margin-top:3px">${data?.pct || 0}%</div>
                        </div>
                    `).join('')}
                </div>
                ` : '<div style="text-align:center;padding:30px;color:#64748b">Loading...</div>'}
            </div>

            <!-- RISK FACTORS -->
            <div class="sa-card">
                <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('alertTriangle')} Carbon → Risk Factors</h3>
                ${risk ? `
                <div class="cb-inner" style="display:flex;justify-content:space-between;margin-bottom:12px;padding:8px 12px;border-radius:8px">
                    <div><span style="color:#94a3b8;font-size:0.78rem">Risk Factors</span><div style="color:#f1f5f9;font-weight:700;font-size:18px">${risk.risk_factors?.length || 0}</div></div>
                    <div><span style="color:#94a3b8;font-size:0.78rem">Avg Score</span><div style="color:${(risk.risk_factors?.reduce((s, r) => s + (r.score || 0), 0) / (risk.risk_factors?.length || 1)) > 60 ? '#ef4444' : '#f59e0b'};font-weight:700;font-size:18px">${Math.round(risk.risk_factors?.reduce((s, r) => s + (r.score || 0), 0) / (risk.risk_factors?.length || 1))}/100</div></div>
                    <div><span style="color:#94a3b8;font-size:0.78rem">Critical</span><div style="color:#ef4444;font-weight:700;font-size:18px">${risk.risk_factors?.filter(r => r.severity === 'critical').length || 0}</div></div>
                </div>
                ${risk.risk_factors?.length > 0 ? risk.risk_factors.map(r => `
                    <div class="cb-inner" style="padding:10px 12px;border-radius:8px;margin-bottom:6px;border-left:4px solid ${r.severity === 'critical' ? '#ef4444' : r.severity === 'high' ? '#f59e0b' : '#3b82f6'}">
                        <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                            <span style="color:#f1f5f9;font-weight:600;font-size:0.82rem">${r.name}</span>
                            <span style="font-size:0.72rem;padding:2px 6px;border-radius:4px;background:${r.severity === 'critical' ? 'rgba(239,68,68,0.15);color:#ef4444' : r.severity === 'high' ? 'rgba(245,158,11,0.15);color:#f59e0b' : 'rgba(59,130,246,0.15);color:#3b82f6'};text-transform:uppercase">${r.severity}</span>
                        </div>
                        <div style="color:#94a3b8;font-size:0.78rem">${r.description || ''}</div>
                        <div style="color:#64748b;font-size:0.72rem;margin-top:2px">${r.impact ? '→ ' + r.impact + ' (score: ' + (r.score || 0) + ')' : ''}</div>
                    </div>
                `).join('') : '<div style="text-align:center;padding:20px;color:#10b981;font-weight:600"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> No carbon risk factors detected</div>'}
                ` : '<div style="text-align:center;padding:30px;color:#64748b">Loading...</div>'}
            </div>
        </div>

        <!-- ═════ ROW: MATURITY + REGULATORY ═════ -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">

            <!-- MATURITY -->
            <div class="sa-card">
                <h3 style="margin:0 0 4px;color:#f1f5f9">${icon('target')} Carbon Maturity</h3>
                ${mat ? `
                ${maturityGauge(mat.current_level)}
                ${mat.levels?.map((l, idx) => `
                    <div style="display:flex;align-items:center;gap:8px;padding:5px 10px;margin-bottom:3px;border-radius:6px;background:${idx < mat.current_level ? 'rgba(16,185,129,0.06)' : 'rgba(100,116,139,0.04)'}">
                        <span style="font-size:14px">${['🌱', '📊', '⚡', '🎯', '🏆'][idx] || '📋'}</span>
                        <div style="flex:1">
                            <div style="color:${idx < mat.current_level ? '#f1f5f9' : '#64748b'};font-weight:${idx === mat.current_level - 1 ? '700' : '500'};font-size:0.82rem">${l.name}</div>
                            <div style="color:#94a3b8;font-size:0.72rem">${l.description}</div>
                        </div>
                        <span style="color:#94a3b8;font-size:0.72rem">${l.target}</span>
                    </div>
                `).join('') || ''}
                ` : '<div style="text-align:center;padding:30px;color:#64748b">Loading...</div>'}
            </div>

            <!-- REGULATORY -->
            <div class="sa-card">
                <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('shield')} Regulatory Alignment</h3>
                ${reg ? `
                <div style="display:flex;gap:8px;margin-bottom:12px">
                    <span style="padding:4px 10px;border-radius:6px;background:rgba(16,185,129,0.1);color:#10b981;font-size:0.82rem"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Ready: ${reg.ready}</span>
                    <span style="padding:4px 10px;border-radius:6px;background:rgba(245,158,11,0.1);color:#f59e0b;font-size:0.82rem"><span class="status-icon status-warn" aria-label="Warning">!</span> Partial: ${reg.partial}</span>
                </div>
                ${reg.frameworks?.map(f => {
                const isReady = f.status === 'compliant' || f.readiness === 'ready';
                const pct = isReady ? 100 : (f.status === 'partial' ? 65 : 0);
                return `
                    <div class="cb-inner" style="padding:8px 12px;border-radius:8px;margin-bottom:4px;display:flex;align-items:center;gap:10px">
                        <span style="font-size:14px">${f.icon || (f.region === 'EU' ? '🇪🇺' : '🌐')}</span>
                        <div style="flex:1">
                            <div style="color:#f1f5f9;font-weight:600;font-size:0.82rem">${f.name} <span style="color:#94a3b8;font-size:0.72rem">${f.region || ''}</span></div>
                            <div style="color:#cbd5e1;font-size:0.72rem">${f.full || ''}</div>
                        </div>
                        <div style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.78rem;color:#fff;background:${isReady ? '#10b981' : '#f59e0b'}">${pct}%</div>
                    </div>
                    `;
            }).join('') || ''}
                ` : '<div style="text-align:center;padding:30px;color:#64748b">Loading...</div>'}
            </div>
        </div>

        <!-- ═════ ESG LEADERBOARD ═════ -->
        <div class="sa-card" style="margin-bottom:20px">
            <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('users')} Partner ESG Leaderboard</h3>
            ${lb ? `
            <div style="display:flex;gap:8px;margin-bottom:12px">
                <span style="padding:4px 10px;border-radius:6px;background:rgba(16,185,129,0.1);color:#10b981;font-size:0.82rem;font-weight:600">A: ${lb.a_grade}</span>
                <span style="padding:4px 10px;border-radius:6px;background:rgba(59,130,246,0.1);color:#3b82f6;font-size:0.82rem;font-weight:600">B: ${lb.b_grade}</span>
                <span style="padding:4px 10px;border-radius:6px;background:rgba(245,158,11,0.1);color:#f59e0b;font-size:0.82rem;font-weight:600">C: ${lb.c_grade}</span>
                <span style="padding:4px 10px;border-radius:6px;background:rgba(239,68,68,0.1);color:#ef4444;font-size:0.82rem;font-weight:600">D: ${lb.d_grade}</span>
            </div>
            <div style="overflow-x:auto">
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead><tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.78rem;text-transform:uppercase">
                        <th style="padding:8px;text-align:left">Partner</th>
                        <th style="padding:8px;text-align:left">Country</th>
                        <th style="padding:8px;text-align:center">ESG Score</th>
                        <th style="padding:8px;text-align:center">Grade</th>
                        <th style="padding:8px;text-align:center">Reliability</th>
                        <th style="padding:8px;text-align:center">Violations</th>
                    </tr></thead>
                    <tbody>
                        ${(lb.leaderboard || []).map(p => `
                        <tr style="border-bottom:1px solid #1e293b">
                            <td style="padding:8px;color:#f1f5f9;font-weight:600">${p.name}</td>
                            <td style="padding:8px;color:#94a3b8">${p.country || ''}</td>
                            <td style="padding:8px;text-align:center;color:${p.grade_color || '#94a3b8'};font-weight:700">${p.esg_score}</td>
                            <td style="padding:8px;text-align:center"><span style="padding:2px 8px;border-radius:4px;background:${p.grade_color || '#94a3b8'}22;color:${p.grade_color || '#94a3b8'};font-weight:700;font-size:0.82rem">${p.grade}</span></td>
                            <td style="padding:8px;text-align:center;color:#94a3b8">${p.metrics?.shipment_reliability || 'N/A'}</td>
                            <td style="padding:8px;text-align:center;color:${(p.metrics?.sla_violations || 0) > 0 ? '#ef4444' : '#10b981'}">${p.metrics?.sla_violations || 0}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
            ` : '<div style="text-align:center;padding:20px;color:#64748b">Loading...</div>'}
        </div>

        <!-- ═════ ROW: GRI + BENCHMARK ═════ -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">

            <!-- GRI DISCLOSURES -->
            <div class="sa-card">
                <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('scroll')} GRI Disclosures</h3>
                ${rpt?.disclosures ? `
                <div style="padding:6px 10px;background:rgba(16,185,129,0.06);border-radius:6px;margin-bottom:10px;font-size:0.78rem;color:#94a3b8">
                    Standard: ${rpt.report_standard} | Period: ${rpt.reporting_period?.from} → ${rpt.reporting_period?.to}
                </div>
                ${Object.entries(rpt.disclosures).map(([code, d]) => `
                    <div class="cb-inner" style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:6px;margin-bottom:3px">
                        <div>
                            <span style="color:#3b82f6;font-weight:700;font-size:0.82rem">${code}</span>
                            <span style="color:#94a3b8;font-size:0.78rem;margin-left:6px">${d.title}</span>
                        </div>
                        <span style="color:#f1f5f9;font-weight:700;font-size:13px">${d.value} <span style="color:#64748b;font-size:0.72rem">${d.unit}</span></span>
                    </div>
                `).join('')}
                ` : '<div style="text-align:center;padding:20px;color:#64748b">Loading...</div>'}
            </div>

            <!-- INDUSTRY BENCHMARK -->
            <div class="sa-card">
                <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('target')} Industry Carbon Benchmark</h3>
                ${bm ? `
                <div style="text-align:center;padding:8px;margin-bottom:10px;background:${bm.insight?.includes('Top') ? 'rgba(16,185,129,0.08)' : bm.insight?.includes('Above') ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)'};border-radius:6px;color:${bm.insight?.includes('Top') ? '#10b981' : bm.insight?.includes('Above') ? '#f59e0b' : '#ef4444'};font-weight:600;font-size:0.82rem">${bm.insight || ''}</div>
                <div class="bm-paginated">${_renderBmPage(bm.your_comparison || [])}</div>
                ` : '<div style="text-align:center;padding:20px;color:#64748b">Loading...</div>'}
            </div>
        </div>

        <!-- ═════ ROLE × CARBON PERMISSION MATRIX ═════ -->
        <div class="sa-card" style="margin-bottom:20px">
            <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('users')} Role × Carbon Permission Matrix</h3>
            ${rm?.matrix ? `
            <div style="overflow-x:auto">
                <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
                    <thead><tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.72rem;text-transform:uppercase">
                        <th style="padding:6px;text-align:left">Action</th>
                        <th style="padding:6px;text-align:center">SCM Ops</th>
                        <th style="padding:6px;text-align:center">Risk</th>
                        <th style="padding:6px;text-align:center">Compliance</th>
                        <th style="padding:6px;text-align:center">CA</th>
                        <th style="padding:6px;text-align:center">SA</th>
                        <th style="padding:6px;text-align:center">CEO</th>
                    </tr></thead>
                    <tbody>
                        ${(rm.actions || []).map(action => `
                        <tr style="border-bottom:1px solid #1e293b">
                            <td style="padding:6px;color:#f1f5f9;font-weight:500">${action.replace(/_/g, ' ')}</td>
                            <td style="padding:6px;text-align:center">${permCell(rm.matrix.scm_ops?.[action])}</td>
                            <td style="padding:6px;text-align:center">${permCell(rm.matrix.risk?.[action])}</td>
                            <td style="padding:6px;text-align:center">${permCell(rm.matrix.compliance?.[action])}</td>
                            <td style="padding:6px;text-align:center">${permCell(rm.matrix.company_admin?.[action])}</td>
                            <td style="padding:6px;text-align:center">${permCell(rm.matrix.super_admin?.[action])}</td>
                            <td style="padding:6px;text-align:center">${permCell(rm.matrix.ceo?.[action])}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
            <div style="margin-top:8px;padding:6px 10px;background:rgba(139,92,246,0.08);border-radius:6px;color:#a78bfa;font-size:0.78rem">${rm.design_principle || ''}</div>
            ` : '<div style="text-align:center;padding:20px;color:#64748b">Loading...</div>'}
        </div>

    </div>`;
}

export function renderPage() { return render(); }

window.refreshCarbon = async function () {
    _carbonFetching = false;
    _carbonLoaded = false;
    carbon = { scope: null, leaderboard: null, report: null, risk: null, regulatory: null, maturity: null, flow: null, roleMatrix: null, benchmark: null };
    _bmPage = 0;
    await fetchCarbonData();
};

/* ─── Benchmark Pagination Helpers ─── */
function _renderBmPage(items) {
    const total = items.length;
    if (total === 0) return '<div style="text-align:center;padding:15px;color:#64748b;font-size:0.82rem">No product data for comparison</div>';
    const totalPages = Math.ceil(total / _bmPageSize);
    if (_bmPage >= totalPages) _bmPage = totalPages - 1;
    const start = _bmPage * _bmPageSize;
    const page = items.slice(start, start + _bmPageSize);
    const from = start + 1;
    const to = Math.min(start + _bmPageSize, total);

    return `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:6px">
                <span style="color:#94a3b8;font-size:0.78rem">Show</span>
                ${[5, 10, 20, 50].map(n => `
                    <button onclick="window._bmSetSize(${n})" style="padding:2px 8px;border-radius:4px;border:1px solid ${_bmPageSize === n ? '#3b82f6' : '#334155'};background:${_bmPageSize === n ? 'rgba(59,130,246,0.15)' : 'transparent'};color:${_bmPageSize === n ? '#3b82f6' : '#94a3b8'};cursor:pointer;font-size:0.75rem;font-weight:${_bmPageSize === n ? '700' : '400'}">${n}</button>
                `).join('')}
            </div>
            <span style="color:#64748b;font-size:0.75rem">${from}–${to} of ${total}</span>
        </div>
        ${page.map(c => `
            <div class="cb-inner" style="padding:10px 12px;border-radius:8px;margin-bottom:4px">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="color:#f1f5f9;font-weight:600;font-size:0.82rem">${c.category}</span>
                    <span style="font-size:0.72rem;padding:2px 6px;border-radius:4px;background:${c.performance === 'top_performer' ? 'rgba(16,185,129,0.15);color:#10b981' : c.performance === 'above_average' ? 'rgba(59,130,246,0.15);color:#3b82f6' : 'rgba(239,68,68,0.15);color:#ef4444'}">${(c.performance || '').replace(/_/g, ' ')}</span>
                </div>
                <div style="display:flex;gap:12px;font-size:0.78rem;color:#94a3b8">
                    <span>You: <strong style="color:#f1f5f9">${c.your_avg_kgCO2e}</strong></span>
                    <span>Industry: <strong>${c.industry_median || c.industry_avg_kgCO2e || 'N/A'}</strong></span>
                    <span>Gap: <strong style="color:${(c.gap_to_median_pct || c.gap_pct || 0) <= 0 ? '#10b981' : '#ef4444'}">${(c.gap_to_median_pct || c.gap_pct || 0) > 0 ? '+' : ''}${c.gap_to_median_pct || c.gap_pct || 0}%</strong></span>
                </div>
            </div>
        `).join('')}
        ${totalPages > 1 ? `
        <div style="display:flex;justify-content:center;align-items:center;gap:8px;margin-top:8px">
            <button onclick="window._bmPrev()" ${_bmPage === 0 ? 'disabled' : ''} style="padding:4px 10px;border-radius:4px;border:1px solid #334155;background:transparent;color:${_bmPage === 0 ? '#334155' : '#94a3b8'};cursor:${_bmPage === 0 ? 'default' : 'pointer'};font-size:0.78rem">← Prev</button>
            <span style="color:#94a3b8;font-size:0.78rem">Page ${_bmPage + 1} / ${totalPages}</span>
            <button onclick="window._bmNext()" ${_bmPage >= totalPages - 1 ? 'disabled' : ''} style="padding:4px 10px;border-radius:4px;border:1px solid #334155;background:transparent;color:${_bmPage >= totalPages - 1 ? '#334155' : '#94a3b8'};cursor:${_bmPage >= totalPages - 1 ? 'default' : 'pointer'};font-size:0.78rem">Next →</button>
        </div>` : ''}
    `;
}

function _bmRefresh() {
    const el = document.querySelector('.bm-paginated');
    if (el && carbon.benchmark?.your_comparison) {
        el.innerHTML = _renderBmPage(carbon.benchmark.your_comparison);
    }
}

window._bmSetSize = function (n) { _bmPageSize = n; _bmPage = 0; _bmRefresh(); };
window._bmPrev = function () { if (_bmPage > 0) { _bmPage--; _bmRefresh(); } };
window._bmNext = function () { _bmPage++; _bmRefresh(); };
