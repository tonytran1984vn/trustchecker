jest.mock('../../../server/db', () => ({
    ...require('../../helpers/db-mock'),
    setOrgContext: jest.fn(),
}));
jest.mock('../../../server/auth/scope-engine', () => ({
    getUserScopes: jest.fn().mockResolvedValue(['product:read', 'product:write']),
}));

const db = require('../../../server/db');
const { getUserScopes } = require('../../../server/auth/scope-engine');
const { orgGuard, orgQuery } = require('../../../server/middleware/org-middleware');

beforeEach(() => {
    db.__resetMocks();
    db.setOrgContext.mockClear();
    getUserScopes.mockClear().mockResolvedValue(['product:read']);
});

const createRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('orgGuard', () => {
    test('returns 401 if no user', async () => {
        const mw = orgGuard();
        const res = createRes();
        await mw({}, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('platform user passes through without orgId', async () => {
        const mw = orgGuard();
        const req = { user: { user_type: 'platform' }, query: {} };
        const next = jest.fn();
        await mw(req, createRes(), next);
        expect(next).toHaveBeenCalled();
        expect(req.scopes).toEqual([]);
    });

    test('platform user scopes to org via query param', async () => {
        const mw = orgGuard();
        const org = { id: 'org-1', name: 'Test', plan: 'enterprise', status: 'active', feature_flags: '{}' };
        db.get.mockResolvedValueOnce(org);
        const req = { user: { user_type: 'platform' }, query: { org_id: 'org-1' } };
        const next = jest.fn();
        await mw(req, createRes(), next);
        expect(next).toHaveBeenCalled();
        expect(req.orgId).toBe('org-1');
        expect(db.setOrgContext).toHaveBeenCalledWith('org-1');
    });

    test('platform user gets 404 for non-existent org', async () => {
        const mw = orgGuard();
        db.get.mockResolvedValueOnce(null);
        const req = { user: { user_type: 'platform' }, query: { org_id: 'bad' } };
        const res = createRes();
        await mw(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('platform user gets 403 for suspended org', async () => {
        const mw = orgGuard();
        db.get.mockResolvedValueOnce({ id: 'o1', status: 'suspended' });
        const req = { user: { user_type: 'platform' }, query: { org_id: 'o1' } };
        const res = createRes();
        await mw(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('strict mode requires org_id for platform user', async () => {
        const mw = orgGuard({ strict: true, allowPlatform: false });
        const req = { user: { user_type: 'platform' }, query: {} };
        const res = createRes();
        await mw(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('org user without orgId gets 403 NO_ORG', async () => {
        const mw = orgGuard();
        const req = { user: { user_type: 'org', id: 'u1' }, query: {} };
        const res = createRes();
        await mw(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'NO_ORG' }));
    });

    test('org user with active membership passes', async () => {
        const mw = orgGuard();
        const membership = {
            id: 'm1', user_id: 'u1', org_id: 'org-1', status: 'active',
            org_name: 'Test', plan: 'enterprise', org_status: 'active', feature_flags: '{}'
        };
        db.get.mockResolvedValueOnce(membership);
        const req = { user: { user_type: 'org', id: 'u1', org_id: 'org-1' }, query: {} };
        const next = jest.fn();
        await mw(req, createRes(), next);
        expect(next).toHaveBeenCalled();
        expect(req.orgId).toBe('org-1');
        expect(req.membership).toEqual(membership);
        expect(getUserScopes).toHaveBeenCalledWith('m1');
    });

    test('org user with suspended org gets 403', async () => {
        const mw = orgGuard();
        const membership = { id: 'm1', org_id: 'org-1', org_status: 'suspended' };
        db.get.mockResolvedValueOnce(membership);
        const req = { user: { user_type: 'org', id: 'u1', org_id: 'org-1' }, query: {} };
        const res = createRes();
        await mw(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'ORG_SUSPENDED' }));
    });

    test('fallback for legacy user without membership', async () => {
        const mw = orgGuard();
        db.get
            .mockResolvedValueOnce(null) // no membership
            .mockResolvedValueOnce({ id: 'org-1', name: 'Test', plan: 'free', status: 'active', feature_flags: '{}' });
        const req = { user: { user_type: 'org', id: 'u1', org_id: 'org-1' }, query: {} };
        const next = jest.fn();
        await mw(req, createRes(), next);
        expect(next).toHaveBeenCalled();
        expect(req.membership).toBeNull();
        expect(req.scopes).toEqual([]);
    });

    test('loadScopes: false skips scope loading', async () => {
        const mw = orgGuard({ loadScopes: false });
        const membership = {
            id: 'm1', org_id: 'org-1', org_status: 'active',
            org_name: 'Test', plan: 'enterprise', feature_flags: '{}'
        };
        db.get.mockResolvedValueOnce(membership);
        const req = { user: { user_type: 'org', id: 'u1', org_id: 'org-1' }, query: {} };
        const next = jest.fn();
        await mw(req, createRes(), next);
        expect(next).toHaveBeenCalled();
        expect(getUserScopes).not.toHaveBeenCalled();
    });
});

describe('orgQuery', () => {
    test('adds org_id WHERE clause for org users', async () => {
        db.all.mockResolvedValueOnce([{ id: '1' }]);
        const req = { orgId: 'org-1' };
        await orgQuery(req, 'SELECT * FROM products');
        expect(db.all).toHaveBeenCalledWith(
            'SELECT * FROM products WHERE org_id = ?',
            ['org-1']
        );
    });

    test('appends AND when WHERE already exists', async () => {
        db.all.mockResolvedValueOnce([]);
        const req = { orgId: 'org-1' };
        await orgQuery(req, "SELECT * FROM products WHERE status = 'active'");
        expect(db.all).toHaveBeenCalledWith(
            "SELECT * FROM products WHERE status = 'active' AND org_id = ? LIMIT 1000",
            ['org-1']
        );
    });

    test('no filter for platform admin without orgId', async () => {
        db.all.mockResolvedValueOnce([]);
        const req = {};
        await orgQuery(req, 'SELECT * FROM products');
        expect(db.all).toHaveBeenCalledWith('SELECT * FROM products', []);
    });
});
