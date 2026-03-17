/**
 * Unified Response Format v1.0
 * Standard: { data, meta, errors }
 * Used by all v1 controllers for consistent API response format.
 */

function success(res, data, meta = {}, status = 200) {
    return res.status(status).json({
        data,
        meta: {
            ...meta,
            timestamp: new Date().toISOString(),
            api_version: 1,
        },
    });
}

function paginated(res, result) {
    return res.json({
        data: result.data,
        meta: {
            ...result.meta,
            timestamp: new Date().toISOString(),
            api_version: 1,
        },
    });
}

function error(res, message, code = 'ERROR', status = 400, details = null) {
    return res.status(status).json({
        data: null,
        errors: [{
            code,
            message,
            ...(details ? { details } : {}),
        }],
        meta: { timestamp: new Date().toISOString(), api_version: 1 },
    });
}

function serviceError(res, err) {
    const status = err.status || 500;
    return error(res, err.message, err.code || 'INTERNAL_ERROR', status);
}

module.exports = { success, paginated, error, serviceError };
