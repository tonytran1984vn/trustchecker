/**
 * Risk – Reports
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const reports = [
        { title: 'Weekly Risk Report — Feb 10–16, 2026', type: 'Weekly', generated: 'Feb 17, 2026', pages: 12, status: 'ready' },
        { title: 'Weekly Risk Report — Feb 3–9, 2026', type: 'Weekly', generated: 'Feb 10, 2026', pages: 10, status: 'ready' },
        { title: 'Monthly Risk Report — January 2026', type: 'Monthly', generated: 'Feb 1, 2026', pages: 28, status: 'ready' },
        { title: 'Investigation Summary — RC-0006', type: 'Investigation', generated: 'Jan 28, 2026', pages: 8, status: 'ready' },
        { title: 'Compliance Export — Q4 2025', type: 'Compliance', generated: 'Jan 15, 2026', pages: 42, status: 'ready' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('scroll', 28)} Risk Reports</h1>
        <div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Generate Report</button></div>
      </div>

      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>Report</th><th>Type</th><th>Generated</th><th>Pages</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${reports.map(r => `
              <tr>
                <td><strong>${r.title}</strong></td>
                <td><span class="sa-status-pill sa-pill-${r.type === 'Weekly' ? 'blue' : r.type === 'Monthly' ? 'green' : r.type === 'Investigation' ? 'orange' : 'teal'}">${r.type}</span></td>
                <td>${r.generated}</td>
                <td>${r.pages}</td>
                <td><span class="sa-status-pill sa-pill-green">${r.status}</span></td>
                <td>
                  <button class="btn btn-xs btn-primary">View</button>
                  <button class="btn btn-xs btn-outline">PDF</button>
                  <button class="btn btn-xs btn-ghost">Share</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
