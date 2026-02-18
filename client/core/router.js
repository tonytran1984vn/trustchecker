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
    'scm-twin': () => import('../pages/scm/digital-twin.js'),
    'kyc': () => import('../pages/kyc.js'),
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
    'branding': () => import('../pages/branding-page.js'),
};

// ─── Navigate ───────────────────────────────────────────────
export function navigate(page, { skipPush = false } = {}) {
    // v9.1: Block navigation to locked features
    const featureKey = PAGE_FEATURE_MAP[page];
    if (featureKey && !hasFeature(featureKey)) {
        showUpgradeModal(featureKey);
        return;
    }
    State.page = page;

    // Update browser URL via History API
    if (!skipPush) {
        const url = _basePath + '/' + page;
        history.pushState({ page }, '', url);
    }

    render();
    loadPageData(page);
}

// ─── Render current page (with lazy loading) ────────────────
export function renderPage() {
    const page = State.page;

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
        } else if (page === 'billing') {
            const [planRes, usageRes, invoiceRes] = await Promise.all([
                API.get('/billing/plan'),
                API.get('/billing/usage'),
                API.get('/billing/invoices'),
            ]);
            State.billingData = { plan: planRes.plan, available: planRes.available_plans, period: usageRes.period, usage: usageRes.usage, invoices: invoiceRes.invoices };
        } else if (page === 'pricing') {
            const pricingRes = await fetch(API.base + '/billing/pricing').then(r => r.json());
            State.pricingData = pricingRes;
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
        } else if (page === 'integrations') {
            try {
                const [schema, data] = await Promise.all([
                    API.get('/integrations/schema'),
                    API.get('/integrations')
                ]);
                State.integrationsSchema = schema;
                State.integrationsData = data;
            } catch (e) { }
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
    // If empty or index.html, default to dashboard
    if (!p || p === 'index.html') return 'dashboard';
    // Check if it's a valid page in PAGE_LOADERS
    if (PAGE_LOADERS[p]) return p;
    // Default to dashboard for unknown paths
    return 'dashboard';
}

// ─── Browser back/forward button handler ────────────────────
window.addEventListener('popstate', (e) => {
    const page = e.state?.page || getPageFromURL();
    navigate(page, { skipPush: true });
});

window.navigate = navigate;
