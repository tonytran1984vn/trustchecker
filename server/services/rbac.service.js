/**
 * RBAC Service v1.0 (Phase 5)
 *
 * DB-backed permission checking with in-memory TTL cache.
 * Replaces hardcoded permission arrays with DB queries.
 *
 * Cache strategy:
 *   user:permissions  → TTL 5 min (cleared on role change)
 *   role:permissions  → TTL 10 min (cleared on permission change)
 *   all:roles         → TTL 30 min
 *
 * Tables used:
 *   rbac_roles, rbac_permissions, rbac_role_permissions, rbac_user_roles
 */
const BaseService = require('./base.service');

class RBACService extends BaseService {
    constructor() {
        super('rbac');
        this.cache = new Map();
        this.TTL = {
            userPerms: 5 * 60 * 1000,    // 5 min
            rolePerms: 10 * 60 * 1000,   // 10 min
            allRoles:  30 * 60 * 1000,   // 30 min
        };

        // Auto-cleanup expired entries every 5 min
        this._cleanupInterval = setInterval(() => this._cleanup(), 5 * 60 * 1000);
        if (this._cleanupInterval.unref) this._cleanupInterval.unref();
    }

    // ── Cache helpers ────────────────────────────────────────────────────────
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

    // ── Core permission check ────────────────────────────────────────────────
    async getUserPermissions(userId, orgId) {
        const cacheKey = 'user:' + userId + ':' + (orgId || 'global');
        const cached = this._cacheGet(cacheKey);
        if (cached) return cached;

        try {
            // Get user's roles (including inherited via parent_role_id)
            const roles = await this.db.all(
                `SELECT r.id, r.name, r.parent_role_id
                 FROM rbac_user_roles ur
                 JOIN rbac_roles r ON r.id = ur.role_id
                 WHERE ur.user_id = $1
                   AND (r.org_id = $2 OR r.org_id IS NULL OR r.type = 'platform')`,
                [userId, orgId]
            );

            // Collect all role IDs including parent hierarchy
            const roleIds = new Set();
            const roleNames = new Set();
            for (const role of roles) {
                roleIds.add(role.id);
                roleNames.add(role.name);
                if (role.parent_role_id) roleIds.add(role.parent_role_id);
            }

            if (roleIds.size === 0) {
                // Fallback: check user.role column
                const user = await this.db.get('SELECT role FROM users WHERE id = $1', [userId]);
                if (user?.role) roleNames.add(user.role);
            }

            // Get permissions for all roles
            let permissions = new Set();
            if (roleIds.size > 0) {
                const placeholders = Array.from(roleIds).map((_, i) => '$' + (i + 1)).join(',');
                const perms = await this.db.all(
                    `SELECT DISTINCT p.resource || ':' || p.action as perm
                     FROM rbac_role_permissions rp
                     JOIN rbac_permissions p ON p.id = rp.permission_id
                     WHERE rp.role_id IN (${placeholders})`,
                    Array.from(roleIds)
                );
                permissions = new Set(perms.map(p => p.perm));
            }

            // Super admin gets all permissions
            if (roleNames.has('super_admin') || roleNames.has('platform_admin')) {
                const allPerms = await this.db.all('SELECT resource || \'::\' || action as perm FROM rbac_permissions');
                permissions = new Set(allPerms.map(p => p.perm));
                permissions.add('*'); // Wildcard
            }

            // Company admin / org_owner gets business-level permissions
            if (roleNames.has('company_admin') || roleNames.has('org_owner')) {
                const businessPerms = await this.db.all(
                    "SELECT resource || ':' || action as perm FROM rbac_permissions WHERE level IN ('business', 'org')"
                );
                for (const p of businessPerms) permissions.add(p.perm);
            }

            const result = {
                roles: Array.from(roleNames),
                permissions: Array.from(permissions),
                permSet: permissions,
            };

            this._cacheSet(cacheKey, result, this.TTL.userPerms);
            return result;
        } catch (e) {
            this.logger.warn('RBAC getUserPermissions fallback', { userId, error: e.message });
            // Fallback: return empty permissions (allow middleware to use old system)
            return { roles: [], permissions: [], permSet: new Set() };
        }
    }

    async hasPermission(userId, orgId, permission) {
        const userPerms = await this.getUserPermissions(userId, orgId);
        if (userPerms.permSet.has('*')) return true;
        if (userPerms.permSet.has(permission)) return true;
        // Wildcard: "product:*" matches "product:create"
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

    // ── Role management ──────────────────────────────────────────────────────
    async getAllRoles(orgId) {
        const cacheKey = 'allRoles:' + (orgId || 'global');
        const cached = this._cacheGet(cacheKey);
        if (cached) return cached;

        const roles = await this.db.all(
            'SELECT * FROM rbac_roles WHERE org_id = $1 OR org_id IS NULL ORDER BY name',
            [orgId]
        );
        this._cacheSet(cacheKey, roles, this.TTL.allRoles);
        return roles;
    }

    async getRolePermissions(roleId) {
        const cacheKey = 'role:' + roleId;
        const cached = this._cacheGet(cacheKey);
        if (cached) return cached;

        const perms = await this.db.all(
            `SELECT p.* FROM rbac_role_permissions rp
             JOIN rbac_permissions p ON p.id = rp.permission_id
             WHERE rp.role_id = $1 ORDER BY p.resource, p.action`,
            [roleId]
        );
        this._cacheSet(cacheKey, perms, this.TTL.rolePerms);
        return perms;
    }

    async assignRole(userId, roleId, orgId) {
        await this.db.run(
            'INSERT INTO rbac_user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId, roleId]
        );
        this.invalidateUser(userId);
        this.logger.info('Role assigned', { userId, roleId, orgId });
    }

    async revokeRole(userId, roleId) {
        await this.db.run(
            'DELETE FROM rbac_user_roles WHERE user_id = $1 AND role_id = $2',
            [userId, roleId]
        );
        this.invalidateUser(userId);
        this.logger.info('Role revoked', { userId, roleId });
    }

    // ── Stats ────────────────────────────────────────────────────────────────
    async getStats() {
        const [roles, perms, assignments] = await Promise.all([
            this.db.get('SELECT COUNT(*) as cnt FROM rbac_roles'),
            this.db.get('SELECT COUNT(*) as cnt FROM rbac_permissions'),
            this.db.get('SELECT COUNT(*) as cnt FROM rbac_user_roles'),
        ]);
        return {
            roles: roles?.cnt || 0,
            permissions: perms?.cnt || 0,
            assignments: assignments?.cnt || 0,
            cache_size: this.cache.size,
        };
    }
}

module.exports = new RBACService();
