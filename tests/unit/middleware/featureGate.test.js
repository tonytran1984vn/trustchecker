const { requireFeature, hasAccess, getRequiredPlan, getFeaturesForPlan, FEATURE_PLANS, PLAN_HIERARCHY } = require('../../../server/middleware/featureGate');

const createRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('hasAccess', () => {
    test('free tier has access to free features', () => {
        expect(hasAccess('free', 'free')).toBe(true);
    });

    test('enterprise has access to all tiers', () => {
        expect(hasAccess('enterprise', 'free')).toBe(true);
        expect(hasAccess('enterprise', 'core')).toBe(true);
        expect(hasAccess('enterprise', 'pro')).toBe(true);
        expect(hasAccess('enterprise', 'enterprise')).toBe(true);
    });

    test('free does not have access to pro', () => {
        expect(hasAccess('free', 'pro')).toBe(false);
    });

    test('null plan defaults to free', () => {
        expect(hasAccess(null, 'free')).toBe(true);
        expect(hasAccess(null, 'core')).toBe(false);
    });
});

describe('getRequiredPlan', () => {
    test('returns correct plan for known features', () => {
        expect(getRequiredPlan('products')).toBe('free');
        expect(getRequiredPlan('fraud')).toBe('core');
        expect(getRequiredPlan('risk_radar')).toBe('pro');
        expect(getRequiredPlan('carbon')).toBe('enterprise');
    });

    test('returns enterprise for unknown features', () => {
        expect(getRequiredPlan('unknown_feature')).toBe('enterprise');
    });
});

describe('getFeaturesForPlan', () => {
    test('free plan has basic features', () => {
        const features = getFeaturesForPlan('free');
        expect(features).toContain('products');
        expect(features).toContain('qr');
        expect(features).not.toContain('fraud');
    });

    test('enterprise plan has all features', () => {
        const features = getFeaturesForPlan('enterprise');
        expect(features).toContain('products');
        expect(features).toContain('carbon');
        expect(features).toContain('digital_twin');
        expect(features.length).toBe(Object.keys(FEATURE_PLANS).length);
    });
});

describe('requireFeature middleware', () => {
    test('admin bypasses feature gate', () => {
        const mw = requireFeature('carbon');
        const req = { user: { role: 'admin', plan: 'free' } };
        const next = jest.fn();
        mw(req, createRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('allows when user plan includes feature', () => {
        const mw = requireFeature('products');
        const req = { user: { plan: 'free' } };
        const next = jest.fn();
        mw(req, createRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('returns 403 when plan insufficient', () => {
        const mw = requireFeature('carbon');
        const req = { user: { plan: 'free' } };
        const res = createRes();
        mw(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            feature: 'carbon',
            required_plan: 'enterprise',
            upgrade_url: '/billing',
        }));
    });

    test('no user defaults to free plan', () => {
        const mw = requireFeature('fraud');
        const req = {};
        const res = createRes();
        mw(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
    });
});

describe('PLAN_HIERARCHY', () => {
    test('has 4 tiers in correct order', () => {
        expect(PLAN_HIERARCHY).toEqual(['free', 'core', 'pro', 'enterprise']);
    });
});
