/**
 * TrustChecker – Feature Flag System (v9.1)
 * Plan-based feature gating with upgrade prompts.
 */
import { State, render } from './state.js';
import { API } from './api.js';

// Maps sidebar page IDs to backend feature keys from FEATURE_PLANS
export const PAGE_FEATURE_MAP = {
    'fraud': 'fraud',
    'reports': 'reports',
    'scm-dashboard': 'scm_tracking',
    'scm-inventory': 'inventory',
    'scm-logistics': 'logistics',
    'scm-partners': 'partners',
    'scm-leaks': 'leaks',
    'scm-trustgraph': 'trust_graph',
    'scm-epcis': 'epcis',
    'scm-ai': 'ai_forecast',
    'scm-risk-radar': 'risk_radar',
    'scm-carbon': 'carbon',
    'scm-twin': 'digital_twin',
    'kyc': 'kyc',
    'evidence': 'evidence',
    'sustainability': 'sustainability',
    'compliance': 'compliance',
    'anomaly': 'anomaly',
    'nft': 'nft',
    'wallet': 'wallet',
    'branding': 'branding',
    'blockchain': 'blockchain',
    'integrations': 'integrations',
};

export const PLAN_NAMES = {
    free: 'Free',
    core: 'Core — $29/mo',
    pro: 'Pro — $79/mo',
    enterprise: 'Enterprise — $199/mo',
};

export const FEATURE_REQUIRED_PLAN = {
    products: 'free', qr: 'free', dashboard: 'free',
    fraud: 'core', reports: 'core', scm_tracking: 'core', support: 'core',
    inventory: 'pro', logistics: 'pro', partners: 'pro', ai_forecast: 'pro',
    demand_sensing: 'pro', risk_radar: 'pro', anomaly: 'pro', kyc: 'pro',
    compliance: 'pro', evidence: 'pro', sustainability: 'pro',
    leaks: 'pro', trust_graph: 'pro', what_if: 'pro', monte_carlo: 'pro',
    carbon: 'enterprise', digital_twin: 'enterprise', epcis: 'enterprise',
    blockchain: 'enterprise', nft: 'enterprise', branding: 'enterprise',
    wallet: 'enterprise', webhooks: 'enterprise', integrations: 'enterprise',
    white_label: 'enterprise',
};

export function hasFeature(featureKey) {
    if (!featureKey) return true;
    if (State.user?.role === 'admin') return true;
    return State.featureFlags[featureKey] === true;
}

export function getRequiredPlanForFeature(featureKey) {
    return FEATURE_REQUIRED_PLAN[featureKey] || 'enterprise';
}

export async function loadFeatureFlags() {
    try {
        const data = await API.get('/auth/me');
        if (data.feature_flags) {
            State.featureFlags = data.feature_flags;
            State.plan = data.user?.plan || 'free';
            State.org = data.user?.org || null;
            localStorage.setItem('tc_features', JSON.stringify(data.feature_flags));
        }
    } catch (e) {
        console.warn('[features] Could not load feature flags:', e.message);
    }
}

export function showUpgradeModal(featureKey) {
    const requiredPlan = getRequiredPlanForFeature(featureKey);
    const planName = PLAN_NAMES[requiredPlan] || requiredPlan;
    State.modal = `
    <div class="modal-content" style="text-align:center;padding:30px;max-width:420px">
      <div style="font-size:48px;margin-bottom:16px">🔐</div>
      <h3 style="margin-bottom:8px">Upgrade Required</h3>
      <p style="color:var(--text-secondary);margin-bottom:20px">
        This feature requires the <strong>${planName}</strong> plan.
        <br>Your current plan: <strong>${PLAN_NAMES[State.plan] || State.plan}</strong>
      </p>
      <button class="btn btn-primary" onclick="navigate('pricing')">View Plans & Upgrade</button>
    </div>
  `;
    render();
}

window.hasFeature = hasFeature;
window.showUpgradeModal = showUpgradeModal;
