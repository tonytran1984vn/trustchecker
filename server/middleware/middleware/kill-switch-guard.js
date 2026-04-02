/**
 * Kill Switch Runtime Guard v9.5.2 (S-14)
 * Checks active kill switches before processing requests.
 * Uses crisis engine state directly instead of an unused DB table.
 */
const crisisEngine = require('../../engines/crisis-module/crisis');

function killSwitchGuard() {
    return async (req, res, next) => {
        // KS-01: Network Freeze — block ALL requests except healthz
        if (crisisEngine.isHalted('global', 'ALL_SYSTEMS') && !req.path.includes('/healthz')) {
            return res.status(503).json({
                error: 'Platform temporarily suspended',
                code: 'KILL_SWITCH_KS01',
                message: 'Network freeze active. Contact platform administration.',
            });
        }

        // KS-03: Scoring Freeze — block trust score writes
        if (
            crisisEngine.isHalted('module', 'scoring') &&
            req.method !== 'GET' &&
            (req.path.includes('/trust') || req.path.includes('/score'))
        ) {
            return res.status(503).json({
                error: 'Trust scoring temporarily frozen',
                code: 'KILL_SWITCH_KS03',
            });
        }

        // KS-05: Settlement Freeze — block settlement/payment endpoints
        if (
            crisisEngine.isHalted('module', 'settlement') &&
            req.method !== 'GET' &&
            (req.path.includes('/wallet') || req.path.includes('/payment') || req.path.includes('/settlement'))
        ) {
            return res.status(503).json({
                error: 'Settlements temporarily frozen',
                code: 'KILL_SWITCH_KS05',
            });
        }

        next();
    };
}

module.exports = { killSwitchGuard };
