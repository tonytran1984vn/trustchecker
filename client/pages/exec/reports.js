/**
 * Executive – Reports with PDF Export
 * ═════════════════════════════════════
 * Data from PostgreSQL via /owner/ccs/reports
 * PDF via print-optimized popup window
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

let _data = null;

export function renderPage() {
  if (!_data) { loadData(); return loadingState(); }
  const d = _data;

  return `
    <div class="exec-page">
      <div class="exec-header">
        <h1>${icon('scroll', 28)} Executive Reports</h1>
        <div class="exec-timestamp">
          <button class="btn btn-primary btn-sm" onclick="window._generatePDF('board')">📄 Generate Board Report PDF</button>
        </div>
      </div>

      <!-- Current Month Summary -->
      <section class="exec-section">
        <h2 class="exec-section-title">Current Period (30 days)</h2>
        <div class="exec-kpi-grid" style="grid-template-columns: repeat(4, 1fr)">
          <div class="exec-kpi-card">
            <div class="exec-kpi-value">${d.current_month.scans}</div>
            <div class="exec-kpi-label">Scans (30d)</div>
          </div>
          <div class="exec-kpi-card">
            <div class="exec-kpi-value">${d.current_month.alerts}</div>
            <div class="exec-kpi-label">Fraud Alerts</div>
          </div>
          <div class="exec-kpi-card">
            <div class="exec-kpi-value" style="color:#ef4444">${d.current_month.critical}</div>
            <div class="exec-kpi-label">Critical</div>
          </div>
          <div class="exec-kpi-card">
            <div class="exec-kpi-value" style="color:#22c55e">${d.current_month.resolved}</div>
            <div class="exec-kpi-label">Resolved</div>
          </div>
        </div>
      </section>

      <!-- Monthly Reports -->
      <section class="exec-section">
        <h2 class="exec-section-title">Monthly Executive Summaries</h2>
        <div class="exec-card">
          ${d.reports.length > 0
      ? d.reports.map(r => reportRow(r)).join('')
      : '<div style="color:var(--text-secondary);font-size:0.85rem;padding:1rem 0">No reports generated yet. Scan data will generate automatic monthly reports.</div>'}
        </div>
      </section>

      <!-- Report Templates -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('clipboard', 20)} Report Templates</h2>
        <div class="exec-grid-3">
          ${templateCard('Board Report', 'Full executive overview: trust score, risk exposure, carbon compliance, financial impact, strategic recommendations.', 'board', '📊')}
          ${templateCard('Risk Assessment', 'Detailed risk intelligence: anomaly trends, zone analysis, partner exposure, regulatory readiness.', 'risk', '🛡')}
          ${templateCard('Carbon & ESG Report', 'Carbon footprint, Scope 1/2/3, GRI alignment, regulatory readiness, partner ESG scores.', 'carbon', '🌱')}
        </div>
      </section>

      <!-- Scheduled Reports -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('settings', 20)} Scheduled Reports</h2>
        <div class="exec-card">
          <table class="sa-table">
            <thead>
              <tr><th>Report</th><th>Frequency</th><th>Recipients</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${d.scheduled.map(s => `
                <tr>
                  <td><strong>${s.name}</strong></td>
                  <td>${s.frequency}</td>
                  <td>${s.recipients}</td>
                  <td><span class="sa-status-pill sa-pill-green">${s.active ? 'active' : 'paused'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

async function loadData() {
  try {
    const r = await api.get('/tenant/owner/ccs/reports');
    _data = r;
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
  } catch (e) { console.error('[Reports]', e); }
}

function loadingState() {
  return `<div class="exec-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading reports...</div></div></div>`;
}

function reportRow(r) {
  return `
    <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 0;border-bottom:1px solid var(--border-color, rgba(255,255,255,0.04))">
      <div style="flex:1">
        <strong>${r.title}</strong>
        <div style="font-size:0.75rem;color:var(--text-secondary)">${r.type} · ${r.date} · ${r.scans} scans</div>
      </div>
      <div style="font-size:0.72rem;color:var(--text-secondary)">
        ✓ ${r.authentic} auth · ⚠ ${r.suspicious} susp · ✕ ${r.counterfeit} cntf
      </div>
      <span class="sa-status-pill sa-pill-green">${r.status}</span>
      <button class="btn btn-xs btn-outline" onclick="window._generatePDF('board')">📄 PDF</button>
    </div>`;
}

function templateCard(title, desc, type, emoji) {
  return `
    <div class="exec-card" style="text-align:center">
      <div style="font-size:2rem;margin-bottom:0.75rem">${emoji}</div>
      <h3>${title}</h3>
      <p style="font-size:0.8rem;color:var(--text-secondary);margin:0.75rem 0">${desc}</p>
      <button class="btn btn-sm btn-primary" onclick="window._generatePDF('${type}')">📄 Generate PDF</button>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF Generation — collects all exec data and opens print-ready popup
// ═══════════════════════════════════════════════════════════════════════════════
window._generatePDF = async function (type = 'board') {
  const btn = event?.target;
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating...'; }

  try {
    // Fetch all available executive data in parallel
    const [reports, overview, carbon, trust] = await Promise.all([
      api.get('/tenant/owner/ccs/reports').catch(() => null),
      api.get('/tenant/owner/ccs/overview').catch(() => null),
      api.get('/tenant/owner/ccs/carbon-summary').catch(() => null),
      api.get('/tenant/owner/ccs/trust-report').catch(() => null),
    ]);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const orgName = overview?.org_name || 'Organization';

    let html = '';
    if (type === 'board') html = buildBoardReport(orgName, dateStr, reports, overview, carbon, trust);
    else if (type === 'risk') html = buildRiskReport(orgName, dateStr, reports, overview, trust);
    else if (type === 'carbon') html = buildCarbonReport(orgName, dateStr, carbon, overview);
    else html = buildBoardReport(orgName, dateStr, reports, overview, carbon, trust);

    // Open popup and print
    const popup = window.open('', '_blank', 'width=900,height=700');
    popup.document.write(html);
    popup.document.close();
    setTimeout(() => popup.print(), 600);
  } catch (e) {
    console.error('[PDF Export]', e);
    alert('Failed to generate PDF. Please try again.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📄 Generate PDF'; }
  }
};

function pdfStyles() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a2e; line-height: 1.6; padding: 40px; font-size: 11pt; }
    .cover { text-align: center; padding: 60px 0 40px; border-bottom: 3px solid #6d28d9; margin-bottom: 30px; }
    .cover h1 { font-size: 28pt; color: #6d28d9; margin-bottom: 8px; letter-spacing: -0.5px; }
    .cover .subtitle { font-size: 14pt; color: #64748b; margin-bottom: 4px; }
    .cover .date { font-size: 10pt; color: #94a3b8; margin-top: 12px; }
    .cover .badge { display: inline-block; padding: 4px 16px; background: #6d28d9; color: #fff; border-radius: 4px; font-size: 9pt; font-weight: 600; letter-spacing: 0.05em; margin-top: 16px; }
    h2 { font-size: 14pt; color: #6d28d9; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 28px 0 14px; page-break-after: avoid; }
    h3 { font-size: 11pt; color: #334155; margin: 14px 0 8px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 14px 0; }
    .kpi-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; }
    .kpi-value { font-size: 20pt; font-weight: 800; color: #1e293b; }
    .kpi-label { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 4px; }
    .kpi-status { font-size: 7pt; padding: 2px 8px; border-radius: 3px; display: inline-block; margin-top: 6px; font-weight: 600; }
    .good { background: #dcfce7; color: #15803d; }
    .warn { background: #fef3c7; color: #92400e; }
    .bad { background: #fee2e2; color: #b91c1c; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9pt; }
    th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-weight: 600; border-bottom: 2px solid #cbd5e1; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    .bar-container { background: #f1f5f9; border-radius: 4px; height: 12px; width: 100%; }
    .bar-fill { height: 12px; border-radius: 4px; }
    .section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 14px 0; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .alert-box { border-left: 4px solid; padding: 10px 14px; margin: 8px 0; border-radius: 0 6px 6px 0; font-size: 9pt; }
    .alert-critical { border-color: #dc2626; background: #fef2f2; }
    .alert-high { border-color: #ea580c; background: #fff7ed; }
    .alert-medium { border-color: #d97706; background: #fffbeb; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
      .cover { page-break-after: always; }
      h2 { page-break-after: avoid; }
      .card, .kpi-box { break-inside: avoid; }
    }
  `;
}

function buildBoardReport(org, date, reports, overview, carbon, trust) {
  const cm = reports?.current_month || {};
  const ov = overview || {};
  const c = carbon || {};
  const t = trust || {};
  const e = c.emissions || {};
  const f = c.financial_exposure || {};

  return `<!DOCTYPE html><html><head><title>${org} — Board Report</title><style>${pdfStyles()}</style></head><body>
    <div class="cover">
      <h1>${org}</h1>
      <div class="subtitle">Executive Board Report</div>
      <div class="date">${date} · Confidential</div>
      <div class="badge">TRUSTCHECKER INTELLIGENCE</div>
    </div>

    <h2>1. Executive Summary</h2>
    <div class="kpi-grid">
      ${pdfKPI('Trust Score', ov.trust_score || ov.enterprise_trust_score || '—', (ov.trust_score || 0) >= 70)}
      ${pdfKPI('Products', ov.total_products || '—', true)}
      ${pdfKPI('Partners', ov.total_partners || '—', true)}
      ${pdfKPI('Compliance', c.compliance_status || '—', c.compliance_status === 'Pass')}
    </div>

    <h2>2. Operational Activity (Last 30 Days)</h2>
    <div class="kpi-grid">
      ${pdfKPI('Total Scans', cm.scans || 0, true)}
      ${pdfKPI('Fraud Alerts', cm.alerts || 0, (cm.alerts || 0) === 0)}
      ${pdfKPI('Critical Issues', cm.critical || 0, (cm.critical || 0) === 0)}
      ${pdfKPI('Resolved', cm.resolved || 0, true)}
    </div>

    ${reports?.reports?.length > 0 ? `
    <h3>Monthly Trend</h3>
    <table>
      <tr><th>Month</th><th>Scans</th><th>Authentic</th><th>Suspicious</th><th>Counterfeit</th><th>Avg Trust</th></tr>
      ${reports.reports.slice(0, 6).map(r => `<tr><td>${r.title.split('—')[0].trim()}</td><td>${r.scans}</td><td>${r.authentic}</td><td>${r.suspicious}</td><td>${r.counterfeit}</td><td>${r.avg_trust}%</td></tr>`).join('')}
    </table>` : ''}

    <h2>3. Carbon & ESG Exposure</h2>
    <div class="kpi-grid">
      ${pdfKPI('Total Emissions', (e.total_tCO2e || 0) + ' tCO₂e', (e.total_tCO2e || 0) < 10)}
      ${pdfKPI('Carbon Liability', '$' + (f.carbon_liability || 0).toLocaleString(), (f.carbon_liability || 0) < 500)}
      ${pdfKPI('Carbon Grade', e.grade || 'N/A', e.grade === 'A' || e.grade === 'A+' || e.grade === 'B')}
      ${pdfKPI('EBITDA Impact', (f.carbon_tax_impact_pct || 0) + '%', (f.carbon_tax_impact_pct || 0) < 2)}
    </div>
    <div class="section-grid">
      <div class="card">
        <h3>Emissions by Scope</h3>
        ${scopeRow('Scope 1 — Manufacturing', e.scope1, e.total_kgCO2e, '#ef4444')}
        ${scopeRow('Scope 2 — Energy', e.scope2, e.total_kgCO2e, '#f59e0b')}
        ${scopeRow('Scope 3 — Transport', e.scope3, e.total_kgCO2e, '#6366f1')}
      </div>
      <div class="card">
        <h3>Risk Factors</h3>
        ${riskRow('Regulatory', c.risk_factors?.regulatory_risk)}
        ${riskRow('Transition', c.risk_factors?.transition_risk)}
        ${riskRow('Reputation', c.risk_factors?.reputation_risk)}
        ${riskRow('Physical', c.risk_factors?.physical_risk)}
      </div>
    </div>

    <h2>4. Trust & Integrity</h2>
    <div class="kpi-grid">
      ${pdfKPI('Seal Coverage', (t.seal_coverage_pct || 0) + '%', (t.seal_coverage_pct || 0) >= 80)}
      ${pdfKPI('Chain Integrity', (t.chain_integrity_pct || 0) + '%', (t.chain_integrity_pct || 0) >= 90)}
      ${pdfKPI('Blockchain Seals', t.total_seals || 0, true)}
      ${pdfKPI('Evidence Items', t.evidence_count || 0, true)}
    </div>

    <h2>5. Strategic Recommendations</h2>
    ${buildPDFRecommendations(c, e)}

    <div class="footer">
      <span>Generated by TrustChecker Intelligence Platform</span>
      <span>${date} · ${org} · Confidential</span>
    </div>
    <button class="no-print" onclick="window.print()" style="position:fixed;bottom:20px;right:20px;padding:10px 24px;background:#6d28d9;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.2)">🖨️ Print / Save PDF</button>
  </body></html>`;
}

function buildRiskReport(org, date, reports, overview, trust) {
  const cm = reports?.current_month || {};
  const t = trust || {};

  return `<!DOCTYPE html><html><head><title>${org} — Risk Assessment</title><style>${pdfStyles()}</style></head><body>
    <div class="cover">
      <h1>${org}</h1>
      <div class="subtitle">Risk Assessment Report</div>
      <div class="date">${date} · Confidential</div>
      <div class="badge">RISK INTELLIGENCE</div>
    </div>

    <h2>1. Risk Overview</h2>
    <div class="kpi-grid">
      ${pdfKPI('Fraud Alerts (30d)', cm.alerts || 0, (cm.alerts || 0) === 0)}
      ${pdfKPI('Critical Issues', cm.critical || 0, (cm.critical || 0) === 0)}
      ${pdfKPI('Resolution Rate', cm.alerts > 0 ? Math.round((cm.resolved / cm.alerts) * 100) + '%' : '100%', true)}
      ${pdfKPI('Chain Integrity', (t.chain_integrity_pct || 0) + '%', (t.chain_integrity_pct || 0) >= 90)}
    </div>

    <h2>2. Anomaly & Tamper Detection</h2>
    <div class="kpi-grid">
      ${pdfKPI('Total Anomalies', t.anomaly_count || '—', true)}
      ${pdfKPI('Seal Coverage', (t.seal_coverage_pct || 0) + '%', (t.seal_coverage_pct || 0) >= 80)}
      ${pdfKPI('Tamper Events', t.tamper_count || 0, (t.tamper_count || 0) === 0)}
      ${pdfKPI('Blockchain Seals', t.total_seals || 0, true)}
    </div>

    <h2>3. Monthly Threat Trend</h2>
    ${reports?.reports?.length > 0 ? `
    <table>
      <tr><th>Month</th><th>Scans</th><th>Suspicious</th><th>Counterfeit</th><th>Threat Rate</th></tr>
      ${reports.reports.slice(0, 6).map(r => `<tr><td>${r.title.split('—')[0].trim()}</td><td>${r.scans}</td><td>${r.suspicious}</td><td>${r.counterfeit}</td><td style="color:${(r.suspicious + r.counterfeit) / Math.max(1, r.scans) > 0.1 ? '#ef4444' : '#22c55e'}">${((r.suspicious + r.counterfeit) / Math.max(1, r.scans) * 100).toFixed(1)}%</td></tr>`).join('')}
    </table>` : '<p style="color:#64748b">No monthly scan data available.</p>'}

    <h2>4. Risk Mitigation Recommendations</h2>
    <div class="alert-box alert-high"><strong>Partner Screening:</strong> Review all D-grade partners and require ESG improvement plans within 90 days.</div>
    <div class="alert-box alert-medium"><strong>Seal Coverage:</strong> Target 95%+ blockchain seal coverage across all supply chain events.</div>
    <div class="alert-box alert-medium"><strong>Anomaly Response:</strong> Reduce mean-time-to-resolve for critical anomalies to under 24 hours.</div>

    <div class="footer">
      <span>Generated by TrustChecker Intelligence Platform</span>
      <span>${date} · ${org} · Confidential</span>
    </div>
    <button class="no-print" onclick="window.print()" style="position:fixed;bottom:20px;right:20px;padding:10px 24px;background:#6d28d9;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.2)">🖨️ Print / Save PDF</button>
  </body></html>`;
}

function buildCarbonReport(org, date, carbon, overview) {
  const c = carbon || {};
  const e = c.emissions || {};
  const f = c.financial_exposure || {};
  const r = c.risk_factors || {};
  const reg = c.regulatory || {};

  return `<!DOCTYPE html><html><head><title>${org} — Carbon & ESG Report</title><style>${pdfStyles()}</style></head><body>
    <div class="cover">
      <h1>${org}</h1>
      <div class="subtitle">Carbon & ESG Compliance Report</div>
      <div class="date">${date} · Confidential</div>
      <div class="badge">ESG INTELLIGENCE</div>
    </div>

    <h2>1. Carbon Compliance Status</h2>
    <div class="kpi-grid">
      ${pdfKPI('Compliance', c.compliance_status || '—', c.compliance_status === 'Pass')}
      ${pdfKPI('Score', (c.compliance_score || 0) + '/100', (c.compliance_score || 0) >= 50)}
      ${pdfKPI('Grade', e.grade || 'N/A', e.grade === 'A' || e.grade === 'A+' || e.grade === 'B')}
      ${pdfKPI('Maturity', 'Level ' + (c.maturity?.current_level || 1), (c.maturity?.current_level || 1) >= 3)}
    </div>

    <h2>2. Emissions Profile</h2>
    <div class="kpi-grid">
      ${pdfKPI('Total', (e.total_tCO2e || 0) + ' tCO₂e', (e.total_tCO2e || 0) < 10)}
      ${pdfKPI('Scope 1', Math.round(e.scope1 || 0) + ' kg', true)}
      ${pdfKPI('Scope 2', Math.round(e.scope2 || 0) + ' kg', true)}
      ${pdfKPI('Scope 3', Math.round(e.scope3 || 0) + ' kg', true)}
    </div>
    <div class="card" style="margin:14px 0">
      ${scopeRow('Scope 1 — Direct Manufacturing', e.scope1, e.total_kgCO2e, '#ef4444')}
      ${scopeRow('Scope 2 — Energy & Warehousing', e.scope2, e.total_kgCO2e, '#f59e0b')}
      ${scopeRow('Scope 3 — Transport & Distribution', e.scope3, e.total_kgCO2e, '#6366f1')}
    </div>

    <h2>3. Financial Exposure</h2>
    <div class="kpi-grid">
      ${pdfKPI('Carbon Liability', '$' + (f.carbon_liability || 0).toLocaleString(), (f.carbon_liability || 0) < 500)}
      ${pdfKPI('Reg. Fine Risk', '$' + (f.regulatory_fine_risk || 0).toLocaleString(), (f.regulatory_fine_risk || 0) < 100)}
      ${pdfKPI('EBITDA Impact', (f.carbon_tax_impact_pct || 0) + '%', (f.carbon_tax_impact_pct || 0) < 2)}
      ${pdfKPI('ESG Multiplier', '+' + (f.esg_multiplier || 0).toFixed(2) + 'x', (f.esg_multiplier || 0) > 0)}
    </div>

    <h2>4. Regulatory Alignment</h2>
    ${(reg.frameworks || []).length > 0 ? `
    <table>
      <tr><th>Framework</th><th>Region</th><th>Readiness</th><th>Status</th></tr>
      ${reg.frameworks.map(fw => `<tr>
        <td><strong>${fw.name}</strong><br><span style="font-size:8pt;color:#64748b">${fw.full || ''}</span></td>
        <td>${fw.region || ''}</td>
        <td>${fw.readiness_pct || 0}%</td>
        <td style="color:${fw.readiness === 'ready' ? '#15803d' : '#d97706'}">${fw.readiness === 'ready' ? '✓ Ready' : '⚠ Partial'}</td>
      </tr>`).join('')}
    </table>` : '<p style="color:#64748b">No regulatory frameworks assessed.</p>'}

    <h2>5. Partner ESG Intelligence</h2>
    <div class="kpi-grid">
      ${pdfKPI('Partners', c.partner_esg?.total_partners || 0, true)}
      ${pdfKPI('Avg ESG Score', (c.partner_esg?.avg_esg_score || 0).toFixed(1), (c.partner_esg?.avg_esg_score || 0) >= 60)}
      ${pdfKPI('Risk Partners', c.partner_esg?.risk_partners || 0, (c.partner_esg?.risk_partners || 0) === 0)}
      ${pdfKPI('Offsets', c.offsets_recorded || 0, (c.offsets_recorded || 0) > 0)}
    </div>

    <h2>6. Recommendations</h2>
    ${buildPDFRecommendations(c, e)}

    <div class="footer">
      <span>Generated by TrustChecker Carbon Intelligence Engine</span>
      <span>${date} · ${org} · Confidential</span>
    </div>
    <button class="no-print" onclick="window.print()" style="position:fixed;bottom:20px;right:20px;padding:10px 24px;background:#6d28d9;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.2)">🖨️ Print / Save PDF</button>
  </body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF Helper Components
// ═══════════════════════════════════════════════════════════════════════════════
function pdfKPI(label, value, isGood) {
  const cls = isGood ? 'good' : 'bad';
  return `<div class="kpi-box">
    <div class="kpi-value">${value}</div>
    <div class="kpi-label">${label}</div>
    <span class="kpi-status ${cls}">${isGood ? '✓ Good' : '⚠ Alert'}</span>
  </div>`;
}

function scopeRow(label, kg, totalKg, color) {
  const pct = totalKg > 0 ? Math.round((kg || 0) / totalKg * 100) : 0;
  return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f1f5f9">
    <div style="flex:1;font-size:9pt">${label}</div>
    <div style="width:120px"><div class="bar-container"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div></div>
    <div style="width:40px;text-align:right;font-weight:600;font-size:9pt">${pct}%</div>
    <div style="width:60px;text-align:right;font-size:8pt;color:#64748b">${(Math.round((kg || 0) / 100) / 10).toFixed(1)} t</div>
  </div>`;
}

function riskRow(label, pct) {
  const v = pct || 0;
  const color = v >= 70 ? '#ef4444' : v >= 40 ? '#f59e0b' : '#22c55e';
  return `<div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid #f1f5f9">
    <div style="flex:1;font-size:9pt">${label} Risk</div>
    <div style="width:100px"><div class="bar-container"><div class="bar-fill" style="width:${v}%;background:${color}"></div></div></div>
    <div style="width:40px;text-align:right;font-weight:600;font-size:9pt;color:${color}">${v}%</div>
  </div>`;
}

function buildPDFRecommendations(c, e) {
  const recs = [];
  const grade = e?.grade;
  const mat = c?.maturity?.current_level || 1;

  if (grade === 'F') recs.push(['critical', 'Grade F: Restructure high-emission supply routes. Shift air freight → sea/rail transport to achieve 30-45% emissions reduction. Budget: $' + Math.round((e.total_kgCO2e || 0) * 0.02).toLocaleString()]);
  else if (grade === 'D') recs.push(['high', 'Grade D: Prioritize renewable energy adoption and manufacturing optimization to improve carbon footprint.']);
  if (mat <= 1) recs.push(['high', 'Maturity L1: Deploy GRI 305 reporting, start carbon offset procurement, and enable blockchain evidence to advance to Level 2.']);
  if ((c?.offsets_recorded || 0) === 0) recs.push(['high', 'No carbon offsets recorded. Purchase verified offsets (Gold Standard/Verra) to hedge $' + (c?.financial_exposure?.carbon_liability || 0).toLocaleString() + ' liability.']);
  if ((c?.compliance_score || 0) < 50) recs.push(['high', 'Compliance score ' + (c?.compliance_score || 0) + '/100 — below threshold. Improve regulatory readiness and partner ESG screening.']);
  if (e?.scope3 > 0 && e?.total_kgCO2e > 0 && e.scope3 / e.total_kgCO2e > 0.6) recs.push(['medium', 'Scope 3 at ' + Math.round(e.scope3 / e.total_kgCO2e * 100) + '% of emissions. Nearshore suppliers and consolidate shipments to reduce logistics dependency.']);

  if (recs.length === 0) return '<p style="color:#15803d">✓ No critical recommendations. Continue monitoring.</p>';

  return recs.map(([sev, text]) => `<div class="alert-box alert-${sev}"><strong>${sev === 'critical' ? '🚨 CRITICAL' : sev === 'high' ? '⚠️ HIGH' : '📊 MEDIUM'}:</strong> ${text}</div>`).join('');
}

window.refreshCarbonSummary = function () {
  _data = null;
  const el = document.getElementById('main-content');
  if (el) el.innerHTML = renderPage();
};
