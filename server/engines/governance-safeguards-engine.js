/**
 * TrustChecker — Governance Safeguards Engine v1.0
 * ANTI-COLLUSION + ANTI-CENTRALIZATION + DB ACCESS CONTROL
 * 
 * Fixes 3 critical vulnerabilities:
 *   1. GGC Collusion → composition rules, independent member requirements
 *   2. Risk + Compliance Collusion → entity separation, third-party observer
 *   3. Super Admin DB Access → access tiers, hash-chained audit log
 * 
 * Core Principle: Trust requires DISTRIBUTED authority across INDEPENDENT entities.
 */

const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════
// VULNERABILITY 1: GGC ANTI-COLLUSION FRAMEWORK
// ═══════════════════════════════════════════════════════════════════

const GGC_COMPOSITION = {
    title: 'Governance & Governance Council — Composition Rules',

    required_composition: {
        min_members: 5,
        max_members: 9,
        independent_minimum_pct: 40,   // At least 40% must be external/independent
        internal_maximum_pct: 60,      // Company insiders cannot exceed 60%
        single_entity_cap_pct: 30,     // No single corporate entity > 30% of seats
    },

    member_types: {
        internal: {
            description: 'Employees or officers of TrustChecker operating entity',
            max_seats: 4,
            can_vote: true,
            can_chair: true,
        },
        independent: {
            description: 'External experts with no financial ties to TrustChecker beyond council compensation',
            min_seats: 2,
            can_vote: true,
            can_chair: true,
            requirements: [
                'No employment by TrustChecker in past 24 months',
                'No equity ownership > 1%',
                'No consulting revenue > $50K/year from TrustChecker',
                'No family relationship with C-suite',
            ],
        },
        validator_representative: {
            description: 'Elected by active validators (1 node = 1 vote)',
            fixed_seats: 1,
            can_vote: true,
            can_chair: false,
            elected_by: 'active_validators',
            term_months: 6,
        },
        tenant_representative: {
            description: 'Elected by enterprise-tier tenants',
            fixed_seats: 1,
            can_vote: true,
            can_chair: false,
            elected_by: 'enterprise_tenants',
            term_months: 12,
        },
    },

    term_limits: {
        max_consecutive_terms: 3,
        term_length_months: 12,
        cooling_off_months: 12,  // Must wait 12 months before re-election
        chair_max_terms: 2,
    },

    conflict_of_interest: {
        disclosure: 'MANDATORY before any vote',
        recusal: 'Member must recuse from votes where personal financial interest exists',
        violation_penalty: 'Immediate suspension + independent review',
        annual_declaration: 'All members file annual conflict-of-interest declaration',
    },

    quorum_rules: {
        standard_vote: { quorum_pct: 60, approval_pct: 51, independent_required: 1 },
        charter_amendment: { quorum_pct: 80, approval_pct: 75, independent_required: 2 },
        emergency_action: { quorum_pct: 60, approval_pct: 67, independent_required: 1 },
        constitutional_change: { quorum_pct: 100, approval_pct: 75, independent_required: 'all' },
    },
};

// ═══════════════════════════════════════════════════════════════════
// VULNERABILITY 2: ANTI-COLLUSION FOR DUAL-KEY OPERATIONS
// ═══════════════════════════════════════════════════════════════════

const ANTI_COLLUSION = {
    title: 'Dual-Key Anti-Collusion Framework',

    entity_separation: {
        rule: 'Dual-key signers MUST belong to different corporate entities or reporting lines',
        enforcement: 'System checks org_id and reporting_chain before allowing dual-key approval',
        same_entity_action: 'BLOCK — dual-key from same entity is constitutional violation',
    },

    collusion_patterns: [
        {
            pattern: 'Same reporting line',
            description: 'Both signers report to the same manager',
            detection: 'Check reporting_chain in user profile',
            action: 'BLOCK + alert to GGC',
        },
        {
            pattern: 'Frequent co-approval',
            description: 'Same pair approves > 70% of dual-key requests',
            detection: 'Statistical analysis of approval pairs in audit_log',
            action: 'FLAG + mandatory rotation after 5 consecutive co-approvals',
        },
        {
            pattern: 'Velocity spike',
            description: 'Unusual number of dual-key approvals in short period',
            detection: 'Rate limit: max 3 dual-key approvals per role pair per 24h',
            action: 'THROTTLE + escalate to GGC for review',
        },
        {
            pattern: 'After-hours approval',
            description: 'Dual-key used outside business hours without declared emergency',
            detection: 'Timestamp check against business hours config',
            action: 'FLAG + require retroactive justification within 24h',
        },
    ],

    treasury_safeguards: {
        high_value_threshold_usd: 10000,
        above_threshold_requires: {
            dual_key: true,
            third_party_observer: true,   // Independent GGC member must be notified
            cooling_period_hours: 24,
            observer_role: 'independent_ggc_member',
        },
        below_threshold_requires: {
            dual_key: true,
            third_party_observer: false,
            cooling_period_hours: 0,
        },
    },
};

// ═══════════════════════════════════════════════════════════════════
// VULNERABILITY 3: DB ACCESS CONTROL & AUDIT TAMPER PROTECTION
// ═══════════════════════════════════════════════════════════════════

const DB_ACCESS_CONTROL = {
    title: 'Database Access Separation & Audit Integrity',

    access_tiers: {
        tier_1_app: {
            description: 'Application-level access via Prisma ORM',
            db_user: 'trustchecker_app',
            permissions: ['SELECT', 'INSERT', 'UPDATE', 'DELETE on application tables'],
            excluded_tables: ['audit_log', 'constitutional_audit'],   // Cannot modify audit trail
            used_by: 'Node.js application process',
        },
        tier_2_readonly: {
            description: 'Read-only access for dashboards and reporting',
            db_user: 'trustchecker_readonly',
            permissions: ['SELECT only — all tables'],
            used_by: 'Super Admin dashboard, analytics, monitoring',
        },
        tier_3_audit: {
            description: 'Append-only access for audit logging',
            db_user: 'trustchecker_audit',
            permissions: ['INSERT on audit_log, constitutional_audit', 'SELECT on audit_log'],
            excluded_operations: ['UPDATE', 'DELETE', 'TRUNCATE'],
            used_by: 'Constitutional enforcement middleware',
        },
        tier_4_dba: {
            description: 'Full database administration — schema changes only',
            db_user: 'trustchecker_dba',
            permissions: ['ALL (with audit)'],
            access_control: 'SSH key + 2FA + corporate VPN only',
            logging: 'All DBA queries logged to separate compliance server',
            used_by: 'Infrastructure team (not Super Admin)',
        },
    },

    super_admin_db_policy: {
        raw_db_access: 'DENIED',
        allowed: 'Read-only via tier_2_readonly user',
        cannot: ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'DROP', 'ALTER'],
        rationale: 'If Super Admin has write access, constitutional layer is bypassable at infra level',
        enforcement: 'PostgreSQL ROLE-based access control (RBAC at DB level)',
    },

    implementation_sql: [
        "-- Tier 1: App (no audit write)",
        "CREATE ROLE trustchecker_app LOGIN PASSWORD '***';",
        "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO trustchecker_app;",
        "REVOKE ALL ON audit_log, constitutional_audit FROM trustchecker_app;",
        "GRANT SELECT, INSERT ON audit_log TO trustchecker_app;  -- can write, not modify",
        "",
        "-- Tier 2: Read-only (Super Admin)",
        "CREATE ROLE trustchecker_readonly LOGIN PASSWORD '***';",
        "GRANT SELECT ON ALL TABLES IN SCHEMA public TO trustchecker_readonly;",
        "",
        "-- Tier 3: Audit (append-only)",
        "CREATE ROLE trustchecker_audit LOGIN PASSWORD '***';",
        "GRANT INSERT, SELECT ON audit_log, constitutional_audit TO trustchecker_audit;",
        "",
        "-- Tier 4: DBA (full, with separate logging)",
        "CREATE ROLE trustchecker_dba LOGIN PASSWORD '***' SUPERUSER;",
        "-- DBA access logged via pgaudit extension",
    ],
};

// ═══════════════════════════════════════════════════════════════════
// HASH-CHAINED AUDIT LOG (TAMPER-PROOF)
// ═══════════════════════════════════════════════════════════════════

const AUDIT_INTEGRITY = {
    title: 'Tamper-Proof Audit Log via Hash Chain',

    mechanism: {
        description: 'Each audit entry contains hash of previous entry — creating blockchain-like chain',
        algorithm: 'SHA-256',
        chain_structure: 'hash(n) = SHA256(hash(n-1) + action + actor + timestamp + details)',
        genesis: 'hash(0) = SHA256("TRUSTCHECKER_AUDIT_GENESIS_2026")',
    },

    tamper_detection: {
        method: 'Periodic chain validation — any modified entry breaks all subsequent hashes',
        frequency: 'Every 15 minutes (automated)',
        on_detection: 'ALERT → GGC + Compliance + Board immediately',
        severity: 'BLACK-level crisis (existential threat)',
    },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

// In-memory hash chain state
let lastAuditHash = crypto.createHash('sha256').update('TRUSTCHECKER_AUDIT_GENESIS_2026').digest('hex');

class GovernanceSafeguardsEngine {

    // ─── GGC Composition Validation ───────────────────────────────

    validateGGCComposition(members) {
        const rules = GGC_COMPOSITION.required_composition;
        const errors = [];

        if (members.length < rules.min_members) errors.push(`Minimum ${rules.min_members} members required, have ${members.length}`);
        if (members.length > rules.max_members) errors.push(`Maximum ${rules.max_members} members allowed, have ${members.length}`);

        const independent = members.filter(m => m.type === 'independent').length;
        const independentPct = (independent / members.length) * 100;
        if (independentPct < rules.independent_minimum_pct) {
            errors.push(`Independent members: ${independentPct.toFixed(0)}% (need ≥${rules.independent_minimum_pct}%)`);
        }

        const internalPct = (members.filter(m => m.type === 'internal').length / members.length) * 100;
        if (internalPct > rules.internal_maximum_pct) {
            errors.push(`Internal members: ${internalPct.toFixed(0)}% (max ${rules.internal_maximum_pct}%)`);
        }

        // Check single entity cap
        const entityCounts = {};
        members.forEach(m => { entityCounts[m.entity || 'unknown'] = (entityCounts[m.entity || 'unknown'] || 0) + 1; });
        for (const [entity, count] of Object.entries(entityCounts)) {
            const pct = (count / members.length) * 100;
            if (pct > rules.single_entity_cap_pct) {
                errors.push(`Entity "${entity}" holds ${pct.toFixed(0)}% of seats (max ${rules.single_entity_cap_pct}%)`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            composition: {
                total: members.length,
                independent,
                independent_pct: independentPct.toFixed(1),
                internal: members.filter(m => m.type === 'internal').length,
                validator_rep: members.filter(m => m.type === 'validator_representative').length,
                tenant_rep: members.filter(m => m.type === 'tenant_representative').length,
            },
        };
    }

    validateGGCVote(vote_type, total_members, votes_cast, independent_votes, in_favor) {
        const rules = GGC_COMPOSITION.quorum_rules[vote_type];
        if (!rules) return { valid: false, error: `Unknown vote type: ${vote_type}` };

        const quorum_met = (votes_cast / total_members) * 100 >= rules.quorum_pct;
        const approval_met = (in_favor / votes_cast) * 100 >= rules.approval_pct;
        const independent_met = rules.independent_required === 'all'
            ? independent_votes >= total_members * 0.4  // all independent members
            : independent_votes >= rules.independent_required;

        return {
            vote_type,
            valid: quorum_met && approval_met && independent_met,
            quorum: { required_pct: rules.quorum_pct, actual_pct: ((votes_cast / total_members) * 100).toFixed(1), met: quorum_met },
            approval: { required_pct: rules.approval_pct, actual_pct: ((in_favor / votes_cast) * 100).toFixed(1), met: approval_met },
            independent: { required: rules.independent_required, actual: independent_votes, met: independent_met },
        };
    }

    // ─── Dual-Key Anti-Collusion ──────────────────────────────────

    validateDualKeyEntities(signer1, signer2) {
        const issues = [];

        // Same person check
        if (signer1.user_id === signer2.user_id) {
            issues.push({ severity: 'CRITICAL', type: 'self_approval', detail: 'Same person cannot be both signers' });
        }

        // Same entity check
        if (signer1.entity_id && signer2.entity_id && signer1.entity_id === signer2.entity_id) {
            issues.push({ severity: 'CRITICAL', type: 'same_entity', detail: `Both signers belong to entity "${signer1.entity_id}" — distributed authority violated` });
        }

        // Same reporting line
        if (signer1.reports_to && signer2.reports_to && signer1.reports_to === signer2.reports_to) {
            issues.push({ severity: 'HIGH', type: 'same_reporting_line', detail: `Both report to "${signer1.reports_to}" — independence compromised` });
        }

        // Same role (should be different roles for dual-key)
        if (signer1.role === signer2.role) {
            issues.push({ severity: 'MEDIUM', type: 'same_role', detail: `Both have role "${signer1.role}" — cross-function separation needed` });
        }

        return {
            valid: issues.filter(i => i.severity === 'CRITICAL').length === 0,
            blocked: issues.filter(i => i.severity === 'CRITICAL').length > 0,
            issues,
            anti_collusion_score: Math.max(0, 100 - (issues.length * 25)),
        };
    }

    // ─── Hash-Chained Audit Entry ─────────────────────────────────

    createAuditEntry(action, actor, details) {
        const timestamp = new Date().toISOString();
        const payload = `${lastAuditHash}|${action}|${actor}|${timestamp}|${JSON.stringify(details)}`;
        const hash = crypto.createHash('sha256').update(payload).digest('hex');

        const entry = {
            hash,
            previous_hash: lastAuditHash,
            action,
            actor,
            timestamp,
            details,
            chain_valid: true,
        };

        lastAuditHash = hash; // Advance chain
        return entry;
    }

    verifyAuditChain(entries) {
        let expectedPrevious = crypto.createHash('sha256').update('TRUSTCHECKER_AUDIT_GENESIS_2026').digest('hex');
        const results = [];

        for (const entry of entries) {
            const payload = `${expectedPrevious}|${entry.action}|${entry.actor}|${entry.timestamp}|${JSON.stringify(entry.details)}`;
            const expectedHash = crypto.createHash('sha256').update(payload).digest('hex');

            const valid = expectedHash === entry.hash && entry.previous_hash === expectedPrevious;
            results.push({ hash: entry.hash, valid, expected: expectedHash, tampered: !valid });

            if (!valid) {
                return {
                    chain_valid: false,
                    broken_at: entry.hash,
                    tamper_detected: true,
                    severity: 'BLACK',
                    action: 'IMMEDIATE: Alert GGC + Compliance + Board',
                    verified_entries: results,
                };
            }

            expectedPrevious = entry.hash;
        }

        return { chain_valid: true, total_entries: entries.length, verified_entries: results };
    }

    // ─── Getters ──────────────────────────────────────────────────

    getGGCRules() { return GGC_COMPOSITION; }
    getAntiCollusionRules() { return ANTI_COLLUSION; }
    getDBAccessPolicy() { return DB_ACCESS_CONTROL; }
    getAuditIntegrity() { return AUDIT_INTEGRITY; }

    getFullSafeguards() {
        return {
            title: 'Governance Safeguards — Anti-Collusion & Anti-Centralization',
            version: '1.0',
            vulnerabilities_addressed: [
                { id: 'VULN-1', name: 'GGC Collusion', fix: '40% independent member minimum, single-entity cap 30%, term limits, mandatory recusal' },
                { id: 'VULN-2', name: 'Risk+Compliance Collusion', fix: 'Entity separation check, reporting-line independence, co-approval rotation, high-value observer' },
                { id: 'VULN-3', name: 'Super Admin DB Access', fix: '4-tier DB access, super_admin = read-only, hash-chained audit log, DBA ≠ Super Admin' },
            ],
            ggc: GGC_COMPOSITION,
            anti_collusion: ANTI_COLLUSION,
            db_access: DB_ACCESS_CONTROL,
            audit_integrity: AUDIT_INTEGRITY,
        };
    }
}

module.exports = new GovernanceSafeguardsEngine();
