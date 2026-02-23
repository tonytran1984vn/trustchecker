/**
 * Ops – Incident History
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const history = [
        { id: 'OPS-0042', title: 'Early activation — batch scanned before receiving', resolution: 'False positive — scanner test', severity: 'medium', status: 'closed', resolved: '1d ago', duration: '4h' },
        { id: 'OPS-0041', title: 'Geo anomaly scan from Laos', resolution: 'Confirmed gray market — escalated to compliance', severity: 'high', status: 'escalated', resolved: '2d ago', duration: '8h' },
        { id: 'OPS-0040', title: 'Warehouse congestion HCM-03', resolution: 'Redistributed to HCM-04 — congestion cleared', severity: 'medium', status: 'resolved', resolved: '3d ago', duration: '12h' },
        { id: 'OPS-0039', title: 'QR printing defect — batch B-2026-0800', resolution: 'Reprinted 200 labels, old batch voided', severity: 'low', status: 'resolved', resolved: '5d ago', duration: '2h' },
        { id: 'OPS-0038', title: 'Shipment delay customs BKK', resolution: 'Cleared after documentation update', severity: 'medium', status: 'resolved', resolved: '7d ago', duration: '48h' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('scroll', 28)} Incident History</h1></div>

      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>Case ID</th><th>Title</th><th>Resolution</th><th>Severity</th><th>Status</th><th>Duration</th><th>Resolved</th></tr></thead>
          <tbody>
            ${history.map(h => `
              <tr>
                <td class="sa-code">${h.id}</td>
                <td>${h.title}</td>
                <td style="font-size:0.78rem;color:var(--text-secondary)">${h.resolution}</td>
                <td><span class="sa-score sa-score-${h.severity === 'high' ? 'danger' : h.severity === 'medium' ? 'warning' : 'low'}">${h.severity}</span></td>
                <td><span class="sa-status-pill sa-pill-${h.status === 'resolved' ? 'green' : h.status === 'escalated' ? 'orange' : 'blue'}">${h.status}</span></td>
                <td class="sa-code">${h.duration}</td>
                <td style="color:var(--text-secondary)">${h.resolved}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
