/**
 * V1 Products Controller
 * Thin controller — delegates ALL business logic to ProductService.
 * Response format: { data, meta, errors }
 */
const express = require('express');
const router = express.Router();
const productService = require('../../services/product.service');
const { success, paginated, serviceError } = require('../../lib/response');

// GET /api/v1/products
router.get('/', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { page = 1, limit = 20, search, category } = req.query;
        const result = await productService.list(orgId, {
            page: Number(page), limit: Number(limit), search, category,
        });
        paginated(res, result);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/products/:id
router.get('/:id', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const product = await productService.getById(req.params.id, orgId);
        success(res, product);
    } catch (e) { serviceError(res, e); }
});

// POST /api/v1/products
router.post('/', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const product = await productService.create(req.body, orgId);
        success(res, product, {}, 201);
    } catch (e) { serviceError(res, e); }
});

// PUT /api/v1/products/:id
router.put('/:id', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const product = await productService.update(req.params.id, req.body, orgId);
        success(res, product);
    } catch (e) { serviceError(res, e); }
});

// DELETE /api/v1/products/:id
router.delete('/:id', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const product = await productService.delete(req.params.id, orgId);
        success(res, product, { message: 'Product deleted' });
    } catch (e) { serviceError(res, e); }
});

module.exports = router;
