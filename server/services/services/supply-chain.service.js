/**
 * Supply Chain Service v1.0
 * Business logic for tracking, logistics, inventory, partners, and EPCIS.
 */
const BaseService = require('./base.service');
const { v4: uuidv4 } = require('uuid');

class SupplyChainService extends BaseService {
    constructor() {
        super('supply-chain');
    }

    // ── Tracking ─────────────────────────────────────────────────────────────
    async getShipments(orgId, { page = 1, limit = 20, status } = {}) {
        let sql = 'SELECT * FROM shipments WHERE org_id = $1';
        const params = [orgId];
        if (status) { sql += ` AND status = $${params.length + 1}`; params.push(status); }
        sql += ' ORDER BY created_at DESC';
        return this.paginate(sql, params, { page, limit });
    }

    async createShipment(data, orgId) {
        const id = uuidv4();
        await this.db.run(
            'INSERT INTO shipments (id, product_id, origin, destination, carrier, status, org_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())',
            [id, data.product_id, data.origin, data.destination, data.carrier, 'in_transit', orgId]
        );
        return { id, ...data, status: 'in_transit' };
    }

    // ── Inventory ────────────────────────────────────────────────────────────
    async getInventory(orgId, { page = 1, limit = 20 } = {}) {
        return this.paginate(
            'SELECT i.*, p.name as product_name FROM inventory i JOIN products p ON p.id = i.product_id WHERE i.org_id = $1 ORDER BY i.updated_at DESC',
            [orgId], { page, limit }
        );
    }

    // ── Partners ─────────────────────────────────────────────────────────────
    async getPartners(orgId, { page = 1, limit = 20 } = {}) {
        return this.paginate(
            'SELECT * FROM supply_chain_partners WHERE org_id = $1 ORDER BY name',
            [orgId], { page, limit }
        );
    }

    async addPartner(data, orgId) {
        const id = uuidv4();
        await this.db.run(
            'INSERT INTO supply_chain_partners (id, name, type, contact_email, status, org_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
            [id, data.name, data.type, data.contact_email, 'active', orgId]
        );
        return { id, ...data, status: 'active' };
    }

    // ── EPCIS Events ─────────────────────────────────────────────────────────
    async ingestEPCIS(events, orgId) {
        const results = [];
        for (const event of events) {
            const id = uuidv4();
            await this.db.run(
                'INSERT INTO epcis_events (id, event_type, epc_list, biz_step, disposition, org_id, event_data, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())',
                [id, event.type, JSON.stringify(event.epcList), event.bizStep, event.disposition, orgId, JSON.stringify(event)]
            );
            results.push({ id, type: event.type, status: 'ingested' });
        }
        this.logger.info('EPCIS events ingested', { count: results.length, orgId });
        return results;
    }
}

module.exports = new SupplyChainService();
