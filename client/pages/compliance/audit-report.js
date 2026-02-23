/**
 * Compliance – Audit Report
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const reports = [
        { title: 'Monthly Audit Report — January 2026', type: 'Monthly', findings: 7, critical: 1, pages: 18, status: 'final', date: 'Feb 1, 2026' },
        { title: 'Monthly Audit Report — December 2025', type: 'Monthly', findings: 4, critical: 0, pages: 14, status: 'final', date: 'Jan 1, 2026' },
        { title: 'Quarterly Compliance Review — Q4 2025', type: 'Quarterly', findings: 12, critical: 2, pages: 32, status: 'final', date: 'Jan 15, 2026' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('scroll', 28)} Audit Report</h1>
        <div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Generate Report</button></div>
      </div>
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>Report</th><th>Type</th><th>Findings</th><th>Critical</th><th>Pages</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            ${reports.map(r => `
              <tr>
                <td><strong>${r.title}</strong></td>
                <td><span class="sa-status-pill sa-pill-blue">${r.type}</span></td>
                <td>${r.findings}</td>
                <td style="color:${r.critical > 0 ? '#ef4444' : '#22c55e'};font-weight:600">${r.critical}</td>
                <td>${r.pages}</td>
                <td><span class="sa-status-pill sa-pill-green">${r.status}</span></td>
                <td>${r.date}</td>
                <td><button class="btn btn-xs btn-primary">View</button> <button class="btn btn-xs btn-outline">PDF</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
