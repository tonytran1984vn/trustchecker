/**
 * Executive – Reports
 * ════════════════════
 * Data from PostgreSQL via /owner/ccs/reports
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
          <button class="btn btn-primary btn-sm" onclick="alert('PDF generation coming soon')">📄 Generate PDF Report</button>
        </div>
      </div>

      <!-- Current Month Summary -->
      <section class="exec-section">
        <h2 class="exec-section-title">Current Period</h2>
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
          ${templateCard('Board Report', 'High-level overview for board presentations. KPIs, risk score, financial impact, strategic recommendations.', 'board')}
          ${templateCard('Risk Assessment', 'Detailed risk intelligence with heatmap, zone analysis, and AI forecast. For risk committee.', 'risk')}
          ${templateCard('Market Intelligence', 'Channel performance, gray market analysis, regional penetration. For strategy team.', 'market')}
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
      <button class="btn btn-xs btn-outline">View</button>
    </div>`;
}

function templateCard(title, desc, type) {
  return `
    <div class="exec-card" style="text-align:center">
      <div style="font-size:2rem;margin-bottom:0.75rem">${type === 'board' ? '📊' : type === 'risk' ? '🛡' : '🌍'}</div>
      <h3>${title}</h3>
      <p style="font-size:0.8rem;color:var(--text-secondary);margin:0.75rem 0">${desc}</p>
      <button class="btn btn-sm btn-outline">Generate</button>
    </div>`;
}
