/**
 * Compliance Service v1.0
 * Business logic for evidence management, KYC, and regulatory tech.
 */
const BaseService = require('./base.service');
const { v4: uuidv4 } = require('uuid');

class ComplianceService extends BaseService {
    constructor() {
        super('compliance');
    }

    async getEvidencePacks(orgId, { page = 1, limit = 20 } = {}) {
        return this.paginate('SELECT * FROM evidence_packs WHERE org_id = $1 ORDER BY created_at DESC', [orgId], {
            page,
            limit,
        });
    }

    async createEvidencePack(data, orgId) {
        const id = uuidv4();
        await this.db.run(
            'INSERT INTO evidence_packs (id, title, description, status, org_id, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
            [id, data.title, data.description, 'draft', orgId]
        );
        return { id, ...data, status: 'draft' };
    }

    async getKYCStatus(orgId) {
        const status = await this.db.get('SELECT * FROM kyc_status WHERE org_id = $1', [orgId]);
        return status || { status: 'not_started', org_id: orgId };
    }

    async getComplianceScore(orgId) {
        const checks = await this.db.all(
            'SELECT * FROM compliance_checks WHERE org_id = $1 ORDER BY check_date DESC LIMIT 50',
            [orgId]
        );
        const passed = checks.filter(c => c.status === 'passed').length;
        return {
            score: checks.length ? Math.round((passed / checks.length) * 100) : 0,
            total_checks: checks.length,
            passed,
            failed: checks.length - passed,
        };
    }
}

module.exports = new ComplianceService();
