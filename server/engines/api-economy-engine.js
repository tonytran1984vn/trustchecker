/**
 * TrustChecker — API Economy Engine
 * Gateway Management, SDK Keys, Rate Limits, Marketplace
 */
const crypto = require('crypto');

const API_TIERS = {
    free: { name: 'Free', rate_limit: 100, daily_limit: 1000, endpoints: ['read_only'], price_usd: 0 },
    starter: { name: 'Starter', rate_limit: 500, daily_limit: 10000, endpoints: ['read_only', 'write'], price_usd: 49 },
    professional: { name: 'Professional', rate_limit: 2000, daily_limit: 100000, endpoints: ['read_only', 'write', 'analytics'], price_usd: 199 },
    enterprise: { name: 'Enterprise', rate_limit: 10000, daily_limit: 1000000, endpoints: ['read_only', 'write', 'analytics', 'admin'], price_usd: 999 },
    infrastructure: { name: 'Infrastructure', rate_limit: 50000, daily_limit: -1, endpoints: ['all'], price_usd: 4999 }
};

const INTEGRATION_TYPES = {
    scm_vendor: { name: 'SCM Vendor Integration', category: 'SCM', endpoints: ['/scm/*', '/carbon/*'], docs: '/api/docs/scm' },
    erp_system: { name: 'ERP System (SAP/Oracle)', category: 'ERP', endpoints: ['/products/*', '/inventory/*', '/procurement/*'], docs: '/api/docs/erp' },
    logistics: { name: 'Logistics Platform', category: 'Logistics', endpoints: ['/scm/tracking/*', '/scm/logistics/*', '/carbon-credit/verify/*'], docs: '/api/docs/logistics' },
    carbon_marketplace: { name: 'Carbon Marketplace', category: 'Carbon', endpoints: ['/carbon-credit/*', '/carbon/*'], docs: '/api/docs/carbon' },
    compliance_platform: { name: 'Compliance Platform', category: 'RegTech', endpoints: ['/compliance/*', '/identity/*'], docs: '/api/docs/compliance' },
    banking: { name: 'Banking / Green Finance', category: 'Finance', endpoints: ['/green-finance/*', '/carbon-credit/*', '/reputation/*'], docs: '/api/docs/finance' }
};

class APIEconomyEngine {

    generateAPIKey(params) {
        const { tenant_id, tier = 'free', integration_type = 'scm_vendor', app_name = 'Untitled App', owner_id } = params;
        const tierConfig = API_TIERS[tier];
        if (!tierConfig) return { error: `Invalid tier. Valid: ${Object.keys(API_TIERS).join(', ')}` };

        const apiKey = `tc_${tier}_${crypto.randomBytes(16).toString('hex')}`;
        const apiSecret = crypto.randomBytes(32).toString('hex');

        return {
            api_key: apiKey,
            api_secret: apiSecret,
            tier: { key: tier, ...tierConfig },
            integration: INTEGRATION_TYPES[integration_type] || INTEGRATION_TYPES.scm_vendor,
            app_name, tenant_id, owner_id,
            permissions: tierConfig.endpoints,
            rate_limit: { requests_per_minute: tierConfig.rate_limit, daily_limit: tierConfig.daily_limit },
            status: 'active',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 365 * 86400000).toISOString()
        };
    }

    getUsageStats(apiKeys = [], requests = []) {
        const stats = apiKeys.map(key => {
            const keyRequests = requests.filter(r => r.api_key === key.api_key);
            const today = new Date().toISOString().slice(0, 10);
            const todayRequests = keyRequests.filter(r => (r.timestamp || '').startsWith(today));
            return {
                api_key: key.api_key?.slice(0, 16) + '…',
                app_name: key.app_name, tier: key.tier?.key || key.tier,
                total_requests: keyRequests.length, today_requests: todayRequests.length,
                rate_limit: key.rate_limit, within_limits: todayRequests.length < (key.rate_limit?.daily_limit || 1000),
                status: key.status, last_used: keyRequests[keyRequests.length - 1]?.timestamp || 'never'
            };
        });

        return {
            title: 'API Usage Dashboard',
            total_keys: apiKeys.length, active_keys: apiKeys.filter(k => k.status === 'active').length,
            total_requests: requests.length,
            by_tier: Object.keys(API_TIERS).reduce((acc, t) => { acc[t] = apiKeys.filter(k => (k.tier?.key || k.tier) === t).length; return acc; }, {}),
            keys: stats, generated_at: new Date().toISOString()
        };
    }

    getMarketplaceListings() {
        return {
            title: 'TrustChecker Data Marketplace',
            categories: [
                { name: 'Carbon Credit Data', description: 'Real-time carbon credit registry, verification, market prices', endpoints: 4, pricing: '$0.01/query' },
                { name: 'Supply Chain Trust', description: 'Partner trust scores, ESG grades, compliance status', endpoints: 6, pricing: '$0.005/query' },
                { name: 'Compliance Reports', description: 'Auto-generated regulatory compliance reports', endpoints: 3, pricing: '$1.00/report' },
                { name: 'Risk Intelligence', description: 'Behavioral risk scores, fraud graph analysis', endpoints: 4, pricing: '$0.50/analysis' },
                { name: 'DID & Verifiable Credentials', description: 'Identity resolution, credential verification', endpoints: 5, pricing: '$0.02/verification' },
                { name: 'Green Finance Signals', description: 'ESG credit scoring, carbon-backed collateral data', endpoints: 3, pricing: '$0.10/signal' }
            ],
            sdk_platforms: ['JavaScript/Node.js', 'Python', 'Java', 'Go', 'REST API'],
            partner_program: { tiers: ['Certified', 'Premier', 'Strategic'], benefits: ['Revenue share', 'Co-marketing', 'Dedicated support', 'Custom SLA'] },
            generated_at: new Date().toISOString()
        };
    }

    getTiers() { return API_TIERS; }
    getIntegrations() { return INTEGRATION_TYPES; }
}

module.exports = new APIEconomyEngine();
