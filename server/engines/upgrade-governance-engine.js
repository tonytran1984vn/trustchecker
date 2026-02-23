/**
 * TrustChecker — Upgrade Governance Engine v1.0
 * Change Advisory Board (CAB) process for infrastructure changes.
 * 
 * When you change: schema, trust weights, anchor logic, minting logic,
 * kill-switch thresholds — who approves? What quorum? Can you rollback?
 * 
 * Infrastructure cannot "move fast and break things".
 */

// ═══════════════════════════════════════════════════════════════════
// 1. CHANGE CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════

const CHANGE_CLASSIFICATION = {
    title: 'Change Classification — What Type of Change, What Process',

    types: [
        {
            class: 'Class A — Constitutional',
            description: 'Changes to separation rules, kill-switch thresholds, constitutional floors, RBAC core',
            examples: ['Changing validator reward floor from 15%', 'Modifying separation rules', 'Changing KS-05 CAR threshold from 6%'],
            approval: 'Charter amendment process (65-day standard OR 48h emergency)',
            quorum: '75% GGC supermajority',
            rollback: 'Only via reverse charter amendment (same 65-day process)',
            testing: 'Staging environment + 30-day observation before production',
            veto: 'IVU veto (scoring), Validator veto (staking), Regulatory hearing required',
        },
        {
            class: 'Class B — Risk-Impacting',
            description: 'Changes to trust scoring model weights, settlement parameters, capital thresholds',
            examples: ['Updating trust score model weights', 'Changing settlement netting window', 'Adjusting counterparty exposure limits', 'Modifying circuit breaker thresholds'],
            approval: 'Risk Committee approval + CTO sign-off',
            quorum: 'Risk Committee majority (3 of 5 minimum)',
            rollback: 'Immediate rollback capability required. Pre-change snapshot mandatory.',
            testing: 'Shadow mode (parallel run) for minimum 14 days before activation',
            veto: 'IVU veto for scoring changes only',
        },
        {
            class: 'Class C — Structural',
            description: 'Database schema changes, API breaking changes, inter-entity contract changes',
            examples: ['Adding/removing database tables', 'Changing API response formats', 'Modifying blockchain anchoring logic', 'Entity restructuring'],
            approval: 'CTO + Engineering Lead + Risk Committee notification',
            quorum: 'CTO discretion (but Risk must be notified)',
            rollback: 'Database migration must be reversible. API versioning (old version supported 90 days).',
            testing: 'Full regression test + staging deployment + 7-day soak test',
            backward_compatibility: 'REQUIRED for minimum 90 days. Old clients must continue working.',
        },
        {
            class: 'Class D — Operational',
            description: 'Bug fixes, performance improvements, UI changes, documentation updates',
            examples: ['Fixing calculation bug', 'Improving query performance', 'Updating UI text', 'Adding monitoring dashboards'],
            approval: 'Engineering Lead (or CTO for critical path)',
            quorum: 'N/A — standard engineering process',
            rollback: 'Standard deployment rollback via CI/CD',
            testing: 'Unit tests + integration tests + automated deployment',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. CHANGE ADVISORY BOARD (CAB) PROCESS
// ═══════════════════════════════════════════════════════════════════

const CAB_PROCESS = {
    title: 'Change Advisory Board — Formal Change Management',

    composition: {
        permanent: ['CTO (Chair)', 'Risk Committee representative', 'Compliance Officer'],
        invited: ['Engineering Lead (for technical changes)', 'CFO (for financial impact changes)', 'GGC representative (for Class A changes)'],
        quorum: '3 permanent members present',
    },

    meeting_schedule: {
        regular: 'Weekly (30 minutes) — review pending Class B/C changes',
        emergency: 'On-demand for production incidents or Class A proposals',
        annual: 'Annual CAB retrospective — process improvement',
    },

    process: [
        { step: 1, name: 'Change Request (CR)', who: 'Any engineer/role', what: 'Submit CR with: description, classification, impact assessment, rollback plan, test results' },
        { step: 2, name: 'Classification Review', who: 'CTO', what: 'Classify change (A/B/C/D). Route to appropriate approval path.' },
        { step: 3, name: 'Impact Assessment', who: 'Risk + Compliance', what: 'Assess: capital impact, regulatory impact, tenant impact, security impact' },
        { step: 4, name: 'CAB Review', who: 'CAB', what: 'For Class B/C: review, discuss, approve/reject/defer. Record decision.' },
        { step: 5, name: 'Testing Gate', who: 'Engineering', what: 'All required testing completed per classification. Results documented.' },
        { step: 6, name: 'Deployment Window', who: 'Engineering + CTO', what: 'Deploy in designated window. Monitor for 4h post-deployment.' },
        { step: 7, name: 'Post-Deployment Review', who: 'CAB', what: 'Verify change successful. Update documentation. Close CR.' },
    ],

    change_freeze: {
        periods: ['48h before and after quarterly financial close', '7 days before external audit', 'During active kill-switch event', 'During operational drill'],
        exception: 'Only Class D (critical bug fix) during freeze — requires CTO + Risk approval',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 3. ROLLBACK POLICY
// ═══════════════════════════════════════════════════════════════════

const ROLLBACK = {
    title: 'Rollback Policy — Every Change Must Be Reversible',

    requirements: {
        database_migrations: {
            rule: 'Every UP migration must have a corresponding DOWN migration',
            testing: 'Rollback tested in staging before production deployment',
            data_protection: 'Rollback must not cause data loss. If destructive migration → requires Class B approval.',
        },
        api_changes: {
            rule: 'API versioning mandatory. Old version supported for 90 days minimum.',
            deprecation: '30-day notice before old version sunset. Client notification required.',
        },
        model_weight_changes: {
            rule: 'Pre-change weights saved. Rollback = restore previous weights + recalculate affected scores.',
            shadow_mode: 'New weights run in shadow mode (parallel) for 14 days. Comparison report generated.',
        },
        configuration_changes: {
            rule: 'All configurations versioned in Git. Rollback = deploy previous commit.',
            automation: 'Automated rollback trigger: if error rate > 5% post-deployment → auto-rollback.',
        },
    },

    rollback_sla: {
        class_a: 'Reverse charter amendment (65 days — same process)',
        class_b: '< 1 hour (prepared rollback)',
        class_c: '< 4 hours (database migration reversal)',
        class_d: '< 15 minutes (CI/CD redeploy)',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 4. VERSION GOVERNANCE
// ═══════════════════════════════════════════════════════════════════

const VERSION_GOVERNANCE = {
    title: 'Version Governance — What Version is Running and Who Approved It',

    versioning: {
        scheme: 'Semantic versioning: MAJOR.MINOR.PATCH',
        major: 'Class A/B changes (breaking or risk-impacting). Requires CAB approval.',
        minor: 'Class C changes (new features, schema changes). Requires CTO approval.',
        patch: 'Class D changes (bug fixes, performance). Standard engineering process.',
    },

    audit_requirements: {
        every_deployment: ['Version number', 'Deployer identity', 'CR reference', 'Approval chain', 'Test results', 'Rollback plan'],
        stored: 'Deployment log in hash-chained audit trail (tamper-evident)',
        retention: '7 years (regulatory minimum)',
    },

    current: {
        version: '9.4.1',
        engines: 85,
        routes: 72,
        last_major: 'v9.0 — Integration Locking Layer + Constitutional RBAC',
        last_minor: 'v9.4 — Infrastructure-Grade Architecture (entity structuring, crypto governance)',
        last_patch: 'v9.4.1 — Remaining gap engines (data ownership, metrics, upgrade governance)',
    },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class UpgradeGovernanceEngine {
    getClassification() { return CHANGE_CLASSIFICATION; }
    getCABProcess() { return CAB_PROCESS; }
    getRollback() { return ROLLBACK; }
    getVersionGovernance() { return VERSION_GOVERNANCE; }

    classifyChange(description, impacts_scoring, impacts_settlement, impacts_schema, impacts_constitution) {
        if (impacts_constitution) return { class: 'A', approval: '75% GGC supermajority', timeline: '65 days', change: description };
        if (impacts_scoring || impacts_settlement) return { class: 'B', approval: 'Risk Committee + CTO', timeline: '14-day shadow + CAB', change: description };
        if (impacts_schema) return { class: 'C', approval: 'CTO + Engineering Lead', timeline: '7-day soak test', change: description };
        return { class: 'D', approval: 'Engineering Lead', timeline: 'Standard CI/CD', change: description };
    }

    getFullFramework() {
        return { title: 'Upgrade Governance — Infrastructure Change Management', version: '1.0', classification: CHANGE_CLASSIFICATION, cab: CAB_PROCESS, rollback: ROLLBACK, versioning: VERSION_GOVERNANCE };
    }
}

module.exports = new UpgradeGovernanceEngine();
