/**
 * Executive – Capital Allocation Engine
 * ═══════════════════════════════════════
 * What-if simulator: CEO inputs investment amounts,
 * sees projected impact on liability, risk, ESG, valuation
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

let _baseline = null;
let _result = null;
let _investments = {};

export function renderPage() {
    if (!_baseline) { loadBaseline(); return loadingState(); }
    const b = _baseline.baseline;
    const opts = _baseline.investment_options;
    const r = _result;

    return `
    <div class="exec-page" style="font-feature-settings:'tnum'">
      <div class="exec-header">
        <h1>${icon('target', 28)} Capital Allocation Engine</h1>
        <div class="exec-timestamp">What-if simulator · Real-time projections</div>
      </div>

      <!-- Current Baseline -->
      <section class="exec-section">
        <h2 class="exec-section-title" style="letter-spacing:0.025em">${icon('activity', 20)} Current Baseline</h2>
        <div class="exec-kpi-grid" style="grid-template-columns:repeat(5,1fr)">
          ${bkpi('Enterprise Value', '$' + fmt(b.current_ev), '#6366f1')}
          ${bkpi('EBITDA', '$' + fmt(b.ebitda), '#22c55e')}
          ${bkpi('Carbon Liability', '$' + fmt(b.carbon_liability), '#ef4444')}
          ${bkpi('Overall Risk', Math.round(b.overall_risk * 100) + '%', '#f59e0b')}
          ${bkpi('ESG Premium', (b.esg_premium >= 0 ? '+' : '') + b.esg_premium.toFixed(2) + 'x', '#8b5cf6')}
        </div>
      </section>

      <!-- Investment Sliders -->
      <section class="exec-section">
        <h2 class="exec-section-title" style="letter-spacing:0.025em">${icon('sliders', 20)} Investment Allocation</h2>
        <div class="exec-card">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem">
            ${opts.map(o => slider(o)).join('')}
          </div>
          <div style="margin-top:1.5rem;display:flex;align-items:center;gap:1.5rem;padding-top:1rem;border-top:1px solid var(--border-color,rgba(255,255,255,0.08))">
            <div style="flex:1">
              <div style="font-size:0.75rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.03em">Total Investment</div>
              <div id="cae-total" style="font-size:1.5rem;font-weight:800;color:#6366f1">$0</div>
            </div>
            <button onclick="window._runSimulation()" style="padding:0.75rem 2rem;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:#fff;font-weight:700;font-size:0.9rem;cursor:pointer;transition:transform 0.15s;letter-spacing:0.02em" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
              ⚡ Run Simulation
            </button>
            <button onclick="window._resetSliders()" style="padding:0.75rem 1.5rem;background:rgba(255,255,255,0.06);border:1px solid var(--border-color,rgba(255,255,255,0.1));border-radius:8px;color:var(--text-secondary);font-weight:500;font-size:0.85rem;cursor:pointer">
              Reset
            </button>
          </div>
        </div>
      </section>

      <!-- Projection Results -->
      <section class="exec-section" id="cae-results-section" style="${r ? '' : 'display:none'}">
        <h2 class="exec-section-title" style="letter-spacing:0.025em">${icon('star', 20)} Projected Impact</h2>
        <div id="cae-results">${r ? renderResults(r) : ''}</div>
      </section>
    </div>
  `;
}

function renderResults(r) {
    const p = r.projections;
    return `
    <!-- ROI Banner -->
    <div class="exec-card" style="background:linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08));border:1px solid rgba(99,102,241,0.2);margin-bottom:1.25rem">
      <div style="display:flex;align-items:center;gap:2rem;text-align:center;justify-content:center">
        <div>
          <div style="font-size:0.72rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.03em">Total Investment</div>
          <div style="font-size:1.3rem;font-weight:800">$${fmt(r.total_investment)}</div>
        </div>
        <div style="font-size:1.5rem;opacity:0.3">→</div>
        <div>
          <div style="font-size:0.72rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.03em">Total Benefits</div>
          <div style="font-size:1.3rem;font-weight:800;color:#22c55e">$${fmt(r.roi.total_benefits)}</div>
        </div>
        <div style="font-size:1.5rem;opacity:0.3">→</div>
        <div>
          <div style="font-size:0.72rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.03em">ROI</div>
          <div style="font-size:1.3rem;font-weight:800;color:${r.roi.percentage >= 100 ? '#22c55e' : '#f59e0b'}">${r.roi.percentage}%</div>
        </div>
        <div style="font-size:1.5rem;opacity:0.3">→</div>
        <div>
          <div style="font-size:0.72rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.03em">Payback</div>
          <div style="font-size:1.3rem;font-weight:800">${r.roi.payback_months} mo</div>
        </div>
      </div>
    </div>

    <!-- Impact Cards -->
    <div class="exec-kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:1.25rem">
      ${delta('Enterprise Value', p.enterprise_value.current, p.enterprise_value.projected, p.enterprise_value.change, true, '#6366f1')}
      ${delta('Carbon Liability', p.carbon_liability.current, p.carbon_liability.projected, -p.carbon_liability.saved, false, '#ef4444')}
      ${delta('Brand Value', p.brand_value.current, p.brand_value.projected, p.brand_value.change, true, '#8b5cf6')}
      ${delta('Overall Risk', p.risk.current + '%', p.risk.projected + '%', -p.risk.reduction, false, '#f59e0b')}
    </div>

    <!-- Detail Bars -->
    <div class="exec-grid-2">
      <div class="exec-card">
        <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:1rem">Emissions Trajectory</h3>
        ${compBar('Emissions (tCO₂e)', p.emissions.current, p.emissions.projected, '#22c55e')}
        ${compBar('Carbon Liability ($)', p.carbon_liability.current, p.carbon_liability.projected, '#ef4444')}
        ${compBar('EV Multiple', p.ev_multiple.current + 'x', p.ev_multiple.projected + 'x', '#6366f1')}
        ${compBar('ESG Premium', p.esg_premium.current + 'x', p.esg_premium.projected + 'x', '#8b5cf6')}
      </div>
      <div class="exec-card">
        <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:1rem">Integrity Improvement</h3>
        ${compBar('Scan Integrity', p.scan_integrity.current + '%', p.scan_integrity.projected + '%', '#22c55e')}
        ${compBar('SC Integrity', p.sc_integrity.current + '%', p.sc_integrity.projected + '%', '#3b82f6')}
        ${compBar('Risk Reduction', p.risk.current + '%', p.risk.projected + '%', '#f59e0b')}
        ${compBar('Emission Cut', p.emissions.current + 't', p.emissions.projected + 't', '#06b6d4')}
      </div>
    </div>
  `;
}

async function loadBaseline() {
    try {
        _baseline = await api.get('/tenant/owner/ccs/allocation-baseline');
        _baseline.investment_options.forEach(o => { _investments[o.id] = 0; });
        const el = document.getElementById('main-content');
        if (el) el.innerHTML = renderPage();
    } catch (e) { console.error('[AllocationEngine]', e); }
}

function loadingState() {
    return `<div class="exec-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading allocation engine...</div></div></div>`;
}

function fmt(n) { return Number(n || 0).toLocaleString(); }

function bkpi(label, value, color) {
    return `<div class="exec-kpi-card">
    <div class="exec-kpi-value" style="font-size:1.1rem;color:${color}">${value}</div>
    <div class="exec-kpi-label" style="letter-spacing:0.025em">${label}</div>
  </div>`;
}

function slider(opt) {
    return `
    <div style="padding:0.75rem 0">
      <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem">
        <label style="font-size:0.88rem;font-weight:500"><span style="margin-right:0.3rem">${opt.icon}</span> ${opt.label}</label>
        <span id="cae-val-${opt.id}" style="font-weight:700;font-size:0.88rem;color:#6366f1">$0</span>
      </div>
      <input type="range" id="cae-${opt.id}" min="0" max="${opt.max}" step="${opt.step}" value="0"
        oninput="window._updateSlider('${opt.id}',this.value)"
        style="width:100%;accent-color:#6366f1;cursor:pointer">
      <div style="font-size:0.68rem;opacity:0.4;margin-top:0.2rem">${opt.description} · max $${fmt(opt.max)}</div>
    </div>`;
}

function delta(label, current, projected, change, higherIsGood, color) {
    const isPositive = higherIsGood ? change > 0 : change < 0;
    const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '—';
    const changeColor = isPositive ? '#22c55e' : change === 0 ? 'var(--text-secondary)' : '#ef4444';
    const displayChange = typeof change === 'number' ? (change > 0 ? '+$' + fmt(change) : change < 0 ? '-$' + fmt(Math.abs(change)) : '$0') : change;
    return `<div class="exec-kpi-card">
    <div style="font-size:0.72rem;opacity:0.5;margin-bottom:0.25rem">${typeof current === 'string' ? current : '$' + fmt(current)}</div>
    <div class="exec-kpi-value" style="font-size:1.1rem;color:${color}">${typeof projected === 'string' ? projected : '$' + fmt(projected)}</div>
    <div class="exec-kpi-label" style="letter-spacing:0.025em">${label}</div>
    <div style="font-size:0.78rem;font-weight:600;color:${changeColor}">${arrow} ${displayChange}</div>
  </div>`;
}

function compBar(label, current, projected, color) {
    return `
    <div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0;border-bottom:1px solid var(--border-color,rgba(255,255,255,0.04))">
      <div style="flex:1;font-size:0.85rem;font-weight:500">${label}</div>
      <div style="font-size:0.82rem;opacity:0.5;width:75px;text-align:right">${current}</div>
      <div style="font-size:0.85rem;opacity:0.3">→</div>
      <div style="font-size:0.82rem;font-weight:700;color:${color};width:75px;text-align:right">${projected}</div>
    </div>`;
}

// Window handlers
window._updateSlider = function (id, value) {
    _investments[id] = Number(value);
    const valEl = document.getElementById('cae-val-' + id);
    if (valEl) valEl.textContent = '$' + fmt(value);
    const total = Object.values(_investments).reduce((s, v) => s + v, 0);
    const totalEl = document.getElementById('cae-total');
    if (totalEl) totalEl.textContent = '$' + fmt(total);
};

window._runSimulation = async function () {
    try {
        const total = Object.values(_investments).reduce((s, v) => s + v, 0);
        if (total === 0) { alert('Adjust at least one investment slider'); return; }

        const btn = document.querySelector('button[onclick*="_runSimulation"]');
        if (btn) { btn.textContent = '⏳ Simulating...'; btn.disabled = true; }

        _result = await api.post('/tenant/owner/ccs/allocation-simulate', {
            investments: _investments,
            baseline: _baseline.baseline,
        });

        const section = document.getElementById('cae-results-section');
        const results = document.getElementById('cae-results');
        if (section) section.style.display = '';
        if (results) results.innerHTML = renderResults(_result);
        if (btn) { btn.textContent = '⚡ Run Simulation'; btn.disabled = false; }
    } catch (e) {
        console.error('[AllocationEngine] Simulation error:', e);
        alert('Simulation failed — check console');
    }
};

window._resetSliders = function () {
    Object.keys(_investments).forEach(id => {
        _investments[id] = 0;
        const slider = document.getElementById('cae-' + id);
        const val = document.getElementById('cae-val-' + id);
        if (slider) slider.value = 0;
        if (val) val.textContent = '$0';
    });
    const totalEl = document.getElementById('cae-total');
    if (totalEl) totalEl.textContent = '$0';
    const section = document.getElementById('cae-results-section');
    if (section) section.style.display = 'none';
    _result = null;
};
