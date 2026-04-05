/**
 * Organization Service v1.0
 * Business logic for org management, memberships, and settings.
 */
const BaseService = require('./base.service');
const { v4: uuidv4 } = require('uuid');

class OrgService extends BaseService {
    constructor() {
        super('org');
    }

    async getOrg(orgId) {
        const org = await this.db.get('SELECT * FROM organizations WHERE id = $1', [orgId]);
        if (!org) throw this.error('ORG_NOT_FOUND', 'Organization not found', 404);
        return org;
    }

    async updateOrg(orgId, data) {
        const fields = ['name', 'domain', 'industry', 'size', 'plan'];
        const updates = [];
        const params = [];
        let idx = 1;
        for (const f of fields) {
            if (data[f] !== undefined) {
                updates.push(`${f} = $${idx}`);
                params.push(data[f]);
                idx++;
            }
        }
        if (updates.length === 0) throw this.error('NO_CHANGES', 'No fields to update');
        params.push(orgId);
        await this.db.run(
            `UPDATE organizations SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
            params
        );
        return this.getOrg(orgId);
    }

    async getMembers(orgId, { page = 1, limit = 20 } = {}) {
        return this.paginate(
            `SELECT u.id, u.email, u.username, u.role, m.status, m.created_at as joined_at
             FROM memberships m JOIN users u ON u.id = m.user_id
             WHERE m.org_id = $1 ORDER BY m.created_at DESC`,
            [orgId],
            { page, limit }
        );
    }

    async inviteMember(orgId, email, role = 'viewer') {
        const existing = await this.db.get(
            'SELECT m.id FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.org_id = $1 AND u.email = $2',
            [orgId, email]
        );
        if (existing) throw this.error('ALREADY_MEMBER', 'User is already a member');

        const id = uuidv4();
        await this.db.run(
            'INSERT INTO invitations (id, org_id, email, role, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
            [id, orgId, email, role, 'pending']
        );
        this.logger.info('Member invited', { orgId, email, role });
        return { id, email, role, status: 'pending' };
    }

    async removeMember(orgId, userId) {
        await this.db.run('DELETE FROM memberships WHERE org_id = $1 AND user_id = $2', [orgId, userId]);
        this.logger.info('Member removed', { orgId, userId });
    }

    async getOrgStats(orgId) {
        const [members, products, scans, trustScore] = await Promise.all([
            this.db.get('SELECT COUNT(*) as cnt FROM memberships WHERE org_id = $1', [orgId]),
            this.db.get('SELECT COUNT(*) as cnt FROM products WHERE org_id = $1', [orgId]),
            this.db.get(
                'SELECT COUNT(*) as cnt FROM scan_events se JOIN products p ON p.id = se.product_id WHERE p.org_id = $1',
                [orgId]
            ),
            this.db.get(
                'SELECT AVG(score) as avg FROM trust_scores ts JOIN products p ON p.id = ts.product_id WHERE p.org_id = $1 AND ts.is_latest = true',
                [orgId]
            ),
        ]);
        return {
            members: members?.cnt || 0,
            products: products?.cnt || 0,
            total_scans: scans?.cnt || 0,
            avg_trust_score: Math.round(trustScore?.avg || 0),
        };
    }
}

module.exports = new OrgService();
