/**
 * Capital Command System — Executive Overview (CCS v1.0)
 * ═════════════════════════════════════════════════════════════
 * Layer 1: Capital Exposure Radar
 * Layer 4: Decision Command Center
 * Layer 5: Enterprise Value Snapshot
 * 
 * All data from PostgreSQL via org_id-scoped APIs.
 */
import { icon } from '../../core/icons.js';

let _exposure = null, _decisions = null, _valuation = null;
let _catData = [], _catPage = 1, _catSize = 10;
let _decData = [], _decPage = 1, _decSize = 5;

export function renderPage() {
  loadCCSData();
  return `
    <div class="exec-page ccs-page">
      <div class="exec-header">
        <h1>${icon('target', 28)} Capital Command System</h1>
        <div class="exec-timestamp">Live · ${new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</div>
      </div>
      <div id="ccs-overview-content">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px">
          <div class="spinner"></div>
          <div style="font-size:0.78rem;color:var(--text-muted)">Initializing Capital Command…</div>
        </div>
      </div>
    </div>
  `;
}

async function loadCCSData() {
  try {
    const API = window.API;
    [_exposure, _decisions, _valuation] = await Promise.all([
      API.get('/tenant/owner/ccs/exposure').catch(() => null),
      API.get('/tenant/owner/ccs/decisions').catch(() => null),
      API.get('/tenant/owner/ccs/valuation').catch(() => null),
    ]);
    renderCCS();
    // Populate category table after DOM is ready
    setTimeout(() => {
      _catData = (_exposure || {}).category_exposure || [];
      _catPage = 1;
      filterCategoryTable();
      // Build unified decision list
      const d = _decisions || {};
      _decData = [
        ...(d.strategic_alerts || []).map(a => ({ type: 'alert', severity: a.severity, title: a.title, meta: `${a.product || ''} · ${a.category || ''}`, action: a.action_required, time: a.time })),
        ...(d.compliance_actions || []).map(c => ({ type: 'compliance', severity: c.urgency || 'compliance', title: c.action, meta: `${c.product || ''} · ${c.framework || ''} · ${c.requirement || ''}`, action: null, time: c.days_until_review + 'd until review' })),
        ...(d.security_events || []).map(s => ({ type: 'security', severity: 'info', title: (s.action || '').replace(/_/g, ' '), meta: s.actor || 'system', action: null, time: s.time })),
      ];
      _decPage = 1;
      filterDecisionTable();
    }, 0);
  } catch (e) {
    console.error('[CCS] Load error:', e);
    const el = document.getElementById('ccs-overview-content');
    if (el) el.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444">Failed to load Capital Command data</div>';
  }
}

function renderCCS() {
  const el = document.getElementById('ccs-overview-content');
  if (!el) return;

  const exp = _exposure || {};
  const dec = _decisions || {};
  const val = _valuation || {};
  const exposure = exp.exposure || {};
  const scans = exp.scans_30d || {};
  const fraud = exp.fraud || {};
  const compliance = exp.compliance || {};
  const fin = val.financial_inputs || {};
  const gov = val.governance_maturity || {};
  const ev = val.valuation || {};
  const eff = val.efficiency || {};
  const summary = dec.summary || {};
  const configured = fin.configured;

  el.innerHTML = `
    ${!configured ? `
    <div class="ccs-config-banner">
      <div class="ccs-config-icon">${icon('settings', 20)}</div>
      <div>
        <strong>Configure Financial Inputs</strong>
        <div style="font-size:0.78rem;opacity:0.8;margin-top:2px">Set your Annual Revenue, EBITDA, and EV Multiple to unlock full Capital Intelligence</div>
      </div>
      <button onclick="document.getElementById('ccs-fin-modal').style.display='flex'" class="ccs-config-btn">Configure Now</button>
    </div>` : `
    <div class="ccs-config-banner" style="background:rgba(34,197,94,0.08);border-color:rgba(34,197,94,0.2)">
      <div class="ccs-config-icon" style="color:#22c55e">${icon('check', 20)}</div>
      <div>
        <strong style="color:#22c55e">Financial Inputs Configured</strong>
        <div style="font-size:0.78rem;opacity:0.8;margin-top:2px">Revenue: ${fmtMoney(fin.annual_revenue)} · EBITDA: ${fmtMoney(fin.ebitda)} · EV Multiple: ${fin.base_multiple}x</div>
      </div>
      <button onclick="document.getElementById('ccs-fin-modal').style.display='flex'" class="ccs-config-btn" style="background:rgba(99,102,241,0.15);border-color:rgba(99,102,241,0.3)">${icon('edit', 14)} Edit</button>
    </div>`}

    <!-- LAYER 1: Capital Exposure Radar -->
    <section class="exec-section">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h2 class="exec-section-title" style="margin:0">${icon('target', 20)} Capital Exposure Radar ${exp.per_bu && exp.per_bu.length > 0 ? '<span style="font-size:0.65rem;opacity:0.6;font-weight:400">Group Overview · ERQF</span>' : '<span style="font-size:0.65rem;opacity:0.6;font-weight:400">ERQF Engine</span>'}</h2>
        <div style="display:flex;gap:0.5rem;align-items:center">
          ${exp.per_bu && exp.per_bu.length > 0 ? `
          <button onclick="openBUConfigModal()" class="ccs-config-btn" style="padding:4px 10px;font-size:0.7rem;background:rgba(99,102,241,0.15);border-color:rgba(99,102,241,0.3)">${icon('settings', 12)} Edit BUs</button>
          <button onclick="document.getElementById('ccs-bu-detail').style.display=document.getElementById('ccs-bu-detail').style.display==='none'?'block':'none';this.textContent=document.getElementById('ccs-bu-detail').style.display==='none'?'▸ Show per BU':'▾ Hide per BU'" class="ccs-config-btn" style="padding:4px 12px;font-size:0.72rem;background:rgba(99,102,241,0.12);border-color:rgba(99,102,241,0.25)">▾ Hide per BU</button>
          ` : `
          <button onclick="openBUConfigModal()" class="ccs-config-btn" style="padding:4px 10px;font-size:0.7rem;background:rgba(99,102,241,0.1);border-color:rgba(99,102,241,0.2)">${icon('layers', 12)} Setup Multi-BU</button>
          `}
        </div>
      </div>

      <!-- Group-level KPI cards (always visible) -->
      <div class="ccs-kpi-row" style="margin-top:0.75rem">
        ${exposureCard('Total Capital at Risk', fmtMoney(exposure.total_capital_at_risk), 'ERL + EBI + RFE − Diversification', exposure.total_capital_at_risk > 0 ? 'red' : 'green')}
        ${exposureCard('Expected Revenue Loss', fmtMoney(exposure.expected_revenue_loss), `P(Fraud): ${exposure.fraud_probability || 0}% · Coverage: ${exposure.coverage_ratio || 100}%`, exposure.expected_revenue_loss > 0 ? 'orange' : 'green')}
        ${exposureCard('Expected Brand Impact', fmtMoney(exposure.expected_brand_impact), `BRF: ${exposure.brand_risk_factor || 0} · Escalation: ${((exposure.incident_escalation || 0) * 100).toFixed(1)}%`, exposure.expected_brand_impact > 0 ? 'orange' : 'green')}
        ${exposureCard('Regulatory Exposure', fmtMoney(exposure.regulatory_exposure), `WCRS: ${exposure.compliance_wcrs || 0} · ${compliance.compliant || 0}/${compliance.total || 0}`, exposure.regulatory_exposure > 0 ? 'red' : 'green')}
        ${exposureCard('Supply Chain SCRI', (exposure.supply_chain_scri || 0).toFixed(3), `${exp.supply_chain?.events || 0} events · ${exp.supply_chain?.scri > 0.3 ? 'High Risk' : 'Normal'}`, exposure.supply_chain_scri > 0.3 ? 'red' : 'green')}
      </div>

      <!-- ERQF Scenario Table -->
      ${exp.scenarios ? `
      <div class="exec-card" style="margin-top:0.75rem">
        <h3>${icon('barChart', 18)} Scenario Analysis (ERQF)</h3>
        <table class="ccs-table" style="font-size:0.78rem">
          <thead><tr><th>Scenario</th><th>Exp. Revenue Loss</th><th>Exp. Brand Impact</th><th>Regulatory</th><th style="font-weight:700">Total Capital at Risk</th></tr></thead>
          <tbody>
            <tr style="color:#22c55e"><td>🟢 Best Case</td><td>${fmtMoney(exp.scenarios.best?.erl)}</td><td>${fmtMoney(exp.scenarios.best?.ebi)}</td><td>${fmtMoney(exp.scenarios.best?.rfe)}</td><td><strong>${fmtMoney(exp.scenarios.best?.tcar)}</strong></td></tr>
            <tr><td>🔵 Base Case</td><td>${fmtMoney(exp.scenarios.base?.erl)}</td><td>${fmtMoney(exp.scenarios.base?.ebi)}</td><td>${fmtMoney(exp.scenarios.base?.rfe)}</td><td><strong>${fmtMoney(exp.scenarios.base?.tcar)}</strong></td></tr>
            <tr style="color:#ef4444"><td>🔴 Stress Test</td><td>${fmtMoney(exp.scenarios.stress?.erl)}</td><td>${fmtMoney(exp.scenarios.stress?.ebi)}</td><td>${fmtMoney(exp.scenarios.stress?.rfe)}</td><td><strong>${fmtMoney(exp.scenarios.stress?.tcar)}</strong></td></tr>
          </tbody>
        </table>
      </div>` : ''}

      ${exp.per_bu && exp.per_bu.length > 0 ? `
      <!-- ═══ Per-BU Detail View (collapsible) ═══ -->
      <div id="ccs-bu-detail" style="margin-top:1rem">

        <!-- Group Aggregation Summary -->
        <div class="exec-card" style="margin-bottom:1rem;border:none;border-left:3px solid #6366f1">
          <h3 style="margin-bottom:0.5rem">${icon('layers', 18)} Group Aggregation Summary
            <span style="font-size:0.62rem;opacity:0.5;margin-left:6px;font-weight:400">${exp.group_aggregated?.brand_architecture === 'branded_house' ? '🏢 Branded House' : '🏘️ House of Brands'} · ρ=${exp.group_aggregated?.cross_bu_correlation || 0.3}${exp.group_aggregated?.brand_architecture === 'branded_house' ? ' · γ=' + (exp.group_aggregated?.contagion_factor || 0) : ''}</span>
          </h3>
          <table class="ccs-table" style="font-size:0.75rem">
            <thead><tr>
              <th>Business Unit</th><th>β</th><th>k</th><th>Weight</th><th>Scans</th><th>P(Fraud)</th>
              <th>ERL</th><th>EBI</th><th>RFE</th><th style="font-weight:700">TCAR</th>
            </tr></thead>
            <tbody>
              ${exp.per_bu.map(bu => `<tr>
                <td><strong>${bu.name}</strong></td>
                <td>${bu.beta}</td><td>${bu.k}</td>
                <td>${Math.round((bu.revenue_weight || 0) * 100)}%</td>
                <td>${bu.scans.toLocaleString()}</td>
                <td>${bu.p_fraud}%</td>
                <td>${fmtMoney(bu.erl)}</td><td>${fmtMoney(bu.ebi)}</td><td>${fmtMoney(bu.rfe)}</td>
                <td><strong>${fmtMoney(bu.tcar)}</strong></td>
              </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top:2px solid var(--border-color,rgba(255,255,255,0.15));font-weight:600">
                <td colspan="6">Group Total</td>
                <td>${fmtMoney(exp.group_aggregated?.erl)}</td>
                <td>${fmtMoney(exp.group_aggregated?.ebi)}</td>
                <td>${fmtMoney(exp.group_aggregated?.rfe)}</td>
                <td><strong>${fmtMoney(exp.group_aggregated?.tcar)}</strong></td>
              </tr>
              ${exp.group_aggregated?.diversification_discount > 0 ? `<tr style="color:#22c55e;font-size:0.7rem">
                <td colspan="9">↳ Diversification Discount (ρ=${exp.group_aggregated.cross_bu_correlation})</td>
                <td>−${fmtMoney(exp.group_aggregated.diversification_discount)}</td>
              </tr>` : ''}
              ${exp.group_aggregated?.contagion_adjustment > 0 ? `<tr style="color:#ef4444;font-size:0.7rem">
                <td colspan="8">↳ Brand Contagion (γ=${exp.group_aggregated.contagion_factor})</td>
                <td>+${fmtMoney(exp.group_aggregated.contagion_adjustment)}</td><td></td>
              </tr>` : ''}
            </tfoot>
          </table>
        </div>

        <!-- Individual BU Exposure Cards -->
        ${exp.per_bu.map(bu => `
        <div class="exec-card" style="margin-bottom:0.75rem;border:none;border-left:3px solid ${bu.p_fraud > 4 ? '#ef4444' : bu.p_fraud > 2 ? '#f59e0b' : '#22c55e'}">
          <h3 style="margin-bottom:0.5rem">${bu.name}
            <span style="font-size:0.62rem;opacity:0.5;font-weight:400;margin-left:6px">β=${bu.beta} · k=${bu.k} · Fine=$${(bu.avg_fine || 0).toLocaleString()} · ${Math.round((bu.revenue_weight || 0) * 100)}% revenue</span>
          </h3>
          <div style="font-size:0.68rem;opacity:0.45;margin-bottom:0.5rem">${(bu.categories || []).join(' · ')}</div>
          <div class="ccs-kpi-row">
            ${exposureCard('TCAR', fmtMoney(bu.tcar), 'Total Capital at Risk', bu.tcar > 0 ? 'red' : 'green')}
            ${exposureCard('ERL', fmtMoney(bu.erl), `P(Fraud): ${bu.p_fraud}%`, bu.erl > 0 ? 'orange' : 'green')}
            ${exposureCard('EBI', fmtMoney(bu.ebi), `β=${bu.beta} · Trust: ${bu.trust_score}`, bu.ebi > 0 ? 'orange' : 'green')}
            ${exposureCard('RFE', fmtMoney(bu.rfe), `Fine: $${(bu.avg_fine || 0).toLocaleString()}`, bu.rfe > 0 ? 'red' : 'green')}
          </div>
        </div>`).join('')}
      </div>
      ` : ''}
      
      <div class="exec-grid-2" style="margin-top:1rem">
        <!-- Scan Integrity -->
        <div class="exec-card">
          <h3>${icon('barChart', 18)} Scan Intelligence (30d)</h3>
          <div class="ccs-metric-grid">
            <div class="ccs-metric">
              <div class="ccs-metric-value">${(scans.total || 0).toLocaleString()}</div>
              <div class="ccs-metric-label">Total Scans</div>
              <div class="ccs-metric-trend ${scans.trend >= 0 ? 'ccs-trend-up' : 'ccs-trend-down'}">${scans.trend >= 0 ? '↑' : '↓'} ${Math.abs(scans.trend || 0)}%</div>
            </div>
            <div class="ccs-metric">
              <div class="ccs-metric-value" style="color:#22c55e">${scans.authentic || 0}</div>
              <div class="ccs-metric-label">Authentic</div>
            </div>
            <div class="ccs-metric">
              <div class="ccs-metric-value" style="color:#f59e0b">${scans.suspicious || 0}</div>
              <div class="ccs-metric-label">Suspicious</div>
            </div>
            <div class="ccs-metric">
              <div class="ccs-metric-value" style="color:#ef4444">${scans.counterfeit || 0}</div>
              <div class="ccs-metric-label">Counterfeit</div>
            </div>
          </div>
        </div>
        
        <!-- Fraud Exposure -->
        <div class="exec-card">
          <h3>${icon('alertTriangle', 18)} Fraud Exposure</h3>
          <div class="ccs-metric-grid">
            <div class="ccs-metric">
              <div class="ccs-metric-value" style="color:#ef4444">${fraud.open || 0}</div>
              <div class="ccs-metric-label">Open Alerts</div>
            </div>
            <div class="ccs-metric">
              <div class="ccs-metric-value" style="color:#dc2626">${fraud.critical || 0}</div>
              <div class="ccs-metric-label">Critical</div>
            </div>
            <div class="ccs-metric">
              <div class="ccs-metric-value" style="color:#f59e0b">${fraud.high || 0}</div>
              <div class="ccs-metric-label">High</div>
            </div>
            <div class="ccs-metric">
              <div class="ccs-metric-value">${fraud.total || 0}</div>
              <div class="ccs-metric-label">Total</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Geo Risk + Category -->
      <div class="exec-grid-2" style="margin-top:0.75rem">
        <div class="exec-card">
          <h3>${icon('globe', 18)} Geographic Risk Map</h3>
          ${(exp.geo_risk || []).length > 0 ? `
          <table class="ccs-table">
            <thead><tr><th>Country</th><th>Scans</th><th>Flagged</th><th>Fraud %</th><th>Risk</th></tr></thead>
            <tbody>
              ${(exp.geo_risk || []).map(g => `
                <tr>
                  <td><strong>${g.country || '—'}</strong></td>
                  <td>${g.scans}</td>
                  <td>${g.flagged}</td>
                  <td>${g.fraud_rate}%</td>
                  <td><span class="ccs-risk-badge ccs-risk-${g.risk_level}">${g.risk_level}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>` : '<div style="color:var(--text-muted);padding:1rem;text-align:center">No geographic scan data in last 30 days</div>'}
        </div>
        <div class="exec-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem">
            <h3 style="margin:0">${icon('products', 18)} Category Exposure</h3>
            <div style="display:flex;gap:0.5rem;align-items:center">
              <input type="text" id="ccs-cat-search" placeholder="Search category..."
                     oninput="filterCategoryTable()"
                     style="padding:6px 10px;border-radius:6px;border:1px solid var(--border-color, rgba(255,255,255,0.1));background:var(--input-bg, rgba(255,255,255,0.05));color:var(--text-primary, #e2e8f0);font-size:0.78rem;width:160px">
              <select id="ccs-cat-pagesize" onchange="filterCategoryTable(true)"
                      style="padding:6px 8px;border-radius:6px;border:1px solid var(--border-color, rgba(255,255,255,0.1));background:var(--input-bg, rgba(255,255,255,0.05));color:var(--text-primary, #e2e8f0);font-size:0.78rem">
                <option value="10">10 / page</option>
                <option value="20">20 / page</option>
                <option value="50">50 / page</option>
              </select>
            </div>
          </div>
          ${(exp.category_exposure || []).length > 0 ? `
          <table class="ccs-table">
            <thead><tr><th>Category</th><th>Products</th><th>Scans</th><th>Suspicious</th><th>Risk %</th></tr></thead>
            <tbody id="ccs-cat-tbody"></tbody>
          </table>
          <div id="ccs-cat-pager" style="display:flex;justify-content:space-between;align-items:center;margin-top:0.5rem;font-size:0.78rem;color:var(--text-secondary)"></div>
          ` : '<div style="color:var(--text-muted);padding:1rem;text-align:center">No scan data by category</div>'}
        </div>
      </div>
    </section>

    <!-- LAYER 4: Decision Command Center -->
    <section class="exec-section">
      <h2 class="exec-section-title">${icon('zap', 20)} Decision Command Center</h2>
      <div class="ccs-decision-summary">
        <span class="ccs-dec-chip ccs-dec-critical">${summary.critical || 0} Critical</span>
        <span class="ccs-dec-chip ccs-dec-high">${summary.high || 0} High</span>
        <span class="ccs-dec-chip ccs-dec-compliance">${summary.compliance_urgent || 0} Compliance Urgent</span>
        <span class="ccs-dec-chip ccs-dec-total">${summary.total_decisions || 0} Total Actions</span>
      </div>
      <div style="display:flex;gap:0.5rem;align-items:center;margin:0.75rem 0;flex-wrap:wrap">
        <input type="text" id="ccs-dec-search" placeholder="Search decisions..."
               oninput="filterDecisionTable()"
               style="padding:6px 10px;border-radius:6px;border:1px solid var(--border-color, rgba(255,255,255,0.1));background:var(--input-bg, rgba(255,255,255,0.05));color:var(--text-primary, #e2e8f0);font-size:0.78rem;width:180px;flex-shrink:0">
        <select id="ccs-dec-severity" onchange="filterDecisionTable(true)"
                style="padding:6px 8px;border-radius:6px;border:1px solid var(--border-color, rgba(255,255,255,0.1));background:var(--input-bg, rgba(255,255,255,0.05));color:var(--text-primary, #e2e8f0);font-size:0.78rem">
          <option value="">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="compliance">Compliance</option>
          <option value="info">Info</option>
        </select>
        <select id="ccs-dec-pagesize" onchange="filterDecisionTable(true)"
                style="padding:6px 8px;border-radius:6px;border:1px solid var(--border-color, rgba(255,255,255,0.1));background:var(--input-bg, rgba(255,255,255,0.05));color:var(--text-primary, #e2e8f0);font-size:0.78rem">
          <option value="5" selected>5 / page</option>
          <option value="10">10 / page</option>
          <option value="20">20 / page</option>
          <option value="50">50 / page</option>
        </select>
      </div>
      <div id="ccs-dec-container"></div>
      <div id="ccs-dec-pager" style="display:flex;justify-content:space-between;align-items:center;margin-top:0.5rem;font-size:0.78rem;color:var(--text-secondary)"></div>
    </section>

    <!-- LAYER 5: Enterprise Value Snapshot -->
    <section class="exec-section">
      <h2 class="exec-section-title">${icon('star', 20)} Enterprise Value Monitor</h2>
      ${configured ? `
      <div class="ccs-ev-grid">
        <div class="ccs-ev-card ccs-ev-baseline">
          <div class="ccs-ev-label">EV Baseline</div>
          <div class="ccs-ev-value">${fmtMoney(ev.ev_baseline)}</div>
          <div class="ccs-ev-sub">EBITDA ${fmtMoney(fin.ebitda)} × ${fin.base_multiple}x</div>
        </div>
        <div class="ccs-ev-card ccs-ev-adjusted">
          <div class="ccs-ev-label">EV with Governance</div>
          <div class="ccs-ev-value">${fmtMoney(ev.ev_with_governance)}</div>
          <div class="ccs-ev-sub">Adjusted multiple: ${ev.adjusted_multiple}x</div>
        </div>
        <div class="ccs-ev-card ccs-ev-uplift">
          <div class="ccs-ev-label">EV Uplift</div>
          <div class="ccs-ev-value">${ev.ev_uplift >= 0 ? '+' : ''}${fmtMoney(ev.ev_uplift)}</div>
          <div class="ccs-ev-sub">Governance premium: ${((gov.premium_multiplier || 1) * 100 - 100).toFixed(1)}%</div>
        </div>
        <div class="ccs-ev-card ccs-ev-rar">
          <div class="ccs-ev-label">Risk-Adjusted Revenue</div>
          <div class="ccs-ev-value">${fmtMoney(ev.risk_adjusted_revenue)}</div>
          <div class="ccs-ev-sub">Revenue protection: ${fmtMoney(ev.revenue_protection)}</div>
        </div>
      </div>

      <!-- Governance Maturity Breakdown -->
      <div class="exec-card" style="margin-top:1rem">
        <h3>${icon('shield', 18)} Governance Maturity Score: <span style="color:${gov.score >= 70 ? '#22c55e' : gov.score >= 40 ? '#f59e0b' : '#ef4444'};font-size:1.3rem">${gov.score || 0}/100</span></h3>
        <div class="ccs-gov-bars">
          ${Object.entries(gov.breakdown || {}).map(([k, v]) => `
            <div class="ccs-gov-bar-row">
              <div class="ccs-gov-bar-label">${k.replace(/_/g, ' ')}</div>
              <div class="ccs-gov-bar-track">
                <div class="ccs-gov-bar-fill" style="width:${v}%;background:${v >= 70 ? '#22c55e' : v >= 40 ? '#f59e0b' : '#ef4444'}"></div>
              </div>
              <div class="ccs-gov-bar-pct">${v}%</div>
            </div>
          `).join('')}
        </div>
      </div>

      ${eff.roi > 0 ? `
      <div class="exec-card" style="margin-top:0.75rem">
        <h3>${icon('creditCard', 18)} Capital Efficiency</h3>
        <div class="ccs-metric-grid">
          <div class="ccs-metric">
            <div class="ccs-metric-value">${fmtMoney(eff.platform_cost)}</div>
            <div class="ccs-metric-label">Platform Investment</div>
          </div>
          <div class="ccs-metric">
              <div class="ccs-metric-value" style="color:#22c55e">${fmtMoney(eff.ev_uplift)}</div>
            <div class="ccs-metric-label">EV Uplift</div>
          </div>
          <div class="ccs-metric">
              <div class="ccs-metric-value" style="color:#6366f1">${eff.roi}x</div>
            <div class="ccs-metric-label">ROI</div>
          </div>
          <div class="ccs-metric">
            <div class="ccs-metric-value">${eff.payback_months}mo</div>
            <div class="ccs-metric-label">Payback Period</div>
          </div>
        </div>
      </div>` : ''}
      ` : `
      <div class="ccs-ev-unconfigured">
        <div style="font-size:2rem;margin-bottom:0.5rem">${icon('settings', 40)}</div>
        <h3>Financial Inputs Required</h3>
        <p>Enter your Annual Revenue, EBITDA, and EV Multiple to unlock Enterprise Value intelligence.</p>
        <button onclick="document.getElementById('ccs-fin-modal').style.display='flex'" class="ccs-config-btn" style="margin-top:1rem">Configure Financial Inputs</button>
      </div>`}
    </section>

    <!-- Financial Config Modal -->
    <div id="ccs-fin-modal" class="ccs-modal" style="display:none">
      <div class="ccs-modal-content">
        <div class="ccs-modal-header">
          <h3>${icon('settings', 20)} Financial Configuration</h3>
          <button onclick="document.getElementById('ccs-fin-modal').style.display='none'" class="ccs-modal-close">&times;</button>
        </div>
        <div class="ccs-modal-body" style="max-height:60vh;overflow-y:auto">
          <div style="font-size:0.7rem;opacity:0.6;margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:1px">Core Financial Inputs</div>
          <label>Annual Revenue (USD)</label>
          <input type="number" id="ccs-fin-revenue" value="${fin.annual_revenue || ''}" placeholder="e.g. 50000000">
          <label>EBITDA (USD)</label>
          <input type="number" id="ccs-fin-ebitda" value="${fin.ebitda || ''}" placeholder="e.g. 10000000">
          <label>EV Multiple</label>
          <input type="number" id="ccs-fin-multiple" value="${fin.base_multiple || 8}" step="0.5" placeholder="e.g. 10">
          <label>Brand Value Estimate (USD)</label>
          <input type="number" id="ccs-fin-brand" value="${fin.brand_value || ''}" placeholder="e.g. 15000000">

          <div style="font-size:0.7rem;opacity:0.6;margin:1rem 0 0.75rem;text-transform:uppercase;letter-spacing:1px;border-top:1px solid rgba(255,255,255,0.1);padding-top:0.75rem">ERQF Risk Parameters</div>
          <label>Industry Default Preset <span style="font-size:0.68rem;opacity:0.5;font-weight:400">(sets default β, k, fine — override below)</span></label>
          <select id="ccs-fin-industry" onchange="window._fillERQFDefaults && window._fillERQFDefaults()" style="padding:8px;border-radius:6px;border:1px solid var(--border-color,rgba(255,255,255,0.1));background:var(--input-bg,rgba(255,255,255,0.05));color:var(--text-primary,#e2e8f0);font-size:0.85rem">
            <option value="pharmaceutical" ${(fin.industry_type || 'pharmaceutical') === 'pharmaceutical' ? 'selected' : ''}>Pharmaceutical (β=1.8, k=3.0, $50K fine)</option>
            <option value="luxury" ${fin.industry_type === 'luxury' ? 'selected' : ''}>Luxury (β=2.5, k=4.0, $30K fine)</option>
            <option value="fmcg" ${fin.industry_type === 'fmcg' ? 'selected' : ''}>FMCG (β=1.2, k=2.0, $15K fine)</option>
            <option value="electronics" ${fin.industry_type === 'electronics' ? 'selected' : ''}>Electronics (β=1.5, k=2.5, $25K fine)</option>
            <option value="automotive" ${fin.industry_type === 'automotive' ? 'selected' : ''}>Automotive (β=2.0, k=3.5, $40K fine)</option>
          </select>
          <label>Estimated Units Sold (YTD)</label>
          <input type="number" id="ccs-fin-units" value="${fin.estimated_units_ytd || ''}" placeholder="e.g. 500000 · Leave blank for auto">
          <label>Manual Cost per Check (USD)</label>
          <input type="number" id="ccs-fin-manual-cost" value="${fin.manual_cost_per_check || 5}" step="0.5" placeholder="e.g. 5">
          <label>Fraud Recovery Rate (0-1)</label>
          <input type="number" id="ccs-fin-recovery" value="${fin.recovery_rate || 0.2}" step="0.05" min="0" max="1" placeholder="e.g. 0.2">

          <div style="font-size:0.7rem;opacity:0.6;margin:1rem 0 0.75rem;text-transform:uppercase;letter-spacing:1px;border-top:1px solid rgba(255,255,255,0.1);padding-top:0.75rem">Advanced — ERQF Coefficients <span style="opacity:0.5">(0 = use industry default)</span></div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem">
            <div>
              <label style="font-size:0.75rem">β Brand Sensitivity</label>
              <input type="number" id="ccs-fin-beta" value="${fin.custom_beta || ''}" step="0.1" min="0" max="5" placeholder="auto" style="font-size:0.85rem">
            </div>
            <div>
              <label style="font-size:0.75rem">k Escalation Rate</label>
              <input type="number" id="ccs-fin-k" value="${fin.custom_k || ''}" step="0.5" min="0" max="10" placeholder="auto" style="font-size:0.85rem">
            </div>
            <div>
              <label style="font-size:0.75rem">Avg Fine/Violation ($)</label>
              <input type="number" id="ccs-fin-avgfine" value="${fin.custom_avg_fine || ''}" step="1000" min="0" placeholder="auto" style="font-size:0.85rem">
            </div>
          </div>
          <div style="font-size:0.68rem;opacity:0.4;margin-top:0.3rem">Leave blank or 0 to use industry defaults. Custom values override presets.</div>
        </div>
        <div class="ccs-modal-footer">
          <button onclick="document.getElementById('ccs-fin-modal').style.display='none'" class="ccs-btn-secondary">Cancel</button>
          <button onclick="saveCCSFinancials()" class="ccs-btn-primary">Save & Recalculate</button>
        </div>
      </div>
    </div>
  `;
}

window.saveCCSFinancials = async function () {
  const API = window.API;
  const body = {
    annual_revenue: Number(document.getElementById('ccs-fin-revenue')?.value || 0),
    ebitda: Number(document.getElementById('ccs-fin-ebitda')?.value || 0),
    ev_multiple: Number(document.getElementById('ccs-fin-multiple')?.value || 8),
    brand_value_estimate: Number(document.getElementById('ccs-fin-brand')?.value || 0),
    industry_type: document.getElementById('ccs-fin-industry')?.value || 'pharmaceutical',
    estimated_units_ytd: Number(document.getElementById('ccs-fin-units')?.value || 0),
    manual_cost_per_check: Number(document.getElementById('ccs-fin-manual-cost')?.value || 5),
    recovery_rate: Number(document.getElementById('ccs-fin-recovery')?.value || 0.2),
    custom_beta: Number(document.getElementById('ccs-fin-beta')?.value || 0),
    custom_k: Number(document.getElementById('ccs-fin-k')?.value || 0),
    custom_avg_fine: Number(document.getElementById('ccs-fin-avgfine')?.value || 0),
  };
  try {
    await API.patch('/tenant/owner/org-financials', body);
    document.getElementById('ccs-fin-modal').style.display = 'none';
    loadCCSData(); // Refresh all data
  } catch (e) {
    alert('Failed to save financial configuration');
  }
};

// Auto-fill ERQF defaults when industry changes
window._fillERQFDefaults = function () {
  const presets = {
    pharmaceutical: { beta: 1.8, k: 3.0, avgFine: 50000 },
    luxury: { beta: 2.5, k: 4.0, avgFine: 30000 },
    fmcg: { beta: 1.2, k: 2.0, avgFine: 15000 },
    electronics: { beta: 1.5, k: 2.5, avgFine: 25000 },
    automotive: { beta: 2.0, k: 3.5, avgFine: 40000 },
  };
  const sel = document.getElementById('ccs-fin-industry')?.value || 'pharmaceutical';
  const p = presets[sel] || presets.pharmaceutical;
  const betaEl = document.getElementById('ccs-fin-beta');
  const kEl = document.getElementById('ccs-fin-k');
  const fineEl = document.getElementById('ccs-fin-avgfine');
  if (betaEl) betaEl.placeholder = p.beta;
  if (kEl) kEl.placeholder = p.k;
  if (fineEl) fineEl.placeholder = p.avgFine;
};

// ── Business Unit Config Modal ────────────────────────────────────────────────
window._buCategories = []; // available categories from API
window._buRows = [];       // current BU rows

window.openBUConfigModal = async function () {
  try {
    const API = window.API;
    const res = await API.get('/tenant/owner/ccs/bu-config');
    window._buCategories = res.available_categories || [];
    const cfg = res.bu_config || {};
    window._buRows = cfg.business_units && cfg.business_units.length > 0
      ? JSON.parse(JSON.stringify(cfg.business_units))
      : [{ id: 'bu_1', name: 'Division 1', categories: [], beta: 1.5, k: 2.5, avg_fine: 25000, revenue_weight: 0.5 }];

    // Create or show modal
    let modal = document.getElementById('ccs-bu-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ccs-bu-modal';
      modal.className = 'ccs-modal-overlay';
      document.body.appendChild(modal);
    }
    window._buBrandArch = cfg.brand_architecture || 'house_of_brands';
    window._buContagion = cfg.contagion_factor || 0.15;
    window._buCorrelation = cfg.cross_bu_correlation || 0.3;
    window._renderBUModal();
    modal.style.display = 'flex';
  } catch (e) {
    alert('Failed to load BU config');
  }
};

window._renderBUModal = function () {
  const modal = document.getElementById('ccs-bu-modal');
  if (!modal) return;
  const cats = window._buCategories;
  const rows = window._buRows;

  // Find which categories are already assigned
  const assigned = new Set();
  rows.forEach(r => (r.categories || []).forEach(c => assigned.add(c)));

  modal.innerHTML = `
    <div class="ccs-modal" style="max-width:900px;max-height:90vh;overflow-y:auto">
      <div class="ccs-modal-header">
        <h3>🏢 Business Unit Configuration</h3>
        <button onclick="document.getElementById('ccs-bu-modal').style.display='none'" class="ccs-modal-close">✕</button>
      </div>
      <div class="ccs-modal-body" style="max-height:65vh;overflow-y:auto">
        <!-- Brand Architecture Toggle -->
        <div style="display:flex;gap:1rem;margin-bottom:1rem;padding:0.75rem;background:rgba(99,102,241,0.06);border-radius:8px">
          <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer">
            <input type="radio" name="bu-arch" value="house_of_brands" ${window._buBrandArch !== 'branded_house' ? 'checked' : ''} onchange="window._buBrandArch=this.value;window._renderBUModal()"> 🏘️ House of Brands
          </label>
          <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer">
            <input type="radio" name="bu-arch" value="branded_house" ${window._buBrandArch === 'branded_house' ? 'checked' : ''} onchange="window._buBrandArch=this.value;window._renderBUModal()"> 🏢 Branded House
          </label>
          <span style="font-size:0.7rem;opacity:0.5;margin-left:auto">${window._buBrandArch === 'branded_house' ? 'Risk spills across BUs (Samsung, Vingroup)' : 'Risk is isolated per BU (P&G, Unilever)'}</span>
        </div>

        ${window._buBrandArch === 'branded_house' ? `
        <div style="display:flex;gap:1rem;margin-bottom:1rem">
          <div style="flex:1">
            <label style="font-size:0.75rem">γ Contagion Factor (0.0 - 0.5)</label>
            <input type="range" id="bu-contagion" min="0" max="0.5" step="0.05" value="${window._buContagion}" oninput="window._buContagion=Number(this.value);document.getElementById('bu-contagion-val').textContent=this.value" style="width:100%">
            <span id="bu-contagion-val" style="font-size:0.75rem;opacity:0.7">${window._buContagion}</span>
          </div>
          <div style="flex:1">
            <label style="font-size:0.75rem">ρ Cross-BU Correlation (0.0 - 1.0)</label>
            <input type="range" id="bu-correlation" min="0" max="1" step="0.05" value="${window._buCorrelation}" oninput="window._buCorrelation=Number(this.value);document.getElementById('bu-correlation-val').textContent=this.value" style="width:100%">
            <span id="bu-correlation-val" style="font-size:0.75rem;opacity:0.7">${window._buCorrelation}</span>
          </div>
        </div>` : `
        <div style="margin-bottom:1rem">
          <label style="font-size:0.75rem">ρ Cross-BU Correlation (0.0 - 1.0)</label>
          <input type="range" id="bu-correlation" min="0" max="1" step="0.05" value="${window._buCorrelation}" oninput="window._buCorrelation=Number(this.value);document.getElementById('bu-correlation-val').textContent=this.value" style="width:100%">
          <span id="bu-correlation-val" style="font-size:0.75rem;opacity:0.7">${window._buCorrelation}</span>
        </div>`}

        <!-- BU Rows -->
        ${rows.map((bu, idx) => `
        <div style="border:1px solid var(--border-color,rgba(255,255,255,0.1));border-radius:8px;padding:0.75rem;margin-bottom:0.75rem;background:rgba(255,255,255,0.02)">
          <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;align-items:center">
            <input type="text" value="${bu.name || ''}" onchange="window._buRows[${idx}].name=this.value" placeholder="BU Name" style="flex:2;padding:6px;border-radius:4px;border:1px solid var(--border-color,rgba(255,255,255,0.1));background:var(--input-bg,rgba(255,255,255,0.05));color:var(--text-primary,#e2e8f0)">
            <div style="display:flex;gap:0.3rem;flex:1">
              <input type="number" value="${bu.beta || 1.5}" onchange="window._buRows[${idx}].beta=Number(this.value)" step="0.1" min="0.5" max="5" style="width:55px;padding:4px;font-size:0.8rem;border-radius:4px;border:1px solid var(--border-color,rgba(255,255,255,0.1));background:var(--input-bg,rgba(255,255,255,0.05));color:var(--text-primary,#e2e8f0)" title="β">
              <input type="number" value="${bu.k || 2.5}" onchange="window._buRows[${idx}].k=Number(this.value)" step="0.5" min="0.5" max="10" style="width:55px;padding:4px;font-size:0.8rem;border-radius:4px;border:1px solid var(--border-color,rgba(255,255,255,0.1));background:var(--input-bg,rgba(255,255,255,0.05));color:var(--text-primary,#e2e8f0)" title="k">
              <input type="number" value="${bu.avg_fine || 25000}" onchange="window._buRows[${idx}].avg_fine=Number(this.value)" step="5000" min="0" style="width:70px;padding:4px;font-size:0.8rem;border-radius:4px;border:1px solid var(--border-color,rgba(255,255,255,0.1));background:var(--input-bg,rgba(255,255,255,0.05));color:var(--text-primary,#e2e8f0)" title="Avg Fine">
            </div>
            <div style="width:80px">
              <input type="number" value="${Math.round((bu.revenue_weight || 0) * 100)}" onchange="window._buRows[${idx}].revenue_weight=Number(this.value)/100" min="0" max="100" step="5" style="width:50px;padding:4px;font-size:0.8rem;border-radius:4px;border:1px solid var(--border-color,rgba(255,255,255,0.1));background:var(--input-bg,rgba(255,255,255,0.05));color:var(--text-primary,#e2e8f0)"><span style="font-size:0.75rem;opacity:0.6"> %</span>
            </div>
            ${rows.length > 1 ? `<button onclick="window._buRows.splice(${idx},1);window._renderBUModal()" style="background:#ef4444;color:white;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:0.75rem">✕</button>` : ''}
          </div>
          <div style="font-size:0.7rem;opacity:0.5;margin-bottom:4px">β=${bu.beta || 1.5} · k=${bu.k || 2.5} · Fine=$${(bu.avg_fine || 25000).toLocaleString()} · Weight=${Math.round((bu.revenue_weight || 0) * 100)}%</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${cats.map(c => {
    const isSelected = (bu.categories || []).includes(c);
    const isUsedElsewhere = !isSelected && assigned.has(c);
    return `<button onclick="window._toggleBUCat(${idx},'${c.replace(/'/g, "\\'")}')" style="
                padding:2px 8px;border-radius:12px;font-size:0.7rem;cursor:${isUsedElsewhere ? 'not-allowed' : 'pointer'};border:1px solid;
                ${isSelected ? 'background:rgba(99,102,241,0.3);border-color:rgba(99,102,241,0.5);color:#818cf8' : isUsedElsewhere ? 'background:rgba(255,255,255,0.02);border-color:rgba(255,255,255,0.05);color:rgba(255,255,255,0.2)' : 'background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1);color:var(--text-primary,#e2e8f0)'}
              " ${isUsedElsewhere ? 'disabled title="Assigned to another BU"' : ''}>${c}</button>`;
  }).join('')}
          </div>
        </div>`).join('')}

        <button onclick="window._buRows.push({id:'bu_'+(window._buRows.length+1),name:'Division '+(window._buRows.length+1),categories:[],beta:1.5,k:2.5,avg_fine:25000,revenue_weight:0});window._renderBUModal()" style="width:100%;padding:8px;border:1px dashed rgba(99,102,241,0.3);border-radius:8px;background:transparent;color:#818cf8;cursor:pointer;font-size:0.8rem">+ Add Business Unit</button>
      </div>
      <div class="ccs-modal-footer">
        <button onclick="document.getElementById('ccs-bu-modal').style.display='none'" class="ccs-btn-secondary">Cancel</button>
        <button onclick="window._clearBUConfig()" class="ccs-btn-secondary" style="color:#ef4444;border-color:rgba(239,68,68,0.3)">Clear All BUs</button>
        <button onclick="window._saveBUConfig()" class="ccs-btn-primary">Save & Recalculate</button>
      </div>
    </div>
  `;
};

window._toggleBUCat = function (buIdx, cat) {
  const bu = window._buRows[buIdx];
  if (!bu) return;
  const idx = (bu.categories || []).indexOf(cat);
  if (idx >= 0) bu.categories.splice(idx, 1);
  else {
    if (!bu.categories) bu.categories = [];
    bu.categories.push(cat);
  }
  window._renderBUModal();
};

window._saveBUConfig = async function () {
  const API = window.API;
  // Validate weights sum
  const totalWeight = window._buRows.reduce((s, b) => s + (b.revenue_weight || 0), 0);
  if (Math.abs(totalWeight - 1.0) > 0.05) {
    if (!confirm(`Revenue weights sum to ${Math.round(totalWeight * 100)}% (should be ~100%). Continue anyway?`)) return;
  }
  try {
    await API.patch('/tenant/owner/ccs/bu-config', {
      business_units: window._buRows,
      brand_architecture: window._buBrandArch,
      contagion_factor: window._buContagion,
      cross_bu_correlation: window._buCorrelation,
    });
    document.getElementById('ccs-bu-modal').style.display = 'none';
    loadCCSData();
  } catch (e) {
    alert('Failed to save BU configuration');
  }
};

window._clearBUConfig = async function () {
  if (!confirm('Remove all Business Unit configuration? This will revert to single-industry mode.')) return;
  const API = window.API;
  try {
    await API.patch('/tenant/owner/ccs/bu-config', { business_units: [] });
    document.getElementById('ccs-bu-modal').style.display = 'none';
    loadCCSData();
  } catch (e) {
    alert('Failed to clear BU configuration');
  }
};

// ── Category Exposure Pagination ─────────────────────────────────────────────
window.filterCategoryTable = function (resetPage) {
  const q = (document.getElementById('ccs-cat-search')?.value || '').toLowerCase();
  const sizeEl = document.getElementById('ccs-cat-pagesize');
  _catSize = Number(sizeEl?.value || 10);
  if (resetPage) _catPage = 1;

  const filtered = _catData.filter(c => !q || (c.category || '').toLowerCase().includes(q));
  const totalPages = Math.max(1, Math.ceil(filtered.length / _catSize));
  if (_catPage > totalPages) _catPage = totalPages;

  const start = (_catPage - 1) * _catSize;
  const page = filtered.slice(start, start + _catSize);

  const tbody = document.getElementById('ccs-cat-tbody');
  if (tbody) {
    tbody.innerHTML = page.length > 0 ? page.map(c => `
      <tr>
        <td><strong>${c.category || '—'}</strong></td>
        <td>${c.products}</td>
        <td>${c.scans}</td>
        <td>${c.suspicious}</td>
        <td>${c.risk_rate}%</td>
      </tr>
    `).join('') : `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:1rem">No matching categories</td></tr>`;
  }

  const pager = document.getElementById('ccs-cat-pager');
  if (pager) {
    pager.innerHTML = `
      <span>Showing ${filtered.length > 0 ? start + 1 : 0}–${Math.min(start + _catSize, filtered.length)} of ${filtered.length}</span>
      <div style="display:flex;gap:4px">
        <button onclick="changeCatPage(-1)" ${_catPage <= 1 ? 'disabled' : ''}
                style="padding:4px 10px;border-radius:4px;border:1px solid var(--border-color, rgba(255,255,255,0.1));background:var(--input-bg, rgba(255,255,255,0.05));color:var(--text-primary, #e2e8f0);cursor:pointer;font-size:0.75rem">← Prev</button>
        <span style="padding:4px 8px;font-size:0.75rem">${_catPage} / ${totalPages}</span>
        <button onclick="changeCatPage(1)" ${_catPage >= totalPages ? 'disabled' : ''}
                style="padding:4px 10px;border-radius:4px;border:1px solid var(--border-color, rgba(255,255,255,0.1));background:var(--input-bg, rgba(255,255,255,0.05));color:var(--text-primary, #e2e8f0);cursor:pointer;font-size:0.75rem">Next →</button>
      </div>
    `;
  }
};

window.changeCatPage = function (delta) {
  _catPage += delta;
  filterCategoryTable();
};

// ── Decision Command Center Pagination ───────────────────────────────────────
window.filterDecisionTable = function (resetPage) {
  const q = (document.getElementById('ccs-dec-search')?.value || '').toLowerCase();
  const sev = document.getElementById('ccs-dec-severity')?.value || '';
  _decSize = Number(document.getElementById('ccs-dec-pagesize')?.value || 10);
  if (resetPage) _decPage = 1;

  const filtered = _decData.filter(d => {
    if (q && !d.title.toLowerCase().includes(q) && !(d.meta || '').toLowerCase().includes(q)) return false;
    if (sev && d.severity !== sev) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / _decSize));
  if (_decPage > totalPages) _decPage = totalPages;
  const start = (_decPage - 1) * _decSize;
  const page = filtered.slice(start, start + _decSize);

  const sevIcon = { critical: '🔴', high: '🟠', compliance: '🟡', info: '🟢' };
  const container = document.getElementById('ccs-dec-container');
  if (container) {
    container.innerHTML = page.length > 0 ? page.map(d => `
      <div class="ccs-alert ccs-alert-${d.severity}">
        <div class="ccs-alert-header">
          <span class="ccs-alert-sev">${sevIcon[d.severity] || '⚪'} ${d.severity.toUpperCase()}</span>
          <span class="ccs-alert-time">${typeof d.time === 'string' && !d.time.includes('until') ? timeAgo(d.time) : d.time || ''}</span>
        </div>
        <div class="ccs-alert-title">${d.title}</div>
        <div class="ccs-alert-meta">${d.meta}</div>
        ${d.action ? `<div class="ccs-alert-action">⚡ ${d.action}</div>` : ''}
      </div>
    `).join('') : '<div style="text-align:center;padding:1rem;color:var(--text-muted)">No matching decisions</div>';
  }

  const pager = document.getElementById('ccs-dec-pager');
  if (pager) {
    pager.innerHTML = `
      <span>Showing ${filtered.length > 0 ? start + 1 : 0}–${Math.min(start + _decSize, filtered.length)} of ${filtered.length} decisions</span>
      <div style="display:flex;gap:4px">
        <button onclick="changeDecPage(-1)" ${_decPage <= 1 ? 'disabled' : ''}
                style="padding:4px 10px;border-radius:4px;border:1px solid var(--border-color, rgba(255,255,255,0.1));background:var(--input-bg, rgba(255,255,255,0.05));color:var(--text-primary, #e2e8f0);cursor:pointer;font-size:0.75rem">← Prev</button>
        <span style="padding:4px 8px;font-size:0.75rem">${_decPage} / ${totalPages}</span>
        <button onclick="changeDecPage(1)" ${_decPage >= totalPages ? 'disabled' : ''}
                style="padding:4px 10px;border-radius:4px;border:1px solid var(--border-color, rgba(255,255,255,0.1));background:var(--input-bg, rgba(255,255,255,0.05));color:var(--text-primary, #e2e8f0);cursor:pointer;font-size:0.75rem">Next →</button>
      </div>
    `;
  }
};

window.changeDecPage = function (delta) {
  _decPage += delta;
  filterDecisionTable();
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(n) {
  if (!n || n === 0) return '$0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
  return sign + '$' + abs.toLocaleString();
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function exposureCard(title, value, sub, color) {
  const colors = { red: '#ef4444', orange: '#f59e0b', green: '#22c55e', blue: '#6366f1' };
  const bgColors = { red: 'rgba(239,68,68,0.08)', orange: 'rgba(245,158,11,0.08)', green: 'rgba(34,197,94,0.06)', blue: 'rgba(99,102,241,0.06)' };
  return `
    <div class="ccs-exposure-card" style="border-left:4px solid ${colors[color]};background:${bgColors[color]}">
      <div class="ccs-exp-title">${title}</div>
      <div class="ccs-exp-value" style="color:${colors[color]}">${value}</div>
      <div class="ccs-exp-sub">${sub}</div>
    </div>`;
}
