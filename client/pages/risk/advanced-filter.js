/**
 * Risk – Advanced Filter
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('search', 28)} Advanced Filter</h1></div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>Filter Criteria</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem">
          ${filter('Time Range', 'Last 7 days')}
          ${filter('Region', 'All regions')}
          ${filter('SKU / Product', 'All products')}
          ${filter('Node', 'All nodes')}
          ${filter('Risk Score', '≥ 50')}
          ${filter('Pattern Type', 'All types')}
          ${filter('Device Type', 'All devices')}
          ${filter('IP Range', 'Any')}
          ${filter('Status', 'All statuses')}
        </div>
        <div style="display:flex;gap:1rem;justify-content:flex-end;margin-top:1.25rem">
          <button class="btn btn-outline btn-sm">Reset</button>
          <button class="btn btn-primary btn-sm">Apply Filters</button>
        </div>
      </div>

      <div class="sa-card">
        <h3>Filtered Results (0 applied — showing all)</h3>
        <table class="sa-table">
          <thead><tr><th>ID</th><th>Type</th><th>QR</th><th>Region</th><th>Score</th><th>Time</th></tr></thead>
          <tbody>
            <tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:2rem">Apply filters above to narrow results</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function filter(label, value) {
    return `<div class="ops-field"><label class="ops-label">${label}</label><input class="ops-input" value="${value}" /></div>`;
}
