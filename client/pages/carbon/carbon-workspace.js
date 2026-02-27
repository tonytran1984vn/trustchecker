/**
 * TrustChecker — Carbon Officer Workspace
 * ═══════════════════════════════════════════════════════════════
 * "Own the carbon story. Monitor, measure, mint."
 *
 * 6 Modules (Carbon Governance Architecture):
 *   1. Carbon Overview — KPIs, scope split, maturity, recent activity
 *   2. Emission Tracker — Scope 1/2/3 breakdown, per-product footprint
 *   3. Credit Lifecycle — Credit ledger, mint pipeline, simulate
 *   4. Carbon Passports — CIP list, issue passport
 *   5. ESG & Compliance — Regulatory alignment, risk factors
 *   6. Industry Benchmark — Maturity, leaderboard, comparisons
 */
import { State, render } from '../../core/state.js';
import { API } from '../../core/api.js';
import { showToast } from '../../components/toast.js';
import { icon } from '../../core/icons.js';

// ─── State ──────────────────────────────────────────────────
let _dashData = {};
let _dashLoaded = false;
let _emissionData = {};
let _emissionLoaded = false;
let _creditData = {};
let _creditLoaded = false;
let _passportData = {};
let _passportLoaded = false;
let _complianceData = {};
let _complianceLoaded = false;
let _benchmarkData = {};
let _benchmarkLoaded = false;
let _activeTab = 'dashboard';

// Date range for report period
let _dateFrom = '';
let _dateTo = '';
let _datePreset = 'all';

// ─── Tab Registry ───────────────────────────────────────────
const CARBON_TABS = [
  { id: 'dashboard', label: 'Carbon Overview', icon: '📊' },
  { id: 'emissions', label: 'Emission Tracker', icon: '🏭' },
  { id: 'credits', label: 'Credit Lifecycle', icon: '💎' },
  { id: 'passport', label: 'Carbon Passports', icon: '📜' },
  { id: 'compliance', label: 'ESG & Compliance', icon: '⚖️' },
  { id: 'benchmark', label: 'Industry Benchmark', icon: '📈' },
];

// ─── Entry Point ────────────────────────────────────────────
export function renderPage() {
  setTimeout(() => loadDashboard(), 50);
  return `
    <div id="carbon-content">
      <div class="loading"><div class="spinner"></div></div>
    </div>
  `;
}

window._carbonOfficerTab = function (tab) {
  _activeTab = tab;
  window._activeCarbonTab = tab;
  const el = document.getElementById('carbon-content');
  if (el && ['emissions', 'credits', 'passport', 'compliance', 'benchmark'].includes(tab)) {
    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px">
      <div class="spinner"></div>
      <div style="font-size:0.78rem;color:var(--text-muted)">Loading ${CARBON_TABS.find(t => t.id === tab)?.label || tab}…</div>
    </div>`;
  }
  if (tab === 'dashboard') { renderContent(); loadDashboard(); }
  else if (tab === 'emissions') loadEmissions();
  else if (tab === 'credits') loadCredits();
  else if (tab === 'passport') loadPassports(_dateFrom, _dateTo);
  else if (tab === 'compliance') loadCompliance();
  else if (tab === 'benchmark') loadBenchmark();
  else renderContent();
};

// ─── Date Range Controls ────────────────────────────────────
window._carbonDatePreset = function (preset) {
  _datePreset = preset;
  const now = new Date();
  const fmt = d => d.toISOString().slice(0, 10);
  switch (preset) {
    case '30d': _dateFrom = fmt(new Date(now - 30 * 86400000)); _dateTo = fmt(now); break;
    case '90d': _dateFrom = fmt(new Date(now - 90 * 86400000)); _dateTo = fmt(now); break;
    case 'year': _dateFrom = `${now.getFullYear()}-01-01`; _dateTo = fmt(now); break;
    case 'last_year': _dateFrom = `${now.getFullYear() - 1}-01-01`; _dateTo = `${now.getFullYear() - 1}-12-31`; break;
    case 'all': _dateFrom = ''; _dateTo = ''; break;
    case 'custom': renderContent(); return; // Show date inputs, don't reload yet
  }
  _passportLoaded = false;
  loadPassports(_dateFrom, _dateTo);
};

window._carbonDateCustom = function () {
  const from = document.getElementById('carbon-date-from')?.value || '';
  const to = document.getElementById('carbon-date-to')?.value || '';
  _datePreset = 'custom';
  _dateFrom = from;
  _dateTo = to;
  _passportLoaded = false;
  loadPassports(from, to);
};

// ─── Data Loaders ───────────────────────────────────────────
async function loadDashboard() {
  try {
    _dashData = await API.get('/carbon-officer/dashboard');
    _dashLoaded = true;
    renderContent();
  } catch (e) {
    console.error('[Carbon] Dashboard load error:', e);
    _dashData = {};
    _dashLoaded = true;
    renderContent();
  }
}

async function loadEmissions() {
  try {
    const [scope, risk] = await Promise.all([
      API.get('/scm/carbon/scope').catch(() => ({})),
      API.get('/scm/carbon/risk-factors').catch(() => ({})),
    ]);
    _emissionData = { scope, risk };
    _emissionLoaded = true;
    renderContent();
  } catch (e) { _emissionData = {}; _emissionLoaded = true; renderContent(); }
}

async function loadCredits() {
  try {
    const [registry, simulations] = await Promise.all([
      API.get('/scm/carbon-credit/registry').catch(() => ({ credits: [] })),
      API.get('/scm/carbon-credit/simulations?limit=20').catch(() => ({ simulations: [] })),
    ]);
    _creditData = { registry: registry.credits || registry, simulations: simulations.simulations || simulations };
    _creditLoaded = true;
    renderContent();
  } catch (e) { _creditData = {}; _creditLoaded = true; renderContent(); }
}

async function loadPassports(from, to) {
  try {
    const qs = (from || to) ? `?${from ? `from=${from}` : ''}${from && to ? '&' : ''}${to ? `to=${to}` : ''}` : '';
    const [scope, report] = await Promise.all([
      API.get(`/scm/carbon/scope${qs}`).catch(() => ({})),
      API.get(`/scm/carbon/report${qs}`).catch(() => ({})),
    ]);
    _passportData = { scope, report };
    _passportLoaded = true;
    renderContent();
  } catch (e) { _passportData = {}; _passportLoaded = true; renderContent(); }
}

async function loadCompliance() {
  try {
    const [regulatory, risk] = await Promise.all([
      API.get('/scm/carbon/regulatory').catch(() => ({})),
      API.get('/scm/carbon/risk-factors').catch(() => ({})),
    ]);
    _complianceData = { regulatory, risk };
    _complianceLoaded = true;
    renderContent();
  } catch (e) { _complianceData = {}; _complianceLoaded = true; renderContent(); }
}

async function loadBenchmark() {
  try {
    const [maturity, leaderboard] = await Promise.all([
      API.get('/scm/carbon/maturity').catch(() => ({})),
      API.get('/scm/carbon/leaderboard').catch(() => ({})),
    ]);
    _benchmarkData = { maturity, leaderboard };
    _benchmarkLoaded = true;
    renderContent();
  } catch (e) { _benchmarkData = {}; _benchmarkLoaded = true; renderContent(); }
}

function renderContent() {
  const el = document.getElementById('carbon-content');
  if (!el) return;
  const renderers = {
    dashboard: renderOverview,
    emissions: renderEmissions,
    credits: renderCredits,
    passport: renderPassports,
    compliance: renderCompliance,
    benchmark: renderBenchmark,
  };
  el.innerHTML = (renderers[_activeTab] || renderOverview)();
}

// ═══════════════════════════════════════════════════════════════
// 1. CARBON OVERVIEW DASHBOARD
// ═══════════════════════════════════════════════════════════════
function renderOverview() {
  if (!_dashLoaded) return spinner('Loading Carbon Overview…');

  const d = _dashData;
  const totalKg = d.total_emissions_kgCO2e || 0;
  const totalT = d.total_emissions_tCO2e || 0;
  const s1 = d.scope_breakdown?.scope1 || {};
  const s2 = d.scope_breakdown?.scope2 || {};
  const s3 = d.scope_breakdown?.scope3 || {};
  const grade = d.esg_grade || 'N/A';
  const gradeColor = grade.startsWith('A') ? '#10b981' : grade.startsWith('B') ? '#22c55e' : grade.startsWith('C') ? '#f59e0b' : '#ef4444';

  const scopeBar = (label, kg, pct, color) => `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:0.72rem;margin-bottom:4px">
        <span style="font-weight:600">${label}</span>
        <span>${(kg || 0).toLocaleString()} kgCO₂e (${pct || 0}%)</span>
      </div>
      <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
        <div style="width:${Math.max(pct || 0, 2)}%;height:100%;background:${color};border-radius:4px;transition:width 0.4s ease"></div>
      </div>
    </div>`;

  const activity = (d.recent_activity || []).slice(0, 8).map(a => {
    let det = {}; try { det = typeof a.details === 'string' ? JSON.parse(a.details) : a.details || {}; } catch (_) { }
    return `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.72rem">
      <span><span style="padding:2px 8px;border-radius:4px;background:#05966920;color:#059669;font-size:0.68rem;font-weight:600">${a.action || '—'}</span> ${esc(a.actor_email || '—')}</span>
      <span style="color:var(--text-muted)">${timeAgo(a.timestamp)}</span>
    </div>`;
  }).join('') || '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.72rem">No recent carbon activity</div>';

  return `
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px">
      ${kpi('Total Emissions', `${totalT} t`, totalKg > 0 ? '#f59e0b' : '#10b981', `${(totalKg || 0).toLocaleString()} kgCO₂e`)}
      ${kpi('ESG Grade', grade, gradeColor, 'Overall carbon rating')}
      ${kpi('Credits Minted', d.credits_minted || 0, '#10b981', `${d.credits_total_tCO2e || 0} tCO₂e total`)}
      ${kpi('Credits Pending', d.credits_pending || 0, '#f59e0b', 'Awaiting approval')}
      ${kpi('Products Tracked', d.products_tracked || 0, 'var(--text-primary,#1e293b)', 'Carbon footprint calculated')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card" style="border-left:4px solid #059669">
        <div class="card-header"><div class="card-title">🏭 Scope Breakdown</div></div>
        <div class="card-body">
          ${scopeBar('Scope 1 — Direct', s1.kgCO2e, s1.percentage, '#ef4444')}
          ${scopeBar('Scope 2 — Energy', s2.kgCO2e, s2.percentage, '#f59e0b')}
          ${scopeBar('Scope 3 — Supply Chain', s3.kgCO2e, s3.percentage, '#3b82f6')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">⚡ Recent Activity</div></div>
        <div class="card-body" style="max-height:260px;overflow-y:auto">${activity}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      ${kpi('Maturity Level', `L${d.maturity_level || 0}`, '#8b5cf6', d.maturity_name || 'Not Assessed')}
      ${kpi('Simulations', d.simulations_total || 0, '#06b6d4', `${d.simulations_eligible || 0} credit-eligible`)}
      ${kpi('Regulatory', `${d.regulatory_compliant || 0}/${d.regulatory_total || 0}`, d.regulatory_compliant >= d.regulatory_total ? '#10b981' : '#f59e0b', 'Frameworks aligned')}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// 2. EMISSION TRACKER
// ═══════════════════════════════════════════════════════════════
function renderEmissions() {
  if (!_emissionLoaded) return spinner('Loading Emission Tracker…');

  const scope = _emissionData.scope || {};
  // API returns scope_1/scope_2/scope_3 with .total and .pct
  const s1 = { kgCO2e: scope.scope_1?.total || 0, percentage: scope.scope_1?.pct || 0, breakdown: scope.scope_1?.breakdown || scope.scope_1?.items || [] };
  const s2 = { kgCO2e: scope.scope_2?.total || 0, percentage: scope.scope_2?.pct || 0, breakdown: scope.scope_2?.breakdown || scope.scope_2?.items || [] };
  const s3 = { kgCO2e: scope.scope_3?.total || 0, percentage: scope.scope_3?.pct || 0, breakdown: scope.scope_3?.breakdown || scope.scope_3?.items || [] };
  const totalKg = scope.total_emissions_kgCO2e || 0;
  const totalT = scope.total_emissions_tonnes || (totalKg / 1000).toFixed(2);
  const grade = totalKg === 0 ? 'N/A' : totalKg < 1000 ? 'A' : totalKg < 5000 ? 'B' : totalKg < 20000 ? 'C' : totalKg < 50000 ? 'D' : 'F';
  const gradeColor = grade.startsWith('A') ? '#10b981' : grade.startsWith('B') ? '#22c55e' : grade.startsWith('C') ? '#f59e0b' : '#ef4444';

  const riskFactors = (_emissionData.risk?.risk_factors || []).map(f => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-weight:700;font-size:0.75rem">${esc(f.name || f.factor)}</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">${esc(f.description || f.impact || '—')}</div>
      </div>
      <span style="font-size:0.68rem;padding:3px 10px;border-radius:10px;font-weight:700;background:${f.severity === 'high' || f.level === 'high' ? '#ef444420' : f.severity === 'medium' || f.level === 'medium' ? '#f59e0b20' : '#10b98120'};color:${f.severity === 'high' || f.level === 'high' ? '#ef4444' : f.severity === 'medium' || f.level === 'medium' ? '#f59e0b' : '#10b981'}">${f.severity || f.level || 'low'}</span>
    </div>
  `).join('') || '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.72rem">No risk factors detected</div>';

  // Scope detail table
  const scopeDetail = (label, data, color) => {
    const items = data.breakdown || data.items || [];
    const rows = items.length > 0
      ? items.map(i => `<tr>
          <td style="font-size:0.72rem">${esc(i.category || i.name || '—')}</td>
          <td style="font-size:0.72rem;text-align:right;font-weight:700">${(i.kgCO2e || i.value || 0).toLocaleString()}</td>
          <td style="font-size:0.72rem;text-align:right;color:var(--text-muted)">${i.percentage || 0}%</td>
        </tr>`).join('')
      : `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);font-size:0.72rem;padding:12px">No breakdown data</td></tr>`;
    return `
    <div class="card" style="border-left:4px solid ${color};margin-bottom:12px">
      <div class="card-header">
        <div class="card-title">${label}</div>
        <div style="font-size:0.72rem;font-weight:700;color:${color}">${(data.kgCO2e || 0).toLocaleString()} kgCO₂e</div>
      </div>
      <div class="card-body">
        <table class="data-table"><thead><tr><th>Category</th><th style="text-align:right">kgCO₂e</th><th style="text-align:right">%</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
    </div>`;
  };

  return `
    <div style="display:flex;gap:12px;margin-bottom:16px">
      ${kpi('Total Emissions', `${(totalKg / 1000).toFixed(2)} t`, '#f59e0b', `${totalKg.toLocaleString()} kgCO₂e`)}
      ${kpi('ESG Grade', grade, gradeColor, scope.grade_label || 'Carbon rating')}
      ${kpi('Scope 1', `${(s1.kgCO2e || 0).toLocaleString()} kg`, '#ef4444', `${s1.percentage || 0}% direct`)}
      ${kpi('Scope 2', `${(s2.kgCO2e || 0).toLocaleString()} kg`, '#f59e0b', `${s2.percentage || 0}% energy`)}
      ${kpi('Scope 3', `${(s3.kgCO2e || 0).toLocaleString()} kg`, '#3b82f6', `${s3.percentage || 0}% supply chain`)}
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
      <div>
        ${scopeDetail('Scope 1 — Direct Emissions', s1, '#ef4444')}
        ${scopeDetail('Scope 2 — Energy (Indirect)', s2, '#f59e0b')}
        ${scopeDetail('Scope 3 — Value Chain', s3, '#3b82f6')}
      </div>
      <div class="card" style="border-left:4px solid #8b5cf6">
        <div class="card-header"><div class="card-title">⚠️ Carbon Risk Factors</div></div>
        <div class="card-body" style="max-height:600px;overflow-y:auto">${riskFactors}</div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// 3. CREDIT LIFECYCLE
// ═══════════════════════════════════════════════════════════════
function renderCredits() {
  if (!_creditLoaded) return spinner('Loading Credit Lifecycle…');

  const credits = Array.isArray(_creditData.registry) ? _creditData.registry : [];
  const sims = Array.isArray(_creditData.simulations) ? _creditData.simulations : [];

  const statusColor = s => {
    if (s === 'minted' || s === 'active') return '#10b981';
    if (s === 'pending') return '#f59e0b';
    if (s === 'retired') return '#6b7280';
    if (s === 'rejected') return '#ef4444';
    return '#64748b';
  };

  const creditRows = credits.slice(0, 30).map(c => `
    <tr>
      <td style="font-size:0.68rem;font-family:monospace;color:var(--text-muted)">${esc((c.credit_id || c.id || '').substring(0, 12))}…</td>
      <td style="font-size:0.72rem;font-weight:700">${c.quantity_tCO2e || 0} tCO₂e</td>
      <td><span style="font-size:0.65rem;padding:2px 8px;border-radius:10px;font-weight:600;background:${statusColor(c.status)}20;color:${statusColor(c.status)}">${(c.status || 'unknown').toUpperCase()}</span></td>
      <td style="font-size:0.68rem;color:var(--text-muted)">${c.vintage || '—'}</td>
      <td style="font-size:0.68rem;color:var(--text-muted)">${c.methodology || '—'}</td>
      <td style="font-size:0.68rem;color:var(--text-muted)">${timeAgo(c.created_at || c.minted_at)}</td>
    </tr>
  `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;font-size:0.72rem">No credits in registry</td></tr>';

  const simRows = sims.slice(0, 15).map(s => {
    const eligible = s.credit_eligible || s.pipeline_result === 'minted';
    return `
    <tr>
      <td style="font-size:0.68rem;font-family:monospace;color:var(--text-muted)">${esc((s.simulation_id || s.id || '').substring(0, 10))}…</td>
      <td style="font-size:0.72rem">${s.route_type || '—'}</td>
      <td style="font-size:0.72rem">${s.distance_km || 0} km</td>
      <td style="font-size:0.72rem;font-weight:700">${(s.actual_emission || 0).toFixed(2)} kg</td>
      <td style="font-size:0.72rem;color:${(s.reduction_pct || 0) >= 20 ? '#10b981' : '#f59e0b'};font-weight:700">${(s.reduction_pct || 0).toFixed(1)}%</td>
      <td><span style="font-size:0.65rem;padding:2px 8px;border-radius:10px;font-weight:600;background:${eligible ? '#10b98120' : '#f59e0b20'};color:${eligible ? '#10b981' : '#f59e0b'}">${eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}</span></td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;font-size:0.72rem">No simulations yet</td></tr>';

  const minted = credits.filter(c => c.status === 'minted' || c.status === 'active').length;
  const pending = credits.filter(c => c.status === 'pending').length;
  const retired = credits.filter(c => c.status === 'retired').length;

  return `
    <div style="display:flex;gap:12px;margin-bottom:16px">
      ${kpi('Total Credits', credits.length, 'var(--text-primary,#1e293b)', 'In registry')}
      ${kpi('Active / Minted', minted, '#10b981', 'Available credits')}
      ${kpi('Pending', pending, '#f59e0b', 'Awaiting MRV')}
      ${kpi('Retired', retired, '#6b7280', 'Used / retired')}
    </div>

    <div class="card" style="margin-bottom:16px;border-left:4px solid #10b981">
      <div class="card-header">
        <div class="card-title">💎 Carbon Credit Ledger</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">${credits.length} credits · Blockchain-anchored</div>
      </div>
      <div class="card-body" style="max-height:350px;overflow-y:auto">
        <table class="data-table">
          <thead><tr><th>Credit ID</th><th>Quantity</th><th>Status</th><th>Vintage</th><th>Methodology</th><th>Created</th></tr></thead>
          <tbody>${creditRows}</tbody>
        </table>
      </div>
    </div>

    <div class="card" style="border-left:4px solid #06b6d4">
      <div class="card-header">
        <div class="card-title">🧪 Pipeline Simulations</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">${sims.length} simulations · 7-Layer CCME</div>
      </div>
      <div class="card-body" style="max-height:300px;overflow-y:auto">
        <table class="data-table">
          <thead><tr><th>Sim ID</th><th>Route</th><th>Distance</th><th>Emission</th><th>Reduction</th><th>Eligible</th></tr></thead>
          <tbody>${simRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// 4. CARBON PASSPORTS (CIP)
// ═══════════════════════════════════════════════════════════════
function renderPassports() {
  if (!_passportLoaded) return spinner('Loading Carbon Passports…');

  const report = _passportData.report || {};
  const scope = _passportData.scope || {};
  const grade = (() => { const t = scope.total_emissions_kgCO2e || 0; return report.grade || (t === 0 ? 'N/A' : t < 1000 ? 'A' : t < 5000 ? 'B' : t < 20000 ? 'C' : t < 50000 ? 'D' : 'F'); })();
  const gradeColor = grade.startsWith('A') ? '#10b981' : grade.startsWith('B') ? '#22c55e' : grade.startsWith('C') ? '#f59e0b' : '#ef4444';

  // Presets
  const presets = [
    { id: 'all', label: 'All Time' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '90 Days' },
    { id: 'year', label: 'This Year' },
    { id: 'last_year', label: 'Last Year' },
    { id: 'custom', label: 'Custom' },
  ];
  const presetBtns = presets.map(p => {
    const isActive = _datePreset === p.id;
    return `<button onclick="_carbonDatePreset('${p.id}')" style="
      padding:5px 14px;border-radius:8px;border:1px solid ${isActive ? '#3b82f6' : 'var(--border)'};
      background:${isActive ? '#3b82f620' : 'transparent'};color:${isActive ? '#3b82f6' : 'var(--text-muted)'};
      font-size:0.7rem;font-weight:${isActive ? '700' : '500'};cursor:pointer;transition:all .2s;
    ">${p.label}</button>`;
  }).join('');

  const showCustom = _datePreset === 'custom';
  const periodLabel = _dateFrom && _dateTo ? `${_dateFrom} — ${_dateTo}` : _dateFrom ? `From ${_dateFrom}` : _dateTo ? `Until ${_dateTo}` : report.period || 'All Time';

  const datePicker = `
    <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span style="font-size:0.72rem;font-weight:700;margin-right:4px">📅 Report Period</span>
      ${presetBtns}
      ${showCustom ? `
        <span style="font-size:0.68rem;color:var(--text-muted);margin-left:8px">From</span>
        <input type="date" id="carbon-date-from" value="${esc(_dateFrom)}" style="font-size:0.7rem;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-card,#fff);color:var(--text-primary,#1e293b)">
        <span style="font-size:0.68rem;color:var(--text-muted)">To</span>
        <input type="date" id="carbon-date-to" value="${esc(_dateTo)}" style="font-size:0.7rem;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-card,#fff);color:var(--text-primary,#1e293b)">
        <button onclick="_carbonDateCustom()" style="padding:5px 14px;border-radius:8px;border:1px solid #3b82f6;background:#3b82f6;color:#fff;font-size:0.7rem;font-weight:700;cursor:pointer">Apply</button>
      ` : ''}
    </div>`;


  // GRI disclosures
  const disclosures = (report.disclosures || []).map(d => `
    <tr>
      <td style="font-size:0.72rem;font-weight:700;color:#3b82f6">${esc(d.code || d.id)}</td>
      <td style="font-size:0.72rem">${esc(d.title || d.name)}</td>
      <td style="font-size:0.72rem;font-weight:600">${typeof d.value === 'number' ? d.value.toLocaleString() : esc(d.value || '—')}</td>
      <td style="font-size:0.68rem;color:var(--text-muted)">${esc(d.unit || '—')}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;font-size:0.72rem">No GRI disclosures available</td></tr>';

  // Scope summary
  const scopeSummary = ['scope_1', 'scope_2', 'scope_3'].map(s => {
    const data = scope[s] || {};
    const label = s === 'scope_1' ? 'Scope 1' : s === 'scope_2' ? 'Scope 2' : 'Scope 3';
    const color = s === 'scope_1' ? '#ef4444' : s === 'scope_2' ? '#f59e0b' : '#3b82f6';
    return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.72rem">
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px"></span>${label}</span>
      <span style="font-weight:700">${(data.total || 0).toLocaleString()} kgCO₂e</span>
    </div>`;
  }).join('');

  return `
    ${datePicker}
    <div style="display:flex;gap:12px;margin-bottom:16px">
      ${kpi('ESG Grade', grade, gradeColor, 'Carbon Integrity Rating')}
      ${kpi('GRI Standard', report.standard || 'GHG Protocol', '#3b82f6', 'Reporting framework')}
      ${kpi('Report Period', periodLabel, 'var(--text-primary,#1e293b)', 'Current assessment')}
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
      <div class="card" style="border-left:4px solid #3b82f6">
        <div class="card-header">
          <div class="card-title">📋 GRI-Format Disclosures</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">Carbon Integrity Passport components</div>
        </div>
        <div class="card-body" style="max-height:450px;overflow-y:auto">
          <table class="data-table">
            <thead><tr><th>Code</th><th>Disclosure</th><th>Value</th><th>Unit</th></tr></thead>
            <tbody>${disclosures}</tbody>
          </table>
        </div>
      </div>
      <div>
        <div class="card" style="border-left:4px solid #059669;margin-bottom:12px">
          <div class="card-header"><div class="card-title">📊 Scope Summary</div></div>
          <div class="card-body">${scopeSummary}</div>
        </div>
        <div class="card" style="border-left:4px solid #8b5cf6">
          <div class="card-header"><div class="card-title">📜 Report Metadata</div></div>
          <div class="card-body" style="font-size:0.72rem">
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span>Organization</span><span style="font-weight:700">${esc(report.organization || State.org?.name || '—')}</span></div>
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span>Products Assessed</span><span style="font-weight:700">${report.products_assessed || scope.products_count || 0}</span></div>
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span>Supply Chain Nodes</span><span style="font-weight:700">${report.supply_chain_nodes || scope.shipments_count || 0}</span></div>
            <div style="display:flex;justify-content:space-between;padding:6px 0"><span>Total kgCO₂e</span><span style="font-weight:700;color:#059669">${(scope.total_emissions_kgCO2e || report.total_kgCO2e || 0).toLocaleString()}</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// 5. ESG & COMPLIANCE
// ═══════════════════════════════════════════════════════════════
function renderCompliance() {
  if (!_complianceLoaded) return spinner('Loading ESG & Compliance…');

  const frameworks = _complianceData.regulatory?.frameworks || [];
  const riskFactors = _complianceData.risk?.risk_factors || [];

  const fwRows = frameworks.map(fw => {
    const statusColor = fw.status === 'compliant' ? '#10b981' : fw.status === 'partial' ? '#f59e0b' : fw.status === 'active' ? '#3b82f6' : '#ef4444';
    return `
    <tr>
      <td style="font-size:0.72rem;font-weight:700">${esc(fw.name || fw.id)}</td>
      <td style="font-size:0.68rem;color:var(--text-muted)">${esc(fw.full || fw.description || '—')}</td>
      <td style="font-size:0.68rem">${esc(fw.region || '—')}</td>
      <td style="font-size:0.68rem">${(fw.scopes_required || []).join(', ') || '—'}</td>
      <td><span style="font-size:0.65rem;padding:2px 10px;border-radius:10px;font-weight:700;background:${statusColor}20;color:${statusColor}">${(fw.status || 'unknown').toUpperCase()}</span></td>
      <td style="font-size:0.68rem;color:var(--text-muted)">${fw.effective || '—'}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:16px;font-size:0.72rem">No regulatory frameworks configured</td></tr>';

  const riskRows = riskFactors.map(f => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1">
        <div style="font-weight:700;font-size:0.75rem">${esc(f.name || f.factor)}</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">${esc(f.description || f.mitigation || f.impact || '—')}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span style="font-size:0.68rem;padding:3px 10px;border-radius:10px;font-weight:700;background:${f.severity === 'high' || f.level === 'high' ? '#ef444420' : f.severity === 'medium' || f.level === 'medium' ? '#f59e0b20' : '#10b98120'};color:${f.severity === 'high' || f.level === 'high' ? '#ef4444' : f.severity === 'medium' || f.level === 'medium' ? '#f59e0b' : '#10b981'}">${f.severity || f.level || 'low'}</span>
        ${f.score !== undefined ? `<span style="font-size:0.68rem;font-weight:700">${f.score}</span>` : ''}
      </div>
    </div>
  `).join('') || '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.72rem">No ESG risk factors</div>';

  const compliant = frameworks.filter(f => f.status === 'compliant').length;

  return `
    <div style="display:flex;gap:12px;margin-bottom:16px">
      ${kpi('Frameworks', frameworks.length, 'var(--text-primary,#1e293b)', 'Regulatory frameworks tracked')}
      ${kpi('Compliant', compliant, '#10b981', `${frameworks.length > 0 ? Math.round(compliant / frameworks.length * 100) : 0}% alignment`)}
      ${kpi('Risk Factors', riskFactors.length, riskFactors.some(f => f.severity === 'high' || f.level === 'high') ? '#ef4444' : '#f59e0b', 'ESG risk signals')}
    </div>

    <div class="card" style="margin-bottom:16px;border-left:4px solid #3b82f6">
      <div class="card-header">
        <div class="card-title">⚖️ Regulatory Framework Alignment</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">CBAM · EU-ETS · GHG Protocol · CSRD · Vietnam Green Growth</div>
      </div>
      <div class="card-body" style="max-height:350px;overflow-y:auto">
        <table class="data-table">
          <thead><tr><th>Framework</th><th>Full Name</th><th>Region</th><th>Scopes</th><th>Status</th><th>Effective</th></tr></thead>
          <tbody>${fwRows}</tbody>
        </table>
      </div>
    </div>

    <div class="card" style="border-left:4px solid #f59e0b">
      <div class="card-header"><div class="card-title">⚠️ ESG Risk Factor Index</div></div>
      <div class="card-body" style="max-height:350px;overflow-y:auto">${riskRows}</div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// 6. INDUSTRY BENCHMARK
// ═══════════════════════════════════════════════════════════════
function renderBenchmark() {
  if (!_benchmarkLoaded) return spinner('Loading Industry Benchmark…');

  const maturity = _benchmarkData.maturity || {};
  const leaderboard = _benchmarkData.leaderboard || {};
  const partners = leaderboard.partners || leaderboard.leaderboard || [];

  // Maturity levels
  const levels = maturity.levels || [];
  const currentLevel = maturity.current_level || maturity.level || 0;
  const maturityBar = levels.map(l => {
    const isCurrent = l.level === currentLevel;
    const isPast = l.level < currentLevel;
    return `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:0.82rem;color:#fff;background:${isCurrent ? '#8b5cf6' : isPast ? '#10b981' : 'var(--border)'}">${l.level}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:0.75rem;color:${isCurrent ? '#8b5cf6' : isPast ? '#10b981' : 'var(--text-muted)'}">${esc(l.name)} ${isCurrent ? '← Current' : ''}</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">${esc(l.description || '')}</div>
      </div>
      <span style="font-size:0.65rem;padding:3px 10px;border-radius:10px;font-weight:600;background:${isCurrent ? '#8b5cf620' : isPast ? '#10b98120' : 'var(--border)'};color:${isCurrent ? '#8b5cf6' : isPast ? '#10b981' : 'var(--text-muted)'}">${isCurrent ? 'CURRENT' : isPast ? 'ACHIEVED' : l.target || 'LOCKED'}</span>
    </div>`;
  }).join('') || '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.72rem">Maturity data unavailable</div>';

  // Partner leaderboard
  const partnerRows = partners.slice(0, 15).map((p, i) => {
    const esgGrade = p.esg_grade || p.grade || 'N/A';
    const gColor = esgGrade.startsWith('A') ? '#10b981' : esgGrade.startsWith('B') ? '#22c55e' : esgGrade.startsWith('C') ? '#f59e0b' : '#ef4444';
    return `
    <tr>
      <td style="font-size:0.72rem;font-weight:700;color:${i < 3 ? '#f59e0b' : 'var(--text-primary)'}">#${i + 1}</td>
      <td style="font-size:0.72rem;font-weight:600">${esc(p.name || p.partner_name || '—')}</td>
      <td style="font-size:0.72rem">${(p.total_kgCO2e || p.emissions || 0).toLocaleString()} kg</td>
      <td style="font-size:0.72rem;text-align:center"><span style="font-weight:800;color:${gColor}">${esgGrade}</span></td>
      <td style="font-size:0.72rem">${(p.score || p.esg_score || 0).toFixed(1)}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:16px;font-size:0.72rem">No partner data available</td></tr>';

  return `
    <div style="display:flex;gap:12px;margin-bottom:16px">
      ${kpi('Maturity Level', `L${currentLevel}`, '#8b5cf6', maturity.current_name || maturity.name || 'Not Assessed')}
      ${kpi('Partners Tracked', partners.length, 'var(--text-primary,#1e293b)', 'ESG leaderboard')}
      ${kpi('Features Active', (maturity.features_detected || maturity.features || []).length, '#059669', 'Carbon capabilities')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card" style="border-left:4px solid #8b5cf6">
        <div class="card-header">
          <div class="card-title">📈 Carbon Maturity Model</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">5-Level assessment framework</div>
        </div>
        <div class="card-body" style="max-height:450px;overflow-y:auto">${maturityBar}</div>
      </div>
      <div class="card" style="border-left:4px solid #059669">
        <div class="card-header">
          <div class="card-title">🏆 Partner ESG Leaderboard</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">${partners.length} partners ranked</div>
        </div>
        <div class="card-body" style="max-height:450px;overflow-y:auto">
          <table class="data-table">
            <thead><tr><th>Rank</th><th>Partner</th><th>Emissions</th><th>Grade</th><th>Score</th></tr></thead>
            <tbody>${partnerRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ─── Common Helpers ─────────────────────────────────────────
function kpi(label, value, color, desc) {
  return `
    <div style="background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:20px;flex:1;min-width:130px">
      <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">${label}</div>
      <div style="font-size:1.6rem;font-weight:800;color:${color}">${value}</div>
      <div style="font-size:0.68rem;color:var(--text-muted);margin-top:4px">${desc}</div>
    </div>`;
}

function spinner(msg) {
  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px">
    <div class="spinner"></div>
    <div style="font-size:0.78rem;color:var(--text-muted)">${msg}</div>
  </div>`;
}

function esc(s) { return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function timeAgo(d) {
  if (!d) return '—';
  let dt = new Date(d);
  if (isNaN(dt.getTime())) dt = new Date(d + 'Z');
  if (isNaN(dt.getTime())) return '—';
  const s = Math.floor((Date.now() - dt.getTime()) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
