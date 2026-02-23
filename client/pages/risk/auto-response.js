/**
 * Risk – Auto Response Configuration
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const rules = [
        { trigger: 'Risk Score ≥ 90', action: 'Auto-lock QR + Create case + Notify CEO', status: 'active', hits: 3 },
        { trigger: 'Duplicate from blocked region', action: 'Auto-lock QR + Alert risk team', status: 'active', hits: 7 },
        { trigger: 'Velocity > 10 scans/5min', action: 'Temporary block device + Alert', status: 'active', hits: 2 },
        { trigger: 'Cross-border < 2h', action: 'Flag + Create investigation case', status: 'active', hits: 12 },
        { trigger: 'Rooted device detected', action: 'Flag + Add to watchlist', status: 'paused', hits: 1 },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('settings', 28)} Auto Response</h1></div>

      <div class="sa-card" style="margin-bottom:1rem">
        <h3>Auto Response Rules</h3>
        <table class="sa-table">
          <thead><tr><th>Trigger Condition</th><th>Action</th><th>Status</th><th>Hits (30d)</th><th>Actions</th></tr></thead>
          <tbody>
            ${rules.map(r => `
              <tr>
                <td><strong>${r.trigger}</strong></td>
                <td style="font-size:0.78rem">${r.action}</td>
                <td><span class="sa-status-pill sa-pill-${r.status === 'active' ? 'green' : 'orange'}">${r.status}</span></td>
                <td class="sa-code">${r.hits}</td>
                <td>
                  <button class="btn btn-xs btn-outline">Edit</button>
                  <button class="btn btn-xs btn-ghost">${r.status === 'active' ? 'Pause' : 'Resume'}</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <button class="btn btn-sm btn-ghost" style="margin-top:0.75rem">+ Add Auto Response Rule</button>
      </div>
    </div>
  `;
}
