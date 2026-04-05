/**
 * Auth Service v1.0
 * Business logic for authentication, registration, token management, MFA.
 * Routes should ONLY call this service — no direct DB queries in routes.
 */
const BaseService = require('./base.service');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class AuthService extends BaseService {
    constructor() {
        super('auth');
    }

    async findUserByEmail(email) {
        return this.db.get('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    }

    async findUserById(id) {
        return this.db.get('SELECT id, email, username, role, org_id, created_at FROM users WHERE id = $1', [id]);
    }

    async createUser({ email, password, username, orgId, role = 'viewer' }) {
        const id = uuidv4();
        const hash = await bcrypt.hash(password, 12);
        await this.db.run(
            'INSERT INTO users (id, email, password_hash, username, org_id, role, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
            [id, email.toLowerCase().trim(), hash, username, orgId, role]
        );
        this.logger.info('User created', { userId: id, email, orgId });
        return { id, email, username, role, orgId };
    }

    async verifyPassword(plaintext, hash) {
        return bcrypt.compare(plaintext, hash);
    }

    async updateFailedAttempts(userId, attempts) {
        const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        await this.db.run('UPDATE users SET failed_attempts = $1, locked_until = $2 WHERE id = $3', [
            attempts,
            lockUntil,
            userId,
        ]);
    }

    async resetFailedAttempts(userId) {
        await this.db.run('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1', [userId]);
    }

    isAccountLocked(user) {
        return user.locked_until && new Date(user.locked_until) > new Date();
    }

    async getActiveSessions(userId) {
        return this.db.all(
            'SELECT id, created_at, expires_at, ip_address FROM refresh_tokens WHERE user_id = $1 AND revoked = false AND expires_at > NOW()',
            [userId]
        );
    }

    async revokeAllSessions(userId) {
        await this.db.run('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [userId]);
        this.logger.info('All sessions revoked', { userId });
    }

    async logAudit(userId, action, details = {}) {
        await this.db.run(
            'INSERT INTO audit_log (id, user_id, action, details, created_at) VALUES ($1, $2, $3, $4, NOW())',
            [uuidv4(), userId, action, JSON.stringify(details)]
        );
    }
}

module.exports = new AuthService();
