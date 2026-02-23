/**
 * Compliance – Risk Policy Adherence
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const policies = [
        { name: 'Duplicate Detection', required: 'Active on all SKUs', actual: 'Active (100%)', adherence: 100, status: 'compliant' },
        { name: 'Geo Restriction', required: 'Blocked regions configured', actual: '4 regions configured', adherence: 100, status: 'compliant' },
        { name: 'Velocity Monitoring', required: 'Per-QR + Per-Device', actual: 'Per-QR only', adherence: 60, status: 'partial' },
        { name: 'Auto Response Rules', required: 'Min 3 active rules', actual: '5 active rules', adherence: 100, status: 'compliant' },
        { name: 'Case Escalation SLA', required: '< 24h for critical', actual: 'Avg 18h', adherence: 85, status: 'compliant' },
        { name: 'Monthly Risk Review', required: 'Monthly', actual: 'Last: 45 days ago', adherence: 40, status: 'non_compliant' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('alertTriangle', 28)} Risk Policy</h1></div>
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>Policy</th><th>Required</th><th>Actual</th><th>Adherence</th><th>Status</th></tr></thead>
          <tbody>
            ${policies.map(p => `
              <tr>
                <td><strong>${p.name}</strong></td>
                <td style="font-size:0.78rem">${p.required}</td>
                <td style="font-size:0.78rem">${p.actual}</td>
                <td><div style="display:flex;align-items:center;gap:0.5rem"><div style="width:60px;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden"><div style="width:${p.adherence}%;height:100%;background:${p.adherence >= 80 ? '#22c55e' : p.adherence >= 50 ? '#f59e0b' : '#ef4444'};border-radius:3px"></div></div><span style="font-size:0.78rem;font-weight:600">${p.adherence}%</span></div></td>
                <td><span class="sa-status-pill sa-pill-${p.status === 'compliant' ? 'green' : p.status === 'partial' ? 'orange' : 'red'}">${p.status.replace('_', ' ')}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
