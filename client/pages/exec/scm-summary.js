/**
 * Executive – SCM Capital Summary
 * ═════════════════════════════════
 * Supply Chain → Capital-at-Risk abstraction for CEO
 * Data from PostgreSQL via /owner/ccs/scm-summary
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

let _data = null;

export function renderPage() {
    if (!_data) { loadData(); return loadingState(); }
    const d = _data;
    const b = d.breaches;

    const scoreColor = d.risk_score >= 80 ? '#22c55e' : d.risk_score >= 60 ? '#f59e0b' : '#ef4444';

    return `
    <div class="exec-page" style="font-feature-settings:'tnum'">
      <div class="exec-header">
        <h1>${icon('truck', 28)} Supply Chain Capital</h1>
        <div class="exec-timestamp">
          Capital at risk via supply chain · ${d.total_events.toLocaleString()} events tracked
          <button class="btn btn-sm btn-ghost" onclick="window.refreshSCMSummary && window.refreshSCMSummary()">🔄 Refresh</button>
        </div>
      </div>

      <!-- SC Risk Score -->
      <section class="exec-section">
        <div class="exec-integrity-card">
          <div class="exec-integrity-score">
            <div class="exec-score-circle" style="border-color:${scoreColor}">
              <div class="exec-score-value" style="color:${scoreColor}">${d.risk_score}</div>
              <div class="exec-score-label">/ 100</div>
            </div>
            <div class="exec-score-meta">
              <h3>Supply Chain Risk Score</h3>
              <div class="exec-score-breakdown">
                ${scoreLine('Chain Integrity', d.integrity_index)}
                ${scoreLine('Inventory Traceability', d.traceability_pct)}
                ${scoreLine('Breach Resilience', b.total > 0 ? Math.max(0, 100 - b.critical * 20 - b.high * 10) : 100)}
                ${scoreLine('Partner Trust', d.partner_risk.length > 0 ? Math.round(d.partner_risk.reduce((s, p) => s + p.avg_trust, 0) / d.partner_risk.length) : 50)}
              </div>
              <div style="margin-top:1rem;font-size:0.82rem;color:var(--text-secondary);font-style:italic">
                ${d.risk_score >= 80 ? 'Supply chain integrity is strong. Continue monitoring.' : d.risk_score >= 60 ? 'Moderate risk — review unverified partners and unsealed events.' : 'High risk — critical gaps in chain integrity require immediate attention.'}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Key Metrics -->
      <section class="exec-section">
        <h2 class="exec-section-title" style="letter-spacing:0.025em">${icon('activity', 20)} Supply Chain KPIs</h2>
        <div class="exec-kpi-grid" style="grid-template-columns: repeat(5, 1fr)">
          ${kpi('Integrity Index', d.integrity_index + '%', d.integrity_index >= 80, '#22c55e', 'lock')}
          ${kpi('Traceable Inventory', d.traceability_pct + '%', d.traceability_pct >= 70, '#6366f1', 'database')}
          ${kpi('Products Tracked', d.products_tracked.toLocaleString() + ' / ' + d.total_products.toLocaleString(), true, '#3b82f6', 'box')}
          ${kpi('Partners Active', d.partners_involved.toLocaleString(), true, '#8b5cf6', 'network')}
          ${kpi('Batches Tracked', d.batches_tracked.toLocaleString(), true, '#06b6d4', 'layers')}
        </div>
      </section>

      <!-- Breach + Loss -->
      <section class="exec-section">
        <h2 class="exec-section-title" style="letter-spacing:0.025em">${icon('alertTriangle', 20)} Integrity Breaches & Loss Exposure</h2>
        <div class="exec-kpi-grid" style="grid-template-columns: repeat(4, 1fr)">
          ${kpi('Total Breaches', b.total.toLocaleString(), b.total === 0, '#ef4444', 'alertTriangle')}
          ${kpi('Critical', b.critical.toLocaleString(), b.critical === 0, '#dc2626', 'alert')}
          ${kpi('Unresolved', b.unresolved.toLocaleString(), b.unresolved === 0, '#f59e0b', 'clock')}
          ${kpi('Loss Estimate', '$' + b.estimated_loss.toLocaleString(), b.estimated_loss === 0, '#ef4444', 'dollarSign')}
        </div>
      </section>

      <!-- Partner Risk + Geographic Exposure -->
      <section class="exec-section">
        <h2 class="exec-section-title" style="letter-spacing:0.025em">${icon('globe', 20)} Capital Exposure Analysis</h2>
        <div class="exec-grid-2">
          <div class="exec-card">
            <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:1.5rem">Partner Risk <span style="font-weight:400;opacity:0.5;font-size:0.85rem">(${d.partner_risk.length} channels)</span></h3>
            ${d.partner_risk.length > 0
            ? d.partner_risk.map(p => partnerRow(p)).join('')
            : '<div style="color:var(--text-secondary);font-size:0.82rem;padding:1rem 0">No active partners</div>'}
          </div>
          <div class="exec-card">
            <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:1.5rem">Geographic Exposure <span style="font-weight:400;opacity:0.5;font-size:0.85rem">(${d.geographic_exposure.length} regions)</span></h3>
            ${d.geographic_exposure.length > 0
            ? d.geographic_exposure.map(g => geoRow(g)).join('')
            : '<div style="color:var(--text-secondary);font-size:0.82rem;padding:1rem 0">No location data available</div>'}
          </div>
        </div>
      </section>

      <!-- Recent Events -->
      <section class="exec-section">
        <h2 class="exec-section-title" style="letter-spacing:0.025em">${icon('clock', 20)} Recent Supply Chain Activity</h2>
        <div class="exec-card">
          ${d.recent_events.length > 0 ? `
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:0.5rem;font-size:0.78rem;font-weight:600;opacity:0.5;padding-bottom:0.5rem;border-bottom:1px solid var(--border-color,rgba(255,255,255,0.06));text-transform:uppercase;letter-spacing:0.03em">
            <div>Event</div><div>Product</div><div>Location</div><div>Sealed</div>
          </div>
          ${d.recent_events.map(e => `
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:0.5rem;padding:0.6rem 0;border-bottom:1px solid var(--border-color,rgba(255,255,255,0.04));font-size:0.85rem">
            <div style="text-transform:capitalize">${(e.type || '—').replace(/_/g, ' ')}</div>
            <div style="opacity:0.8">${e.product || '—'}</div>
            <div style="opacity:0.7">${e.location || '—'}</div>
            <div>${e.sealed ? '<span style="color:#22c55e">✓</span>' : '<span style="color:#94a3b8">—</span>'}</div>
          </div>`).join('')}`
            : '<div style="color:var(--text-secondary);font-size:0.82rem;padding:1rem 0">No recent events</div>'}
        </div>
      </section>
    </div>
  `;
}

async function loadData() {
    try {
        const r = await api.get('/tenant/owner/ccs/scm-summary');
        _data = r;
        const el = document.getElementById('main-content');
        if (el) el.innerHTML = renderPage();
    } catch (e) { console.error('[SCM Summary]', e); }
}

function loadingState() {
    return `<div class="exec-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading supply chain intelligence...</div></div></div>`;
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

function partnerRow(p) {
    const riskColor = p.high_risk > 0 ? '#ef4444' : p.avg_trust >= 80 ? '#22c55e' : '#f59e0b';
    const verifiedPct = p.total > 0 ? Math.round(100 * p.verified / p.total) : 0;
    return `
    <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 0;border-bottom:1px solid var(--border-color,rgba(255,255,255,0.04))">
      <div style="flex:1;font-size:1rem;font-weight:500;text-transform:capitalize">${p.channel}</div>
      <div style="width:100px">
        <div class="exec-score-bar" style="background:${riskColor}15"><div class="exec-score-fill" style="width:${verifiedPct}%;background:${riskColor}"></div></div>
      </div>
      <div style="width:44px;text-align:right;font-weight:600;font-size:0.88rem">${verifiedPct}%</div>
      <div style="width:85px;text-align:right;font-size:0.78rem">
        <span style="color:var(--text-secondary)">${p.total} total</span>
        ${p.high_risk > 0 ? `<br><span style="color:#ef4444;font-weight:600">${p.high_risk} high risk</span>` : ''}
      </div>
    </div>`;
}

function geoRow(g) {
    const color = g.integrity_pct >= 80 ? '#22c55e' : g.integrity_pct >= 50 ? '#f59e0b' : '#ef4444';
    return `
    <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 0;border-bottom:1px solid var(--border-color,rgba(255,255,255,0.04))">
      <div style="flex:1;font-size:1rem;font-weight:500">${g.region}</div>
      <div style="width:100px">
        <div class="exec-score-bar" style="background:${color}15"><div class="exec-score-fill" style="width:${g.integrity_pct}%;background:${color}"></div></div>
      </div>
      <div style="width:44px;text-align:right;font-weight:600;font-size:0.88rem">${g.integrity_pct}%</div>
      <div style="width:75px;text-align:right;color:var(--text-secondary);font-size:0.78rem;letter-spacing:0.02em">${g.events.toLocaleString()} events</div>
    </div>`;
}

window.refreshSCMSummary = function () {
    _data = null;
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
};
