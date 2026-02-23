/**
 * Risk – Duplicate Rules Configuration
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('shield', 28)} Duplicate Rules</h1></div>

      <div class="sa-card" style="margin-bottom:1rem">
        <h3>Global Duplicate Detection</h3>
        <div class="sa-threshold-list">
          ${threshold('Time Window', 'Flag if same QR scanned within', '5 minutes', 'Min time between scans to NOT flag')}
          ${threshold('Distance Threshold', 'Flag if scan locations differ by more than', '50 km', 'Minimum geo distance for duplicate flag')}
          ${threshold('Max Scans per QR', 'Flag if total scans exceed', '10 scans/day', 'Daily scan limit per unique QR')}
          ${threshold('Cross-Border Alert', 'Flag if scanned in different countries within', '2 hours', 'Time window for cross-border duplicate')}
        </div>
      </div>

      <div class="sa-card" style="margin-bottom:1rem">
        <h3>Per-Product Overrides</h3>
        <table class="sa-table">
          <thead><tr><th>Product / SKU</th><th>Time Window</th><th>Distance</th><th>Max Scans</th><th>Actions</th></tr></thead>
          <tbody>
            <tr><td>COFFEE-PRE-250</td><td>3 min (stricter)</td><td>30 km</td><td>5/day</td><td><button class="btn btn-xs btn-outline">Edit</button></td></tr>
            <tr><td>OIL-COC-500</td><td>10 min (relaxed)</td><td>100 km</td><td>15/day</td><td><button class="btn btn-xs btn-outline">Edit</button></td></tr>
          </tbody>
        </table>
        <button class="btn btn-sm btn-ghost" style="margin-top:0.75rem">+ Add Override</button>
      </div>

      <div style="display:flex;gap:1rem;justify-content:flex-end;margin-top:1.5rem">
        <button class="btn btn-outline">Reset to Default</button>
        <button class="btn btn-primary">Save Rules</button>
      </div>
    </div>
  `;
}

function threshold(name, desc, value, help) {
    return `<div class="sa-threshold-item"><div class="sa-threshold-header"><strong>${name}</strong><input class="ops-input" value="${value}" style="width:180px;text-align:center" /></div><div class="sa-threshold-desc">${desc}<br><em style="font-size:0.7rem;opacity:0.6">${help}</em></div></div>`;
}
