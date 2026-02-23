/**
 * TrustChecker — Super Admin Institutionalization Engine v1.0
 * CRITICAL: Define exactly what super_admin CAN and CANNOT do
 * 
 * Auditors WILL ask: "What can your super admin do?"
 * The answer must be: "Read everything. Change nothing critical."
 * 
 * This is the first audit question in any infrastructure review.
 */

// ═══════════════════════════════════════════════════════════════════
// 1. SUPER ADMIN — PERMITTED ACTIONS (CAN DO)
// ═══════════════════════════════════════════════════════════════════

const PERMITTED = {
    title: 'Super Admin — Permitted Actions',
    principle: 'Visibility without authority. Observe without intervene.',

    actions: [
        { category: 'System Monitoring', actions: ['View system health dashboard', 'View all API metrics', 'View error logs', 'View performance metrics', 'View resource utilization'], audit: true },
        { category: 'User Management (Non-Critical)', actions: ['Create new user accounts', 'Reset passwords (with notification)', 'Assign non-critical roles', 'View user activity logs'], audit: true },
        { category: 'Configuration (Non-Revenue)', actions: ['Modify UI settings', 'Update notification templates', 'Change system timezone/locale', 'Manage API rate limits (within bounds)'], audit: true },
        { category: 'Visibility', actions: ['Read all audit logs', 'View all transaction summaries (anonymized)', 'View all engine status', 'View governance meeting minutes', 'View compliance reports', 'View capital adequacy dashboard'], audit: true },
        { category: 'Incident Coordination', actions: ['Trigger L1 escalation (notify on-call)', 'Coordinate incident response communication', 'Access post-mortem reports'], audit: true },
        { category: 'Infrastructure', actions: ['Restart application (PM2 restart)', 'Deploy approved code changes', 'Manage backup schedules', 'Monitor database performance (read-only)'], audit: true },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. SUPER ADMIN — PROHIBITED ACTIONS (CANNOT DO)
// ═══════════════════════════════════════════════════════════════════

const PROHIBITED = {
    title: 'Super Admin — PROHIBITED Actions (Hardcoded)',
    principle: 'These prohibitions are CONSTITUTIONAL. Cannot be overridden, not even by super admin.',

    prohibitions: [
        {
            category: 'Trust & Scoring',
            actions: [
                { action: 'Modify trust scores', reason: 'Trust scores are computed by IVU engine. No human override.', enforcement: 'Constitutional RBAC: SEP-3' },
                { action: 'Override verification results', reason: 'Verification is algorithm-driven. Manual override = fraud vector.', enforcement: 'Engine-level immutability' },
                { action: 'Change scoring weights', reason: 'Weights are set by GGC + external audit. Admin cannot influence.', enforcement: 'SEP-3 + constitutional action block' },
                { action: 'Alter trust lineage/history', reason: 'Historical trust data is append-only. Hash-chained audit trail.', enforcement: 'Hash-chain + database role (trustchecker_readonly)' },
            ],
        },
        {
            category: 'Revenue & Finance',
            actions: [
                { action: 'Change pricing', reason: 'Pricing requires GGC approval. Admin is not a revenue authority.', enforcement: 'SEP-1: Super Admin ≠ Financial Controller' },
                { action: 'Approve treasury payouts', reason: 'Treasury requires dual-key (Risk + Compliance). Admin excluded.', enforcement: 'Dual-key middleware' },
                { action: 'Modify fee allocation', reason: 'Fee governance requires GGC super-majority.', enforcement: 'Constitutional amendment process' },
                { action: 'Access settlement reserves', reason: 'Reserves in bankruptcy-remote trust. Admin has no trustee role.', enforcement: 'Capital Reserve Trust + independent trustee' },
            ],
        },
        {
            category: 'Governance & Compliance',
            actions: [
                { action: 'Vote on GGC decisions', reason: 'Admin is operational, not governance.', enforcement: 'GGC membership exclusion' },
                { action: 'Modify constitutional rules', reason: 'Constitution requires GGC super-majority.', enforcement: 'Charter amendment process' },
                { action: 'Bypass compliance checks', reason: 'Compliance middleware is non-bypassable.', enforcement: 'requireConstitutionalWithAudit (hardcoded)' },
                { action: 'Suppress audit logs', reason: 'Audit logs are append-only. Admin has SELECT-only DB access.', enforcement: 'trustchecker_readonly PostgreSQL role' },
            ],
        },
        {
            category: 'Network & Validators',
            actions: [
                { action: 'Admit or suspend validators', reason: 'Validator management requires GGC + Risk.', enforcement: 'SEP-2 + multi-party approval' },
                { action: 'Slash validator stakes', reason: 'Slashing requires evidence + Risk proposal + GGC approval.', enforcement: 'Constitutional slashing process' },
                { action: 'Trigger network kill-switch', reason: 'Network freeze requires Crisis Council (2 of 3).', enforcement: 'Kill-switch authority matrix' },
                { action: 'Modify consensus parameters', reason: 'Consensus is protocol-level. Requires GGC + technical review.', enforcement: 'Protocol upgrade charter' },
            ],
        },
        {
            category: 'Database',
            actions: [
                { action: 'Write to production database', reason: 'Admin role = trustchecker_readonly (SELECT only).', enforcement: 'PostgreSQL RBAC' },
                { action: 'Delete audit records', reason: 'Audit table has no DELETE grant for any application role.', enforcement: 'trustchecker_audit role (INSERT only)' },
                { action: 'Modify hash-chained audit', reason: 'Any modification breaks hash chain = BLACK-level alert.', enforcement: 'Cryptographic integrity + chain validation' },
            ],
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 3. SUPER ADMIN ACCOUNTABILITY
// ═══════════════════════════════════════════════════════════════════

const ACCOUNTABILITY = {
    audit_trail: {
        every_action_logged: true,
        log_destination: 'Hash-chained audit log + external SIEM',
        retention: '7 years minimum',
        tamper_protection: 'SHA-256 hash chain — any modification detected automatically',
    },

    review_cycle: {
        daily: 'Automated scan for anomalous admin actions',
        weekly: 'Risk Committee reviews admin activity summary',
        quarterly: 'External auditor reviews admin access logs',
        annually: 'Full admin role re-certification by GGC',
    },

    violation_response: {
        attempt_prohibited_action: 'BLOCKED at middleware + RED alert to Risk Committee + incident log created',
        repeated_attempts: '3+ blocked attempts in 24h → automatic role suspension pending investigation',
        successful_bypass: 'BLACK-level crisis → immediate suspension + forensic investigation + regulatory notification',
    },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class SuperAdminBoundariesEngine {
    getPermitted() { return PERMITTED; }
    getProhibited() { return PROHIBITED; }
    getAccountability() { return ACCOUNTABILITY; }

    getSummary() {
        const canCount = PERMITTED.actions.reduce((t, c) => t + c.actions.length, 0);
        const cannotCount = PROHIBITED.prohibitions.reduce((t, c) => t + c.actions.length, 0);
        return {
            title: 'Super Admin Role — Institutionalized',
            principle: 'Visibility without authority',
            can_do: canCount,
            cannot_do: cannotCount,
            db_access: 'trustchecker_readonly (SELECT only)',
            audit: 'Every action logged to hash-chained trail',
            review: 'Weekly by Risk, quarterly by external auditor, annually re-certified by GGC',
        };
    }

    getFullFramework() {
        return {
            title: 'Super Admin Institutionalization — Audit-Ready',
            version: '1.0',
            summary: this.getSummary(),
            permitted: PERMITTED,
            prohibited: PROHIBITED,
            accountability: ACCOUNTABILITY,
        };
    }
}

module.exports = new SuperAdminBoundariesEngine();
