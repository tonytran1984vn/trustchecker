/**
 * Base Service — shared utilities for all domain services.
 * Provides DB access, logging, event publishing, and error handling.
 */
const db = require('../db');
const logger = require('../lib/logger');

class BaseService {
    constructor(domain) {
        this.domain = domain;
        this.db = db;
        this.logger = logger;
    }

    // Standardized error
    error(code, message, status = 400) {
        const err = new Error(message);
        err.code = code;
        err.status = status;
        err.domain = this.domain;
        return err;
    }

    // Paginated query
    async paginate(sql, params = [], { page = 1, limit = 20 } = {}) {
        const offset = (page - 1) * limit;
        const countSql = sql.replace(/SELECT .+? FROM/i, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY .+$/i, '').replace(/LIMIT .+$/i, '');
        const [rows, countResult] = await Promise.all([
            this.db.all(sql + ` LIMIT ${limit} OFFSET ${offset}`, params),
            this.db.get(countSql, params),
        ]);
        return {
            data: rows,
            meta: {
                page,
                limit,
                total: countResult?.total || 0,
                totalPages: Math.ceil((countResult?.total || 0) / limit),
            },
        };
    }

    // Standard response format
    success(data, meta = {}) {
        return { data, meta: { ...meta, timestamp: new Date().toISOString() } };
    }
}

module.exports = BaseService;
