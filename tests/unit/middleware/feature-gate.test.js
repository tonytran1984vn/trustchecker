const {
    requireFeature, hasAccess, getRequiredPlan, getFeaturesForPlan,
    FEATURE_PLANS, PLAN_HIERARCHY,
} = require('../../../server/middleware/featureGate');

describe('featureGate', () => {
    describe('PLAN_HIERARCHY', () => {
        test('has 4 plans', () => {
            expect(PLAN_HIERARCHY).toHaveLength(4);
        });
        test('free is first', () => {
            expect(PLAN_HIERARCHY[0]).toBe('free');
        });
        test('enterprise is last', () => {
            expect(PLAN_HIERARCHY[3]).toBe('enterprise');
        });
        test('order is free → core → pro → enterprise', () => {
            expect(PLAN_HIERARCHY).toEqual(['free', 'core', 'pro', 'enterprise']);
        });
    });

    describe('FEATURE_PLANS', () => {
        test('products is free', () => {
            expect(FEATURE_PLANS.products).toBe('free');
        });
        test('fraud is core', () => {
            expect(FEATURE_PLANS.fraud).toBe('core');
        });
        test('risk_radar is pro', () => {
            expect(FEATURE_PLANS.risk_radar).toBe('pro');
        });
        test('carbon is enterprise', () => {
            expect(FEATURE_PLANS.carbon).toBe('enterprise');
        });
        test('blockchain is enterprise', () => {
            expect(FEATURE_PLANS.blockchain).toBe('enterprise');
        });
        test('qr is free', () => {
            expect(FEATURE_PLANS.qr).toBe('free');
        });
        test('kyc is pro', () => {
            expect(FEATURE_PLANS.kyc).toBe('pro');
        });
    });

    describe('getRequiredPlan', () => {
        test('returns free for products', () => {
            expect(getRequiredPlan('products')).toBe('free');
        });
        test('returns core for fraud', () => {
            expect(getRequiredPlan('fraud')).toBe('core');
        });
        test('returns enterprise for unknown feature', () => {
            expect(getRequiredPlan('nonexistent_feature')).toBe('enterprise');
        });
        test('returns pro for risk_radar', () => {
            expect(getRequiredPlan('risk_radar')).toBe('pro');
        });
    });

    describe('hasAccess', () => {
        test('enterprise has access to free features', () => {
            expect(hasAccess('enterprise', 'free')).toBe(true);
        });
        test('free does not have access to enterprise', () => {
            expect(hasAccess('free', 'enterprise')).toBe(false);
        });
        test('pro has access to core', () => {
            expect(hasAccess('pro', 'core')).toBe(true);
        });
        test('core does not have access to pro', () => {
            expect(hasAccess('core', 'pro')).toBe(false);
        });
        test('same plan has access', () => {
            expect(hasAccess('pro', 'pro')).toBe(true);
        });
        test('null plan defaults to free', () => {
            expect(hasAccess(null, 'free')).toBe(true);
        });
        test('undefined plan defaults to free', () => {
            expect(hasAccess(undefined, 'free')).toBe(true);
        });
    });

    describe('getFeaturesForPlan', () => {
        test('free includes products', () => {
            expect(getFeaturesForPlan('free')).toContain('products');
        });
        test('free includes qr', () => {
            expect(getFeaturesForPlan('free')).toContain('qr');
        });
        test('free does NOT include fraud', () => {
            expect(getFeaturesForPlan('free')).not.toContain('fraud');
        });
        test('core includes fraud', () => {
            expect(getFeaturesForPlan('core')).toContain('fraud');
        });
        test('pro includes risk_radar', () => {
            expect(getFeaturesForPlan('pro')).toContain('risk_radar');
        });
        test('enterprise includes everything', () => {
            const all = getFeaturesForPlan('enterprise');
            expect(all).toContain('carbon');
            expect(all).toContain('blockchain');
            expect(all).toContain('products');
        });
        test('higher plan has more features', () => {
            expect(getFeaturesForPlan('enterprise').length).toBeGreaterThan(getFeaturesForPlan('free').length);
        });
    });

    describe('requireFeature middleware', () => {
        function mockRes() {
            return { status: jest.fn().mockReturnThis(), json: jest.fn() };
        }
        test('returns a function', () => {
            expect(typeof requireFeature('products')).toBe('function');
        });
        test('passes for admin regardless of plan', () => {
            const next = jest.fn();
            requireFeature('carbon')({ user: { role: 'admin', plan: 'free' } }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });
        test('blocks free user from pro feature', () => {
            const res = mockRes();
            requireFeature('risk_radar')({ user: { plan: 'free' } }, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });
        test('passes pro user for pro feature', () => {
            const next = jest.fn();
            requireFeature('risk_radar')({ user: { plan: 'pro' } }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });
        test('block response includes upgrade_url', () => {
            const res = mockRes();
            requireFeature('carbon')({ user: { plan: 'free' } }, res, jest.fn());
            expect(res.json.mock.calls[0][0].upgrade_url).toBe('/billing');
        });
        test('block response includes feature name', () => {
            const res = mockRes();
            requireFeature('carbon')({ user: { plan: 'free' } }, res, jest.fn());
            expect(res.json.mock.calls[0][0].feature).toBe('carbon');
        });
    });
});
