/**
 * Kill Switch Runtime Guard v9.5.1 (S-14)
 * Checks active kill switches before processing requests.
 * Uses kill_switch_logs table to track active switches.
 */
const db = require('../db');

let activeKillSwitches = new Set();
let lastCheck = 0;
const CHECK_INTERVAL = 10000; // 10 seconds

async function refreshKillSwitches() {
    try {
        const now = Date.now();
        if (now - lastCheck < CHECK_INTERVAL) return;
        lastCheck = now;
        const rows = await db.all(
            "SELECT switch_id FROM kill_switch_state WHERE active = true"
        );
        activeKillSwitches = new Set(rows.map(r => r.switch_id));
    } catch(e) {
        // Non-critical — don't block requests if check fails
    }
}

function killSwitchGuard() {
    return async (req, res, next) => {
        await refreshKillSwitches();

        // KS-01: Network Freeze — block ALL requests except healthz
        if (activeKillSwitches.has('KS-01') && !req.path.includes('/healthz')) {
            return res.status(503).json({
                error: 'Platform temporarily suspended',
                code: 'KILL_SWITCH_KS01',
                message: 'Network freeze active. Contact platform administration.',
            });
        }

        // KS-03: Scoring Freeze — block trust score writes
        if (activeKillSwitches.has('KS-03') && req.method !== 'GET' &&
            (req.path.includes('/trust') || req.path.includes('/score'))) {
            return res.status(503).json({
                error: 'Trust scoring temporarily frozen',
                code: 'KILL_SWITCH_KS03',
            });
        }

        // KS-05: Settlement Freeze — block settlement/payment endpoints
        if (activeKillSwitches.has('KS-05') && req.method !== 'GET' &&
            (req.path.includes('/wallet') || req.path.includes('/payment') || req.path.includes('/settlement'))) {
            return res.status(503).json({
                error: 'Settlements temporarily frozen',
                code: 'KILL_SWITCH_KS05',
            });
        }

        next();
    };
}

module.exports = { killSwitchGuard };
