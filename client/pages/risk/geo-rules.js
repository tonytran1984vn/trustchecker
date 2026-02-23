/**
 * Risk – Geo Rules Configuration
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const regions = [
        { name: 'Cambodia (blocked)', status: 'blocked', reason: 'Unauthorized distribution channel' },
        { name: 'Myanmar (restricted)', status: 'restricted', reason: 'Limited distributor network' },
        { name: 'Thailand (monitored)', status: 'monitored', reason: 'High fraud activity zone' },
        { name: 'Laos (restricted)', status: 'restricted', reason: 'No authorized distributor' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('globe', 28)} Geo Rules</h1></div>

      <div class="sa-card" style="margin-bottom:1rem">
        <h3>Region Restrictions</h3>
        <table class="sa-table">
          <thead><tr><th>Region</th><th>Status</th><th>Reason</th><th>Actions</th></tr></thead>
          <tbody>
            ${regions.map(r => `
              <tr>
                <td><strong>${r.name}</strong></td>
                <td><span class="sa-status-pill sa-pill-${r.status === 'blocked' ? 'red' : r.status === 'restricted' ? 'orange' : 'blue'}">${r.status}</span></td>
                <td style="font-size:0.78rem;color:var(--text-secondary)">${r.reason}</td>
                <td><button class="btn btn-xs btn-outline">Edit</button> <button class="btn btn-xs btn-ghost">Remove</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <button class="btn btn-sm btn-ghost" style="margin-top:0.75rem">+ Add Region Rule</button>
      </div>

      <div class="sa-card">
        <h3>Geo-fence Settings</h3>
        <div class="sa-threshold-list">
          ${threshold('Auto-block threshold', 'Block region after', '50 anomalies/month')}
          ${threshold('Alert on first scan', 'Alert when product scanned first time in', 'New country')}
          ${threshold('Velocity + Geo combo', 'Flag if velocity spike AND geo anomaly within', '30 minutes')}
        </div>
      </div>
    </div>
  `;
}

function threshold(name, desc, value) {
    return `<div class="sa-threshold-item"><div class="sa-threshold-header"><strong>${name}</strong><input class="ops-input" value="${value}" style="width:180px;text-align:center" /></div><div class="sa-threshold-desc">${desc}</div></div>`;
}
