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
let _trends = null, _alerts = null, _roi = null;
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
    [_exposure, _decisions, _valuation, _trends, _alerts, _roi] = await Promise.all([
      API.get('/tenant/owner/ccs/exposure').catch(() => null),
      API.get('/tenant/owner/ccs/decisions').catch(() => null),
      API.get('/tenant/owner/ccs/valuation').catch(() => null),
      API.get('/tenant/owner/ccs/trends').catch(() => null),
      API.get('/tenant/owner/ccs/alerts').catch(() => null),
      API.get('/tenant/owner/ccs/roi').catch(() => null),
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
        ${exposureCard('Total Capital at Risk', fmtMoney(exposure.total_capital_at_risk),
    (exposure.tcar_ci_low && exposure.tcar_ci_low !== exposure.total_capital_at_risk
      ? `${fmtMoney(exposure.tcar_ci_low)} – ${fmtMoney(exposure.tcar_ci_high)} (95% CI)`
      : 'ERL + EBI + RFE − Diversification') +
    (exposure.risk_cluster ? ` · ${exposure.risk_cluster.id}: ${exposure.risk_cluster.label}` : ''),
    exposure.total_capital_at_risk > 0 ? 'red' : 'green')}
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
              <th>ERL</th><th>EBI</th><th>RFE</th><th style="font-weight:700">TCAR</th><th>Risk %</th>
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
                <td style="font-weight:600;color:${bu.tcar / (exp.group_aggregated?.raw_tcar || 1) > 0.3 ? '#ef4444' : '#f59e0b'}">${Math.round(bu.tcar / (exp.group_aggregated?.raw_tcar || 1) * 100)}%</td>
              </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top:2px solid var(--border-color,rgba(255,255,255,0.15));font-weight:600">
                <td colspan="6">Group Total</td>
                <td>${fmtMoney(exp.group_aggregated?.erl)}</td>
                <td>${fmtMoney(exp.group_aggregated?.ebi)}</td>
                <td>${fmtMoney(exp.group_aggregated?.rfe)}</td>
                <td><strong>${fmtMoney(exp.group_aggregated?.tcar)}</strong></td>
                <td>100%</td>
              </tr>
              ${exp.group_aggregated?.diversification_discount > 0 ? `<tr style="color:#22c55e;font-size:0.7rem">
                <td colspan="10">↳ Diversification Discount (ρ=${exp.group_aggregated.cross_bu_correlation})</td>
                <td>−${fmtMoney(exp.group_aggregated.diversification_discount)}</td>
              </tr>` : ''}
              ${exp.group_aggregated?.contagion_adjustment > 0 ? `<tr style="color:#ef4444;font-size:0.7rem">
                <td colspan="9">↳ Brand Contagion (γ=${exp.group_aggregated.contagion_factor})</td>
                <td>+${fmtMoney(exp.group_aggregated.contagion_adjustment)}</td><td></td>
              </tr>` : ''}
            </tfoot>
          </table>
        </div>

        <!-- Individual BU Exposure Cards -->
        ${exp.per_bu.map(bu => `
        <div class="exec-card" style="margin-bottom:0.75rem">
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

    ${renderTrendChart()}
    ${renderAlertFeed()}
    ${renderRiskHeatmap()}
    ${renderROIDashboard()}

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

          <div style="font-size:0.7rem;opacity:0.6;margin:1rem 0 0.75rem;text-transform:uppercase;letter-spacing:1px;border-top:1px solid rgba(255,255,255,0.1);padding-top:0.75rem">Operational Parameters</div>
          <label>Estimated Units Sold (YTD)</label>
          <input type="number" id="ccs-fin-units" value="${fin.estimated_units_ytd || ''}" placeholder="e.g. 500000 · Leave blank for auto">
          <label>Manual Cost per Check (USD)</label>
          <input type="number" id="ccs-fin-manual-cost" value="${fin.manual_cost_per_check || 5}" step="0.5" placeholder="e.g. 5">
          <label>Fraud Recovery Rate (0–1)</label>
          <input type="number" id="ccs-fin-recovery" value="${fin.recovery_rate || 0.2}" step="0.05" min="0" max="1" placeholder="e.g. 0.2">
          <div style="font-size:0.68rem;opacity:0.4;margin-top:0.3rem">Industry-specific β, k, avgFine are now configured per Business Unit via Edit BUs.</div>
        </div>
        <div class="ccs-modal-footer">
          <button onclick="document.getElementById('ccs-fin-modal').style.display='none'" class="ccs-btn-secondary">Cancel</button>
          <button onclick="saveCCSFinancials()" class="ccs-btn-primary">Save & Recalculate</button>
        </div>
      </div>
    </div>
  `;
}

// ── Render: 12-Week Trend Chart (SVG) ──────────────────────────────────────────
function renderTrendChart() {
  const t = (_trends || {}).trend || [];
  if (!t.length) return '';
  const maxTCAR = Math.max(...t.map(d => d.tcar), 1);
  const maxPF = Math.max(...t.map(d => d.pFraud), 1);
  const W = 680, H = 200, PAD = 40;
  const cw = (W - PAD * 2) / Math.max(t.length - 1, 1);
  const tcarPts = t.map((d, i) => `${PAD + i * cw},${H - PAD - ((d.tcar / maxTCAR) * (H - PAD * 2))}`).join(' ');
  const pfPts = t.map((d, i) => `${PAD + i * cw},${H - PAD - ((d.pFraud / maxPF) * (H - PAD * 2))}`).join(' ');
  const labels = t.map((d, i) => {
    const dt = new Date(d.week);
    return `<text x="${PAD + i * cw}" y="${H - 8}" text-anchor="middle" fill="#888" font-size="9">${(dt.getMonth() + 1)}/${dt.getDate()}</text>`;
  }).join('');
  // Trend direction
  const firstTCAR = t[0]?.tcar || 0, lastTCAR = t[t.length - 1]?.tcar || 0;
  const trendDir = lastTCAR > firstTCAR * 1.1 ? 'worsening' : lastTCAR < firstTCAR * 0.9 ? 'improving' : 'stable';
  const trendColor = trendDir === 'improving' ? '#22c55e' : trendDir === 'worsening' ? '#ef4444' : '#eab308';
  const trendIcon = trendDir === 'improving' ? '↘' : trendDir === 'worsening' ? '↗' : '→';

  return `
  <section class="ccs-section">
    <div class="ccs-section-header">
      <h3>${icon('trending-up', 18)} Risk Trend (12 Weeks)</h3>
      <span style="font-size:0.75rem;padding:3px 10px;border-radius:20px;background:${trendColor}22;color:${trendColor};font-weight:600">${trendIcon} ${trendDir}</span>
    </div>
    <div style="overflow-x:auto">
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto;margin:0 auto;display:block">
        <defs>
          <linearGradient id="tcar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#6366f1" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <!-- Grid lines -->
        ${[0, 1, 2, 3, 4].map(i => {
    const y = PAD + i * ((H - PAD * 2) / 4);
    return `<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="#333" stroke-width="0.5" stroke-dasharray="4"/>`;
  }).join('')}
        <!-- TCAR area -->
        <polygon points="${PAD},${H - PAD} ${tcarPts} ${PAD + (t.length - 1) * cw},${H - PAD}" fill="url(#tcar-grad)"/>
        <!-- TCAR line -->
        <polyline points="${tcarPts}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linejoin="round"/>
        <!-- P(Fraud) line -->
        <polyline points="${pfPts}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6,3" stroke-linejoin="round"/>
        <!-- Data points -->
        ${t.map((d, i) => `<circle cx="${PAD + i * cw}" cy="${H - PAD - ((d.tcar / maxTCAR) * (H - PAD * 2))}" r="3.5" fill="#6366f1"/>`).join('')}
        ${labels}
        <!-- Y-axis labels -->
        <text x="${PAD - 4}" y="${PAD + 4}" text-anchor="end" fill="#6366f1" font-size="9">${fmtMoney(maxTCAR)}</text>
        <text x="${PAD - 4}" y="${H - PAD}" text-anchor="end" fill="#888" font-size="9">$0</text>
        <text x="${W - PAD + 4}" y="${PAD + 4}" text-anchor="start" fill="#f59e0b" font-size="9">${maxPF}%</text>
      </svg>
    </div>
    <div style="display:flex;gap:1.5rem;justify-content:center;margin-top:0.5rem;font-size:0.72rem;opacity:0.7">
      <span><span style="display:inline-block;width:16px;height:3px;background:#6366f1;vertical-align:middle;margin-right:4px;border-radius:2px"></span>TCAR ($)</span>
      <span><span style="display:inline-block;width:16px;height:3px;background:#f59e0b;vertical-align:middle;margin-right:4px;border-radius:2px;border-top:2px dashed #f59e0b;height:0"></span>P(Fraud) %</span>
    </div>
  </section>`;
}

// ── Render: Smart Alert Feed ───────────────────────────────────────────────────
function renderAlertFeed() {
  const al = (_alerts || {}).alerts || [];
  if (!al.length) return `
  <section class="ccs-section">
    <div class="ccs-section-header"><h3>${icon('bell', 18)} Intelligence Alerts</h3></div>
    <div style="text-align:center;padding:1.5rem;opacity:0.5;font-size:0.85rem">${icon('check-circle', 24)}<br>No active alerts — all systems nominal</div>
  </section>`;

  const sevStyles = {
    critical: { bg: 'rgba(239,68,68,0.12)', border: '#ef4444', icon: '🚨', color: '#ef4444' },
    high: { bg: 'rgba(249,115,22,0.12)', border: '#f97316', icon: '⚠️', color: '#f97316' },
    medium: { bg: 'rgba(234,179,8,0.12)', border: '#eab308', icon: '⚡', color: '#eab308' },
    low: { bg: 'rgba(34,197,94,0.08)', border: '#22c55e', icon: 'ℹ️', color: '#22c55e' },
  };

  const shown = al.slice(0, 5);
  return `
  <section class="ccs-section">
    <div class="ccs-section-header">
      <h3>${icon('bell', 18)} Intelligence Alerts</h3>
      <span style="background:rgba(239,68,68,0.15);color:#ef4444;padding:2px 10px;border-radius:20px;font-size:0.72rem;font-weight:600">${al.length} active</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:0.5rem">
      ${shown.map(a => {
    const s = sevStyles[a.severity] || sevStyles.medium;
    return `
        <div style="display:flex;align-items:flex-start;gap:0.75rem;padding:0.75rem;border-radius:10px;background:${s.bg};border-left:3px solid ${s.border}">
          <div style="font-size:1.2rem;flex-shrink:0;margin-top:2px">${s.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:0.82rem;color:${s.color}">${a.title}</div>
            <div style="font-size:0.74rem;opacity:0.75;margin-top:2px">${a.description}</div>
          </div>
          <div style="font-size:0.68rem;opacity:0.5;flex-shrink:0;white-space:nowrap">${a.timestamp ? timeAgo(a.timestamp) : ''}</div>
        </div>`;
  }).join('')}
      ${al.length > 5 ? `<div style="text-align:center;font-size:0.75rem;opacity:0.5;padding:0.5rem">+${al.length - 5} more alerts</div>` : ''}
    </div>
  </section>`;
}

// ── Render: Risk Heatmap (Geographic) ──────────────────────────────────────────
function renderRiskHeatmap() {
  const geo = (_exposure || {}).geo_risk || [];
  if (!geo.length) return '';

  const maxScans = Math.max(...geo.map(g => parseInt(g.scans) || 1));
  return `
  <section class="ccs-section">
    <div class="ccs-section-header"><h3>${icon('globe', 18)} Geographic Risk Heatmap</h3></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;padding:0.5rem 0">
      ${geo.map(g => {
    const scans = parseInt(g.scans) || 0;
    const flagged = parseInt(g.flagged) || 0;
    const fraudRate = (parseFloat(g.fraud_rate) || 0) / 100;
    const size = Math.max(60, Math.round(60 + (scans / maxScans) * 80));
    const r = Math.round(fraudRate * 255);
    const g2 = Math.round((1 - fraudRate) * 200);
    const bg = `rgba(${Math.min(r + 40, 255)}, ${g2}, ${Math.max(60 - r, 20)}, 0.2)`;
    const borderColor = `rgb(${Math.min(r + 40, 255)}, ${g2}, ${Math.max(60 - r, 20)})`;
    const riskColors = { low: '#22c55e', medium: '#eab308', high: '#ef4444', critical: '#dc2626' };
    const riskCol = riskColors[g.risk_level] || borderColor;
    return `
        <div style="width:${size}px;height:${size}px;border-radius:10px;background:${bg};border:2px solid ${riskCol};display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:0.7rem;cursor:default;transition:transform 0.15s" title="${g.country}: ${scans} scans, ${flagged} flagged (${g.fraud_rate || 0}%)">
          <div style="font-weight:700;font-size:0.85rem">${g.country || '??'}</div>
          <div style="opacity:0.7">${scans}</div>
          ${flagged > 0 ? `<div style="color:${riskCol};font-weight:600">${g.fraud_rate || 0}%</div>` : ''}
        </div>`;
  }).join('')}
    </div>
    <div style="display:flex;gap:1rem;justify-content:center;margin-top:0.5rem;font-size:0.68rem;opacity:0.6">
      <span>🟢 Low risk</span><span>🟡 Medium</span><span>🔴 High risk</span>
      <span style="margin-left:0.5rem">Size = scan volume</span>
    </div>
  </section>`;
}

// ── Render: ROI Dashboard ──────────────────────────────────────────────────────
function renderROIDashboard() {
  const r = _roi || {};
  if (!r.total_scans) return '';

  const protRate = r.authentication_rate || 0;
  const stopped = r.counterfeits_detected || 0;
  const flagged = (r.counterfeits_detected || 0) + (r.suspicious_flagged || 0);
  const stopRate = flagged > 0 ? Math.round((stopped / flagged) * 100) : 0;
  const t = (_trends || {}).trend || [];

  // Mini sparkline SVG helper
  const sparkline = (data, color) => {
    if (!data.length) return '';
    const max = Math.max(...data, 1);
    const w = 80, h = 28;
    const pts = data.map((v, i) => `${(i / Math.max(data.length - 1, 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ');
    return `<svg width="${w}" height="${h}" style="opacity:0.6"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  };

  const tcarSpark = sparkline(t.map(w => w.tcar || 0), '#22c55e');
  const detSpark = sparkline(t.map(w => w.counterfeit || 0), '#f59e0b');

  return `
  <section class="ccs-section">
    <div class="ccs-section-header">
      <h3>${icon('bar-chart-2', 18)} Platform ROI</h3>
      <button onclick="window._exportBoardReport()" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:6px 16px;border-radius:8px;font-size:0.72rem;cursor:pointer;font-weight:600;box-shadow:0 2px 8px rgba(99,102,241,0.3);transition:transform 0.15s" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">📄 Export Board Report</button>
    </div>

    <!-- 2×2 Premium Card Grid -->
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:0.5rem">

      <!-- Revenue Protected -->
      <div style="background:linear-gradient(135deg,rgba(34,197,94,0.08),rgba(34,197,94,0.02));border:1px solid rgba(34,197,94,0.2);border-radius:14px;padding:16px;position:relative;overflow:hidden">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="width:32px;height:32px;border-radius:8px;background:rgba(34,197,94,0.15);display:flex;align-items:center;justify-content:center;font-size:1.1rem">🛡️</div>
          <span style="font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;opacity:0.6;font-weight:600">Revenue Protected</span>
        </div>
        <div style="display:flex;align-items:flex-end;justify-content:space-between">
          <div>
            <div style="font-size:1.5rem;font-weight:800;color:#22c55e;letter-spacing:-0.5px">${fmtMoney(r.protected_revenue)}</div>
            <div style="font-size:0.68rem;opacity:0.5;margin-top:2px">${protRate}% authentication rate</div>
          </div>
          <div style="flex-shrink:0">${tcarSpark}</div>
        </div>
      </div>

      <!-- Counterfeits Stopped -->
      <div style="background:linear-gradient(135deg,rgba(239,68,68,0.08),rgba(239,68,68,0.02));border:1px solid rgba(239,68,68,0.2);border-radius:14px;padding:16px;position:relative;overflow:hidden">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="width:32px;height:32px;border-radius:8px;background:rgba(239,68,68,0.15);display:flex;align-items:center;justify-content:center;font-size:1.1rem">🚫</div>
          <span style="font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;opacity:0.6;font-weight:600">Counterfeits Stopped</span>
        </div>
        <div style="font-size:1.5rem;font-weight:800;color:#ef4444;letter-spacing:-0.5px">${stopped.toLocaleString()}</div>
        <div style="margin-top:8px">
          <div style="display:flex;justify-content:space-between;font-size:0.65rem;margin-bottom:3px">
            <span style="opacity:0.6">Stopped vs Total Flagged</span>
            <span style="font-weight:600;color:${stopRate > 60 ? '#22c55e' : '#eab308'}">${stopped.toLocaleString()} / ${flagged.toLocaleString()}</span>
          </div>
          <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden">
            <div style="width:${stopRate}%;height:100%;background:linear-gradient(90deg,#ef4444,#f97316);border-radius:3px;transition:width 0.5s"></div>
          </div>
          <div style="font-size:0.6rem;opacity:0.4;margin-top:2px;text-align:right">${stopRate}% confirmation rate</div>
        </div>
      </div>

      <!-- Detection Value -->
      <div style="background:linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.02));border:1px solid rgba(245,158,11,0.2);border-radius:14px;padding:16px;position:relative;overflow:hidden">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="width:32px;height:32px;border-radius:8px;background:rgba(245,158,11,0.15);display:flex;align-items:center;justify-content:center;font-size:1.1rem">💰</div>
          <span style="font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;opacity:0.6;font-weight:600">Detection Value</span>
        </div>
        <div style="display:flex;align-items:flex-end;justify-content:space-between">
          <div>
            <div style="font-size:1.5rem;font-weight:800;color:#f59e0b;letter-spacing:-0.5px">${fmtMoney(r.detection_value)}</div>
            <div style="font-size:0.68rem;opacity:0.5;margin-top:2px">$${r.cost_per_detection || 0} per detection</div>
          </div>
          <div style="flex-shrink:0">${detSpark}</div>
        </div>
      </div>

      <!-- ROI Multiple -->
      <div style="background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.05));border:1px solid rgba(99,102,241,0.25);border-radius:14px;padding:16px;position:relative;overflow:hidden">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="width:32px;height:32px;border-radius:8px;background:rgba(99,102,241,0.15);display:flex;align-items:center;justify-content:center;font-size:1.1rem">📈</div>
          <span style="font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;opacity:0.6;font-weight:600">ROI Multiple</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-size:1.8rem;font-weight:900;background:linear-gradient(135deg,#6366f1,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-1px">${r.roi_multiple || 0}x</div>
          <div style="background:rgba(99,102,241,0.1);padding:3px 10px;border-radius:20px;font-size:0.65rem;font-weight:600;color:#a78bfa">Payback: ${r.payback_months || 0}mo</div>
        </div>
        <div style="font-size:0.65rem;opacity:0.4;margin-top:6px">Platform cost: $${(r.platform_cost || 0).toLocaleString()} · ${r.months_active || 0} months active</div>
      </div>

    </div>

    <!-- Protection Coverage Footer -->
    <div style="margin-top:10px;background:rgba(99,102,241,0.04);border:1px solid rgba(99,102,241,0.1);border-radius:12px;padding:12px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:0.72rem;font-weight:600;opacity:0.7">${icon('shield', 14)} Protection Coverage</span>
        <span style="font-size:0.82rem;font-weight:700;color:#22c55e">${protRate}%</span>
      </div>
      <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden">
        <div style="width:${Math.min(protRate, 100)}%;height:100%;background:linear-gradient(90deg,#22c55e,#6366f1);border-radius:4px;transition:width 0.8s ease"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.62rem;opacity:0.4;margin-top:4px">
        <span>${r.total_scans?.toLocaleString() || 0} total scans</span>
        <span>${stopped.toLocaleString()} counterfeits · ${(r.suspicious_flagged || 0).toLocaleString()} suspicious</span>
      </div>
    </div>
  </section>`;
}

// ── Board Report Export ────────────────────────────────────────────────────────
window._exportBoardReport = async function () {
  try {
    const btn = event?.target;
    if (btn) { btn.textContent = '⏳ Generating...'; btn.disabled = true; }

    const exp = (_exposure || {}).exposure || {};
    const val = _valuation || {};
    const roi = _roi || {};
    const trends = (_trends || {}).trend || [];
    const alerts = (_alerts || {}).alerts || [];
    const fin = (val.financial_inputs || {});
    const ev = val.valuation || {};
    const gov = val.governance_maturity || {};
    const scenarios = (_exposure || {}).scenarios || {};
    const scans = (_exposure || {}).scans_30d || {};

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Board Report — ${dateStr}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Segoe UI',system-ui,-apple-system,sans-serif; color:#1a1a2e; background:#fff; padding:40px; max-width:900px; margin:0 auto; font-size:13px; line-height:1.6; }
      h1 { font-size:22px; margin-bottom:4px; color:#1a1a2e; }
      h2 { font-size:15px; margin:24px 0 10px; padding-bottom:6px; border-bottom:2px solid #6366f1; color:#6366f1; text-transform:uppercase; letter-spacing:1px; }
      .subtitle { font-size:12px; color:#666; margin-bottom:20px; }
      .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:12px 0; }
      .card { padding:14px; border-radius:10px; background:#f8fafc; border:1px solid #e2e8f0; }
      .card-value { font-size:20px; font-weight:700; color:#1a1a2e; }
      .card-label { font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:#666; margin-top:2px; }
      .card-sub { font-size:10px; color:#888; margin-top:4px; }
      .alert-row { padding:8px 12px; border-radius:8px; margin:4px 0; font-size:11px; }
      .alert-critical { background:#fef2f2; border-left:3px solid #ef4444; }
      .alert-high { background:#fff7ed; border-left:3px solid #f97316; }
      table { width:100%; border-collapse:collapse; font-size:11px; margin:8px 0; }
      th,td { padding:6px 10px; text-align:left; border-bottom:1px solid #e2e8f0; }
      th { background:#f1f5f9; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:0.5px; }
      .footer { margin-top:30px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:10px; color:#999; text-align:center; }
      @media print { body { padding:20px; } }
    </style></head><body>
    <h1>📊 Capital Command System — Board Report</h1>
    <div class="subtitle">Generated ${dateStr} · ERQF v${exp.erqf_version || '2.0'} · Confidential</div>

    <h2>Capital Exposure Radar</h2>
    <div class="grid">
      <div class="card"><div class="card-value">${fmtMoney(exp.total_capital_at_risk || 0)}</div><div class="card-label">Total Capital at Risk</div></div>
      <div class="card"><div class="card-value">${fmtMoney(exp.expected_revenue_loss || 0)}</div><div class="card-label">Expected Revenue Loss</div></div>
      <div class="card"><div class="card-value">${fmtMoney(exp.expected_brand_impact || 0)}</div><div class="card-label">Expected Brand Impact</div></div>
      <div class="card"><div class="card-value">${fmtMoney(exp.regulatory_exposure || 0)}</div><div class="card-label">Regulatory Exposure</div></div>
    </div>
    <div class="grid">
      <div class="card"><div class="card-value">${exp.fraud_probability || 0}%</div><div class="card-label">P(Fraud)</div></div>
      <div class="card"><div class="card-value">${exp.coverage_ratio || 0}%</div><div class="card-label">Coverage Ratio</div></div>
      <div class="card"><div class="card-value">${exp.supply_chain_scri || 0}</div><div class="card-label">Supply Chain SCRI</div></div>
      <div class="card"><div class="card-value">${exp.risk_cluster?.label || 'N/A'}</div><div class="card-label">Risk Cluster</div></div>
    </div>

    ${Object.keys(scenarios).length ? `
    <h2>Scenario Analysis</h2>
    <table>
      <tr><th>Scenario</th><th>ERL</th><th>EBI</th><th>RFE</th><th>TCAR</th></tr>
      ${['best', 'moderate', 'base', 'stress', 'extreme'].filter(k => scenarios[k]).map(k => {
      const s = scenarios[k];
      return `<tr><td style="text-transform:capitalize;font-weight:600">${k}</td><td>${fmtMoney(s.erl)}</td><td>${fmtMoney(s.ebi)}</td><td>${fmtMoney(s.rfe)}</td><td style="font-weight:700">${fmtMoney(s.tcar)}</td></tr>`;
    }).join('')}
    </table>` : ''}

    ${ev.ev_baseline ? `
    <h2>Enterprise Valuation</h2>
    <div class="grid">
      <div class="card"><div class="card-value">${fmtMoney(ev.ev_baseline)}</div><div class="card-label">EV Baseline</div></div>
      <div class="card"><div class="card-value" style="color:#22c55e">${fmtMoney(ev.ev_with_governance)}</div><div class="card-label">EV with Governance</div></div>
      <div class="card"><div class="card-value" style="color:#6366f1">+${fmtMoney(ev.ev_uplift)}</div><div class="card-label">EV Uplift</div></div>
      <div class="card"><div class="card-value">${gov.total_score || 0}/100</div><div class="card-label">Governance Score</div></div>
    </div>` : ''}

    ${roi.total_scans ? `
    <h2>Platform ROI</h2>
    <div class="grid">
      <div class="card"><div class="card-value" style="color:#22c55e">${fmtMoney(roi.protected_revenue)}</div><div class="card-label">Revenue Protected</div></div>
      <div class="card"><div class="card-value" style="color:#ef4444">${roi.counterfeits_detected?.toLocaleString()}</div><div class="card-label">Counterfeits Detected</div></div>
      <div class="card"><div class="card-value">${fmtMoney(roi.detection_value)}</div><div class="card-label">Detection Value</div></div>
      <div class="card"><div class="card-value" style="color:#6366f1">${roi.roi_multiple}x</div><div class="card-label">ROI Multiple</div></div>
    </div>` : ''}

    ${alerts.length ? `
    <h2>Active Alerts (${alerts.length})</h2>
    ${alerts.slice(0, 5).map(a => `<div class="alert-row alert-${a.severity}"><strong>${a.title}</strong><br>${a.description}</div>`).join('')}
    ` : ''}

    <div class="footer">
      TrustChecker Capital Command System · ERQF v${exp.erqf_version || '2.0'} · ${scans.total || 0} scans analyzed (30d)<br>
      This report is auto-generated and confidential. © ${now.getFullYear()} TrustChecker
    </div>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TrustChecker_Board_Report_${now.toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);

    if (btn) { btn.textContent = '📄 Export Board Report'; btn.disabled = false; }
  } catch (e) {
    console.error('[CCS] Board report export error:', e);
    alert('Failed to generate report');
  }
};

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

// Auto-fill ERQF defaults when industry changes — cluster-based
window._fillERQFDefaults = function () {
  const clusters = {
    A: { beta: 2.8, k: 2.2, recovery: 0.286 },
    B: { beta: 2.5, k: 2.8, recovery: 0.429 },
    C: { beta: 2.2, k: 1.9, recovery: 0.571 },
    D: { beta: 1.4, k: 1.5, recovery: 0.625 },
    E: { beta: 1.2, k: 1.25, recovery: 0.750 },
  };
  const map = {
    pharmaceutical: 'A', aviation: 'A', nuclear_energy: 'A', blood_vaccine: 'A', life_medical_device: 'A', baby_food: 'A', waste_management: 'A', oil_gas: 'A',
    banking_finance: 'B', fund_management: 'B', cybersecurity: 'B', saas: 'B', telecom: 'B',
    luxury: 'C', jewelry_gems: 'C', premium_wine: 'C', cosmetics_skincare: 'C', premium_watches: 'C', luxury_auto: 'C', art_antiques: 'C', premium_hospitality: 'C', premium_real_estate: 'C', yacht_jet: 'C',
    fmcg: 'D', retail: 'D', fast_fashion: 'D', toys: 'D', animal_feed: 'D', furniture: 'D', household_chemicals: 'D', sporting_goods: 'D', publishing: 'D', restaurant: 'D', electronics: 'D', electronic_parts: 'D', ecommerce: 'D', home_appliances: 'D', automotive: 'D',
    mining: 'E', steel_metals: 'E', heavy_chemicals: 'E', wood_forestry: 'E', cement: 'E', water_utilities: 'E', shipbuilding: 'E', fertilizer_pesticide: 'E', machinery: 'E', construction: 'E', renewable_energy: 'E', logistics: 'E',
  };
  const fines = {
    pharmaceutical: 50000, aviation: 500000, banking_finance: 250000, nuclear_energy: 1000000, baby_food: 200000, blood_vaccine: 500000, cybersecurity: 150000, life_medical_device: 300000,
    fund_management: 200000, oil_gas: 400000, luxury: 30000, jewelry_gems: 50000, premium_wine: 40000, cosmetics_skincare: 60000, premium_watches: 35000, luxury_auto: 80000,
    art_antiques: 20000, premium_hospitality: 45000, premium_real_estate: 30000, yacht_jet: 50000, electronics: 25000, electronic_parts: 20000, telecom: 80000, logistics: 15000,
    ecommerce: 50000, saas: 40000, automotive: 75000, home_appliances: 25000, construction: 30000, renewable_energy: 20000, fmcg: 15000, retail: 10000, fast_fashion: 12000, toys: 80000,
    animal_feed: 30000, furniture: 8000, household_chemicals: 25000, sporting_goods: 10000, publishing: 5000, restaurant: 35000, mining: 100000, steel_metals: 20000, heavy_chemicals: 150000,
    wood_forestry: 25000, cement: 15000, waste_management: 200000, water_utilities: 80000, shipbuilding: 40000, fertilizer_pesticide: 100000, machinery: 20000,
  };
  const sel = document.getElementById('ccs-fin-industry')?.value || 'pharmaceutical';
  const c = clusters[map[sel] || 'A'];
  const betaEl = document.getElementById('ccs-fin-beta');
  const kEl = document.getElementById('ccs-fin-k');
  const fineEl = document.getElementById('ccs-fin-avgfine');
  const recoveryEl = document.getElementById('ccs-fin-recovery');
  if (betaEl) betaEl.placeholder = c.beta;
  if (kEl) kEl.placeholder = c.k;
  if (fineEl) fineEl.placeholder = fines[sel] || 50000;
  if (recoveryEl) recoveryEl.placeholder = c.recovery;
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
      : [{ id: 'bu_1', name: 'Division 1', categories: [], industry_type: 'fmcg', beta: 1.4, k: 1.5, avg_fine: 15000, revenue_weight: 0.5 }];

    // Auto-detect industry_type for BUs migrated from old config (no industry_type field)
    const idGuess = { pharma: 'pharmaceutical', luxury: 'luxury', fmcg: 'fmcg', tech: 'electronics', finance: 'banking_finance', food: 'restaurant', auto: 'automotive' };
    const nameGuess = { 'pharma': 'pharmaceutical', 'health': 'pharmaceutical', 'luxury': 'luxury', 'fashion': 'luxury', 'f&b': 'fmcg', 'consumer': 'fmcg', 'food': 'fmcg', 'tech': 'electronics', 'iot': 'electronics', 'software': 'saas', 'bank': 'banking_finance', 'finance': 'banking_finance' };
    for (const bu of window._buRows) {
      if (!bu.industry_type) {
        // Try matching by BU id first, then by keywords in name
        bu.industry_type = idGuess[bu.id] || null;
        if (!bu.industry_type && bu.name) {
          const n = bu.name.toLowerCase();
          for (const [kw, ind] of Object.entries(nameGuess)) {
            if (n.includes(kw)) { bu.industry_type = ind; break; }
          }
        }
        if (!bu.industry_type) bu.industry_type = 'fmcg'; // fallback
        // Auto-fill cluster values
        window._setBUIndustry && window._setBUIndustry(window._buRows.indexOf(bu), bu.industry_type);
      }
    }

    // Create or show modal
    let modal = document.getElementById('ccs-bu-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ccs-bu-modal';
      modal.className = 'ccs-modal';
      modal.style.display = 'none';
      document.body.appendChild(modal);
    }
    window._buBrandArch = cfg.brand_architecture || 'house_of_brands';
    window._buContagion = cfg.contagion_factor || 0.15;
    window._buCorrelation = cfg.cross_bu_correlation || 0.3;
    window._renderBUModal();
    modal.style.display = 'flex';
  } catch (e) {
    console.error('BU Config error:', e);
    alert('Failed to load BU config: ' + e.message);
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
    <div class="ccs-modal-content" style="max-width:640px">
      <div class="ccs-modal-header">
        <h3>🏢 Business Unit Configuration</h3>
        <button onclick="document.getElementById('ccs-bu-modal').style.display='none'" class="ccs-modal-close">&times;</button>
      </div>
      <div class="ccs-modal-body" style="max-height:65vh;overflow-y:auto">
        ${rows.map((bu, idx) => `
        <div style="font-size:0.7rem;opacity:0.6;margin:1.25rem 0 0.75rem;text-transform:uppercase;letter-spacing:1px;border-top:1px solid rgba(255,255,255,0.1);padding-top:0.75rem">Business Unit ${idx + 1} ${rows.length > 1 ? `<button onclick="window._buRows.splice(${idx},1);window._renderBUModal()" style="float:right;background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.75rem">✕ Remove</button>` : ''}</div>

        <label>BU Name</label>
        <input type="text" value="${bu.name || ''}" onchange="window._buRows[${idx}].name=this.value" placeholder="e.g. Pharmaceutical Division">

        <label>Industry Preset <span style="font-size:0.68rem;opacity:0.5;font-weight:400">(auto-fills β, k, fine from cluster)</span></label>
        <select onchange="window._setBUIndustry(${idx},this.value)">
          <optgroup label="⚠️ Cluster A — Life-Critical">
            <option value="pharmaceutical" ${(bu.industry_type || '') === 'pharmaceutical' ? 'selected' : ''}>Pharmaceutical & Healthcare</option>
            <option value="aviation" ${bu.industry_type === 'aviation' ? 'selected' : ''}>Civil Aviation</option>
            <option value="banking_finance" ${bu.industry_type === 'banking_finance' ? 'selected' : ''}>Banking & Finance</option>
            <option value="nuclear_energy" ${bu.industry_type === 'nuclear_energy' ? 'selected' : ''}>Nuclear Energy</option>
            <option value="baby_food" ${bu.industry_type === 'baby_food' ? 'selected' : ''}>Baby & Infant Food</option>
            <option value="blood_vaccine" ${bu.industry_type === 'blood_vaccine' ? 'selected' : ''}>Blood & Vaccines</option>
            <option value="cybersecurity" ${bu.industry_type === 'cybersecurity' ? 'selected' : ''}>Cybersecurity</option>
            <option value="life_medical_device" ${bu.industry_type === 'life_medical_device' ? 'selected' : ''}>Medical Devices</option>
            <option value="fund_management" ${bu.industry_type === 'fund_management' ? 'selected' : ''}>Fund Management</option>
            <option value="oil_gas" ${bu.industry_type === 'oil_gas' ? 'selected' : ''}>Oil & Gas</option>
            <option value="waste_management" ${bu.industry_type === 'waste_management' ? 'selected' : ''}>Waste Management</option>
          </optgroup>
          <optgroup label="💎 Cluster C — Luxury & Brand">
            <option value="luxury" ${bu.industry_type === 'luxury' ? 'selected' : ''}>Luxury Fashion</option>
            <option value="jewelry_gems" ${bu.industry_type === 'jewelry_gems' ? 'selected' : ''}>Jewelry & Gems</option>
            <option value="premium_wine" ${bu.industry_type === 'premium_wine' ? 'selected' : ''}>Wine & Spirits</option>
            <option value="cosmetics_skincare" ${bu.industry_type === 'cosmetics_skincare' ? 'selected' : ''}>Cosmetics & Skincare</option>
            <option value="premium_watches" ${bu.industry_type === 'premium_watches' ? 'selected' : ''}>Watches</option>
            <option value="luxury_auto" ${bu.industry_type === 'luxury_auto' ? 'selected' : ''}>Luxury Auto</option>
            <option value="art_antiques" ${bu.industry_type === 'art_antiques' ? 'selected' : ''}>Art & Antiques</option>
            <option value="premium_hospitality" ${bu.industry_type === 'premium_hospitality' ? 'selected' : ''}>5-Star Hospitality</option>
            <option value="premium_real_estate" ${bu.industry_type === 'premium_real_estate' ? 'selected' : ''}>Premium Real Estate</option>
            <option value="yacht_jet" ${bu.industry_type === 'yacht_jet' ? 'selected' : ''}>Yachts & Jets</option>
          </optgroup>
          <optgroup label="⚙️ Cluster B/D — Tech & Operations">
            <option value="electronics" ${bu.industry_type === 'electronics' ? 'selected' : ''}>Electronics</option>
            <option value="telecom" ${bu.industry_type === 'telecom' ? 'selected' : ''}>Telecom</option>
            <option value="ecommerce" ${bu.industry_type === 'ecommerce' ? 'selected' : ''}>E-Commerce</option>
            <option value="saas" ${bu.industry_type === 'saas' ? 'selected' : ''}>SaaS / Enterprise Software</option>
            <option value="automotive" ${bu.industry_type === 'automotive' ? 'selected' : ''}>Automotive</option>
            <option value="logistics" ${bu.industry_type === 'logistics' ? 'selected' : ''}>Logistics</option>
            <option value="construction" ${bu.industry_type === 'construction' ? 'selected' : ''}>Construction</option>
            <option value="renewable_energy" ${bu.industry_type === 'renewable_energy' ? 'selected' : ''}>Renewable Energy</option>
          </optgroup>
          <optgroup label="🛒 Cluster D — Consumer & Retail">
            <option value="fmcg" ${bu.industry_type === 'fmcg' ? 'selected' : ''}>FMCG / Consumer Goods</option>
            <option value="retail" ${bu.industry_type === 'retail' ? 'selected' : ''}>Supermarket & Retail</option>
            <option value="fast_fashion" ${bu.industry_type === 'fast_fashion' ? 'selected' : ''}>Fast Fashion</option>
            <option value="toys" ${bu.industry_type === 'toys' ? 'selected' : ''}>Children's Toys</option>
            <option value="restaurant" ${bu.industry_type === 'restaurant' ? 'selected' : ''}>Restaurant & F&B</option>
            <option value="furniture" ${bu.industry_type === 'furniture' ? 'selected' : ''}>Furniture</option>
            <option value="sporting_goods" ${bu.industry_type === 'sporting_goods' ? 'selected' : ''}>Sporting Goods</option>
          </optgroup>
          <optgroup label="🏭 Cluster E — Industrial">
            <option value="mining" ${bu.industry_type === 'mining' ? 'selected' : ''}>Mining & Minerals</option>
            <option value="steel_metals" ${bu.industry_type === 'steel_metals' ? 'selected' : ''}>Steel & Metals</option>
            <option value="heavy_chemicals" ${bu.industry_type === 'heavy_chemicals' ? 'selected' : ''}>Heavy Chemicals</option>
            <option value="cement" ${bu.industry_type === 'cement' ? 'selected' : ''}>Cement</option>
            <option value="shipbuilding" ${bu.industry_type === 'shipbuilding' ? 'selected' : ''}>Shipbuilding</option>
            <option value="machinery" ${bu.industry_type === 'machinery' ? 'selected' : ''}>Machinery & Tools</option>
          </optgroup>
        </select>
        <div style="font-size:0.72rem;opacity:0.55;margin:-0.3rem 0 0.5rem">β=${bu.beta || '—'} · k=${bu.k || '—'} · Fine=$${(bu.avg_fine || 0).toLocaleString()} · Cluster ${bu._cluster || '—'}</div>

        <label>Revenue Weight (%)</label>
        <input type="number" value="${Math.round((bu.revenue_weight || 0) * 100)}" onchange="window._buRows[${idx}].revenue_weight=Number(this.value)/100" min="0" max="100" step="5" placeholder="e.g. 40">

        <label>Product Categories <span style="font-size:0.68rem;opacity:0.5;font-weight:400">(click to assign)</span></label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:0.5rem">
          ${cats.map(c => {
    const isSelected = (bu.categories || []).includes(c);
    const isUsedElsewhere = !isSelected && assigned.has(c);
    return `<button onclick="window._toggleBUCat(${idx},'${c.replace(/'/g, "\\'")}')" style="
                padding:4px 12px;border-radius:16px;font-size:0.75rem;cursor:${isUsedElsewhere ? 'not-allowed' : 'pointer'};border:1px solid;
                ${isSelected ? 'background:rgba(99,102,241,0.15);border-color:rgba(99,102,241,0.4);color:#6366f1;font-weight:500' : isUsedElsewhere ? 'background:#f1f5f9;border-color:#e2e8f0;color:#94a3b8' : 'background:transparent;border-color:rgba(255,255,255,0.15);color:inherit'}
              " ${isUsedElsewhere ? 'disabled title="Assigned to another BU"' : ''}>${c}</button>`;
  }).join('')}
        </div>
        `).join('')}


        <div style="font-size:0.7rem;opacity:0.4;margin:1.5rem 0 0.5rem;text-transform:uppercase;letter-spacing:1px;border-top:1px solid rgba(255,255,255,0.1);padding-top:0.75rem;cursor:pointer" onclick="var el=document.getElementById('bu-advanced');el.style.display=el.style.display==='none'?'block':'none'">ADVANCED — RISK MODEL ▾</div>
        <div id="bu-advanced" style="display:none">
          <label>Brand Architecture</label>
          <select onchange="window._buBrandArch=this.value;window._renderBUModal()">
            <option value="house_of_brands" ${window._buBrandArch !== 'branded_house' ? 'selected' : ''}>House of Brands — Risk isolated per BU (P&G)</option>
            <option value="branded_house" ${window._buBrandArch === 'branded_house' ? 'selected' : ''}>Branded House — Risk spills across BUs (Samsung)</option>
          </select>
          ${window._buBrandArch === 'branded_house' ? `
          <label>γ Contagion Factor (0.0 – 0.5)</label>
          <input type="range" id="bu-contagion" min="0" max="0.5" step="0.05" value="${window._buContagion}" oninput="window._buContagion=Number(this.value);document.getElementById('bu-contagion-val').textContent=this.value" style="width:100%">
          <span id="bu-contagion-val" style="font-size:0.75rem;opacity:0.7">${window._buContagion}</span>
          ` : ''}
          <label>ρ Cross-BU Correlation (0.0 – 1.0)</label>
          <input type="range" id="bu-correlation" min="0" max="1" step="0.05" value="${window._buCorrelation}" oninput="window._buCorrelation=Number(this.value);document.getElementById('bu-correlation-val').textContent=this.value" style="width:100%">
          <span id="bu-correlation-val" style="font-size:0.75rem;opacity:0.7">${window._buCorrelation}</span>
        </div>
        <button onclick="window._buRows.push({id:'bu_'+(window._buRows.length+1),name:'Division '+(window._buRows.length+1),categories:[],industry_type:'fmcg',beta:1.4,k:1.5,avg_fine:15000,revenue_weight:0,_cluster:'D'});window._renderBUModal()" style="width:100%;padding:8px;border:1px dashed rgba(99,102,241,0.3);border-radius:8px;background:transparent;color:#818cf8;cursor:pointer;font-size:0.8rem">+ Add Business Unit</button>
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

// Set BU industry → auto-fill β, k, avgFine from cluster
window._setBUIndustry = function (buIdx, industryType) {
  const bu = window._buRows[buIdx];
  if (!bu) return;
  const clusters = {
    A: { beta: 2.8, k: 2.2, recovery: 0.286 },
    B: { beta: 2.5, k: 2.8, recovery: 0.429 },
    C: { beta: 2.2, k: 1.9, recovery: 0.571 },
    D: { beta: 1.4, k: 1.5, recovery: 0.625 },
    E: { beta: 1.2, k: 1.25, recovery: 0.750 },
  };
  const map = {
    pharmaceutical: 'A', aviation: 'A', nuclear_energy: 'A', blood_vaccine: 'A', life_medical_device: 'A', baby_food: 'A', waste_management: 'A', oil_gas: 'A',
    banking_finance: 'B', fund_management: 'B', cybersecurity: 'B', saas: 'B', telecom: 'B',
    luxury: 'C', jewelry_gems: 'C', premium_wine: 'C', cosmetics_skincare: 'C', premium_watches: 'C', luxury_auto: 'C', art_antiques: 'C', premium_hospitality: 'C', premium_real_estate: 'C', yacht_jet: 'C',
    fmcg: 'D', retail: 'D', fast_fashion: 'D', toys: 'D', animal_feed: 'D', furniture: 'D', household_chemicals: 'D', sporting_goods: 'D', publishing: 'D', restaurant: 'D', electronics: 'D', electronic_parts: 'D', ecommerce: 'D', home_appliances: 'D', automotive: 'D',
    mining: 'E', steel_metals: 'E', heavy_chemicals: 'E', wood_forestry: 'E', cement: 'E', water_utilities: 'E', shipbuilding: 'E', fertilizer_pesticide: 'E', machinery: 'E', construction: 'E', renewable_energy: 'E', logistics: 'E',
  };
  const fines = {
    pharmaceutical: 50000, aviation: 500000, banking_finance: 250000, nuclear_energy: 1000000, baby_food: 200000, blood_vaccine: 500000, cybersecurity: 150000, life_medical_device: 300000,
    fund_management: 200000, oil_gas: 400000, luxury: 30000, jewelry_gems: 50000, premium_wine: 40000, cosmetics_skincare: 60000, premium_watches: 35000, luxury_auto: 80000,
    art_antiques: 20000, premium_hospitality: 45000, premium_real_estate: 30000, yacht_jet: 50000, electronics: 25000, electronic_parts: 20000, telecom: 80000, logistics: 15000,
    ecommerce: 50000, saas: 40000, automotive: 75000, home_appliances: 25000, construction: 30000, renewable_energy: 20000, fmcg: 15000, retail: 10000, fast_fashion: 12000, toys: 80000,
    animal_feed: 30000, furniture: 8000, household_chemicals: 25000, sporting_goods: 10000, publishing: 5000, restaurant: 35000, mining: 100000, steel_metals: 20000, heavy_chemicals: 150000,
    wood_forestry: 25000, cement: 15000, waste_management: 200000, water_utilities: 80000, shipbuilding: 40000, fertilizer_pesticide: 100000, machinery: 20000,
  };
  const cid = map[industryType] || 'D';
  const c = clusters[cid];
  bu.industry_type = industryType;
  bu.beta = c.beta;
  bu.k = c.k;
  bu.avg_fine = fines[industryType] || 25000;
  bu._cluster = cid;
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
