/**
 * CIE Role Architecture Engine v2.1 — Enterprise Ready
 * Dual-Layer: Platform (TrustChecker) + Company (Tenant)
 * Enterprise SoD — No end-to-end control for any single role
 *
 * Principles:
 *   1. Platform ≠ Business
 *   2. Calculation ≠ Approval
 *   3. Validation ≠ Seal
 *   4. Governance ≠ Operation
 *   5. Admin ≠ Authority
 *   6. Oversight ≠ Override (v2.1)
 *   7. Audit ≠ Approve (v2.1)
 */

// ═══════════════════════════════════════════════════════════════════
// I. ROLE DEFINITIONS — 5 Platform + 12 Company
// ═══════════════════════════════════════════════════════════════════

const PLATFORM_ROLES = {
    platform_super_admin: {
        id: 'platform_super_admin',
        layer: 'platform',
        name: 'Platform Super Admin',
        icon: '🔧',
        description: 'Infrastructure management. Zero business authority.',
        can: [
            'manage_infra', 'tenant_provisioning', 'security_policy',
            'system_config', 'view_system_logs', 'manage_api_keys',
        ],
        cannot: [
            'edit_emission_data', 'approve_cip', 'run_tenant_replay',
            'modify_factor_version', 'seal_passport', 'override_cip',
        ],
        sod_principle: 'Infrastructure only. Cannot touch carbon data.',
    },

    mgb_member: {
        id: 'mgb_member',
        layer: 'platform',
        name: 'Carbon Methodology Governance Board (MGB)',
        icon: '🌍',
        description: 'Proposes, votes, and freezes methodology + emission factors.',
        can: [
            'propose_methodology_version', 'vote_methodology',
            'freeze_emission_factor', 'publish_change_log',
            'review_factor_citations', 'set_effective_date',
        ],
        cannot: [
            'edit_sealed_cip', 'access_tenant_data',
            'modify_individual_passport', 'approve_cip',
        ],
        sod_principle: 'Governs methodology globally. Cannot intervene at tenant level.',
    },

    global_risk_committee: {
        id: 'global_risk_committee',
        layer: 'platform',
        name: 'Global Risk Committee',
        icon: '⚡',
        description: 'Configures risk scoring weights and anomaly thresholds.',
        can: [
            'configure_risk_weights', 'set_anomaly_threshold',
            'review_global_risk_report', 'set_overclaim_alert_pct',
        ],
        cannot: [
            'override_individual_cip', 'modify_emission_data',
            'approve_cip', 'access_tenant_replay',
        ],
        sod_principle: 'Sets risk policy. Cannot override individual assessments.',
    },

    ivu_registry_admin: {
        id: 'ivu_registry_admin',
        layer: 'platform',
        name: 'IVU Registry Admin',
        icon: '🏛️',
        description: 'Manages the validator registry and qualifications.',
        can: [
            'manage_validator_list', 'verify_ivu_qualification',
            'revoke_ivu_registration', 'view_ivu_audit_log',
        ],
        cannot: [
            'approve_cip_on_behalf', 'validate_cip',
            'modify_emission_data', 'access_company_data',
        ],
        sod_principle: 'Manages who can validate. Cannot validate themselves.',
    },

    blockchain_operator: {
        id: 'blockchain_operator',
        layer: 'platform',
        name: 'Blockchain Operator',
        icon: '⛓️',
        description: 'Anchors hashes and manages blockchain nodes.',
        can: [
            'anchor_hash', 'manage_nodes', 'view_anchor_log',
            'verify_chain_integrity', 'manage_worm_storage',
        ],
        cannot: [
            'create_cip', 'approve_cip', 'modify_emission_data',
            'seal_passport', 'access_company_calculations',
        ],
        sod_principle: 'Infrastructure operator. Cannot create or modify carbon data.',
    },
};

const COMPANY_ROLES = {
    carbon_officer: {
        id: 'carbon_officer',
        layer: 'company',
        name: 'Carbon Officer',
        icon: '📊',
        description: 'Operational submitter. Inputs emission data and initiates CIP drafts.',
        can: [
            'submit_emission_data', 'review_calculation',
            'initiate_cip_draft', 'upload_evidence',
            'view_own_passports', 'request_revision',
        ],
        cannot: [
            'approve_cip', 'modify_methodology', 'seal_passport',
            'validate_cip', 'override_risk_score',
        ],
        replay_level: 1, // View only
        sod_principle: 'Submits data. Cannot approve what they submit.',
    },

    scm_analyst: {
        id: 'scm_analyst',
        layer: 'company',
        name: 'SCM Analyst',
        icon: '🔗',
        description: 'Uploads supply chain data and supplier declarations.',
        can: [
            'upload_supply_chain_data', 'submit_supplier_declaration',
            'view_scope3_sources', 'update_logistics_data',
        ],
        cannot: [
            'approve_cip', 'modify_emission_factor',
            'validate_cip', 'seal_passport',
        ],
        replay_level: 1,
        sod_principle: 'Data provider. Cannot influence calculation or approval.',
    },

    emission_engine: {
        id: 'emission_engine',
        layer: 'company',
        name: 'Emission Engine (System)',
        icon: '⚙️',
        description: 'Deterministic calculation. Locked formula. Version-based. Not a human.',
        can: [
            'execute_calculation', 'apply_factor_version',
            'generate_scope_breakdown', 'run_benchmark',
        ],
        cannot: [
            'accept_manual_override', 'skip_validation',
            'modify_own_formula', 'bypass_factor_lock',
        ],
        is_system: true,
        sod_principle: 'Pure computation. No human override possible.',
    },

    internal_reviewer: {
        id: 'internal_reviewer',
        layer: 'company',
        name: 'Internal Reviewer',
        icon: '🔍',
        description: 'Reviews data quality and requests revisions.',
        can: [
            'review_cip_data', 'add_comments',
            'request_revision', 'flag_anomaly',
            'view_calculation_detail',
        ],
        cannot: [
            'seal_passport', 'approve_cip',
            'validate_cip', 'modify_emission_data',
        ],
        replay_level: 1,
        sod_principle: 'Quality gate. Cannot approve or seal.',
    },

    ivu_validator: {
        id: 'ivu_validator',
        layer: 'company',
        name: 'Independent Validation Unit (IVU)',
        icon: '✅',
        description: 'External validator. Issues validation status on CIPs.',
        can: [
            'validate_cip', 'issue_validation_status',
            'request_additional_evidence', 'view_methodology',
            'declare_conflict_of_interest',
        ],
        cannot: [
            'modify_emission_data', 'approve_compliance',
            'seal_passport', 'override_calculation',
        ],
        replay_level: 3, // Full lineage forensic
        sod_principle: 'Validates independently. Cannot modify data or approve compliance.',
    },

    compliance_officer: {
        id: 'compliance_officer',
        layer: 'company',
        name: 'Compliance Officer',
        icon: '⚖️',
        description: 'Final compliance confirmation. Approves CIP for sealing.',
        can: [
            'approve_cip', 'confirm_compliance',
            'review_ivu_report', 'authorize_seal',
            'view_regulatory_mapping',
        ],
        cannot: [
            'modify_calculation', 'override_ivu',
            'submit_emission_data', 'modify_factor',
        ],
        replay_level: 3, // Full lineage forensic
        sod_principle: 'Approves. Cannot modify what they approve.',
    },

    company_risk_committee: {
        id: 'company_risk_committee',
        layer: 'company',
        name: 'Company Risk Committee',
        icon: '🛡️',
        description: 'Runs replay, what-if simulation, and impact analysis.',
        can: [
            'run_replay', 'what_if_simulation',
            'impact_analysis', 'view_risk_report',
            'escalate_to_mgb',
        ],
        cannot: [
            'rewrite_history', 'modify_sealed_cip',
            'approve_cip', 'override_ivu',
        ],
        replay_level: 2, // Impact simulation
        sod_principle: 'Analyzes risk. Cannot rewrite history.',
    },

    export_officer: {
        id: 'export_officer',
        layer: 'company',
        name: 'Export Officer',
        icon: '📤',
        description: 'Exports reports, shares CIPs, generates PDFs.',
        can: [
            'export_report', 'share_cip', 'generate_pdf',
            'view_regulatory_mapping', 'download_audit_trail',
        ],
        cannot: [
            'modify_sealed_cip', 'approve_cip',
            'submit_emission_data', 'validate_cip',
        ],
        replay_level: 1,
        sod_principle: 'Read-only export. Cannot modify anything.',
    },

    // ── CIE v2.1 Enterprise Ready ────────────────────────────────
    board_observer: {
        id: 'board_observer',
        layer: 'company',
        name: 'Board Observer',
        icon: '👁️',
        description: 'Read-only strategic oversight for Board / Audit Committee. Institutional transparency.',
        can: [
            'view_dashboard', 'view_risk_exposure',
            'view_compliance_status', 'view_escalation_history',
            'view_cip_status', 'view_benchmark_percentile',
        ],
        cannot: [
            'trigger_recalculation', 'approve_cip',
            'modify_data', 'validate_cip',
            'seal_passport', 'submit_data',
        ],
        replay_level: 1,
        sod_principle: 'Observes. Cannot influence any operational or approval decision.',
    },

    internal_audit: {
        id: 'internal_audit',
        layer: 'company',
        name: 'Internal Audit',
        icon: '🔎',
        description: 'Full audit trail, SoD violation attempts, change history, replay log. Forensic-grade.',
        can: [
            'view_full_audit_trail', 'view_sod_violations',
            'view_change_history', 'view_replay_log',
            'view_sealed_cip', 'view_approval_flow',
        ],
        cannot: [
            'modify_data', 'approve_cip',
            'validate_cip', 'seal_passport',
            'submit_data', 'override_risk',
        ],
        replay_level: 3, // Full lineage forensic
        sod_principle: 'Monitors everything. Cannot change anything.',
    },

    data_steward: {
        id: 'data_steward',
        layer: 'company',
        name: 'Data Steward',
        icon: '📋',
        description: 'Validates data completeness and metadata quality BEFORE CIP draft. Data governance gate.',
        can: [
            'validate_data_completeness', 'reject_incomplete_submission',
            'manage_metadata_quality', 'review_data_sources',
            'flag_data_quality_issue',
        ],
        cannot: [
            'approve_passport', 'seal_passport',
            'validate_cip', 'modify_methodology',
            'approve_cip',
        ],
        replay_level: 1,
        sod_principle: 'Ensures data quality. Cannot approve or seal.',
    },

    legal_counsel: {
        id: 'legal_counsel',
        layer: 'company',
        name: 'Legal Counsel',
        icon: '⚖️',
        description: 'Views sealed CIP, methodology version, liability mapping. Critical for disclosure and regulatory inquiry.',
        can: [
            'view_sealed_cip', 'view_methodology_version',
            'view_liability_mapping', 'view_responsibility_allocation',
            'view_escalation_log',
        ],
        cannot: [
            'modify_data', 'approve_cip',
            'validate_cip', 'seal_passport',
            'submit_data', 'override_calculation',
        ],
        replay_level: 1,
        sod_principle: 'Legal review. Cannot modify or approve operational decisions.',
    },
};

// ═══════════════════════════════════════════════════════════════════
// II. SEPARATION OF DUTIES MATRIX
// ═══════════════════════════════════════════════════════════════════

const SOD_MATRIX = {
    actions: ['Submit Data', 'Validate Data', 'Calculate', 'Review', 'Validate (IVU)', 'Approve', 'Seal', 'Anchor', 'Audit', 'Observe'],
    roles: {
        carbon_officer: ['✅', '—', '—', '—', '❌', '❌', '❌', '❌', '—', '—'],
        scm_analyst: ['✅', '—', '—', '—', '❌', '❌', '❌', '❌', '—', '—'],
        data_steward: ['—', '✅', '—', '—', '❌', '❌', '❌', '❌', '—', '—'],
        emission_engine: ['—', '—', '⚙️', '—', '—', '—', '—', '—', '—', '—'],
        internal_reviewer: ['❌', '—', '—', '✅', '❌', '❌', '❌', '❌', '—', '—'],
        ivu_validator: ['❌', '❌', '❌', '—', '✅', '❌', '❌', '❌', '—', '—'],
        compliance_officer: ['❌', '❌', '❌', '—', '❌', '✅', '❌', '❌', '—', '—'],
        internal_audit: ['❌', '❌', '❌', '❌', '❌', '❌', '❌', '❌', '✅', '—'],
        board_observer: ['❌', '❌', '❌', '❌', '❌', '❌', '❌', '❌', '—', '✅'],
        legal_counsel: ['❌', '❌', '❌', '❌', '❌', '❌', '❌', '❌', '—', '✅'],
        blockchain_operator: ['❌', '❌', '❌', '❌', '❌', '❌', '❌', '✅', '—', '—'],
    },
    note: 'Seal is automated after all gates pass. No single human can seal. Data Steward validates BEFORE calculation.',
};

// ═══════════════════════════════════════════════════════════════════
// III. CIP LIFECYCLE — Role Gates
// ═══════════════════════════════════════════════════════════════════

const CIP_LIFECYCLE = [
    { stage: 'draft', action: 'Submit emission data', required_role: 'carbon_officer', gate: 'Data completeness check' },
    { stage: 'calculated', action: 'Deterministic calculation', required_role: 'emission_engine', gate: 'Factor version lock' },
    { stage: 'reviewed', action: 'Internal review', required_role: 'internal_reviewer', gate: 'Data quality check' },
    { stage: 'validated', action: 'Independent validation', required_role: 'ivu_validator', gate: 'IVU conflict-of-interest cleared' },
    { stage: 'approved', action: 'Compliance approval', required_role: 'compliance_officer', gate: 'IVU validation passed' },
    { stage: 'sealed', action: 'System seal (auto)', required_role: 'emission_engine', gate: 'All gates passed + risk < threshold' },
    { stage: 'anchored', action: 'Blockchain anchor', required_role: 'blockchain_operator', gate: 'CIP sealed' },
];

// ═══════════════════════════════════════════════════════════════════
// IV. REPLAY ACCESS CONTROL
// ═══════════════════════════════════════════════════════════════════

const REPLAY_ACCESS_LEVELS = [
    { level: 1, name: 'View Only', roles: ['carbon_officer', 'scm_analyst', 'internal_reviewer', 'export_officer', 'board_observer', 'data_steward', 'legal_counsel'], description: 'Read historical CIP data. No simulation.' },
    { level: 2, name: 'Impact Simulation', roles: ['company_risk_committee'], description: 'What-if analysis on methodology changes. No data modification.' },
    { level: 3, name: 'Full Lineage Forensic', roles: ['ivu_validator', 'compliance_officer', 'internal_audit'], description: 'Full reconstruction from snapshot capsule. Audit-grade access.' },
];

// ═══════════════════════════════════════════════════════════════════
// V. METHODOLOGY CHANGE CONTROL
// ═══════════════════════════════════════════════════════════════════

const METHODOLOGY_CHANGE_FLOW = [
    { step: 1, action: 'Propose', actor: 'MGB Member', requires: 'Written proposal with impact analysis' },
    { step: 2, action: 'Board Vote', actor: 'MGB Full Board', requires: '≥75% approval (no conflicts)' },
    { step: 3, action: 'Factor Freeze', actor: 'MGB + System', requires: 'Hash lock on factor set' },
    { step: 4, action: 'Publish', actor: 'MGB', requires: 'Change bulletin with effective date' },
    { step: 5, action: 'Tenant Adopt', actor: 'Company Admin', requires: 'Select version (cannot edit content)' },
];

// ═══════════════════════════════════════════════════════════════════
// VI. ESCALATION HIERARCHY
// ═══════════════════════════════════════════════════════════════════

const ESCALATION_CHAIN = [
    { trigger: 'Anomaly detected', escalates_from: 'carbon_officer', escalates_to: 'internal_reviewer' },
    { trigger: 'Review flags high risk', escalates_from: 'internal_reviewer', escalates_to: 'ivu_validator' },
    { trigger: 'IVU validation concern', escalates_from: 'ivu_validator', escalates_to: 'compliance_officer' },
    { trigger: 'Compliance escalation', escalates_from: 'compliance_officer', escalates_to: 'company_risk_committee' },
    { trigger: 'Risk exceeds threshold', escalates_from: 'company_risk_committee', escalates_to: 'global_risk_committee' },
];

// ═══════════════════════════════════════════════════════════════════
// VII. ACCESS PRINCIPLES
// ═══════════════════════════════════════════════════════════════════

const ACCESS_PRINCIPLES = [
    { id: 'AP-01', name: 'Least Privilege', description: 'Each role has minimum permissions needed.' },
    { id: 'AP-02', name: 'Zero Override', description: 'No role can bypass another role\'s gate.' },
    { id: 'AP-03', name: 'Version Lock', description: 'Methodology and factors are immutable once frozen.' },
    { id: 'AP-04', name: 'No Silent Admin Edit', description: 'All changes logged with actor + timestamp.' },
    { id: 'AP-05', name: 'No Emergency Backdoor', description: 'Emergency access requires logged multi-signature.' },
    { id: 'AP-06', name: 'Platform ≠ Business', description: 'Platform roles cannot modify business data.' },
    { id: 'AP-07', name: 'Calculation ≠ Approval', description: 'Calculation is deterministic. Approval is human.' },
    { id: 'AP-08', name: 'Validation ≠ Seal', description: 'IVU validates. System seals after all gates pass.' },
];

// ═══════════════════════════════════════════════════════════════════
// VIII. LIABILITY CONTAINMENT
// ═══════════════════════════════════════════════════════════════════

const LIABILITY_MATRIX = {
    trustchecker_responsible_for: [
        'Process integrity',
        'Governance enforcement',
        'Audit log preservation',
        'SoD enforcement',
        'Blockchain anchor integrity',
    ],
    trustchecker_NOT_responsible_for: [
        'Scientific accuracy of emission factors',
        'Company input data quality',
        'IVU validation correctness',
        'Compliance decision accuracy',
        'Regulatory interpretation',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// IX. EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function getAllRoles() {
    return { platform: PLATFORM_ROLES, company: COMPANY_ROLES };
}

function getRoleById(roleId) {
    return PLATFORM_ROLES[roleId] || COMPANY_ROLES[roleId] || null;
}

function getSoDMatrix() {
    return SOD_MATRIX;
}

function getCipLifecycle() {
    return CIP_LIFECYCLE;
}

function getReplayAccessLevels() {
    return REPLAY_ACCESS_LEVELS;
}

function getEscalationChain() {
    return ESCALATION_CHAIN;
}

function getMethodologyChangeFlow() {
    return METHODOLOGY_CHANGE_FLOW;
}

function getAccessPrinciples() {
    return ACCESS_PRINCIPLES;
}

function getLiabilityMatrix() {
    return LIABILITY_MATRIX;
}

/**
 * Check if a role can perform an action
 */
function canPerform(roleId, action) {
    const role = getRoleById(roleId);
    if (!role) return false;
    return role.can.includes(action);
}

/**
 * Check if an action is blocked for a role
 */
function isBlocked(roleId, action) {
    const role = getRoleById(roleId);
    if (!role) return true;
    return role.cannot.includes(action);
}

/**
 * Get replay access level for a role
 */
function getReplayLevel(roleId) {
    const role = getRoleById(roleId);
    if (!role || role.layer === 'platform') return 0;
    return role.replay_level || 0;
}

/**
 * Validate CIP stage transition
 */
function validateTransition(currentStage, targetStage, roleId) {
    const currentIdx = CIP_LIFECYCLE.findIndex(s => s.stage === currentStage);
    const targetIdx = CIP_LIFECYCLE.findIndex(s => s.stage === targetStage);
    if (currentIdx === -1 || targetIdx === -1) return { allowed: false, reason: 'Invalid stage' };
    if (targetIdx !== currentIdx + 1) return { allowed: false, reason: 'Must follow sequential lifecycle' };
    const target = CIP_LIFECYCLE[targetIdx];
    if (target.required_role !== roleId) {
        return { allowed: false, reason: `Stage "${targetStage}" requires role "${target.required_role}", got "${roleId}"` };
    }
    return { allowed: true, stage: targetStage, gate: target.gate };
}

module.exports = {
    PLATFORM_ROLES,
    COMPANY_ROLES,
    SOD_MATRIX,
    CIP_LIFECYCLE,
    REPLAY_ACCESS_LEVELS,
    ESCALATION_CHAIN,
    METHODOLOGY_CHANGE_FLOW,
    ACCESS_PRINCIPLES,
    LIABILITY_MATRIX,
    getAllRoles,
    getRoleById,
    getSoDMatrix,
    getCipLifecycle,
    getReplayAccessLevels,
    getEscalationChain,
    getMethodologyChangeFlow,
    getAccessPrinciples,
    getLiabilityMatrix,
    canPerform,
    isBlocked,
    getReplayLevel,
    validateTransition,
};
