/**
 * TrustChecker – Global State Module
 * Centralized state management with localStorage hydration.
 */

export const State = {
    page: 'dashboard',
    user: JSON.parse(localStorage.getItem('tc_user') || 'null'),
    dashboardStats: null,
    products: [],
    fraudAlerts: [],
    scanHistory: [],
    blockchain: null,
    events: [],
    ws: null,
    modal: null,
    scanResult: null,
    toasts: [],
    // SCM state
    scmDashboard: null,
    scmInventory: null,
    scmShipments: null,
    scmPartners: null,
    scmLeaks: null,
    scmGraph: null,
    scmOptimization: null,
    scmForecast: null,
    scmSlaViolations: null,
    // Phase 6 state
    kycData: null,
    evidenceData: null,
    stakeholderData: null,
    billingData: null,
    // Phase 6B state
    publicData: null,
    // Phase 6C state
    notifications: JSON.parse(localStorage.getItem('tc_notifications') || '[]'),
    notifOpen: false,
    searchOpen: false,
    searchQuery: '',
    searchResults: null,
    // Phase 6D state
    integrationsSchema: null,
    integrationsData: null,
    // v9.1 — Feature flags & Branding
    featureFlags: JSON.parse(localStorage.getItem('tc_features') || '{}'),
    branding: JSON.parse(localStorage.getItem('tc_branding') || 'null'),
    plan: 'free',
    org: null,
    // v9.2 — Branding page data
    brandingData: null,
};

/**
 * Render function — will be set by main.js after all modules load.
 * This avoids circular dependency issues.
 */
let _renderFn = () => { };

export function setRenderFn(fn) {
    _renderFn = fn;
}

export function render() {
    _renderFn();
}

window.State = State;
