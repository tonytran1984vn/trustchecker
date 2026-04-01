/**
 * Executive – Enterprise Risk & Control Map (Risk Heatmap 5x5)
 * Board-Level Dashboard & IPO Readiness
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

let _data = null;
let _loading = false;

// Helpers
const formatDate = (iso) => new Date(iso).toLocaleDateString();
const zc = (z) => z === 'critical' ? '#ef4444' : z === 'high' ? '#f59e0b' : z === 'medium' ? '#3b82f6' : '#10b981';
const sc = (s) => s >= 15 ? '#ef4444' : s >= 8 ? '#f59e0b' : s >= 4 ? '#3b82f6' : '#10b981';

export function renderPage() {
    if (!_data) { loadData(); return loadingState(); }
    const { tl, gov, reg, hm, cm, ra, bd, ct, gap, mat } = _data;

    return `
    <div class="exec-page">
      <div class="exec-header">
        <h1>${icon('dashboard', 28)} Enterprise Risk & Control Map (IPO Readiness)</h1>
        <div style="display:flex;align-items:center;gap:1.5rem">
            <div style="display:flex;align-items:center;gap:6px;font-size:0.8rem;background:rgba(16,185,129,0.1);color:#10b981;padding:6px 12px;border-radius:20px;border:1px solid rgba(16,185,129,0.3)">
                ${icon('shield', 14)} <strong>Controls:</strong> ${cm?.ipo_ready ? 'IPO Ready' : 'In Progress'}
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:0.8rem;background:rgba(239,68,68,0.1);color:#ef4444;padding:6px 12px;border-radius:20px;border:1px solid rgba(239,68,68,0.3)">
                ${icon('alertTriangle', 14)} <strong>Critical Risks:</strong> ${bd?.risk_count?.critical || 0}
            </div>
            <button onclick="window._attestControls()" style="display:flex;align-items:center;gap:8px;background:linear-gradient(135deg, #10b981, #059669);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:700;font-size:0.8rem;cursor:pointer;box-shadow:0 4px 12px rgba(16,185,129,0.3)">
                ${icon('check', 16)} Sign-off Controls
            </button>
        </div>
      </div>

      <!-- Top Stats -->
      <section class="exec-section">
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:15px">
          ${kpiCard('Maturity Score', mat?.overall || 'L4.0/5', 'Institutional', '#3b82f6')}
          ${kpiCard('Total Risks Scored', reg?.total_risks || 32, 'Across 7 domains', '#8b5cf6')}
          ${kpiCard('High/Critical', (bd?.risk_count?.critical || 0) + (bd?.risk_count?.high || 0), 'Residual risks', '#ef4444')}
          ${kpiCard('Appetite Breaches', bd?.appetite_breaches?.length || 0, 'Domains flagged', bd?.appetite_breaches?.length ? '#ef4444' : '#10b981')}
          ${kpiCard('IPO Readiness', gap?.completeness_pct + '%', 'Controls verified', gap?.completeness_pct > 80 ? '#10b981' : '#f59e0b')}
        </div>
      </section>

      <!-- Main Layout: 5x5 Matrix + Top 10 Risks -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
        
        <!-- Left: The 5x5 Heatmap Matrix -->
        <section class="exec-section" style="margin-bottom:0">
            <h2 class="exec-section-title" style="display:flex;justify-content:space-between;align-items:center">
                <span>${icon('grid', 20)} Inherent Risk Matrix (Impact × Likelihood)</span>
                <span style="font-size:0.7rem;font-weight:normal;color:var(--text-secondary)">Bubble size = Number of Risks</span>
            </h2>
            ${renderHeatmapGrid(hm?.grid, reg?.risks)}
            <div style="display:flex;justify-content:center;gap:15px;margin-top:20px;font-size:0.7rem;font-weight:600">
                <div style="display:flex;align-items:center;gap:4px"><div style="width:12px;height:12px;border-radius:2px;background:#ef4444"></div> Critical (≥15)</div>
                <div style="display:flex;align-items:center;gap:4px"><div style="width:12px;height:12px;border-radius:2px;background:#f59e0b"></div> High (8-14)</div>
                <div style="display:flex;align-items:center;gap:4px"><div style="width:12px;height:12px;border-radius:2px;background:#3b82f6"></div> Medium (4-7)</div>
                <div style="display:flex;align-items:center;gap:4px"><div style="width:12px;height:12px;border-radius:2px;background:#10b981"></div> Low (<4)</div>
            </div>
        </section>

        <!-- Right: Top 10 Residual Risks -->
        <section class="exec-section" style="margin-bottom:0">
            <h2 class="exec-section-title">${icon('alertTriangle', 20)} Top 10 Residual Risks (Post-Controls)</h2>
            <div style="background:var(--surface-color,rgba(0,0,0,0.2));border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:8px">
                ${(bd?.top_10_residual_risks || []).map((r, i) => {
                    const c = sc(r.score);
                    return `
                    <div style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid rgba(255,255,255,0.04)">
                        <div style="width:24px;height:24px;border-radius:12px;background:${c}22;color:${c};display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800">${i + 1}</div>
                        <div style="flex:1">
                            <div style="display:flex;justify-content:space-between;margin-bottom:2px">
                                <span style="font-size:0.85rem;font-weight:700;color:var(--text-primary)">${r.id}: ${r.description}</span>
                                <span style="font-size:0.9rem;font-weight:800;color:${c}">${r.score}</span>
                            </div>
                            <div style="display:flex;gap:10px;font-size:0.7rem;color:var(--text-secondary)">
                                <span><strong>Domain:</strong> ${r.domain}</span>
                                <span><strong>Owner:</strong> ${r.owner}</span>
                            </div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </section>
      </div>

      <!-- Bottom Layout: Risk Appetite and IPO Gap -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        
        <section class="exec-section">
            <h2 class="exec-section-title">${icon('activity', 20)} Domain Scores vs Risk Appetite</h2>
            <div style="display:flex;flex-direction:column;gap:12px">
                ${(bd?.domain_scores || []).map(d => {
                    const pct = Math.min(100, (d.avg_score / Math.max(d.appetite_max, 1)) * 100);
                    const isBreach = d.breached;
                    return `
                    <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);padding:12px;border-radius:8px">
                        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                            <span style="font-weight:700;font-size:0.85rem">${d.domain}</span>
                            <span style="font-size:0.75rem;font-weight:600;color:${isBreach ? '#ef4444' : '#10b981'}">${d.avg_score} / ${d.appetite_max} max</span>
                        </div>
                        <div style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden">
                            <div style="height:100%;width:${pct}%;background:${isBreach ? '#ef4444' : '#10b981'};border-radius:3px"></div>
                        </div>
                        <div style="margin-top:6px;font-size:0.65rem;color:var(--text-secondary);display:flex;justify-content:space-between">
                            <span>Appetite Limit: <strong>${d.tolerance}</strong></span>
                            ${isBreach ? `<span style="color:#ef4444;font-weight:700">${icon('alertTriangle', 10)} BREACH DETECTED</span>` : `<span style="color:#10b981">${icon('check', 10)} WITHIN LIMITS</span>`}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </section>

        <section class="exec-section">
            <h2 class="exec-section-title">${icon('target', 20)} IPO Gap Analysis (Controls & Audit)</h2>
            <div style="margin-bottom:15px">
                <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px;font-weight:600">
                    <span>IPO Framework Completeness</span>
                    <span style="color:${gap?.completeness_pct >= 80 ? '#10b981' : '#f59e0b'}">${gap?.completeness_pct}%</span>
                </div>
                <div style="height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden">
                    <div style="height:100%;width:${gap?.completeness_pct}%;background:${gap?.completeness_pct >= 80 ? '#10b981' : '#f59e0b'};border-radius:4px"></div>
                </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
                ${(gap?.gaps || []).map(g => `
                    <div style="display:flex;align-items:flex-start;gap:10px;background:rgba(255,255,255,0.02);padding:10px;border-radius:6px;border-left:3px solid ${g.status === 'implemented' ? '#10b981' : '#f59e0b'}">
                        ${g.status === 'implemented' ? `<div style="color:#10b981">${icon('checkCircle', 16)}</div>` : `<div style="color:#f59e0b">${icon('clock', 16)}</div>`}
                        <div>
                            <div style="font-size:0.8rem;font-weight:700;color:var(--text-primary);margin-bottom:2px">${g.item}</div>
                            <div style="font-size:0.7rem;color:var(--text-secondary)">${g.description}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>
      </div>

      <!-- Glossary / Audit Terms Tooltip -->
      <section class="exec-section" style="margin-top:20px;background:rgba(255,255,255,0.01)">
        <h2 class="exec-section-title" style="font-size:0.8rem;border-bottom:none;margin-bottom:8px">${icon('book', 14)} Audit & Compliance Glossary</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(250px, 1fr));gap:15px;font-size:0.75rem;color:var(--text-secondary)">
            <div><strong>Inherent Risk:</strong> The natural level of risk before any controls are applied. (L × I)</div>
            <div><strong>Residual Risk:</strong> The remaining risk after controls are applied. (L × I × CE)</div>
            <div><strong>Control Effectiveness (CE):</strong> A multiplier (0.5 to 1.5) measuring how well controls mitigate risk.</div>
            <div><strong>Risk Appetite:</strong> The maximum level of residual risk the Board is willing to accept per domain.</div>
            <div><strong>Three Lines Model:</strong> 1st: Operations (Own risk), 2nd: Risk/Compliance (Monitor), 3rd: Internal Audit (Assure).</div>
            <div><strong>Attestation:</strong> Formal sign-off by C-Level (CEO/CFO) validating that internal controls are effective.</div>
        </div>
      </section>

    </div>
  `;
}

// Draw the 5x5 Grid
function renderHeatmapGrid(gridData = [], risksMap = []) {
    // gridData gives us inherent_zone and risks (IDs) per [impact, likelihood] cell.
    // 5 rows (Impact 5 down to 1), 5 cols (Likelihood 1 to 5)
    let gridHTML = '<div style="display:grid;grid-template-columns:30px repeat(5, 1fr);gap:4px">';
    
    // Header row (X-axis: Likelihood)
    gridHTML += '<div style="display:flex;align-items:end;justify-content:center;font-size:0.65rem;color:var(--text-secondary);transform:rotate(-90deg);translate:0px 60px">Impact</div>';
    [1, 2, 3, 4, 5].forEach(col => {
        gridHTML += `<div style="text-align:center;font-size:0.7rem;color:var(--text-secondary);padding-bottom:5px">L${col}</div>`;
    });

    for (let imp = 5; imp >= 1; imp--) {
        gridHTML += `<div style="display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:var(--text-secondary)">I${imp}</div>`; // Y-axis label
        for (let lik = 1; lik <= 5; lik++) {
            // Find cell
            const cellInfo = gridData.find(c => c.impact === imp && c.likelihood === lik) || { risks: [], inherent_zone: 'low' };
            const count = cellInfo.risks.length;
            
            // Define cell color based on inherent zone
            let bgColor = 'rgba(16,185,129,0.15)'; // Low
            let hoverBorder = '#10b981';
            let circleColor = '#10b981';
            
            if (cellInfo.inherent_zone === 'critical') { bgColor = 'rgba(239,68,68,0.15)'; hoverBorder = '#ef4444'; circleColor = '#ef4444'; }
            else if (cellInfo.inherent_zone === 'high') { bgColor = 'rgba(245,158,11,0.15)'; hoverBorder = '#f59e0b'; circleColor = '#f59e0b'; }
            else if (cellInfo.inherent_zone === 'medium') { bgColor = 'rgba(59,130,246,0.15)'; hoverBorder = '#3b82f6'; circleColor = '#3b82f6'; }

            // Tooltip generation
            let tooltip = `Impact: ${imp} | Likelihood: ${lik}&#10;`;
            if (count > 0) tooltip += cellInfo.risks.join(', ');

            gridHTML += `
                <div title="${tooltip}" style="aspect-ratio:1;background:${bgColor};border:1px solid rgba(255,255,255,0.05);border-radius:6px;display:flex;align-items:center;justify-content:center;position:relative;cursor:crosshair;transition:all 0.2s" onmouseover="this.style.borderColor='${hoverBorder}'" onmouseout="this.style.borderColor='rgba(255,255,255,0.05)'">
                    ${count > 0 ? `<div style="width:${Math.min(30 + count*8, 60)}%;aspect-ratio:1;background:${circleColor}99;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.8rem;color:#fff;box-shadow:0 0 10px ${circleColor}44">${count}</div>` : ''}
                </div>
            `;
        }
    }
    gridHTML += '<div></div><div style="grid-column: 2 / span 5;text-align:center;font-size:0.75rem;color:var(--text-secondary);padding-top:8px">Likelihood</div>';
    gridHTML += '</div>';
    return gridHTML;
}

function kpiCard(label, value, sub, color) {
  return `
    <div style="background:linear-gradient(135deg,${color}0a,transparent);border:1px solid ${color}20;border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:1.3rem;font-weight:800;color:${color}">${value}</div>
      <div style="font-size:0.68rem;font-weight:600;margin-top:4px">${label}</div>
      ${sub ? `<div style="font-size:0.6rem;opacity:0.5;margin-top:2px">${sub}</div>` : ''}
    </div>`;
}

async function loadData() {
    if (_loading) return;
    _loading = true;
    try {
        const [tl, gov, reg, hm, cm, ra, bd, ct, gap, mat] = await Promise.all([
            api.get('/hardening/ercm/three-lines').catch(() => ({})),
            api.get('/hardening/ercm/governance-bodies').catch(() => ({})),
            api.get('/hardening/ercm/risk-registry').catch(() => ({})),
            api.get('/hardening/ercm/heatmap').catch(() => ({})),
            api.get('/hardening/ercm/control-matrix').catch(() => ({})),
            api.get('/hardening/ercm/risk-appetite').catch(() => ({})),
            api.get('/hardening/ercm/board-dashboard').catch(() => ({})),
            api.get('/hardening/ercm/control-tests').catch(() => ({})),
            api.get('/hardening/ercm/ipo-gap').catch(() => ({})),
            api.get('/hardening/ercm/maturity').catch(() => ({}))
        ]);
        
        _data = { tl, gov, reg, hm, cm, ra, bd, ct, gap, mat };
        rerender();
    } catch (e) {
        console.error('[ERCM Heatmap]', e);
    } finally {
        _loading = false;
    }
}

window._attestControls = async function() {
    if(!confirm("By signing off, you attest that internal controls over operational and financial risk are operating effectively. Proceed?")) return;
    
    try {
        const res = await api.post('/hardening/ercm/attestation', { role: 'CEO', statement: 'I attest internal controls are effective for IPO standards.' });
        if(res.hash) {
            alert(`Sign-off successful!\\n\\nAudit Hash:\\n${res.hash}\\n\\nTimestamp: ${res.attested_at}`);
        } else {
            alert('Attestation recorded successfully.');
        }
    } catch(err) {
        alert('Failed to attest controls: ' + (err.message || 'Server error'));
    }
}

function rerender() {
  const el = document.getElementById('main-content');
  if (el) el.innerHTML = renderPage();
}

function loadingState() {
  return `<div class="exec-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Compiling Enterprise Risk matrix...</div></div></div>`;
}
