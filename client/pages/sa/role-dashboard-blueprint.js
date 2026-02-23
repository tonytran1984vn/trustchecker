/**
 * SA – Role Dashboard Blueprint (Per-Persona Intelligence Design)
 * What each role sees, why they see it, what questions it answers
 */
import { icon } from '../../core/icons.js';

const BLUEPRINTS = [
    {
        role: 'Super Admin', color: '#ef4444', icon: '<span class="status-dot red"></span>', focus: 'Ecosystem Risk & Engine Governance', timeHorizon: 'Real-time + Monthly', kpis: [
            'Total scan volume (all tenants)', 'Cross-tenant anomaly clusters', 'Risk engine model version', 'API latency P99', 'Error rate by connector', 'Tenant SLA compliance'
        ], sections: [
            { name: 'Control Tower', desc: 'Bird\'s eye: scan volume, risk distribution, tenant health across ecosystem', dataLevel: 'Aggregated cross-tenant' },
            { name: 'Cross-Tenant Intelligence', desc: 'Detect patterns spanning multiple brands: same region, same counterfeit cluster', dataLevel: 'Pattern-level (no SKU detail)' },
            { name: 'Engine Governance', desc: 'Model version, recalibration queue, A/B test results, deployment gate', dataLevel: 'System config' },
            { name: 'Platform Health', desc: 'API load, scan latency, integration status, error rates', dataLevel: 'Infrastructure metrics' },
        ], doesNot: 'View individual SKUs, consumer data, or tenant-specific cases. Sees ecosystem patterns only.'
    },

    {
        role: 'Company Admin', color: '#8b5cf6', icon: '🟣', focus: 'Supply Chain Architecture & Rule Control', timeHorizon: 'Weekly + Configuration', kpis: [
            'Code generation audit', 'Active batch count', 'Distribution zone map', 'Rule threshold config', 'User provisioning status', 'Integration connector health'
        ], sections: [
            { name: 'Code Governance', desc: 'Format rules, generation log, batch assignment, lifecycle management', dataLevel: 'Full operational detail' },
            { name: 'Supply Chain Config', desc: 'Factories, warehouses, distributors, SKU→route mapping', dataLevel: 'Full config access' },
            { name: 'Rule & Threshold', desc: 'Duplicate threshold, risk escalation threshold, geo-fence config', dataLevel: 'Config + impact preview' },
            { name: 'Role Mapping', desc: 'RBAC assignment: who can generate codes, who can lock batches, who exports', dataLevel: 'Full RBAC control' },
        ], doesNot: 'Handle individual cases or investigations. Designs the rules of the game.'
    },

    {
        role: 'CEO', color: '#f59e0b', icon: '<span class="status-dot amber"></span>', focus: 'Strategic Integrity & Revenue Protection', timeHorizon: 'Monthly + Quarterly', kpis: [
            'Brand Risk Index (BRI)', 'Adjusted duplicate rate (classified)', 'Revenue protected ($M)', 'First scan rate', 'Top 3 risk regions', 'Distribution integrity score'
        ], sections: [
            { name: 'WHAT → SO WHAT → NOW WHAT', desc: '3-column decision cards: fact → implication → actionable recommendation', dataLevel: 'Aggregated + trend only' },
            { name: 'Brand Protection Index', desc: 'BRI trend (3-6 months), classified dup rate (not raw!), heatmap', dataLevel: 'Aggregated KPI' },
            { name: 'Distribution Integrity', desc: 'Channel leakage %, out-of-zone product detection, distributor risk', dataLevel: 'Aggregated per channel' },
            { name: 'Decision Triggers', desc: 'Needs legal action? Need audit? Need distributor change?', dataLevel: 'Y/N recommendations' },
        ], doesNot: 'See raw scan logs, individual codes, device hashes, or IP addresses. Everything is aggregated.'
    },

    {
        role: 'Ops', color: '#3b82f6', icon: '<span class="status-dot blue"></span>', focus: 'Real-time Monitoring & Action', timeHorizon: 'Hourly + Daily', kpis: [
            'Live scan feed', 'Duplicate alerts today', 'Out-of-zone alerts', 'Batch anomaly count', 'Shipment exceptions', 'QC pass rate'
        ], sections: [
            { name: 'Live Dashboard', desc: 'Real-time scan feed with ERS color coding, geo map, batch status', dataLevel: 'Full scan detail' },
            { name: 'Investigation', desc: 'First scan location, code journey trace, geo pattern comparison', dataLevel: 'Full event detail' },
            { name: 'Field Action', desc: 'Contact distributor, lock batch, pause distribution, create case', dataLevel: 'Operational actions' },
            { name: 'ERP Overlay', desc: 'Warehouse stock, shipment tracking, QC results — data from ERP', dataLevel: 'ERP integration read' },
        ], doesNot: 'Modify risk weights, change scoring model, or access compliance exports.'
    },

    {
        role: 'Risk', color: '#ef4444', icon: '<span class="status-dot red"></span>', focus: 'Risk Modeling & Anomaly Detection', timeHorizon: 'Weekly + Monthly', kpis: [
            'FP rate trend', 'Model accuracy (TP/FN)', 'Weight calibration log', 'Cluster detection', 'Decay effectiveness', 'Early warning signals'
        ], sections: [
            { name: 'Scoring Engine', desc: '4-tier scoring review, factor weights, decay function visualization', dataLevel: 'Full model access' },
            { name: 'Model Governance', desc: 'Propose weight changes, sandbox simulation, approval queue', dataLevel: 'Model config + simulation' },
            { name: 'Pattern Analysis', desc: 'Anomaly clusters, counterfeit ring detection, velocity patterns', dataLevel: 'Full analytical' },
            { name: 'Early Warning', desc: 'Trend detection before escalation: rising dup rate, new geo cluster', dataLevel: 'Predictive analytics' },
        ], doesNot: 'Generate codes, manage warehouses, or configure RBAC. Purely analytical + model management.'
    },

    {
        role: 'Compliance', color: '#22c55e', icon: '<span class="status-dot green"></span>', focus: 'Audit & Evidence', timeHorizon: 'Monthly + On-demand', kpis: [
            'Audit log completeness', 'Evidence packages created', 'Legal holds active', 'Regulatory reports filed', 'Config change log', 'Data retention compliance'
        ], sections: [
            { name: 'Audit Trail', desc: 'Immutable log: who created codes, who changed rules, who closed cases', dataLevel: 'Full audit read' },
            { name: 'Case Documentation', desc: 'Complete scan history, risk score evolution, action log per case', dataLevel: 'Case detail read' },
            { name: 'Evidence Export', desc: 'Signed PDF/CSV packages for regulators, digital signatures', dataLevel: 'Read + Export' },
            { name: 'Regulatory', desc: 'Pre-built templates for FDA, EU authorities, customs agencies', dataLevel: 'Template + data fill' },
        ], doesNot: 'Create cases, modify risk weights, or generate codes. Evidence-only role.'
    },

    {
        role: 'IT', color: '#06b6d4', icon: '<span class="status-dot blue"></span>', focus: 'Stability & Security', timeHorizon: 'Real-time + Daily', kpis: [
            'API latency P99', 'Integration uptime', 'Circuit breaker state', 'DLQ depth', 'Bot detection rate', 'Key rotation status'
        ], sections: [
            { name: 'Integration Resilience', desc: 'Connector health, retry queue, circuit breakers, DLQ management', dataLevel: 'Full infra access' },
            { name: 'API Management', desc: 'Keys, OAuth clients, rate limiting, usage monitoring', dataLevel: 'Full config' },
            { name: 'Security', desc: 'Access logs, key management, tamper detection, WAF rules', dataLevel: 'Full security access' },
            { name: 'Performance', desc: 'Scan latency, throughput, scaling recommendations', dataLevel: 'Full metrics' },
        ], doesNot: 'Access business data (scan content, risk scores, case details). Infrastructure-only.'
    },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('dashboard', 28)} Role Dashboard Blueprint</h1></div>
      ${BLUEPRINTS.map(b => `
        <div class="sa-card" style="margin-bottom:1rem;border-left:4px solid ${b.color}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
            <h3 style="margin:0">${b.icon} ${b.role}</h3>
            <span style="font-size:0.72rem;color:var(--text-secondary)">Focus: <strong style="color:${b.color}">${b.focus}</strong> · Cadence: ${b.timeHorizon}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.75rem">
            ${b.kpis.map(k => `<div style="font-size:0.68rem;padding:0.2rem 0.4rem;background:${b.color}06;border-radius:4px;border-left:2px solid ${b.color}">${k}</div>`).join('')}
          </div>
          <table class="sa-table" style="margin-bottom:0.5rem"><thead><tr><th>Dashboard Section</th><th>Content</th><th>Data Level</th></tr></thead><tbody>
            ${b.sections.map(s => `<tr><td><strong>${s.name}</strong></td><td style="font-size:0.78rem">${s.desc}</td><td style="font-size:0.72rem;color:${b.color}">${s.dataLevel}</td></tr>`).join('')}
          </tbody></table>
          <div style="font-size:0.72rem;padding:0.4rem 0.6rem;background:rgba(148,163,184,0.06);border-radius:4px">
            <strong>Does NOT:</strong> <span style="color:var(--text-secondary)">${b.doesNot}</span>
          </div>
        </div>
      `).join('')}
    </div>`;
}
