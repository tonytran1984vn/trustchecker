/**
 * Compliance – Investigation Summary
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const summaries = [
        { case: 'RC-0006', title: 'SGN Retail Duplicate Ring', outcome: 'Counterfeit seized, 3 retail blacklisted', duration: '2 weeks', risk: 88, status: 'closed' },
        { case: 'RC-0005', title: 'Unauthorized Reseller D-180', outcome: 'Distributor terminated, product recalled', duration: '1 week', risk: 72, status: 'closed' },
        { case: 'RC-0009', title: 'Cambodia Gray Market', outcome: 'Escalated to legal — ongoing', duration: '3 weeks+', risk: 91, status: 'ongoing' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('search', 28)} Investigation Summary</h1></div>
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>Case</th><th>Title</th><th>Outcome</th><th>Duration</th><th>Risk Score</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${summaries.map(s => `
              <tr>
                <td class="sa-code">${s.case}</td>
                <td><strong>${s.title}</strong></td>
                <td style="font-size:0.78rem">${s.outcome}</td>
                <td>${s.duration}</td>
                <td><span class="sa-score sa-score-${s.risk >= 80 ? 'danger' : 'warning'}">${s.risk}</span></td>
                <td><span class="sa-status-pill sa-pill-${s.status === 'closed' ? 'green' : 'orange'}">${s.status}</span></td>
                <td><button class="btn btn-xs btn-outline">Full Report</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
