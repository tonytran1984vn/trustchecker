/**
 * Executive – Reports
 * ════════════════════
 * Executive summary reports, monthly auto-reports, PDF export
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="exec-page">
      <div class="exec-header">
        <h1>${icon('scroll', 28)} Executive Reports</h1>
        <div class="exec-timestamp">
          <button class="btn btn-primary btn-sm" onclick="alert('PDF generation coming soon')">📄 Generate PDF Report</button>
        </div>
      </div>

      <!-- Recent Reports -->
      <section class="exec-section">
        <h2 class="exec-section-title">Monthly Executive Summaries</h2>
        <div class="exec-card">
          ${reportRow('February 2026 — Executive Summary', 'Auto-generated', '2026-02-18', 'ready')}
          ${reportRow('January 2026 — Executive Summary', 'Auto-generated', '2026-02-01', 'ready')}
          ${reportRow('December 2025 — Executive Summary', 'Auto-generated', '2026-01-01', 'ready')}
          ${reportRow('Q4 2025 — Quarterly Review', 'Manual', '2025-12-31', 'ready')}
          ${reportRow('November 2025 — Executive Summary', 'Auto-generated', '2025-12-01', 'ready')}
        </div>
      </section>

      <!-- Report Templates -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('clipboard', 20)} Report Templates</h2>
        <div class="exec-grid-3">
          ${templateCard('Board Report', 'High-level overview for board presentations. KPIs, risk score, financial impact, strategic recommendations.', 'board')}
          ${templateCard('Risk Assessment', 'Detailed risk intelligence report with heatmap, zone analysis, and AI forecast. For risk committee.', 'risk')}
          ${templateCard('Market Intelligence', 'Channel performance, gray market analysis, regional penetration. For strategy team.', 'market')}
        </div>
      </section>

      <!-- Scheduled Reports -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('settings', 20)} Scheduled Reports</h2>
        <div class="exec-card">
          <table class="sa-table">
            <thead>
              <tr><th>Report</th><th>Frequency</th><th>Recipients</th><th>Next Run</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Executive Summary</strong></td><td>Monthly</td><td>CEO, CFO, COO</td><td>Mar 1, 2026</td><td><span class="sa-status-pill sa-pill-green">active</span></td></tr>
              <tr><td><strong>Risk Alert Digest</strong></td><td>Weekly</td><td>CEO, CRO</td><td>Feb 24, 2026</td><td><span class="sa-status-pill sa-pill-green">active</span></td></tr>
              <tr><td><strong>Board Deck</strong></td><td>Quarterly</td><td>Board members</td><td>Mar 31, 2026</td><td><span class="sa-status-pill sa-pill-green">active</span></td></tr>
              <tr><td><strong>Market Intelligence</strong></td><td>Bi-weekly</td><td>CEO, CMO</td><td>Feb 28, 2026</td><td><span class="sa-status-pill sa-pill-orange">draft</span></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function reportRow(title, type, date, status) {
    return `
    <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
      <div style="flex:1">
        <strong>${title}</strong>
        <div style="font-size:0.75rem;color:var(--text-secondary)">${type} · ${date}</div>
      </div>
      <span class="sa-status-pill sa-pill-green">${status}</span>
      <button class="btn btn-xs btn-outline">View</button>
      <button class="btn btn-xs btn-ghost">📄 PDF</button>
    </div>
  `;
}

function templateCard(title, desc, type) {
    return `
    <div class="exec-card" style="text-align:center">
      <div style="font-size:2rem;margin-bottom:0.75rem">${type === 'board' ? '📊' : type === 'risk' ? '🛡' : '🌍'}</div>
      <h3>${title}</h3>
      <p style="font-size:0.8rem;color:var(--text-secondary);margin:0.75rem 0">${desc}</p>
      <button class="btn btn-sm btn-outline">Generate</button>
    </div>
  `;
}
