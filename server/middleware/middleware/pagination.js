/**
 * Pagination Helper v9.4.2
 * Usage: const { limit, offset, page } = parsePagination(req);
 */
function parsePagination(req, defaults = { limit: 50, maxLimit: 200 }) {
    let limit = parseInt(req.query.limit) || defaults.limit;
    if (limit > defaults.maxLimit) limit = defaults.maxLimit;
    if (limit < 1) limit = 1;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const offset = (page - 1) * limit;

    return { limit, offset, page };
}

module.exports = { parsePagination };
