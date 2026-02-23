/**
 * Risk – Distributor Risk Ranking
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const distributors = [
        { id: 'D-204', name: 'Pacific Trade Co.', region: 'Cambodia', score: 82, events: 18, trend: '↑ rising', status: 'watchlist' },
        { id: 'D-118', name: 'Metro Supply BKK', region: 'Thailand', score: 67, events: 9, trend: '→ stable', status: 'monitored' },
        { id: 'D-302', name: 'Saigon Distribution', region: 'Vietnam', score: 34, events: 3, trend: '↓ declining', status: 'normal' },
        { id: 'D-155', name: 'Singapore Retail Hub', region: 'Singapore', score: 12, events: 0, trend: '→ stable', status: 'normal' },
        { id: 'D-180', name: 'Delta Logistics', region: 'Vietnam', score: 0, events: 72, trend: 'N/A', status: 'terminated' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('network', 28)} Distributor Risk</h1></div>

      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>ID</th><th>Distributor</th><th>Region</th><th>Risk Score</th><th>Events (90d)</th><th>Trend</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${distributors.map(d => `
              <tr class="sa-row-clickable">
                <td class="sa-code">${d.id}</td>
                <td><strong>${d.name}</strong></td>
                <td>${d.region}</td>
                <td><span class="sa-score sa-score-${d.score >= 70 ? 'danger' : d.score >= 40 ? 'warning' : d.score > 0 ? 'low' : 'info'}">${d.score}</span></td>
                <td>${d.events}</td>
                <td style="color:${d.trend.includes('↑') ? '#ef4444' : d.trend.includes('↓') ? '#22c55e' : 'var(--text-secondary)'}">${d.trend}</td>
                <td><span class="sa-status-pill sa-pill-${d.status === 'watchlist' ? 'red' : d.status === 'monitored' ? 'orange' : d.status === 'terminated' ? 'red' : 'green'}">${d.status}</span></td>
                <td><button class="btn btn-xs btn-outline">Profile</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
