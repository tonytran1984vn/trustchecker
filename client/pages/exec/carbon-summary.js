/**
 * Executive – Carbon Capital Summary
 * ═════════════════════════════════════
 * Carbon → Financial Exposure abstraction for CEO
 * Data from PostgreSQL + Carbon Engine via /owner/ccs/carbon-summary
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

let _data = null;

export function renderPage() {
  if (!_data) { loadData(); return loadingState(); }
  const d = _data;
  const e = d.emissions;
  const f = d.financial_exposure;
  const r = d.risk_factors;

  const statusColor = d.compliance_status === 'Pass' ? '#22c55e' : d.compliance_status === 'At Risk' ? '#f59e0b' : '#ef4444';
  const statusIcon = d.compliance_status === 'Pass' ? '✓' : d.compliance_status === 'At Risk' ? '⚠' : '✕';

  return `
    <div class="exec-page" style="font-feature-settings:'tnum'">
      <div class="exec-header">
        <h1>${icon('leaf', 28)} Carbon Capital</h1>
        <div class="exec-timestamp">
          ESG financial exposure · ${d.products_assessed} products assessed
          <button class="btn btn-sm btn-ghost" onclick="window.refreshCarbonSummary && window.refreshCarbonSummary()">🔄 Refresh</button>
        </div>
      </div>

      <!-- Compliance Status Hero -->
      <section class="exec-section">
        <div class="exec-integrity-card">
          <div class="exec-integrity-score">
            <div class="exec-score-circle" style="border-color:${statusColor}">
              <div class="exec-score-value" style="color:${statusColor};font-size:1.2rem">${statusIcon}</div>
              <div class="exec-score-label" style="font-size:0.75rem">${d.compliance_status}</div>
            </div>
            <div class="exec-score-meta">
              <h3>Carbon Compliance Status</h3>
              <div class="exec-score-breakdown">
                ${scoreLine('Regulatory Risk', Math.max(0, Math.min(100, 100 - r.regulatory_risk)))}
                ${scoreLine('Transition Risk', Math.max(0, Math.min(100, 100 - r.transition_risk)))}
                ${scoreLine('Reputation Risk', Math.max(0, Math.min(100, 100 - r.reputation_risk)))}
                ${scoreLine('Physical Risk', Math.max(0, Math.min(100, 100 - r.physical_risk)))}
              </div>
              <div style="margin-top:1rem;font-size:0.82rem;color:var(--text-secondary)">
                Maturity: <strong>${d.maturity?.level_name || 'Level 1'}</strong> · Grade: <strong style="color:${e.grade === 'A+' || e.grade === 'A' ? '#22c55e' : e.grade === 'B' ? '#f59e0b' : '#ef4444'}">${e.grade}</strong> ${e.grade_label}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Financial Exposure KPIs -->
      <section class="exec-section">
        <h2 class="exec-section-title" style="letter-spacing:0.025em">${icon('dollarSign', 20)} Carbon Financial Exposure</h2>
        <div class="exec-kpi-grid" style="grid-template-columns: repeat(4, 1fr)">
          ${kpi('Carbon Liability', '$' + f.carbon_liability.toLocaleString(), f.carbon_liability === 0, '#ef4444', 'alertTriangle')}
          ${kpi('Regulatory Fine Risk', '$' + f.regulatory_fine_risk.toLocaleString(), f.regulatory_fine_risk === 0, '#f59e0b', 'shield')}
          ${kpi('EBITDA Impact', f.carbon_tax_impact_pct + '%', f.carbon_tax_impact_pct < 2, '#6366f1', 'target')}
          ${kpi('ESG Multiplier', (f.esg_multiplier >= 0 ? '+' : '') + f.esg_multiplier.toFixed(2) + 'x', f.esg_multiplier >= 0, '#22c55e', 'star')}
        </div>
        <div style="font-size:0.72rem;opacity:0.45;margin-top:0.5rem;text-align:right">Carbon price: €${f.carbon_price_per_tonne}/tonne (EU ETS reference)</div>
      </section>

      <!-- Emissions Breakdown -->
      <section class="exec-section">
        <h2 class="exec-section-title" style="letter-spacing:0.025em">${icon('activity', 20)} Emissions Profile</h2>
        <div class="exec-grid-2">
          <div class="exec-card">
            <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:1.5rem">Scope Breakdown <span style="font-weight:400;opacity:0.5;font-size:0.85rem">(tCO₂e)</span></h3>
            <div style="font-size:2rem;font-weight:800;margin-bottom:1rem">${e.total_tCO2e.toLocaleString()} <span style="font-size:0.9rem;font-weight:400;opacity:0.5">tCO₂e</span></div>
            ${scopeBar('Scope 1 — Direct', e.scope1, e.total_kgCO2e, '#ef4444')}
            ${scopeBar('Scope 2 — Energy', e.scope2, e.total_kgCO2e, '#f59e0b')}
            ${scopeBar('Scope 3 — Supply Chain', e.scope3, e.total_kgCO2e, '#6366f1')}
            <div style="margin-top:1rem;font-size:0.75rem;opacity:0.5">Offsets recorded: ${d.offsets_recorded}</div>
          </div>
          <div class="exec-card">
            <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:1.5rem">Regulatory Alignment <span style="font-weight:400;opacity:0.5;font-size:0.85rem">(${d.regulatory.aligned_count}/${d.regulatory.total_frameworks})</span></h3>
            ${d.regulatory.frameworks.length > 0
      ? d.regulatory.frameworks.map(fw => regRow(fw)).join('')
      : '<div style="color:var(--text-secondary);font-size:0.82rem;padding:1rem 0">No regulatory frameworks assessed</div>'}
          </div>
        </div>
      </section>

      <!-- Partner ESG -->
      <section class="exec-section">
        <h2 class="exec-section-title" style="letter-spacing:0.025em">${icon('network', 20)} Partner ESG Intelligence</h2>
        <div class="exec-kpi-grid" style="grid-template-columns: repeat(4, 1fr)">
          ${kpi('Partners Assessed', d.partner_esg.total_partners.toLocaleString(), true, '#8b5cf6', 'network')}
          ${kpi('Avg ESG Score', d.partner_esg.avg_esg_score.toFixed(1), d.partner_esg.avg_esg_score >= 60, '#22c55e', 'star')}
          ${kpi('Risk Partners', d.partner_esg.risk_partners.toLocaleString(), d.partner_esg.risk_partners === 0, '#ef4444', 'alertTriangle')}
          ${kpi('Products Scoped', d.products_assessed.toLocaleString(), true, '#3b82f6', 'box')}
        </div>
        ${d.partner_esg.top_performers.length > 0 ? `
        <div class="exec-card" style="margin-top:1rem">
          <h3 style="font-size:0.85rem;font-weight:600;opacity:0.6;margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.03em">Top ESG Performers</h3>
          ${d.partner_esg.top_performers.map((p, i) => `
          <div style="display:flex;align-items:center;gap:1rem;padding:0.5rem 0;border-bottom:1px solid var(--border-color,rgba(255,255,255,0.04))">
            <div style="width:24px;font-size:0.85rem;font-weight:700;color:${i === 0 ? '#f59e0b' : 'var(--text-secondary)'}">#${i + 1}</div>
            <div style="flex:1;font-weight:500">${p.name || 'Unknown'}</div>
            <div style="font-weight:700;color:${p.score >= 80 ? '#22c55e' : p.score >= 50 ? '#f59e0b' : '#ef4444'}">${p.score?.toFixed(1) || '—'}</div>
            <div style="font-size:0.78rem;opacity:0.6">${p.grade || '—'}</div>
          </div>`).join('')}
        </div>` : ''}
      </section>
    </div>
  `;
}

async function loadData() {
  try {
    const r = await api.get('/tenant/owner/ccs/carbon-summary');
    _data = r;
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
  } catch (e) { console.error('[Carbon Summary]', e); }
}

function loadingState() {
  return `<div class="exec-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading carbon intelligence...</div></div></div>`;
}

function scoreLine(label, score) {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  return `
    <div class="exec-score-line">
      <span>${label}</span>
      <div class="exec-score-bar"><div class="exec-score-fill" style="width:${score}%;background:${color}"></div></div>
      <span class="exec-score-num">${score}%</span>
    </div>`;
}

function kpi(label, value, isGood, color, iconName) {
  return `
    <div class="exec-kpi-card">
      <div class="exec-kpi-icon" style="color:${color}">${icon(iconName, 20)}</div>
      <div class="exec-kpi-value" style="font-size:1.1rem">${value}</div>
      <div class="exec-kpi-label" style="letter-spacing:0.025em">${label}</div>
      <div class="exec-kpi-change ${isGood ? 'exec-change-good' : 'exec-change-bad'}">${isGood ? '✓ Good' : '⚠ Alert'}</div>
    </div>`;
}

function scopeBar(label, kgCO2, totalKg, color) {
  const pct = totalKg > 0 ? Math.round(100 * kgCO2 / totalKg) : 0;
  const tCO2 = Math.round(kgCO2 / 100) / 10;
  return `
    <div style="display:flex;align-items:center;gap:1rem;padding:0.6rem 0;border-bottom:1px solid var(--border-color,rgba(255,255,255,0.04))">
      <div style="flex:1;font-size:0.88rem;font-weight:500">${label}</div>
      <div style="width:120px">
        <div class="exec-score-bar" style="background:${color}15"><div class="exec-score-fill" style="width:${pct}%;background:${color}"></div></div>
      </div>
      <div style="width:50px;text-align:right;font-weight:600;font-size:0.85rem">${pct}%</div>
      <div style="width:70px;text-align:right;color:var(--text-secondary);font-size:0.78rem">${tCO2.toLocaleString()} t</div>
    </div>`;
}

function regRow(fw) {
  const statusColor = fw.status === 'aligned' || fw.status === 'compliant' ? '#22c55e' : fw.status === 'partial' ? '#f59e0b' : '#ef4444';
  const statusLabel = fw.status === 'aligned' || fw.status === 'compliant' ? '✓ Aligned' : fw.status === 'partial' ? '⚠ Partial' : '✕ Gap';
  return `
    <div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0;border-bottom:1px solid var(--border-color,rgba(255,255,255,0.04))">
      <div style="flex:1;font-size:0.9rem;font-weight:500">${fw.name || fw.id || 'Unknown'}</div>
      <div style="font-size:0.78rem;opacity:0.5">${fw.region || ''}</div>
      <div style="font-size:0.82rem;font-weight:600;color:${statusColor}">${statusLabel}</div>
    </div>`;
}

window.refreshCarbonSummary = function () {
  _data = null;
  const el = document.getElementById('main-content');
  if (el) el.innerHTML = renderPage();
};
