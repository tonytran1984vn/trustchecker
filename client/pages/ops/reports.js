/**
 * Ops – Reports & Export
 * ═══════════════════════
 * Weekly/monthly operational reports with export capabilities
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
  const reports = [
    { id: 'RPT-W09', title: 'Weekly Operations Summary', period: 'Feb 24 – Mar 2, 2026', type: 'weekly', status: 'ready', generated: '2h ago' },
    { id: 'RPT-W08', title: 'Weekly Operations Summary', period: 'Feb 17 – Feb 23, 2026', type: 'weekly', status: 'ready', generated: '7d ago' },
    { id: 'RPT-M02', title: 'Monthly Batch Report', period: 'February 2026', type: 'monthly', status: 'ready', generated: '1d ago' },
    { id: 'RPT-SLA', title: 'SLA Compliance Report', period: 'February 2026', type: 'sla', status: 'ready', generated: '1d ago' },
    { id: 'RPT-INC', title: 'Incident Analysis Report', period: 'Feb 2026', type: 'incident', status: 'generating', generated: 'In progress' },
  ];

  const typeIcons = { weekly: '📊', monthly: '📅', sla: '⏱', incident: '🧾' };

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('scroll', 28)} Reports & Export</h1>
        <div class="sa-title-actions">
          <button class="btn btn-primary btn-sm" onclick="showToast('📊 Report generation queued. This may take a few minutes.','info')">+ Generate Report</button>
          <button class="btn btn-outline btn-sm" onclick="showToast('📥 Exporting all reports as ZIP…','info')">📥 Export All</button>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        <div class="sa-metric-card sa-metric-blue"><div class="sa-metric-body"><div class="sa-metric-value">24</div><div class="sa-metric-label">Batches This Week</div></div></div>
        <div class="sa-metric-card sa-metric-green"><div class="sa-metric-body"><div class="sa-metric-value">18</div><div class="sa-metric-label">Transfers Completed</div></div></div>
        <div class="sa-metric-card sa-metric-orange"><div class="sa-metric-body"><div class="sa-metric-value">97.2%</div><div class="sa-metric-label">SLA Compliance</div></div></div>
        <div class="sa-metric-card sa-metric-red"><div class="sa-metric-body"><div class="sa-metric-value">3</div><div class="sa-metric-label">Open Incidents</div></div></div>
      </div>

      <!-- Report Templates -->
      <section class="sa-section">
        <h2 class="sa-section-title">Quick Export</h2>
        <div class="sa-grid-2col" style="gap:1rem;margin-bottom:1.5rem">
          ${exportCard('📊 Batch Summary', 'All batches with lifecycle status, origin, destination', 'CSV')}
          ${exportCard('🚚 Shipment Log', 'Transfer orders with carrier, tracking, SLA status', 'CSV')}
          ${exportCard('🔍 Scan Analytics', 'Scan volume, anomaly rate, duplicate detection', 'PDF')}
          ${exportCard('🧾 Incident Report', 'Open/closed cases, SLA compliance, resolution time', 'PDF')}
        </div>
      </section>

      <!-- Generated Reports -->
      <section class="sa-section">
        <h2 class="sa-section-title">Generated Reports</h2>
        <div class="sa-card">
          <table class="sa-table">
            <thead><tr><th>ID</th><th>Report</th><th>Period</th><th>Type</th><th>Status</th><th>Generated</th><th>Actions</th></tr></thead>
            <tbody>
              ${reports.map(r => `
                <tr class="sa-row-clickable">
                  <td><strong class="sa-code">${r.id}</strong></td>
                  <td>${r.title}</td>
                  <td style="color:var(--text-secondary)">${r.period}</td>
                  <td><span style="font-size:1.1rem">${typeIcons[r.type] || '📄'}</span></td>
                  <td><span class="sa-status-pill sa-pill-${r.status === 'ready' ? 'green' : 'orange'}">${r.status}</span></td>
                  <td style="color:var(--text-secondary);font-size:0.78rem">${r.generated}</td>
                  <td>
                    ${r.status === 'ready' ? `<button class="btn btn-xs btn-outline" onclick="showToast('📥 Downloading ${r.id}: ${r.title}','success')">📥 Download</button>` : '<button class="btn btn-xs btn-ghost" disabled>Generating…</button>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function exportCard(title, desc, format) {
  return `
    <div class="sa-card" style="cursor:pointer;transition:transform 0.15s" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <h3 style="margin:0 0 4px;font-size:0.92rem">${title}</h3>
          <div style="font-size:0.75rem;color:var(--text-secondary)">${desc}</div>
        </div>
        <button class="btn btn-sm btn-outline" onclick="showToast('📥 Exporting ${title} as ${format}…','info')">${format} ↓</button>
      </div>
    </div>
  `;
}
