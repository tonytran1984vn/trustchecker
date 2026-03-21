/**
 * Shared SQL Safety Utilities
 * Centralized functions for safe SQL query building.
 * Used across route handlers to prevent SQL injection.
 */
'use strict';

/**
 * Sanitize identifier (table/column name) — allow only alphanumeric + underscore
 */
function _safeId(id) {
    if (!id || typeof id !== 'string') return '';
    return id.replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Sanitize a WHERE clause fragment — basic safety check
 * NOTE: Prefer parameterized queries ($1, $2) over this approach.
 */
function _safeWhere(condition) {
    if (!condition || typeof condition !== 'string') return '1=1';
    // Block obvious injection patterns
    if (/(--|;|\/\*|\*\/|xp_|sp_)/i.test(condition)) return '1=0';
    return condition;
}

/**
 * Sanitize a date string (ISO 8601 format only)
 */
function _safeDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
}

/**
 * Build a safe org-scoped JOIN condition
 */
function _safeJoin(join) {
    if (!join || typeof join !== 'string') return '';
    return join.replace(/[^a-zA-Z0-9_=. AND']/gi, '');
}

/**
 * Build a safe ORDER BY clause
 */
function _safeOrderBy(column, direction = 'ASC') {
    const safeCol = _safeId(column);
    const safeDir = direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    return `${safeCol} ${safeDir}`;
}

/**
 * Clamp a numeric limit to prevent unbounded queries
 */
function _safeLimit(limit, max = 1000, fallback = 50) {
    const n = parseInt(limit);
    if (isNaN(n) || n < 1) return fallback;
    return Math.min(n, max);
}

module.exports = { _safeId, _safeWhere, _safeDate, _safeJoin, _safeOrderBy, _safeLimit };
