/**
 * SA – Data Access Matrix (Who Sees What)
 * Field-level RBAC across 7 roles: Super Admin, Company Admin, CEO, Ops, Risk, Compliance, IT
 * Enterprise requirement: "Show me exactly which role can access which data"
 */
import { icon } from '../../core/icons.js';

const ROLES = ['Super Admin', 'Company Admin', 'CEO', 'Ops', 'Risk', 'Compliance', 'IT'];
const ROLE_COLORS = { 'Super Admin': '#ef4444', 'Company Admin': '#8b5cf6', 'CEO': '#f59e0b', 'Ops': '#3b82f6', 'Risk': '#ef4444', 'Compliance': '#22c55e', 'IT': '#06b6d4' };

// <span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> = Full access, 👁 = Read-only, 📊 = Aggregated only, — = No access
const MATRIX = [
    {
        domain: 'SCAN DATA', items: [
            { resource: 'Individual scan log (raw)', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '—', ops: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', risk: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', comp: '👁', it: '👁' },
            { resource: 'Scan volume (aggregate)', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '📊', ops: '📊', risk: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', comp: '📊', it: '📊' },
            { resource: 'Consumer device hash', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '—', ceo: '—', ops: '—', risk: '👁', comp: '👁', it: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' },
            { resource: 'Consumer IP address', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '—', ceo: '—', ops: '—', risk: '👁', comp: '👁', it: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' },
            { resource: 'Geo coordinates (precise)', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '—', ops: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', risk: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', comp: '👁', it: '—' },
            { resource: 'Geo region (aggregate)', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '📊', ops: '📊', risk: '📊', comp: '📊', it: '—' },
        ]
    },
    {
        domain: 'RISK ENGINE', items: [
            { resource: 'ERS per event', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '👁', ceo: '—', ops: '👁', risk: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', comp: '👁', it: '—' },
            { resource: 'BRS per batch', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '📊', ops: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', risk: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', comp: '👁', it: '—' },
            { resource: 'CRS per distributor', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '📊', ops: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', risk: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', comp: '👁', it: '—' },
            { resource: 'BRI (Brand Risk Index)', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ops: '📊', risk: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', comp: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', it: '—' },
            { resource: 'Scoring weights config', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '👁', ceo: '—', ops: '—', risk: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', comp: '👁', it: '—' },
            { resource: 'Model version / sandbox', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '—', ceo: '—', ops: '—', risk: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', comp: '👁', it: '—' },
            { resource: 'Recalibration history', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '👁', ceo: '—', ops: '—', risk: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', comp: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', it: '—' },
        ]
    },
    {
        domain: 'CODE GOVERNANCE', items: [
            { resource: 'Code format rules', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '—', ops: '👁', risk: '—', comp: '👁', it: '—' },
            { resource: 'Code generation (action)', sa: '—', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '—', ops: '—', risk: '—', comp: '—', it: '—' },
            { resource: 'Batch assignment', sa: '—', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '—', ops: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', risk: '—', comp: '👁', it: '—' },
            { resource: 'Code lifecycle state', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '—', ops: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', risk: '👁', comp: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', it: '—' },
            { resource: 'Audit log (immutable)', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '👁', ceo: '—', ops: '—', risk: '👁', comp: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', it: '👁' },
            { resource: 'Lock / Revoke (action)', sa: '—', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>*', ceo: '—', ops: '—', risk: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>*', comp: '—', it: '—' },
        ]
    },
    {
        domain: 'SUPPLY CHAIN (ERP OVERLAY)', items: [
            { resource: 'Purchase Orders', sa: '📊', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '📊', ops: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', risk: '—', comp: '👁', it: '—' },
            { resource: 'Warehouse stock levels', sa: '📊', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '—', ops: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', risk: '—', comp: '—', it: '—' },
            { resource: 'Shipment tracking', sa: '📊', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '—', ops: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', risk: '👁', comp: '—', it: '—' },
            { resource: 'QC inspection results', sa: '📊', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '—', ops: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', risk: '👁', comp: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', it: '—' },
            { resource: 'Supplier composite score', sa: '📊', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '📊', ops: '👁', risk: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', comp: '👁', it: '—' },
            { resource: 'Demand forecast', sa: '—', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '📊', ops: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', risk: '—', comp: '—', it: '—' },
        ]
    },
    {
        domain: 'CASE MANAGEMENT', items: [
            { resource: 'Create case', sa: '—', ca: '—', ceo: '—', ops: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', risk: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', comp: '—', it: '—' },
            { resource: 'View open cases', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '📊', ops: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', risk: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', comp: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', it: '—' },
            { resource: 'Escalate case', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '—', ceo: '—', ops: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', risk: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', comp: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', it: '—' },
            { resource: 'Close / resolve case', sa: '—', ca: '—', ceo: '—', ops: '—', risk: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', comp: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', it: '—' },
            { resource: 'Evidence package export', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '—', ceo: '—', ops: '—', risk: '👁', comp: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', it: '—' },
        ]
    },
    {
        domain: 'PLATFORM / INFRASTRUCTURE', items: [
            { resource: 'API keys & secrets', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '—', ceo: '—', ops: '—', risk: '—', comp: '—', it: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' },
            { resource: 'Integration health', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '📊', ceo: '—', ops: '—', risk: '—', comp: '—', it: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' },
            { resource: 'Cross-tenant analytics', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '—', ceo: '—', ops: '—', risk: '—', comp: '—', it: '—' },
            { resource: 'System performance', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '—', ceo: '—', ops: '—', risk: '—', comp: '—', it: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' },
            { resource: 'User provisioning', sa: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ca: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', ceo: '—', ops: '—', risk: '—', comp: '—', it: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' },
        ]
    },
];

export function renderPage() {
    const legend = [['<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', 'Full access', '#22c55e'], ['👁', 'Read-only', '#3b82f6'], ['📊', 'Aggregated only', '#f59e0b'], ['—', 'No access', '#94a3b8'], ['<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>*', 'With approval (4/6-Eyes)', '#8b5cf6']];
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('shield', 28)} Data Access Matrix</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">Export RBAC Policy</button></div></div>
      <div style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap">
        ${legend.map(([sym, lbl, clr]) => `<span style="font-size:0.72rem;display:flex;align-items:center;gap:0.3rem"><span style="font-size:1rem">${sym}</span><span style="color:${clr}">${lbl}</span></span>`).join('')}
      </div>
      ${MATRIX.map(domain => `
        <div class="sa-card" style="margin-bottom:1rem">
          <h3 style="font-size:0.88rem;margin-bottom:0.5rem">${domain.domain}</h3>
          <table class="sa-table"><thead><tr><th style="min-width:200px">Resource</th>${ROLES.map(r => `<th style="text-align:center;font-size:0.68rem;color:${ROLE_COLORS[r]}">${r.replace(' ', '\n')}</th>`).join('')}</tr></thead><tbody>
            ${domain.items.map(item => `<tr>
              <td style="font-size:0.78rem"><strong>${item.resource}</strong></td>
              <td style="text-align:center;font-size:1.1rem">${item.sa}</td>
              <td style="text-align:center;font-size:1.1rem">${item.ca}</td>
              <td style="text-align:center;font-size:1.1rem">${item.ceo}</td>
              <td style="text-align:center;font-size:1.1rem">${item.ops}</td>
              <td style="text-align:center;font-size:1.1rem">${item.risk}</td>
              <td style="text-align:center;font-size:1.1rem">${item.comp}</td>
              <td style="text-align:center;font-size:1.1rem">${item.it}</td>
            </tr>`).join('')}
          </tbody></table>
        </div>
      `).join('')}
    </div>`;
}
