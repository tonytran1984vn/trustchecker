/**
 * Product Service v1.0
 * Business logic for product CRUD, metadata, search, and batch operations.
 */
const BaseService = require('./base.service');
const { v4: uuidv4 } = require('uuid');

const PLAN_LIMITS = { free: 50, starter: 500, pro: 5000, enterprise: 100000 };

class ProductService extends BaseService {
    constructor() {
        super('product');
    }

    async list(orgId, { page = 1, limit = 20, search, category } = {}) {
        let sql =
            'SELECT p.*, ts.score as trust_score FROM products p LEFT JOIN trust_scores ts ON ts.product_id = p.id  WHERE p.org_id = $1';
        const params = [orgId];
        if (search) {
            sql += ` AND (p.name ILIKE $${params.length + 1} OR p.sku ILIKE $${params.length + 1})`;
            params.push(`%${search}%`);
        }
        if (category) {
            sql += ` AND p.category = $${params.length + 1}`;
            params.push(category);
        }
        sql += ' ORDER BY p.created_at DESC';
        return this.paginate(sql, params, { page, limit });
    }

    async getById(id, orgId) {
        const product = await this.db.get(
            'SELECT p.*, ts.score as trust_score FROM products p LEFT JOIN trust_scores ts ON ts.product_id = p.id  WHERE p.id = $1 AND p.org_id = $2',
            [id, orgId]
        );
        if (!product) throw this.error('PRODUCT_NOT_FOUND', 'Product not found', 404);
        return product;
    }

    async create(data, orgId) {
        // Check plan limit
        const org = await this.db.get('SELECT plan FROM organizations WHERE id = $1', [orgId]);
        const count = await this.db.get('SELECT COUNT(*) as cnt FROM products WHERE org_id = $1', [orgId]);
        const limit = PLAN_LIMITS[org?.plan || 'free'] || 50;
        if ((count?.cnt || 0) >= limit) {
            throw this.error('PLAN_LIMIT', `Product limit reached (${limit} for ${org?.plan || 'free'} plan)`, 403);
        }

        const id = uuidv4();
        await this.db.run(
            `INSERT INTO products (id, name, sku, description, category, manufacturer, batch_number, origin_country, org_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
            [
                id,
                data.name,
                data.sku,
                data.description,
                data.category,
                data.manufacturer,
                data.batch_number,
                data.origin_country,
                orgId,
            ]
        );

        // ── Phase 1: Dual-write to product_definitions + product_catalogs ──
        const { dualWriteProduct } = require('../lib/dual-write');
        dualWriteProduct({
            id,
            name: data.name,
            orgId,
            sku: data.sku,
            category: data.category || '',
            description: data.description || '',
            origin_country: data.origin_country || '',
            manufacturer: data.manufacturer || '',
        }).catch(e => this.logger.error('[DualWrite] service create:', e.message));

        this.logger.info('Product created', { productId: id, orgId });
        return this.getById(id, orgId);
    }

    async update(id, data, orgId) {
        const existing = await this.getById(id, orgId);
        const fields = ['name', 'sku', 'description', 'category', 'manufacturer', 'batch_number', 'origin_country'];
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
        updates.push(`updated_at = NOW()`);
        params.push(id, orgId);
        await this.db.run(
            `UPDATE products SET ${updates.join(', ')} WHERE id = $${idx} AND org_id = $${idx + 1}`,
            params
        );
        return this.getById(id, orgId);
    }

    async delete(id, orgId) {
        const product = await this.getById(id, orgId);
        await this.db.run('DELETE FROM products WHERE id = $1 AND org_id = $2', [id, orgId]);
        this.logger.info('Product deleted', { productId: id, orgId });
        return product;
    }
}

module.exports = new ProductService();
