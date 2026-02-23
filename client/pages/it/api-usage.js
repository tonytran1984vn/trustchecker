/**
 * IT – API Usage
 */
import { icon } from '../../core/icons.js';
export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('dashboard', 28)} API Usage</h1></div>
      <div class="sa-metrics-row">
        ${m('Total Requests (24h)', '42,800', '↑ 12% from yesterday', 'blue', 'dashboard')}
        ${m('Error Rate', '0.3%', '128 errors / 42,800 total', 'green', 'check')}
        ${m('Avg Latency', '85ms', 'P99: 340ms', 'green', 'clock')}
        ${m('Rate Limit Hits', '12', '3 clients throttled', 'orange', 'alertTriangle')}
      </div>
      <div class="sa-card" style="margin-top:1rem">
        <h3>Rate Limits</h3>
        <table class="sa-table"><thead><tr><th>Client</th><th>Limit</th><th>Used (24h)</th><th>%</th><th>Status</th></tr></thead><tbody>
          <tr><td><strong>Mobile App</strong></td><td>10,000/h</td><td>8,200</td><td>82%</td><td><span class="sa-status-pill sa-pill-orange">near limit</span></td></tr>
          <tr><td><strong>SAP Integration</strong></td><td>5,000/h</td><td>1,200</td><td>24%</td><td><span class="sa-status-pill sa-pill-green">ok</span></td></tr>
          <tr><td><strong>Partner Portal</strong></td><td>2,000/h</td><td>450</td><td>23%</td><td><span class="sa-status-pill sa-pill-green">ok</span></td></tr>
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
