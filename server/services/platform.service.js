/**
 * Platform Service v1.0
 * Business logic for feature flags, billing, and platform admin.
 */
const BaseService = require('./base.service');

class PlatformService extends BaseService {
    constructor() {
        super('platform');
    }

    async getFeatureFlags(orgId) {
        const flags = await this.db.all('SELECT * FROM platform_feature_flags ORDER BY name');
        const overrides = orgId
            ? await this.db.all('SELECT * FROM org_feature_overrides WHERE org_id = $1', [orgId])
            : [];

        return flags.map(f => {
            const override = overrides.find(o => o.flag_id === f.id);
            return { ...f, effective_value: override?.value ?? f.default_value };
        });
    }

    async isFeatureEnabled(orgId, flagName) {
        const flag = await this.db.get('SELECT * FROM platform_feature_flags WHERE name = $1', [flagName]);
        if (!flag) return false;
        if (orgId) {
            const override = await this.db.get(
                'SELECT value FROM org_feature_overrides WHERE org_id = $1 AND flag_id = $2',
                [orgId, flag.id]
            );
            if (override) return override.value === 'true' || override.value === true;
        }
        return flag.default_value === 'true' || flag.default_value === true;
    }

    async getPlatformStats() {
        const [orgs, users, products, scans] = await Promise.all([
            this.db.get('SELECT COUNT(*) as cnt FROM organizations'),
            this.db.get('SELECT COUNT(*) as cnt FROM users'),
            this.db.get('SELECT COUNT(*) as cnt FROM products'),
            this.db.get('SELECT COUNT(*) as cnt FROM scan_events'),
        ]);
        return {
            total_orgs: orgs?.cnt || 0,
            total_users: users?.cnt || 0,
            total_products: products?.cnt || 0,
            total_scans: scans?.cnt || 0,
        };
    }

    async getBillingInfo(orgId) {
        return this.db.get('SELECT * FROM billing WHERE org_id = $1', [orgId]);
    }
}

module.exports = new PlatformService();
