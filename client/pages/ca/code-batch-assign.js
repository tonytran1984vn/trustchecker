/**
 * Company Admin – Code Batch Assignment
 * Bind codes to batch context: production date, distributor, region, expiry
 */
import { icon } from '../../core/icons.js';

const ASSIGNMENTS = [
    { batch: 'B-2026-0895', product: 'Premium Coffee Blend', codes: 10000, assigned: 10000, unassigned: 0, production: '2026-02-19', expiry: '2028-02-19', factory: 'HCM-01', distributor: 'D-VN-012 (Saigon Trading)', region: 'VN-South', status: 'complete' },
    { batch: 'B-2026-0891', product: 'Organic Tea Collection', codes: 5000, assigned: 5000, unassigned: 0, production: '2026-02-18', expiry: '2028-02-18', factory: 'HN-02', distributor: 'D-VN-008 (Hanoi Express)', region: 'VN-North', status: 'complete' },
    { batch: 'B-2026-0887', product: 'Manuka Honey UMF15+', codes: 2000, assigned: 1200, unassigned: 800, production: '2026-02-17', expiry: '2029-02-17', factory: 'SG-01', distributor: 'Pending assignment', region: 'APAC', status: 'partial' },
    { batch: 'B-2026-0882', product: 'Premium Coffee (Dark)', codes: 8000, assigned: 0, unassigned: 8000, production: '2026-02-15', expiry: '2028-02-15', factory: 'HCM-01', distributor: 'Not assigned', region: '—', status: 'unassigned' },
];

const METADATA_FIELDS = [
    { field: 'batch_id', required: true, desc: 'Unique batch identifier', source: 'System auto' },
    { field: 'production_date', required: true, desc: 'Manufacturing date', source: 'Factory input' },
    { field: 'expiry_date', required: true, desc: 'Product shelf life end', source: 'Product config' },
    { field: 'factory_code', required: true, desc: 'Production facility ID', source: 'Node registry' },
    { field: 'distributor_id', required: true, desc: 'Assigned distributor', source: 'Partner registry' },
    { field: 'region', required: true, desc: 'Target distribution region', source: 'Geo config' },
    { field: 'product_sku', required: true, desc: 'Product line SKU', source: 'Product catalog' },
    { field: 'quality_grade', required: false, desc: 'QC grade (A/B/C)', source: 'QC team' },
    { field: 'certification', required: false, desc: 'Organic, Halal, ISO cert', source: 'Compliance' },
    { field: 'customs_ref', required: false, desc: 'Export customs reference', source: 'Logistics' },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('clipboard', 28)} Batch Assignment</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Assign Codes to Batch</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Total Codes', '25,000', 'Across 4 batches', 'blue', 'zap')}
        ${m('Fully Assigned', '2', '15,000 codes bound', 'green', 'check')}
        ${m('Partial', '1', '800 codes pending', 'orange', 'clock')}
        ${m('Unassigned', '1', '8,000 codes (no batch context)', 'red', 'alertTriangle')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📦 Batch ↔ Code Assignments</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Every code must be bound to a batch with full metadata before activation. Unbound codes cannot be scanned.</p>
        <table class="sa-table"><thead><tr><th>Batch</th><th>Product</th><th>Codes</th><th>Assigned</th><th>Production</th><th>Expiry</th><th>Factory</th><th>Distributor</th><th>Region</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${ASSIGNMENTS.map(a => `<tr class="${a.status === 'unassigned' ? 'ops-alert-row' : ''}">
            <td class="sa-code">${a.batch}</td><td><strong>${a.product}</strong></td>
            <td style="text-align:right">${a.codes.toLocaleString()}</td>
            <td style="text-align:right">${a.assigned.toLocaleString()} ${a.unassigned > 0 ? `<span style="color:#ef4444;font-size:0.72rem">(${a.unassigned} pending)</span>` : ''}</td>
            <td class="sa-code" style="font-size:0.78rem">${a.production}</td>
            <td class="sa-code" style="font-size:0.78rem">${a.expiry}</td>
            <td>${a.factory}</td>
            <td style="font-size:0.78rem">${a.distributor}</td>
            <td>${a.region}</td>
            <td><span class="sa-status-pill sa-pill-${a.status === 'complete' ? 'green' : a.status === 'partial' ? 'orange' : 'red'}">${a.status}</span></td>
            <td>${a.status !== 'complete' ? '<button class="btn btn-xs btn-outline">Assign</button>' : '<button class="btn btn-xs btn-ghost">Reassign</button>'}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <div class="sa-card">
        <h3>🏷 Required Metadata per Code</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Each code inherits batch metadata. Without these fields, Risk Engine cannot evaluate context.</p>
        <table class="sa-table"><thead><tr><th>Field</th><th>Required</th><th>Description</th><th>Data Source</th></tr></thead><tbody>
          ${METADATA_FIELDS.map(f => `<tr>
            <td class="sa-code" style="font-size:0.78rem">${f.field}</td>
            <td><span class="sa-status-pill sa-pill-${f.required ? 'red' : 'blue'}">${f.required ? 'required' : 'optional'}</span></td>
            <td style="font-size:0.82rem">${f.desc}</td>
            <td style="font-size:0.78rem">${f.source}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
