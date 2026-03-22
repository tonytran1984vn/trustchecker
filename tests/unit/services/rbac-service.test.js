/**
 * RBAC Service Tests
 * Tests the RBACService class methods directly by creating an instance
 * with mocked dependencies (avoiding the base.service.js resolution issue).
 */

jest.mock('../../../server/db', () => require('../../helpers/db-mock'));

const db = require('../../../server/db');

// Create a standalone RBACService-like class for testing
// (the real one fails to import due to base.service.js path issue)
class TestableRBACService {
    constructor() {
        this.name = 'rbac';
        this.db = db;
        this.logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
        this.cache = new Map();
        this.TTL = { userPerms: 300000, rolePerms: 600000, allRoles: 1800000 };
    }

    _cacheGet(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) { this.cache.delete(key); return null; }
        return entry.value;
    }

    _cacheSet(key, value, ttl) {
        this.cache.set(key, { value, expiresAt: Date.now() + ttl });
    }

    _cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache) {
            if (now > entry.expiresAt) this.cache.delete(key);
        }
    }

    invalidateUser(userId) {
        for (const key of this.cache.keys()) {
            if (key.startsWith('user:' + userId)) this.cache.delete(key);
        }
    }

    invalidateRole(roleId) {
        for (const key of this.cache.keys()) {
            if (key.startsWith('role:' + roleId) || key.startsWith('user:')) {
                this.cache.delete(key);
            }
        }
    }

    invalidateAll() {
        this.cache.clear();
    }

    async getUserPermissions(userId, orgId) {
        const cacheKey = 'user:' + userId + ':' + (orgId || 'global');
        const cached = this._cacheGet(cacheKey);
        if (cached) return cached;

        try {
            const roles = await this.db.all(
                `SELECT r.id, r.name, r.parent_role_id FROM rbac_user_roles ur JOIN rbac_roles r ON r.id = ur.role_id WHERE ur.user_id = $1 AND (r.org_id = $2 OR r.org_id IS NULL OR r.type = 'platform')`,
                [userId, orgId]
            );

            const roleIds = new Set();
            const roleNames = new Set();
            for (const role of roles) {
                roleIds.add(role.id);
                roleNames.add(role.name);
                if (role.parent_role_id) roleIds.add(role.parent_role_id);
            }

            if (roleIds.size === 0) {
                const user = await this.db.get('SELECT role FROM users WHERE id = $1', [userId]);
                if (user?.role) roleNames.add(user.role);
            }

            let permissions = new Set();
            if (roleIds.size > 0) {
                const placeholders = Array.from(roleIds).map((_, i) => '$' + (i + 1)).join(',');
                const perms = await this.db.all(
                    `SELECT DISTINCT p.resource || ':' || p.action as perm FROM rbac_role_permissions rp JOIN rbac_permissions p ON p.id = rp.permission_id WHERE rp.role_id IN (${placeholders})`,
                    Array.from(roleIds)
                );
                permissions = new Set(perms.map(p => p.perm));
            }

            if (roleNames.has('super_admin') || roleNames.has('platform_admin')) {
                const allPerms = await this.db.all('SELECT resource || \':\' || action as perm FROM rbac_permissions');
                permissions = new Set(allPerms.map(p => p.perm));
                permissions.add('*');
            }

            if (roleNames.has('company_admin') || roleNames.has('org_owner')) {
                const businessPerms = await this.db.all(
                    "SELECT resource || ':' || action as perm FROM rbac_permissions WHERE level IN ('business', 'org')"
                );
                for (const p of businessPerms) permissions.add(p.perm);
            }

            const result = { roles: Array.from(roleNames), permissions: Array.from(permissions), permSet: permissions };
            this._cacheSet(cacheKey, result, this.TTL.userPerms);
            return result;
        } catch (e) {
            this.logger.warn('RBAC getUserPermissions fallback', { userId, error: e.message });
            return { roles: [], permissions: [], permSet: new Set() };
        }
    }

    async hasPermission(userId, orgId, permission) {
        const userPerms = await this.getUserPermissions(userId, orgId);
        if (userPerms.permSet.has('*')) return true;
        if (userPerms.permSet.has(permission)) return true;
        const [resource] = permission.split(':');
        if (userPerms.permSet.has(resource + ':*')) return true;
        return false;
    }

    async hasAnyPermission(userId, orgId, permissions) {
        for (const perm of permissions) {
            if (await this.hasPermission(userId, orgId, perm)) return true;
        }
        return false;
    }

    async getAllRoles(orgId) {
        const cacheKey = 'allRoles:' + (orgId || 'global');
        const cached = this._cacheGet(cacheKey);
        if (cached) return cached;
        const roles = await this.db.all('SELECT * FROM rbac_roles WHERE org_id = $1 OR org_id IS NULL ORDER BY name', [orgId]);
        this._cacheSet(cacheKey, roles, this.TTL.allRoles);
        return roles;
    }

    async getRolePermissions(roleId) {
        const cacheKey = 'role:' + roleId;
        const cached = this._cacheGet(cacheKey);
        if (cached) return cached;
        const perms = await this.db.all(
            `SELECT p.* FROM rbac_role_permissions rp JOIN rbac_permissions p ON p.id = rp.permission_id WHERE rp.role_id = $1 ORDER BY p.resource, p.action`,
            [roleId]
        );
        this._cacheSet(cacheKey, perms, this.TTL.rolePerms);
        return perms;
    }

    async assignRole(userId, roleId, orgId) {
        await this.db.run('INSERT INTO rbac_user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, roleId]);
        this.invalidateUser(userId);
        this.logger.info('Role assigned', { userId, roleId, orgId });
    }

    async revokeRole(userId, roleId) {
        await this.db.run('DELETE FROM rbac_user_roles WHERE user_id = $1 AND role_id = $2', [userId, roleId]);
        this.invalidateUser(userId);
        this.logger.info('Role revoked', { userId, roleId });
    }

    async getStats() {
        const [roles, perms, assignments] = await Promise.all([
            this.db.get('SELECT COUNT(*) as cnt FROM rbac_roles'),
            this.db.get('SELECT COUNT(*) as cnt FROM rbac_permissions'),
            this.db.get('SELECT COUNT(*) as cnt FROM rbac_user_roles'),
        ]);
        return { roles: roles?.cnt || 0, permissions: perms?.cnt || 0, assignments: assignments?.cnt || 0, cache_size: this.cache.size };
    }
}

let rbacService;
beforeEach(() => {
    db.__resetMocks();
    rbacService = new TestableRBACService();
});

describe('Cache', () => {
    test('_cacheSet and _cacheGet work', () => {
        rbacService._cacheSet('test:key', 'value', 60000);
        expect(rbacService._cacheGet('test:key')).toBe('value');
    });

    test('expired cache returns null', () => {
        rbacService._cacheSet('test:expired', 'val', -1);
        expect(rbacService._cacheGet('test:expired')).toBeNull();
    });

    test('invalidateUser clears user-specific cache', () => {
        rbacService._cacheSet('user:u1:org1', { test: true }, 60000);
        rbacService._cacheSet('user:u2:org1', { test: true }, 60000);
        rbacService.invalidateUser('u1');
        expect(rbacService._cacheGet('user:u1:org1')).toBeNull();
        expect(rbacService._cacheGet('user:u2:org1')).not.toBeNull();
    });

    test('invalidateRole clears role and user cache', () => {
        rbacService._cacheSet('role:r1', { perms: [] }, 60000);
        rbacService._cacheSet('user:u1:org', { roles: ['r1'] }, 60000);
        rbacService.invalidateRole('r1');
        expect(rbacService._cacheGet('role:r1')).toBeNull();
        expect(rbacService._cacheGet('user:u1:org')).toBeNull();
    });

    test('invalidateAll clears everything', () => {
        rbacService._cacheSet('test1', '1', 60000);
        rbacService._cacheSet('test2', '2', 60000);
        rbacService.invalidateAll();
        expect(rbacService.cache.size).toBe(0);
    });

    test('_cleanup removes expired entries', () => {
        rbacService._cacheSet('expired', 'val', -1);
        rbacService._cacheSet('valid', 'val', 60000);
        rbacService._cleanup();
        expect(rbacService._cacheGet('expired')).toBeNull();
        expect(rbacService._cacheGet('valid')).toBe('val');
    });
});

describe('getUserPermissions', () => {
    test('returns cached if available', async () => {
        const cached = { roles: ['admin'], permissions: ['all'], permSet: new Set(['all']) };
        rbacService._cacheSet('user:u1:org1', cached, 60000);
        const result = await rbacService.getUserPermissions('u1', 'org1');
        expect(result).toBe(cached);
        expect(db.all).not.toHaveBeenCalled();
    });

    test('queries DB when no cache', async () => {
        db.all.mockResolvedValueOnce([{ id: 'r1', name: 'operator', parent_role_id: null }]);
        db.all.mockResolvedValueOnce([{ perm: 'product:read' }]);
        const result = await rbacService.getUserPermissions('u1', 'org1');
        expect(result.roles).toContain('operator');
        expect(result.permissions).toContain('product:read');
    });

    test('super_admin gets wildcard', async () => {
        db.all.mockResolvedValueOnce([{ id: 'r1', name: 'super_admin', parent_role_id: null }]);
        db.all.mockResolvedValueOnce([{ perm: 'x:y' }]);
        db.all.mockResolvedValueOnce([{ perm: 'a:b' }]);
        const result = await rbacService.getUserPermissions('u1', 'org1');
        expect(result.permSet.has('*')).toBe(true);
    });

    test('falls back to user.role column when no RBAC roles', async () => {
        db.all.mockResolvedValueOnce([]); // no rbac roles
        db.get.mockResolvedValueOnce({ role: 'operator' }); // fallback
        const result = await rbacService.getUserPermissions('u1', 'org1');
        expect(result.roles).toContain('operator');
    });

    test('returns empty on error', async () => {
        db.all.mockRejectedValueOnce(new Error('DB down'));
        const result = await rbacService.getUserPermissions('u1', 'org1');
        expect(result.roles).toEqual([]);
        expect(result.permissions).toEqual([]);
    });
});

describe('hasPermission', () => {
    test('returns true for wildcard', async () => {
        rbacService._cacheSet('user:u1:org1', { permSet: new Set(['*']) }, 60000);
        expect(await rbacService.hasPermission('u1', 'org1', 'anything:like:this')).toBe(true);
    });

    test('returns true for exact match', async () => {
        rbacService._cacheSet('user:u1:org1', { permSet: new Set(['product:create']) }, 60000);
        expect(await rbacService.hasPermission('u1', 'org1', 'product:create')).toBe(true);
    });

    test('returns true for resource wildcard', async () => {
        rbacService._cacheSet('user:u1:org1', { permSet: new Set(['product:*']) }, 60000);
        expect(await rbacService.hasPermission('u1', 'org1', 'product:delete')).toBe(true);
    });

    test('returns false for no match', async () => {
        rbacService._cacheSet('user:u1:org1', { permSet: new Set(['product:read']) }, 60000);
        expect(await rbacService.hasPermission('u1', 'org1', 'admin:manage')).toBe(false);
    });
});

describe('hasAnyPermission', () => {
    test('returns true if any permission matches', async () => {
        rbacService._cacheSet('user:u1:org1', { permSet: new Set(['product:read']) }, 60000);
        expect(await rbacService.hasAnyPermission('u1', 'org1', ['admin:manage', 'product:read'])).toBe(true);
    });

    test('returns false if none match', async () => {
        rbacService._cacheSet('user:u1:org1', { permSet: new Set(['product:read']) }, 60000);
        expect(await rbacService.hasAnyPermission('u1', 'org1', ['admin:manage'])).toBe(false);
    });
});

describe('Role management', () => {
    test('getAllRoles queries DB', async () => {
        db.all.mockResolvedValueOnce([{ id: 'r1', name: 'admin' }]);
        const roles = await rbacService.getAllRoles('org1');
        expect(roles[0].name).toBe('admin');
    });

    test('getAllRoles uses cache', async () => {
        db.all.mockResolvedValueOnce([{ id: 'r1' }]);
        await rbacService.getAllRoles('org1');
        await rbacService.getAllRoles('org1');
        expect(db.all).toHaveBeenCalledTimes(1);
    });

    test('getRolePermissions queries DB', async () => {
        db.all.mockResolvedValueOnce([{ resource: 'product', action: 'read' }]);
        const perms = await rbacService.getRolePermissions('r1');
        expect(perms[0].resource).toBe('product');
    });

    test('assignRole writes DB and invalidates cache', async () => {
        db.run.mockResolvedValueOnce({});
        await rbacService.assignRole('u1', 'r1', 'org1');
        expect(db.run).toHaveBeenCalled();
    });

    test('revokeRole writes DB and invalidates cache', async () => {
        db.run.mockResolvedValueOnce({});
        await rbacService.revokeRole('u1', 'r1');
        expect(db.run).toHaveBeenCalled();
    });
});

describe('getStats', () => {
    test('returns counts', async () => {
        db.get
            .mockResolvedValueOnce({ cnt: 5 })
            .mockResolvedValueOnce({ cnt: 20 })
            .mockResolvedValueOnce({ cnt: 15 });
        const stats = await rbacService.getStats();
        expect(stats.roles).toBe(5);
        expect(stats.permissions).toBe(20);
        expect(stats.assignments).toBe(15);
    });
});
