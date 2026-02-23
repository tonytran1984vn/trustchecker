/**
 * SCM – Supplier Scoring (Enterprise Supplier Evaluation)
 * KYC + Trust + Delivery + Compliance + Financial scoring
 */
import { icon } from '../../core/icons.js';

const SUPPLIERS = [
    { id: 'SUP-001', name: 'Golden Beans Co.', country: 'Vietnam', type: 'Manufacturer', kyc: 'Verified', trust: 92, delivery: 96, quality: 94, compliance: 88, financial: 85, composite: 91, tier: 'Gold', contracts: 2, risk: 'Low', since: '2022' },
    { id: 'SUP-002', name: 'Ceylon Leaf Ltd', country: 'Sri Lanka', type: 'Manufacturer', kyc: 'Verified', trust: 88, delivery: 91, quality: 93, compliance: 90, financial: 82, composite: 89, tier: 'Gold', contracts: 1, risk: 'Low', since: '2023' },
    { id: 'SUP-003', name: 'NZ Manuka Inc', country: 'New Zealand', type: 'Producer', kyc: 'Verified', trust: 95, delivery: 89, quality: 98, compliance: 95, financial: 92, composite: 94, tier: 'Platinum', contracts: 1, risk: 'Low', since: '2024' },
    { id: 'SUP-004', name: 'Pacific Pack', country: 'Thailand', type: 'Packaging', kyc: 'Verified', trust: 78, delivery: 85, quality: 82, compliance: 75, financial: 80, composite: 80, tier: 'Silver', contracts: 1, risk: 'Medium', since: '2024' },
    { id: 'SUP-005', name: 'Mekong Logistics', country: 'Vietnam', type: '3PL', kyc: 'Pending', trust: 65, delivery: 72, quality: 70, compliance: 60, financial: 68, composite: 67, tier: 'Bronze', contracts: 0, risk: 'High', since: '2025' },
];

const SCORING_DIMENSIONS = [
    { dim: 'Trust Score', weight: '25%', factors: 'Transaction history, dispute rate, reference checks, years in partnership', source: 'TrustChecker platform data' },
    { dim: 'Delivery Performance', weight: '20%', factors: 'On-time rate, lead time variance, order accuracy, damage rate', source: 'PO + shipment records' },
    { dim: 'Quality Score', weight: '25%', factors: 'QC pass rate, defect rate, certification status, audit findings', source: 'QC inspections + audits' },
    { dim: 'Compliance Score', weight: '15%', factors: 'KYC status, regulatory compliance, ESG rating, sanction screening', source: 'Compliance module' },
    { dim: 'Financial Health', weight: '15%', factors: 'Credit rating, payment history, insurance coverage, D&B score', source: 'External + financial data' },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('users', 28)} Supplier Scoring</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Onboard Supplier</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Active Suppliers', SUPPLIERS.length.toString(), `${SUPPLIERS.filter(s => s.tier === 'Gold' || s.tier === 'Platinum').length} Gold/Platinum`, 'green', 'users')}
        ${m('Avg Composite', Math.round(SUPPLIERS.reduce((s, su) => s + su.composite, 0) / SUPPLIERS.length).toString(), 'Weighted across 5 dimensions', 'blue', 'target')}
        ${m('KYC Pending', SUPPLIERS.filter(s => s.kyc === 'Pending').length.toString(), 'Requires verification', 'orange', 'shield')}
        ${m('High Risk', SUPPLIERS.filter(s => s.risk === 'High').length.toString(), 'Below threshold (< 70)', 'red', 'alertTriangle')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📊 Supplier Performance Matrix</h3>
        <table class="sa-table"><thead><tr><th>Supplier</th><th>Country</th><th>Type</th><th>KYC</th><th>Trust</th><th>Delivery</th><th>Quality</th><th>Compliance</th><th>Financial</th><th>Composite</th><th>Tier</th><th>Risk</th></tr></thead><tbody>
          ${SUPPLIERS.map(s => {
        const tierColor = s.tier === 'Platinum' ? '#8b5cf6' : s.tier === 'Gold' ? '#f59e0b' : s.tier === 'Silver' ? '#94a3b8' : '#cd7f32';
        return `<tr class="${s.risk === 'High' ? 'ops-alert-row' : ''}">
              <td><strong>${s.name}</strong><div style="font-size:0.65rem;color:var(--text-secondary)">${s.id} · Since ${s.since}</div></td>
              <td>${s.country}</td><td style="font-size:0.78rem">${s.type}</td>
              <td><span class="sa-status-pill sa-pill-${s.kyc === 'Verified' ? 'green' : 'orange'}">${s.kyc}</span></td>
              ${[s.trust, s.delivery, s.quality, s.compliance, s.financial].map(v => `<td style="text-align:center;font-weight:600;color:${v >= 90 ? '#22c55e' : v >= 75 ? '#f59e0b' : '#ef4444'}">${v}</td>`).join('')}
              <td style="text-align:center;font-weight:800;font-size:1.1rem;color:${s.composite >= 90 ? '#22c55e' : s.composite >= 75 ? '#f59e0b' : '#ef4444'}">${s.composite}</td>
              <td><span style="font-weight:700;color:${tierColor}">⬤ ${s.tier}</span></td>
              <td><span class="sa-status-pill sa-pill-${s.risk === 'Low' ? 'green' : s.risk === 'Medium' ? 'orange' : 'red'}">${s.risk}</span></td>
            </tr>`;
    }).join('')}
        </tbody></table>
      </div>

      <div class="sa-card">
        <h3>📐 Scoring Methodology</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.75rem">Composite Score = Σ(Dimension × Weight). Review cycle: quarterly. Auto-downgrade if composite falls below 70.</p>
        <table class="sa-table"><thead><tr><th>Dimension</th><th>Weight</th><th>Factors</th><th>Data Source</th></tr></thead><tbody>
          ${SCORING_DIMENSIONS.map(d => `<tr>
            <td><strong>${d.dim}</strong></td><td style="font-weight:700">${d.weight}</td>
            <td style="font-size:0.78rem">${d.factors}</td>
            <td style="font-size:0.78rem">${d.source}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
