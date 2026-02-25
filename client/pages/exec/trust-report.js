/**
 * CEO Trust Report — Brand Protection Strength Dashboard
 * Data from PostgreSQL via /owner/ccs/trust-report
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

let _data = null;

export function renderPage() {
  if (!_data) { loadData(); return loadingState(); }
  const d = _data;
  const sc = d.seal_coverage;
  const ci = d.chain_integrity;
  const td = d.tamper_detection;
  const sv = d.scan_verification;
  const ev = d.evidence_packages;
  const bps = d.brand_protection_score;

  const scoreColor = bps >= 80 ? '#22c55e' : bps >= 60 ? '#f59e0b' : '#ef4444';

  return `
    <div class="exec-page">
      <div class="exec-header">
        <h1>${icon('shield', 28)} CEO Trust Report</h1>
        <div class="exec-timestamp">
          Brand protection strength · ${d.product_count} products
          <button class="btn btn-sm btn-outline" style="margin-left:1rem" onclick="window.exportTrustReport && window.exportTrustReport()">📄 Export PDF</button>
          <button class="btn btn-sm btn-ghost" onclick="window.refreshTrustReport && window.refreshTrustReport()">🔄 Refresh</button>
        </div>
      </div>

      <!-- Brand Protection Score -->
      <section class="exec-section">
        <div class="exec-integrity-card">
          <div class="exec-integrity-score">
            <div class="exec-score-circle" style="border-color:${scoreColor}">
              <div class="exec-score-value" style="color:${scoreColor}">${bps}</div>
              <div class="exec-score-label">/ 100</div>
            </div>
            <div class="exec-score-meta">
              <h3>Brand Protection Score</h3>
              <div class="exec-score-breakdown">
                ${scoreLine('Scan Verification', sv.integrity_pct)}
                ${scoreLine('Chain Integrity', ci.coverage_pct)}
                ${scoreLine('Tamper Resolution', td.resolution_rate)}
                ${scoreLine('Evidence Sealing', ev.total > 0 ? Math.round(100 * ev.sealed / ev.total) : 0)}
              </div>
              <div style="margin-top:1rem;font-size:0.82rem;color:var(--text-secondary);font-style:italic">
                ${d.recommendation}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Key Metrics -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('lock', 20)} Seal & Integrity Metrics</h2>
        <div class="exec-kpi-grid" style="grid-template-columns: repeat(5, 1fr)">
          ${m('Total Seals', sc.total, '', '#6366f1', 'lock')}
          ${m('Scan Verified', sv.authentic + '/' + sv.total, sv.integrity_pct + '%', '#22c55e', 'check')}
          ${m('Chain Sealed', ci.sealed + '/' + ci.total_events, ci.coverage_pct + '%', '#3b82f6', 'link')}
          ${m('Tamper Alerts', td.total, td.critical + ' critical', '#ef4444', 'alertTriangle')}
          ${m('Evidence Pkgs', ev.sealed + '/' + ev.total, 'sealed', '#8b5cf6', 'archive')}
        </div>
      </section>

      <!-- Seal Categories -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('database', 20)} Seal Coverage by Category</h2>
        <div class="exec-grid-3">
          ${catCard('🔍', 'Scan Events', sc.scan_seals, sv.total, '#22c55e')}
          ${catCard('🔗', 'Supply Chain', sc.chain_seals, ci.total_events, '#3b82f6')}
          ${catCard('📦', 'Evidence', sc.evidence_seals, ev.total, '#8b5cf6')}
        </div>
      </section>
    </div>
  `;
}

async function loadData() {
  try {
    const r = await api.get('/tenant/owner/ccs/trust-report');
    _data = r;
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
  } catch (e) { console.error('[TrustReport]', e); }
}

function loadingState() {
  return `<div class="exec-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading trust report...</div></div></div>`;
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

function m(l, v, s, c, i) {
  return `
    <div class="exec-kpi-card">
      <div class="exec-kpi-icon" style="color:${c}">${icon(i, 20)}</div>
      <div class="exec-kpi-value">${v}</div>
      <div class="exec-kpi-label">${l}</div>
      ${s ? `<div style="font-size:0.7rem;color:var(--text-secondary)">${s}</div>` : ''}
    </div>`;
}

function catCard(emoji, title, sealed, total, color) {
  const pct = total > 0 ? Math.round(100 * sealed / total) : 0;
  return `
    <div class="exec-card" style="text-align:center">
      <div style="font-size:2rem;margin-bottom:0.5rem">${emoji}</div>
      <h3>${title}</h3>
      <div class="exec-big-number" style="color:${color}">${sealed}</div>
      <div class="exec-big-sub">${pct}% of ${total} sealed</div>
      <div style="margin-top:0.75rem">
        <div class="exec-score-bar" style="height:8px"><div class="exec-score-fill" style="width:${pct}%;background:${color}"></div></div>
      </div>
    </div>`;
}

// Window handlers
window.refreshTrustReport = function () {
  _data = null;
  const el = document.getElementById('main-content');
  if (el) el.innerHTML = renderPage();
};

window.exportTrustReport = function () {
  alert('PDF export coming soon');
};
