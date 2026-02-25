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
    </div>` : ''}

    <!-- LAYER 1: Capital Exposure Radar -->
    <section class="exec-section">
      <h2 class="exec-section-title">${icon('target', 20)} Capital Exposure Radar</h2>
      <div class="ccs-kpi-row">
        ${exposureCard('Total Capital at Risk', fmtMoney(exposure.total_capital_at_risk), 'Total estimated exposure', exposure.total_capital_at_risk > 0 ? 'red' : 'green')}
        ${exposureCard('Revenue at Risk', fmtMoney(exposure.revenue_at_risk), `${exposure.fraud_exposure_rate || 0}% fraud rate`, exposure.fraud_exposure_rate > 5 ? 'red' : exposure.fraud_exposure_rate > 1 ? 'orange' : 'green')}
        ${exposureCard('Brand Value at Risk', fmtMoney(exposure.brand_value_at_risk), `Trust: ${scans.avg_trust || 0}`, exposure.brand_value_at_risk > 0 ? 'orange' : 'green')}
        ${exposureCard('Compliance Risk', `${exposure.compliance_risk_pct || 0}%`, `${compliance.compliant || 0}/${compliance.total || 0} compliant`, exposure.compliance_risk_pct > 30 ? 'red' : exposure.compliance_risk_pct > 10 ? 'orange' : 'green')}
        ${exposureCard('Supply Chain Index', (exposure.supply_chain_risk_index || 0).toFixed(3), `${exp.supply_chain?.events || 0} events tracked`, exposure.supply_chain_risk_index > 0.3 ? 'red' : 'green')}
      </div>
      
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
          <h3>${icon('products', 18)} Category Exposure</h3>
          ${(exp.category_exposure || []).length > 0 ? `
          <table class="ccs-table">
            <thead><tr><th>Category</th><th>Products</th><th>Scans</th><th>Suspicious</th><th>Risk %</th></tr></thead>
            <tbody>
              ${(exp.category_exposure || []).map(c => `
                <tr>
                  <td><strong>${c.category || '—'}</strong></td>
                  <td>${c.products}</td>
                  <td>${c.scans}</td>
                  <td>${c.suspicious}</td>
                  <td>${c.risk_rate}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>` : '<div style="color:var(--text-muted);padding:1rem;text-align:center">No scan data by category</div>'}
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

      ${(dec.strategic_alerts || []).length > 0 ? `
      <div class="ccs-decision-section">
        <h3>🔴 Strategic Alerts</h3>
        ${(dec.strategic_alerts || []).map(a => `
          <div class="ccs-alert ccs-alert-${a.severity}">
            <div class="ccs-alert-header">
              <span class="ccs-alert-sev">${a.severity.toUpperCase()}</span>
              <span class="ccs-alert-time">${timeAgo(a.time)}</span>
            </div>
            <div class="ccs-alert-title">${a.title}</div>
            <div class="ccs-alert-meta">${a.product} · ${a.category}</div>
            <div class="ccs-alert-action">${icon('zap', 14)} ${a.action_required}</div>
          </div>
        `).join('')}
      </div>` : ''}

      ${(dec.compliance_actions || []).length > 0 ? `
      <div class="ccs-decision-section">
        <h3>🟡 Compliance Actions</h3>
        ${(dec.compliance_actions || []).map(c => `
          <div class="ccs-alert ccs-alert-${c.urgency}">
            <div class="ccs-alert-header">
              <span class="ccs-alert-sev">${c.urgency.toUpperCase()}</span>
              <span class="ccs-alert-time">${c.days_until_review}d until review</span>
            </div>
            <div class="ccs-alert-title">${c.action}</div>
            <div class="ccs-alert-meta">${c.product} · ${c.framework} · ${c.requirement}</div>
          </div>
        `).join('')}
      </div>` : ''}

      ${(dec.security_events || []).length > 0 ? `
      <div class="ccs-decision-section">
        <h3>🟢 Security Events</h3>
        ${(dec.security_events || []).map(s => `
          <div class="ccs-alert ccs-alert-info">
            <div class="ccs-alert-header">
              <span class="ccs-alert-sev">INFO</span>
              <span class="ccs-alert-time">${timeAgo(s.time)}</span>
            </div>
            <div class="ccs-alert-title">${(s.action || '').replace(/_/g, ' ')}</div>
            <div class="ccs-alert-meta">${s.actor || 'system'}</div>
          </div>
        `).join('')}
      </div>` : ''}
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
        <div class="ccs-modal-body">
          <label>Annual Revenue (USD)</label>
          <input type="number" id="ccs-fin-revenue" value="${fin.annual_revenue || ''}" placeholder="e.g. 12000000">
          <label>EBITDA (USD)</label>
          <input type="number" id="ccs-fin-ebitda" value="${fin.ebitda || ''}" placeholder="e.g. 2400000">
          <label>EV Multiple</label>
          <input type="number" id="ccs-fin-multiple" value="${fin.base_multiple || 8}" step="0.5" placeholder="e.g. 8.5">
          <label>Brand Value Estimate (USD)</label>
          <input type="number" id="ccs-fin-brand" value="${fin.brand_value || ''}" placeholder="e.g. 5000000">
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
  };
  try {
    await API.patch('/tenant/owner/org-financials', body);
    document.getElementById('ccs-fin-modal').style.display = 'none';
    loadCCSData(); // Refresh all data
  } catch (e) {
    alert('Failed to save financial configuration');
  }
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
