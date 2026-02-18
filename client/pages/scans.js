/**
 * TrustChecker – Scans Page
 */
import { State, render } from '../core/state.js';
import { timeAgo, scoreColor } from '../utils/helpers.js';

export function renderPage() {
  return `
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-title">🔍 All Scan Events</div>
        <button class="btn btn-sm" onclick="exportScansCSV()">📊 Export CSV</button>
      </div>
      <div class="table-container">
        <table>
          <tr><th>Product</th><th>Result</th><th>Fraud %</th><th>Trust</th><th>City</th><th>Response</th><th>Time</th></tr>
          ${(State.scanHistory || []).map(s => `
            <tr>
              <td style="font-weight:600;color:var(--text-primary)">${s.product_name || '—'}</td>
              <td><span class="badge ${s.result}">${s.result}</span></td>
              <td style="font-family:'JetBrains Mono';font-size:0.75rem;color:${s.fraud_score > 0.5 ? 'var(--rose)' : 'var(--emerald)'}">${(s.fraud_score * 100).toFixed(0)}%</td>
              <td style="font-family:'JetBrains Mono';font-size:0.75rem;color:${scoreColor(s.trust_score)}">${Math.round(s.trust_score)}</td>
              <td style="font-size:0.75rem">${s.geo_city || '—'}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${s.response_time_ms}ms</td>
              <td class="event-time">${timeAgo(s.scanned_at)}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>
  `;
}

// Window exports for onclick handlers

