/**
 * Compliance – Regulatory Export (Compliance pack / audit-ready bundle)
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const packs = [
        { name: 'Compliance Pack — Q4 2025', contents: 'Audit log, policy docs, violation log, investigation summaries', size: '24.5 MB', format: 'ZIP', generated: 'Jan 20, 2026' },
        { name: 'Traceability Proof — COFFEE-PRE-250', contents: 'Full product journey, scan history, QR lifecycle', size: '8.2 MB', format: 'PDF + CSV', generated: 'Feb 10, 2026' },
        { name: 'Incident Report Bundle — 2025', contents: 'All closed cases, evidence, decision logs', size: '42.1 MB', format: 'ZIP', generated: 'Jan 15, 2026' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('globe', 28)} Regulatory Export</h1>
        <div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Generate Pack</button></div>
      </div>
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>Pack Name</th><th>Contents</th><th>Size</th><th>Format</th><th>Generated</th><th>Actions</th></tr></thead>
          <tbody>
            ${packs.map(p => `
              <tr>
                <td><strong>${p.name}</strong></td>
                <td style="font-size:0.78rem;color:var(--text-secondary)">${p.contents}</td>
                <td class="sa-code">${p.size}</td>
                <td><span class="sa-status-pill sa-pill-blue">${p.format}</span></td>
                <td>${p.generated}</td>
                <td><button class="btn btn-xs btn-primary">Download</button> <button class="btn btn-xs btn-ghost">Share</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
