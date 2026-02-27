/**
 * TrustChecker – Router Module
 * Page routing with dynamic imports for heavy pages.
 * Includes navigate(), loadPageData(), renderPage().
 */
import { State, render } from './state.js';
import { API } from './api.js';
import { PAGE_FEATURE_MAP, hasFeature, showUpgradeModal } from './features.js';

// ─── Base path detection (for reverse-proxy sub-path like /trustchecker/) ─
const _basePath = (() => {
    const p = window.location.pathname;
    // Check if we're served under a sub-path (e.g. /trustchecker/)
    // If pathname starts with a known prefix before a page name, extract it
    const match = p.match(/^(\/[^/]+\/)/);
    if (match && match[1] !== '/api/' && match[1] !== '/ws/') {
        return match[1].replace(/\/$/, ''); // e.g. "/trustchecker"
    }
    return '';
})();

// ─── Lazy-loaded page module cache ──────────────────────────
const _pageCache = {};

/**
 * Page module loaders — heavy pages use dynamic import().
 * Light pages export their render function directly.
 */
const PAGE_LOADERS = {
    'dashboard': () => import('../pages/dashboard.js'),
    'scanner': () => import('../pages/scanner.js'),
    'products': () => import('../pages/products.js'),
    'scans': () => import('../pages/scans.js'),
    'fraud': () => import('../pages/fraud.js'),
    'blockchain': () => import('../pages/blockchain.js'),
    'blockchain-explorer': () => import('../pages/blockchain-explorer.js'),
    'events': () => import('../pages/events.js'),
    'scm-dashboard': () => import('../pages/scm/dashboard.js'),
    'scm-inventory': () => import('../pages/scm/inventory.js'),
    'scm-logistics': () => import('../pages/scm/logistics.js'),
    'scm-partners': () => import('../pages/scm/partners.js'),
    'scm-leaks': () => import('../pages/scm/leaks.js'),
    'scm-trustgraph': () => import('../pages/scm/trustgraph.js'),
    'scm-epcis': () => import('../pages/scm/epcis.js'),
    'scm-ai': () => import('../pages/scm/ai.js'),
    'scm-risk-radar': () => import('../pages/scm/risk-radar.js'),
    'scm-carbon': () => import('../pages/scm/carbon.js'),
    'scm-carbon-credit': () => import('../pages/scm/carbon-credit.js'),
    'identity': () => import('../pages/infra/identity.js'),
    'risk-graph': () => import('../pages/infra/risk-graph.js'),
    'compliance-regtech': () => import('../pages/infra/compliance-regtech.js'),
    'api-economy': () => import('../pages/infra/api-economy.js'),
    'green-finance': () => import('../pages/infra/green-finance.js'),
    'reputation': () => import('../pages/infra/reputation.js'),
    'governance': () => import('../pages/infra/governance.js'),
    'ops-monitoring': () => import('../pages/infra/ops-monitoring.js'),
    'infra-custody': () => import('../pages/infra/infra-custody.js'),
    'hardening': () => import('../pages/infra/hardening.js'),
    'risk-intelligence': () => import('../pages/infra/risk-intelligence.js'),
    'mrmf': () => import('../pages/infra/mrmf.js'),
    'ercm': () => import('../pages/infra/ercm.js'),
    'institutional': () => import('../pages/infra/institutional.js'),
    'platform-architecture': () => import('../pages/infra/platform-architecture.js'),
    'carbon-registry': () => import('../pages/infra/carbon-registry.js'),
    'scm-twin': () => import('../pages/scm/digital-twin.js'),
    'scm-procurement': () => import('../pages/scm/procurement.js'),
    'scm-warehouse': () => import('../pages/scm/warehouse.js'),
    'scm-quality-control': () => import('../pages/scm/quality-control.js'),
    'scm-supplier-scoring': () => import('../pages/scm/supplier-scoring.js'),
    'scm-demand-planning': () => import('../pages/scm/demand-planning.js'),
    'scm-shipment-tracking': () => import('../pages/scm/shipment-tracking.js'),
    'kyc': () => import('../pages/kyc.js'),
    'ca-integrations': () => import('../pages/ca/integrations.js'),
    'evidence': () => import('../pages/evidence.js'),
    'stakeholder': () => import('../pages/stakeholder.js'),
    'billing': () => import('../pages/billing.js'),
    'pricing': () => import('../pages/pricing.js'),
    'public-dashboard': () => import('../pages/public-dashboard.js'),
    'api-docs': () => import('../pages/api-docs.js'),
    'settings': () => import('../pages/settings.js'),
    'admin-users': () => import('../pages/admin-users.js'),
    'integrations': () => import('../pages/integrations.js'),
    'sustainability': () => import('../pages/sustainability.js'),
    'compliance': () => import('../pages/compliance.js'),
    'anomaly': () => import('../pages/anomaly.js'),
    'reports': () => import('../pages/reports.js'),
    'nft': () => import('../pages/nft.js'),
    'wallet': () => import('../pages/wallet.js'),
    'audit-view': () => import('../pages/audit-view.js'),
    'branding': () => import('../pages/branding-page.js'),
    'org-management': () => import('../pages/org-management.js'),
    'pricing-admin': () => import('../pages/pricing-admin.js'),
    'role-manager': () => import('../pages/role-manager.js'),

    // ─── SA Workspace Routes (Fortune 100 IA) ──────────
    'sa-risk': () => import('../pages/sa/sa-risk-workspace.js'),
    'sa-integrity': () => import('../pages/sa/sa-integrity-workspace.js'),
    'sa-governance': () => import('../pages/sa/sa-governance-workspace.js'),
    'sa-financial': () => import('../pages/sa/sa-financial-workspace.js'),
    'sa-operations': () => import('../pages/sa/sa-settings-workspace.js'),
    'sa-carbon': () => import('../pages/sa/sa-carbon-workspace.js?v=3.4'),

    // ─── Super Admin (Platform Governance) pages ────────
    'control-tower': () => import('../pages/sa/control-tower.js'),
    'sa-tenants': () => import('../pages/sa/tenants.js'),
    'sa-create-tenant': () => import('../pages/sa/tenants.js'),    // reuse tenant list (create modal)
    'sa-suspended': () => import('../pages/sa/tenants.js'),        // reuse with filter
    'sa-archived': () => import('../pages/sa/tenants.js'),         // reuse with filter
    'sa-tenant-detail': () => import('../pages/sa/tenant-detail.js'),
    'sa-risk-feed': () => import('../pages/sa/risk-feed.js'),
    'sa-risk-analytics': () => import('../pages/sa/risk-analytics.js'),
    'sa-suspicious': () => import('../pages/sa/suspicious-tenants.js'),
    'sa-ai-engine': () => import('../pages/sa/ai-engine.js'),
    'sa-platform-users': () => import('../pages/sa/platform-users.js'),
    'sa-platform-roles': () => import('../pages/sa/platform-roles.js'),
    'sa-access-logs': () => import('../pages/sa/access-logs.js'),
    'sa-role-bundles': () => import('../pages/sa/role-bundles.js'),
    'sa-permission-matrix': () => import('../pages/sa/permission-matrix.js'),
    'sa-approval-workflows': () => import('../pages/sa/approval-workflows.js'),
    'sa-abac-policies': () => import('../pages/sa/abac-policies.js'),
    'sa-services': () => import('../pages/sa/services-status.js'),
    'sa-performance': () => import('../pages/sa/services-status.js'),
    'sa-incidents': () => import('../pages/sa/incidents.js'),
    'sa-revenue': () => import('../pages/billing.js'),
    'sa-plans': () => import('../pages/pricing-admin.js'),
    'sa-usage': () => import('../pages/billing.js'),
    'sa-audit': () => import('../pages/audit-view.js'),
    'sa-data-gov': () => import('../pages/sa/data-governance.js'),
    'sa-keys': () => import('../pages/sa/key-management.js'),
    'sa-data-access-matrix': () => import('../pages/sa/data-access-matrix.js'),
    'sa-role-blueprint': () => import('../pages/sa/role-dashboard-blueprint.js'),
    'sa-escalation-flow': () => import('../pages/sa/escalation-flow.js'),
    'sa-industry-benchmark': () => import('../pages/sa/industry-benchmark.js'),
    'sa-feature-flags': () => import('../pages/settings.js'),
    'sa-risk-threshold': () => import('../pages/sa/ai-engine.js'),
    'sa-notifications': () => import('../pages/settings.js'),
    'sa-global-settings': () => import('../pages/settings.js'),

    // ─── Company Admin (Business Plane) pages ────────────
    'ca-nodes': () => import('../pages/ca/nodes.js'),
    'ca-flow-config': () => import('../pages/ca/flow-config.js'),
    'ca-batches': () => import('../pages/ca/batches.js'),
    'ca-traceability': () => import('../pages/ca/traceability.js'),
    'ca-incidents': () => import('../pages/ca/incidents.js'),
    'ca-risk-rules': () => import('../pages/ca/risk-rules.js'),
    'ca-access-logs': () => import('../pages/ca/access-logs.js'),
    'ca-company-profile': () => import('../pages/ca/company-profile.js'),

    // ─── Code Governance (Company Admin) pages ───────────
    'ca-code-generate': () => import('../pages/ca/code-generate.js'),
    'ca-code-format-rules': () => import('../pages/ca/code-format-rules.js'),
    'ca-code-batch-assign': () => import('../pages/ca/code-batch-assign.js'),
    'ca-code-lifecycle': () => import('../pages/ca/code-lifecycle.js'),
    'ca-code-audit-log': () => import('../pages/ca/code-audit-log.js'),
    'ca-scan-analytics': () => import('../pages/ca/scan-analytics.js'),
    'ca-duplicate-classification': () => import('../pages/ca/duplicate-classification.js'),
    'ca-supply-route-engine': () => import('../pages/ca/supply-route-engine.js'),
    'scan-result': () => import('../pages/scan-result.js'),

    // ─── CA Workspace Routes (matching SA workspace pattern) ──
    'ca-operations': () => import('../pages/ca/ca-operations-workspace.js'),
    'ca-risk': () => import('../pages/ca/ca-risk-workspace.js'),
    'ca-identity': () => import('../pages/ca/ca-identity-workspace.js'),
    'ca-governance': () => import('../pages/ca/ca-governance-workspace.js'),
    'ca-settings': () => import('../pages/ca/ca-settings-workspace.js'),

    // ─── Org Owner (Strategic Governance Authority) ───────
    'owner-governance': () => import('../pages/owner/owner-workspace.js?v=10.4'),

    // ─── Executive (CEO Decision Intelligence) pages ─────
    'exec-overview': () => import('../pages/exec/overview.js'),
    'exec-alerts': () => import('../pages/exec/overview.js'),
    'exec-trends': () => import('../pages/exec/overview.js'),
    'exec-heatmap': () => import('../pages/exec/overview.js'),
    'exec-roi': () => import('../pages/exec/overview.js'),
    'exec-risk-intel': () => import('../pages/exec/risk-intel.js'),
    'exec-market': () => import('../pages/exec/market.js'),
    'exec-performance': () => import('../pages/exec/performance.js'),
    'exec-reports': () => import('../pages/exec/reports.js'),
    'exec-trust-report': () => import('../pages/exec/trust-report.js'),
    'exec-scm-summary': () => import('../pages/exec/scm-summary.js'),
    'exec-carbon-summary': () => import('../pages/exec/carbon-summary.js'),
    'exec-allocation-engine': () => import('../pages/exec/allocation-engine.js'),

    // ─── Ops (Operational Control Layer) pages ───────────
    'ops-dashboard': () => import('../pages/ops/dashboard.js'),
    'ops-batch-create': () => import('../pages/ops/batch-create.js'),
    'ops-batch-list': () => import('../pages/ops/batch-list.js'),
    'ops-batch-split': () => import('../pages/ops/batch-split.js'),
    'ops-batch-recall': () => import('../pages/ops/batch-recall.js'),
    'ops-transfer-orders': () => import('../pages/ops/transfer-orders.js'),
    'ops-receiving': () => import('../pages/ops/receiving.js'),
    'ops-mismatch': () => import('../pages/ops/mismatch.js'),
    'ops-scan-monitor': () => import('../pages/ops/scan-monitor.js'),
    'ops-duplicate-alerts': () => import('../pages/ops/duplicate-alerts.js'),
    'ops-geo-alerts': () => import('../pages/ops/geo-alerts.js'),
    'ops-incidents-open': () => import('../pages/ops/incidents-open.js'),
    'ops-incidents-history': () => import('../pages/ops/incidents-history.js'),

    // ─── Risk (Risk Governance Layer) pages ─────────────
    'risk-dashboard': () => import('../pages/risk/dashboard.js'),
    'risk-event-feed': () => import('../pages/risk/event-feed.js'),
    'risk-advanced-filter': () => import('../pages/risk/advanced-filter.js'),
    'risk-high-risk': () => import('../pages/risk/high-risk.js'),
    'risk-duplicate-rules': () => import('../pages/risk/duplicate-rules.js'),
    'risk-geo-rules': () => import('../pages/risk/geo-rules.js'),
    'risk-velocity-rules': () => import('../pages/risk/velocity-rules.js'),
    'risk-auto-response': () => import('../pages/risk/auto-response.js'),
    'risk-cases-open': () => import('../pages/risk/cases-open.js'),
    'risk-cases-escalated': () => import('../pages/risk/cases-escalated.js'),
    'risk-cases-closed': () => import('../pages/risk/cases-closed.js'),
    'risk-pattern-clusters': () => import('../pages/risk/pattern-clusters.js'),
    'risk-distributor-risk': () => import('../pages/risk/distributor-risk.js'),
    'risk-sku-risk': () => import('../pages/risk/sku-risk.js'),
    'risk-reports': () => import('../pages/risk/reports.js'),
    'risk-heatmap': () => import('../pages/risk/heatmap.js'),
    'risk-scoring-engine': () => import('../pages/risk/scoring-engine.js'),
    'risk-decision-engine': () => import('../pages/risk/decision-engine.js'),
    'risk-case-workflow': () => import('../pages/risk/case-workflow.js'),
    'risk-model-governance': () => import('../pages/risk/model-governance.js'),
    'risk-forensic': () => import('../pages/risk/forensic-investigation.js'),

    // ─── Compliance (Governance Layer) pages ───────────
    'compliance-dashboard': () => import('../pages/compliance/dashboard.js'),
    'compliance-user-activity': () => import('../pages/compliance/user-activity.js'),
    'compliance-system-changes': () => import('../pages/compliance/system-changes.js'),
    'compliance-data-export': () => import('../pages/compliance/data-export.js'),
    'compliance-privileged-access': () => import('../pages/compliance/privileged-access.js'),
    'compliance-access-policy': () => import('../pages/compliance/access-policy.js'),
    'compliance-risk-policy': () => import('../pages/compliance/risk-policy.js'),
    'compliance-workflow-control': () => import('../pages/compliance/workflow-control.js'),
    'compliance-violation-log': () => import('../pages/compliance/violation-log.js'),
    'compliance-retention': () => import('../pages/compliance/retention.js'),
    'compliance-data-access-review': () => import('../pages/compliance/data-access-review.js'),
    'compliance-privacy-requests': () => import('../pages/compliance/privacy-requests.js'),
    'compliance-audit-report': () => import('../pages/compliance/audit-report.js'),
    'compliance-investigation-summary': () => import('../pages/compliance/investigation-summary.js'),
    'compliance-regulatory-export': () => import('../pages/compliance/regulatory-export.js'),
    'compliance-legal-hold': () => import('../pages/compliance/legal-hold.js'),
    'compliance-sod-matrix': () => import('../pages/compliance/sod-matrix.js'),
    'compliance-immutable-audit': () => import('../pages/compliance/immutable-audit.js'),
    'compliance-data-governance': () => import('../pages/compliance/data-governance.js'),

    // ─── IT (Technical Administration) pages ──────────
    'it-authentication': () => import('../pages/it/authentication.js'),
    'it-network': () => import('../pages/it/network.js'),
    'it-api-security': () => import('../pages/it/api-security.js'),
    'it-conditional-access': () => import('../pages/it/conditional-access.js'),
    'it-sso': () => import('../pages/it/sso.js'),
    'it-domain': () => import('../pages/it/domain.js'),
    'it-provisioning': () => import('../pages/it/provisioning.js'),
    'it-erp': () => import('../pages/it/erp.js'),
    'it-webhooks': () => import('../pages/it/webhooks.js'),
    'it-integration-logs': () => import('../pages/it/integration-logs.js'),
    'it-integration-hub': () => import('../pages/it/integration-hub.js'),
    'it-integration-resilience': () => import('../pages/it/integration-resilience.js'),
    'it-api-keys': () => import('../pages/it/api-keys.js'),
    'it-oauth-clients': () => import('../pages/it/oauth-clients.js'),
    'it-api-usage': () => import('../pages/it/api-usage.js'),
    'it-api-health': () => import('../pages/it/api-health.js'),
    'it-sync-status': () => import('../pages/it/sync-status.js'),
    'it-error-log': () => import('../pages/it/error-log.js'),
    'it-sla-monitoring': () => import('../pages/it/sla-monitoring.js'),
    'it-data-export': () => import('../pages/it/data-export.js'),
    'it-backup': () => import('../pages/it/backup.js'),
    'it-evidence-verify': () => import('../pages/it/evidence-verify.js'),
    'it-anchor-config': () => import('../pages/it/anchor-config.js'),
    'it-governance-dashboard': () => import('../pages/it/governance-dashboard.js'),
    'it-sandbox': () => import('../pages/it/sandbox.js'),

    // ─── Infrastructure Engines (Section 16-23) ─────────
    'infra-revenue-gov': () => import('../pages/infra/revenue-governance.js'),
    'infra-kill-switch': () => import('../pages/infra/kill-switch.js'),
    'infra-economic-logic': () => import('../pages/infra/economic-logic.js'),
    'infra-forensic-logic': () => import('../pages/infra/forensic-logic.js'),
    'infra-jurisdiction-logic': () => import('../pages/infra/jurisdiction-logic.js'),
    'infra-coherence': () => import('../pages/infra/coherence-audit.js'),
    'infra-playbook': () => import('../pages/infra/operational-playbook.js'),
    'infra-human-gov': () => import('../pages/infra/human-governance.js'),
    'infra-incentive': () => import('../pages/infra/incentive-architecture.js'),
    'infra-entity': () => import('../pages/infra/entity-structuring.js'),
    'infra-crypto-gov': () => import('../pages/infra/cryptographic-governance.js'),
    'infra-data-ownership': () => import('../pages/infra/data-ownership.js'),
    'infra-metrics': () => import('../pages/infra/infra-metrics.js'),
    'infra-upgrade-gov': () => import('../pages/infra/upgrade-governance.js'),
};

// ─── Navigate ───────────────────────────────────────────────
export function navigate(page, opts = {}) {
    // v10.1: Role-based page redirect (prevents org_owner from seeing operational dashboard)
    const _roleRedirects = {
        org_owner: { dashboard: 'owner-governance' },
        super_admin: { dashboard: 'control-tower' },
        executive: { dashboard: 'exec-overview' },
    };
    const userRole = State.user?.role;
    const redirect = _roleRedirects[userRole]?.[page];
    if (redirect) page = redirect;

    // Support both navigate('page', {tenantId:'x'}) and navigate('page', {skipPush:true})
    const skipPush = opts.skipPush || false;
    const params = { ...opts };
    delete params.skipPush;

    // v9.1: Block navigation to locked features
    const featureKey = PAGE_FEATURE_MAP[page];
    if (featureKey && !hasFeature(featureKey)) {
        showUpgradeModal(featureKey);
        return;
    }
    State.page = page;
    State.pageParams = params;

    // Update browser URL via History API
    if (!skipPush) {
        let url = _basePath + '/' + page;
        // Append sub-path for detail pages (e.g. /sa-tenant-detail/UUID)
        if (page === 'sa-tenant-detail' && params.tenantId) {
            url += '/' + params.tenantId;
        }
        history.pushState({ page, params }, '', url);
    }

    render();
    loadPageData(page);

    // Scroll to top on navigation so the page doesn't stay mid-scroll
    const main = document.querySelector('.main-content') || document.documentElement;
    main.scrollTop = 0;
    window.scrollTo(0, 0);
}

// ─── Render current page (with lazy loading) ────────────────
export function renderPage() {
    let page = State.page;

    // v10.1: Auto-correct default 'dashboard' page for roles with dedicated landing pages
    const _roleLanding = { org_owner: 'owner-governance', super_admin: 'control-tower', executive: 'exec-overview' };
    const correctPage = _roleLanding[State.user?.role];
    if (correctPage && page === 'dashboard') {
        State.page = correctPage;
        page = correctPage;
        // Update URL to match (defer to avoid re-entrancy)
        setTimeout(() => { const url = _basePath + '/' + correctPage; history.replaceState({ page: correctPage }, '', url); }, 0);
    }

    // If module is already cached, use it
    if (_pageCache[page]) {
        return _pageCache[page].renderPage();
    }

    // Otherwise, start lazy loading and show skeleton
    const loader = PAGE_LOADERS[page];
    if (!loader) {
        return '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">Page not found</div></div>';
    }

    // Trigger async load → cache → re-render
    loader().then(mod => {
        _pageCache[page] = mod;
        // Only re-render if we're still on that page
        if (State.page === page) render();
    }).catch(err => {
        console.error(`[router] Failed to load page module: ${page}`, err);
    });

    // Return skeleton while loading
    return `<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading page…</span></div>`;
}

// ─── Load page data ─────────────────────────────────────────
export async function loadPageData(page) {
    try {
        if (page === 'dashboard') {
            State.dashboardStats = await API.get('/qr/dashboard-stats');
            render();
            setTimeout(() => {
                if (_pageCache['dashboard']?.initDashboardCharts) _pageCache['dashboard'].initDashboardCharts();
            }, 50);
        } else if (page === 'products') {
            const res = await API.get('/products');
            State.products = res.products || [];
            render();
        } else if (page === 'fraud') {
            const res = await API.get('/qr/fraud-alerts?status=open&limit=50');
            State.fraudAlerts = res.alerts || [];
            render();
        } else if (page === 'scans') {
            const res = await API.get('/qr/scan-history?limit=50');
            State.scanHistory = res.scans || [];
            render();
        } else if (page === 'blockchain') {
            State.blockchain = await API.get('/qr/blockchain');
            render();
        } else if (page === 'scm-dashboard') {
            State.scmDashboard = await API.get('/scm/dashboard');
            render();
        } else if (page === 'scm-inventory') {
            State.scmInventory = await API.get('/scm/inventory');
            State.scmForecast = await API.get('/scm/inventory/forecast');
            render();
        } else if (page === 'scm-logistics') {
            const [ships, sla, opt] = await Promise.all([
                API.get('/scm/shipments'),
                API.get('/scm/sla/violations'),
                API.get('/scm/optimization')
            ]);
            State.scmShipments = ships;
            State.scmSlaViolations = sla;
            State.scmOptimization = opt;
            render();
        } else if (page === 'scm-partners') {
            const res = await API.get('/scm/partners');
            State.scmPartners = res.partners || [];
            render();
        } else if (page === 'scm-leaks') {
            State.scmLeaks = await API.get('/scm/leaks/stats');
            render();
        } else if (page === 'scm-trustgraph') {
            State.scmGraph = await API.get('/scm/graph/analysis');
            render();
        } else if (page === 'kyc') {
            const [stats, biz] = await Promise.all([API.get('/kyc/stats'), API.get('/kyc/businesses')]);
            State.kycData = { stats, businesses: biz.businesses || [] };
            // Load approvers for super_admin
            if (State.user?.role === 'super_admin') {
                try {
                    const approversRes = await API.get('/kyc/approvers');
                    State.kycApprovers = approversRes.approvers || [];
                } catch (_) { State.kycApprovers = []; }
            }
            render();
        } else if (page === 'evidence') {
            const [stats, items] = await Promise.all([API.get('/evidence/stats'), API.get('/evidence')]);
            State.evidenceData = { stats, items: items.items || [] };
            render();
        } else if (page === 'stakeholder') {
            const [dashboard, certs, compliance] = await Promise.all([
                API.get('/trust/dashboard'), API.get('/trust/certifications'), API.get('/trust/compliance')
            ]);
            State.stakeholderData = { dashboard, certifications: certs.certifications || [], compliance: compliance.records || [] };
            render();
        } else if (page === 'sa-financial') {
            // Financial workspace needs billing + pricing + tenants data
            const [planRes, usageRes, invoiceRes, tenantRes] = await Promise.all([
                API.get('/billing/plan'),
                API.get('/billing/usage'),
                API.get('/billing/invoices'),
                API.get('/platform/tenants').catch(() => ({ tenants: [] })),
            ]);
            State.billingData = { plan: planRes.plan, available: planRes.available_plans, period: usageRes.period, usage: usageRes.usage, invoices: invoiceRes.invoices };
            State.platformTenants = Array.isArray(tenantRes) ? tenantRes : (tenantRes.tenants || []);
            try {
                const pRes = await fetch(API.base + '/billing/pricing');
                if (pRes.ok) State.pricingAdminData = await pRes.json();
                else State.pricingAdminData = {};
            } catch (e) { State.pricingAdminData = {}; }
            render();
        } else if (page === 'billing' || page === 'sa-revenue' || page === 'sa-usage') {
            try {
                const [planRes, usageRes, invoiceRes] = await Promise.all([
                    API.get('/billing/plan').catch(() => ({ plan: null, available_plans: [] })),
                    API.get('/billing/usage').catch(() => ({ period: null, usage: {} })),
                    API.get('/billing/invoices').catch(() => ({ invoices: [] })),
                ]);
                State.billingData = { plan: planRes.plan, available: planRes.available_plans, period: usageRes.period, usage: usageRes.usage, invoices: invoiceRes.invoices };
            } catch (e) {
                console.warn('[router] Billing fetch failed:', e.message);
                State.billingData = { plan: null, available: [], period: null, usage: {}, invoices: [] };
            }
            render();
        } else if (page === 'pricing') {
            try {
                const res = await fetch(API.base + '/billing/pricing');
                if (res.ok) {
                    State.pricingData = await res.json();
                } else {
                    throw new Error('HTTP ' + res.status);
                }
            } catch (e) {
                console.warn('[router] Pricing fetch failed, using static fallback:', e.message);
                // Static fallback so the page always renders
                State.pricingData = {
                    plans: {
                        free: { name: 'Free', slug: 'free', tagline: 'Get started with product verification', price_monthly: 0, price_annual: 0, limits: { scans: 500, api_calls: 1000, storage_mb: 100, nft_mints: 0, carbon_calcs: 0 }, features: ['Basic QR verification', 'Public trust check page'], sla: null, badge: null },
                        starter: { name: 'Starter', slug: 'starter', tagline: 'For growing brands building trust', price_monthly: 49, price_annual: 470, limits: { scans: 5000, api_calls: 10000, storage_mb: 1024, nft_mints: 10, carbon_calcs: 100 }, features: ['Everything in Free', 'Fraud detection alerts'], sla: '99%', badge: null },
                        pro: { name: 'Pro', slug: 'pro', tagline: 'Advanced trust infrastructure for scale', price_monthly: 199, price_annual: 1910, limits: { scans: 25000, api_calls: 100000, storage_mb: 10240, nft_mints: 100, carbon_calcs: 1000 }, features: ['Everything in Starter', 'AI anomaly detection'], sla: '99.5%', badge: 'POPULAR' },
                        business: { name: 'Business', slug: 'business', tagline: 'Full-stack trust for enterprise brands', price_monthly: 499, price_annual: 4790, limits: { scans: 100000, api_calls: 500000, storage_mb: 51200, nft_mints: 500, carbon_calcs: 5000 }, features: ['Everything in Pro', 'Digital twin simulation'], sla: '99.9%', badge: null },
                        enterprise: { name: 'Enterprise', slug: 'enterprise', tagline: 'Custom deployment with white-glove service', price_monthly: null, price_annual: null, limits: { scans: -1, api_calls: -1, storage_mb: -1, nft_mints: -1, carbon_calcs: -1 }, features: ['Everything in Business', 'On-premise deployment'], sla: '99.95%', badge: null },
                    },
                    usage_pricing: {
                        scans: { name: 'QR Scans', unit: 'scan', tiers: [{ up_to: 1000, price: 0.05 }, { up_to: 10000, price: 0.03 }, { up_to: 50000, price: 0.02 }, { up_to: null, price: 0.01 }] },
                        nft_mints: { name: 'NFT Certificate Mints', unit: 'mint', tiers: [{ up_to: 50, price: 2.00 }, { up_to: 200, price: 1.50 }, { up_to: null, price: 0.50 }] },
                        carbon_calcs: { name: 'Carbon Calculations', unit: 'calculation', tiers: [{ up_to: null, price: 0.01 }], bundle: { size: 1000, price: 10.00 } },
                        api_calls: { name: 'API Calls', unit: 'call', tiers: [{ up_to: null, price: 0.001 }] },
                    },
                    currency: 'USD', annual_discount_percent: 20, free_trial_days: 14,
                };
            }
            render();
        } else if (page === 'public-dashboard') {
            const [stats, trends, trustDist, scanResults, alertSev] = await Promise.all([
                fetch('/api/public/stats').then(r => r.json()),
                fetch('/api/public/scan-trends').then(r => r.json()),
                fetch('/api/public/trust-distribution').then(r => r.json()),
                fetch('/api/public/scan-results').then(r => r.json()),
                fetch('/api/public/alert-severity').then(r => r.json())
            ]);
            State.publicData = { stats, trends, trustDist, scanResults, alertSev };
            render();
            setTimeout(() => {
                if (_pageCache['public-dashboard']?.initPublicCharts) _pageCache['public-dashboard'].initPublicCharts();
            }, 50);
        } else if (page === 'api-docs') {
            render();
        } else if (page === 'settings') {
            render();
            if (_pageCache['settings']?.loadSettingsData) _pageCache['settings'].loadSettingsData();
            return;
        } else if (page === 'admin-users') {
            render();
            if (_pageCache['admin-users']?.loadAdminUsers) _pageCache['admin-users'].loadAdminUsers();
            return;
        } else if (page === 'role-manager') {
            render();
            if (_pageCache['role-manager']?.loadRoleManager) _pageCache['role-manager'].loadRoleManager();
            return;
        } else if (page === 'integrations') {
            try {
                const [schema, data] = await Promise.all([
                    API.get('/integrations/schema').catch(() => ({})),
                    API.get('/integrations').catch(() => ({}))
                ]);
                State.integrationsSchema = schema;
                State.integrationsData = data;
            } catch (e) {
                console.warn('[router] Integrations fetch failed:', e.message);
                State.integrationsSchema = {};
                State.integrationsData = {};
            }
            render();
        } else if (page === 'scm-epcis') {
            const [events, stats] = await Promise.all([API.get('/scm/epcis/events'), API.get('/scm/epcis/stats')]);
            State.epcisData = { events: events.events || [], stats };
            render();
        } else if (page === 'scm-ai') {
            const [forecast, sensing] = await Promise.all([API.get('/scm/ai/forecast-demand'), API.get('/scm/ai/demand-sensing')]);
            State.aiData = { forecast, sensing };
            render();
        } else if (page === 'scm-risk-radar') {
            const [radar, heatmap, alerts] = await Promise.all([API.get('/scm/risk/radar'), API.get('/scm/risk/heatmap'), API.get('/scm/risk/alerts')]);
            State.riskRadarData = { radar, heatmap, alerts };
            render();
        } else if (page === 'scm-carbon') {
            const [scope, leaderboard, report] = await Promise.all([API.get('/scm/carbon/scope'), API.get('/scm/carbon/leaderboard'), API.get('/scm/carbon/report')]);
            State.carbonData = { scope, leaderboard, report };
            render();
        } else if (page === 'scm-twin') {
            const [model, kpis, anomalies] = await Promise.all([API.get('/scm/twin/model'), API.get('/scm/twin/kpis'), API.get('/scm/twin/anomalies')]);
            State.twinData = { model, kpis, anomalies };
            render();
        } else if (page === 'sustainability') {
            const [stats, scores] = await Promise.all([API.get('/sustainability/stats'), API.get('/sustainability/leaderboard')]);
            State.sustainData = { stats, scores: scores.scores || [] };
            render();
        } else if (page === 'compliance') {
            const [stats, records, policies] = await Promise.all([API.get('/compliance/stats'), API.get('/compliance/records'), API.get('/compliance/retention')]);
            State.complianceData = { stats, records: records.records || [], policies: policies.policies || [] };
            render();
        } else if (page === 'anomaly') {
            const res = await API.get('/anomaly?limit=50');
            State.anomalyData = res;
            render();
        } else if (page === 'reports') {
            const res = await API.get('/reports/templates');
            State.reportsData = res;
            render();
        } else if (page === 'nft') {
            const res = await API.get('/nft');
            State.nftData = res;
            render();
        } else if (page === 'wallet') {
            const [wallets, txns] = await Promise.all([API.get('/wallet/wallets'), API.get('/wallet/transactions')]);
            State.walletData = { wallets: wallets.wallets || [], transactions: txns.transactions || [] };
            render();
        } else if (page === 'branding') {
            const res = await API.get('/branding');
            State.brandingData = res;
            render();
        } else if (page === 'org-management') {
            const res = await API.get('/org/all');
            State.orgData = { organizations: res.organizations || [] };
            render();
        } else if (page === 'pricing-admin' || page === 'sa-plans') {
            try {
                const res = await fetch(API.base + '/billing/pricing');
                if (res.ok) {
                    State.pricingAdminData = await res.json();
                } else {
                    throw new Error('HTTP ' + res.status);
                }
            } catch (e) {
                console.warn('[router] Pricing admin fetch failed:', e.message);
                State.pricingAdminData = {};
            }
            render();

            // ─── CA Workspace data preloads ────────────────────────
        } else if (page === 'ca-operations') {
            // Products + Scans are dumb renderers needing State preload
            const [prodRes, scanRes] = await Promise.all([
                API.get('/products').catch(() => ({ products: [] })),
                API.get('/qr/scan-history?limit=50').catch(() => ({ scans: [] })),
            ]);
            State.products = prodRes.products || [];
            State.scanHistory = scanRes.scans || [];
            // Carbon data (optional, tab may self-load)
            try {
                const [scope, lb, rpt] = await Promise.all([
                    API.get('/scm/carbon/scope').catch(() => ({})),
                    API.get('/scm/carbon/leaderboard').catch(() => ({})),
                    API.get('/scm/carbon/report').catch(() => ({})),
                ]);
                State.carbonData = { scope, leaderboard: lb, report: rpt };
            } catch (_) { }
            render();
        } else if (page === 'ca-risk') {
            // Fraud alerts are dumb renderer
            const res = await API.get('/qr/fraud-alerts?status=open&limit=50').catch(() => ({ alerts: [] }));
            State.fraudAlerts = res.alerts || [];
            render();
        } else if (page === 'ca-identity') {
            // All tabs self-load — just trigger render
            render();
        } else if (page === 'ca-governance') {
            // admin-users and role-manager self-load via their own init
            render();
            // Trigger admin-users loader if cached
            if (_pageCache['admin-users']?.loadAdminUsers) _pageCache['admin-users'].loadAdminUsers();
            if (_pageCache['role-manager']?.loadRoleManager) _pageCache['role-manager'].loadRoleManager();
        } else if (page === 'ca-settings') {
            // Settings (security) and billing need preload
            try {
                const [planRes, usageRes, invoiceRes] = await Promise.all([
                    API.get('/billing/plan').catch(() => ({ plan: null, available_plans: [] })),
                    API.get('/billing/usage').catch(() => ({ period: null, usage: {} })),
                    API.get('/billing/invoices').catch(() => ({ invoices: [] })),
                ]);
                State.billingData = { plan: planRes.plan, available: planRes.available_plans, period: usageRes.period, usage: usageRes.usage, invoices: invoiceRes.invoices };
            } catch (e) {
                State.billingData = { plan: null, available: [], period: null, usage: {}, invoices: [] };
            }
            render();
            if (_pageCache['settings']?.loadSettingsData) _pageCache['settings'].loadSettingsData();
        }
    } catch (e) {
        console.error('Load data error:', e);
    }
}

// ─── Parse page from current URL ────────────────────────────
export function getPageFromURL() {
    let p = window.location.pathname;
    // Strip base path prefix (e.g. /trustchecker)
    if (_basePath && p.startsWith(_basePath)) {
        p = p.slice(_basePath.length);
    }
    // Remove leading slash and trailing slash
    p = p.replace(/^\/+|\/+$/g, '');

    // Handle detail pages with sub-path: sa-tenant-detail/UUID
    if (p.startsWith('sa-tenant-detail/')) {
        const parts = p.split('/');
        const tenantId = parts[1];
        if (tenantId) {
            State.pageParams = { tenantId };
        }
        return 'sa-tenant-detail';
    }

    // If empty or index.html, route based on role
    if (!p || p === 'index.html') {
        return _defaultPageForRole();
    }
    // Check if it's a valid page in PAGE_LOADERS
    if (PAGE_LOADERS[p]) return p;
    // Default based on role
    return _defaultPageForRole();
}

function _defaultPageForRole() {
    const role = State.user?.role;
    const map = {
        super_admin: 'control-tower', platform_security: 'control-tower',
        org_owner: 'owner-governance', security_officer: 'ca-governance',
        data_gov_officer: 'compliance-dashboard', executive: 'exec-overview',
        ops_manager: 'ops-dashboard', risk_officer: 'risk-dashboard',
        compliance_officer: 'compliance-dashboard', developer: 'it-authentication',
        ggc_member: 'trustgraph', risk_committee: 'risk-dashboard',
        ivu_validator: 'risk-dashboard', scm_analyst: 'ops-dashboard',
        blockchain_operator: 'dashboard', carbon_officer: 'scm-carbon',
        auditor: 'compliance-dashboard',
    };
    return map[role] || 'dashboard';
}

// ─── Browser back/forward button handler ────────────────────
window.addEventListener('popstate', (e) => {
    const page = e.state?.page || getPageFromURL();
    const params = e.state?.params || {};
    navigate(page, { ...params, skipPush: true });
});

window.navigate = navigate;
