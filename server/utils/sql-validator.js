/**
 * SQL Identifier Validator
 * Validates table names and column names to prevent SQL injection
 * through dynamic identifier construction.
 */

const VALID_TABLES = new Set([
    'products', 'partners', 'users', 'organizations', 'sessions',
    'scan_events', 'qr_codes', 'trust_scores', 'blockchain_seals',
    'fraud_alerts', 'shipments', 'batches', 'inventory', 'certifications',
    'sustainability_scores', 'sla_violations', 'leak_alerts', 'anomaly_detections',
    'supply_chain_events', 'verifiable_credentials', 'carbon_credits', 'did_registry',
    'evidence_items', 'audit_log', 'refresh_tokens', 'rbac_user_roles',
    'rbac_roles', 'rbac_permissions', 'rbac_role_permissions', 'format_rules',
    'api_keys', 'notifications', 'webhooks', 'system_settings'
]);

/**
 * Validate a table name against allowlist
 * @param {string} tableName - The table name to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidTableName(tableName) {
    if (!tableName || typeof tableName !== 'string') return false;
    return VALID_TABLES.has(tableName);
}

/**
 * Validate a column name (alphanumeric + underscore only)
 * @param {string} columnName - The column name to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidColumnName(columnName) {
    if (!columnName || typeof columnName !== 'string') return false;
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(columnName);
}

/**
 * Build a safe SQL filter with validated identifiers
 * @param {string} tableName - Table name (will be validated)
 * @param {object} conditions - Key-value pairs for WHERE conditions
 * @param {string} orgId - Optional organization ID for tenant scoping
 * @returns {{ sql: string, params: array }} - Safe SQL and params
 */
function buildSafeQuery(tableName, conditions = {}, orgId = null) {
    if (!isValidTableName(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
    }

    const params = [];
    const whereClauses = [];

    // Always add org_id filter if orgId provided and table has org_id column
    if (orgId) {
        whereClauses.push('org_id = ?');
        params.push(orgId);
    }

    // Add user-provided conditions
    for (const [key, value] of Object.entries(conditions)) {
        if (!isValidColumnName(key)) {
            throw new Error(`Invalid column name: ${key}`);
        }
        whereClauses.push(`${key} = ?`);
        params.push(value);
    }

    const whereClause = whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '';
    return {
        sql: `SELECT * FROM ${tableName}${whereClause}`,
        params
    };
}

/**
 * Safe ORDER BY clause builder
 * @param {string} orderBy - Column to order by
 * @param {string} direction - ASC or DESC
 * @returns {string} - Safe ORDER BY clause
 */
function buildSafeOrderBy(orderBy, direction = 'ASC') {
    if (!isValidColumnName(orderBy)) {
        throw new Error(`Invalid column name for ORDER BY: ${orderBy}`);
    }
    const dir = direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    return ` ORDER BY ${orderBy} ${dir}`;
}

module.exports = {
    isValidTableName,
    isValidColumnName,
    buildSafeQuery,
    buildSafeOrderBy,
    VALID_TABLES
};
