/**
 * Risk – Closed Cases
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const cases = [
        { id: 'RC-0008', title: 'Velocity spike Bangkok — marketing campaign', resolution: 'False positive — verified as legitimate promotional event', score: 45, duration: '3d', closed: '1w ago' },
        { id: 'RC-0006', title: 'Duplicate ring detected SGN retail', resolution: 'Counterfeit batch seized, 3 retail points blacklisted', score: 88, duration: '2w', closed: '3w ago' },
        { id: 'RC-0005', title: 'Supply chain leak — unauthorized reseller', resolution: 'Distributor D-180 terminated, product recalled', score: 72, duration: '1w', closed: '1m ago' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('check', 28)} Closed Cases</h1></div>
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>Case</th><th>Title</th><th>Resolution</th><th>Risk Score</th><th>Duration</th><th>Closed</th></tr></thead>
          <tbody>
            ${cases.map(c => `
              <tr>
                <td class="sa-code">${c.id}</td>
                <td><strong>${c.title}</strong></td>
                <td style="font-size:0.78rem;color:var(--text-secondary)">${c.resolution}</td>
                <td><span class="sa-score sa-score-${c.score >= 80 ? 'danger' : c.score >= 50 ? 'warning' : 'low'}">${c.score}</span></td>
                <td class="sa-code">${c.duration}</td>
                <td style="color:var(--text-secondary)">${c.closed}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
