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
          ${m('Total Seals', sc.total.toLocaleString(), '', '#6366f1', 'lock')}
          ${m('Scan Verified', sv.authentic.toLocaleString() + ' / ' + sv.total.toLocaleString(), sv.integrity_pct + '%', '#22c55e', 'check')}
          ${m('Chain Sealed', ci.sealed.toLocaleString() + ' / ' + ci.total_events.toLocaleString(), ci.coverage_pct + '%', '#3b82f6', 'link')}
          ${m('Tamper Alerts', td.total.toLocaleString(), td.critical + ' critical', '#ef4444', 'alertTriangle')}
          ${m('Evidence Pkgs', ev.sealed.toLocaleString() + ' / ' + ev.total.toLocaleString(), 'sealed', '#8b5cf6', 'archive')}
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
    const r = await api.get('/org-admin/owner/ccs/trust-report');
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
      <div class="exec-kpi-value" style="font-size:1.1rem">${v}</div>
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
  if (!_data) { alert('Report data not loaded yet'); return; }
  const d = _data;
  const bps = d.brand_protection_score;
  const sc = d.seal_coverage;
  const ci = d.chain_integrity;
  const td = d.tamper_detection;
  const sv = d.scan_verification;
  const ev = d.evidence_packages;
  const scoreColor = bps >= 80 ? '#22c55e' : bps >= 60 ? '#f59e0b' : '#ef4444';
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const cw = (label, value, sub, color) => `
    <div style="text-align:center;padding:16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0">
      <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;margin-bottom:4px">${label}</div>
      <div style="font-size:1.4rem;font-weight:800;color:${color}">${value}</div>
      ${sub ? `<div style="font-size:0.7rem;color:#94a3b8;margin-top:2px">${sub}</div>` : ''}
    </div>`;

  const bar = (label, pct) => {
    const c = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
    return `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="width:140px;font-size:0.8rem;color:#334155">${label}</span>
        <div style="flex:1;height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${c};border-radius:5px"></div>
        </div>
        <span style="width:40px;text-align:right;font-size:0.8rem;font-weight:700;color:${c}">${pct}%</span>
      </div>`;
  };

  const catSec = (emoji, title, sealed, total, color) => {
    const pct = total > 0 ? Math.round(100 * sealed / total) : 0;
    return `
      <div style="flex:1;text-align:center;padding:20px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0">
        <div style="font-size:2rem">${emoji}</div>
        <div style="font-weight:700;margin:6px 0">${title}</div>
        <div style="font-size:1.8rem;font-weight:800;color:${color}">${sealed.toLocaleString()}</div>
        <div style="font-size:0.75rem;color:#94a3b8">${pct}% of ${total.toLocaleString()} sealed</div>
        <div style="margin-top:8px;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:3px"></div>
        </div>
      </div>`;
  };

  const evidencePct = ev.total > 0 ? Math.round(100 * ev.sealed / ev.total) : 0;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>CEO Trust Report — TrustChecker</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1e293b; background:#fff; padding:40px; max-width:900px; margin:0 auto; }
      .header { display:flex; justify-content:space-between; align-items:center; padding-bottom:20px; border-bottom:2px solid #e2e8f0; margin-bottom:30px; }
      .header h1 { font-size:1.5rem; color:#1e293b; }
      .header .meta { font-size:0.8rem; color:#64748b; text-align:right; }
      .section { margin-bottom:30px; }
      .section-title { font-size:1rem; font-weight:700; color:#334155; margin-bottom:16px; padding-bottom:8px; border-bottom:1px solid #e2e8f0; }
      .score-card { display:flex; align-items:center; gap:30px; padding:24px; background:linear-gradient(135deg, #fafafa 0%, #f1f5f9 100%); border-radius:12px; border:1px solid #e2e8f0; margin-bottom:24px; }
      .score-circle { width:110px; height:110px; border-radius:50%; border:6px solid ${scoreColor}; display:flex; flex-direction:column; align-items:center; justify-content:center; flex-shrink:0; }
      .score-value { font-size:2.2rem; font-weight:800; color:${scoreColor}; line-height:1; }
      .score-label { font-size:0.75rem; color:#94a3b8; }
      .kpi-grid { display:grid; grid-template-columns: repeat(5, 1fr); gap:12px; }
      .cat-grid { display:flex; gap:12px; }
      .footer { margin-top:30px; padding-top:16px; border-top:1px solid #e2e8f0; text-align:center; font-size:0.7rem; color:#94a3b8; }
      @media print {
        body { padding:20px; }
        .no-print { display:none; }
        .score-card { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      }
    </style>
  </head><body>
    <div class="header">
      <h1>🛡️ CEO Trust Report</h1>
      <div class="meta">
        <div style="font-weight:600">TrustChecker</div>
        <div>${now} · ${d.product_count} products</div>
      </div>
    </div>

    <div class="section">
      <div class="score-card">
        <div class="score-circle">
          <div class="score-value">${bps}</div>
          <div class="score-label">/ 100</div>
        </div>
        <div style="flex:1">
          <h2 style="font-size:1.1rem;margin-bottom:12px">Brand Protection Score</h2>
          ${bar('Scan Verification', sv.integrity_pct)}
          ${bar('Chain Integrity', ci.coverage_pct)}
          ${bar('Tamper Resolution', td.resolution_rate)}
          ${bar('Evidence Sealing', evidencePct)}
          <div style="margin-top:10px;font-size:0.8rem;color:#64748b;font-style:italic">${d.recommendation}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">🔒 Seal & Integrity Metrics</div>
      <div class="kpi-grid">
        ${cw('Total Seals', sc.total.toLocaleString(), '', '#6366f1')}
        ${cw('Scan Verified', sv.authentic.toLocaleString() + ' / ' + sv.total.toLocaleString(), sv.integrity_pct + '%', '#22c55e')}
        ${cw('Chain Sealed', ci.sealed.toLocaleString() + ' / ' + ci.total_events.toLocaleString(), ci.coverage_pct + '%', '#3b82f6')}
        ${cw('Tamper Alerts', td.total.toLocaleString(), td.critical + ' critical', '#ef4444')}
        ${cw('Evidence Pkgs', ev.sealed.toLocaleString() + ' / ' + ev.total.toLocaleString(), 'sealed', '#8b5cf6')}
      </div>
    </div>

    <div class="section">
      <div class="section-title">📊 Seal Coverage by Category</div>
      <div class="cat-grid">
        ${catSec('🔍', 'Scan Events', sc.scan_seals, sv.total, '#22c55e')}
        ${catSec('🔗', 'Supply Chain', sc.chain_seals, ci.total_events, '#3b82f6')}
        ${catSec('📦', 'Evidence', sc.evidence_seals, ev.total, '#8b5cf6')}
      </div>
    </div>

    <div class="footer">
      Generated by TrustChecker · ${now} · Confidential — For executive review only
    </div>

    <button class="no-print" onclick="window.print()" style="position:fixed;bottom:20px;right:20px;padding:10px 24px;background:#6d28d9;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.2)">🖨️ Print / Save PDF</button>
    <script>setTimeout(()=>window.print(),600);</script>
  </body></html>`;

  const popup = window.open('', '_blank', 'width=960,height=800');
  if (popup) {
    popup.document.write(html);
    popup.document.close();
  } else {
    alert('Popup blocked. Please allow popups for this site.');
  }
};
