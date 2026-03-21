/**
 * Carbon Integrity Governance Engine v3.0 — Institutional Grade
 * 4-Layer Architecture: L1 Infrastructure → L2 Federation → L3 Org → L4 Capital Market
 *
 * Designed for:
 *   - Regulatory defensibility (EU CSRD / ESRS / SEC climate)
 *   - Capital market credibility
 *   - Litigation resilience
 *   - Independence integrity
 *   - No single point of override
 *
 * Control Principles:
 *   1. Platform ≠ Business (L1 cannot touch L3 data)
 *   2. Calculation ≠ Approval (deterministic vs human)
 *   3. Validation ≠ Seal (IVU validates independently)
 *   4. Governance ≠ Operation (oversight vs execution)
 *   5. Admin ≠ Authority (IAM vs business decision)
 *   6. Oversight ≠ Override (observe, not rewrite)
 *   7. Audit ≠ Approve (monitor, not decide)
 *   8. Federation ≠ Org (L2 independence from L3)
 *   9. Disclosure ≠ Modification (sign-off ≠ edit)
 *
 * Authority Boundary Rule:
 *   No single layer has full-stack control.
 *   No single actor can Submit + Validate + Approve + Seal.
 */

// ═══════════════════════════════════════════════════════════════════
// I. L1 — PLATFORM INFRASTRUCTURE LAYER (TrustChecker-controlled)
//    7 roles. Zero business authority. Infra, security, thresholds only.
// ═══════════════════════════════════════════════════════════════════

const L1_INFRASTRUCTURE = {
    platform_super_admin: {
        id: 'platform_super_admin',
        layer: 'L1',
        name: 'Platform Super Admin',
        icon: '🔧',
        description: 'Infrastructure management. Zero business authority.',
        can: [
            'manage_infra', 'org_provisioning', 'security_policy',
            'system_config', 'view_system_logs', 'manage_api_keys',
        ],
        cannot: [
            'edit_emission_data', 'approve_cip', 'run_org_replay',
            'modify_factor_version', 'seal_passport', 'override_cip',
            'read_org_cip_detail',
        ],
        sod_principle: 'Infrastructure only. Cannot touch carbon data.',
    },

    platform_security: {
        id: 'platform_security',
        layer: 'L1',
        name: 'Platform Security Officer',
        icon: '🔐',
        description: 'Key rotation, incident monitor, privileged access logging. SOC 2 control.',
        can: [
            'rotate_keys', 'monitor_privileged_access',
            'view_security_logs', 'manage_mfa_policy',
        ],
        cannot: [
            'edit_emission_data', 'approve_cip', 'access_org_data',
            'modify_methodology',
        ],
        sod_principle: 'Security perimeter. Cannot access business data.',
    },

    data_gov_officer: {
        id: 'data_gov_officer',
        layer: 'L1',
        name: 'Data Governance Officer',
        icon: '📋',
        description: 'Data classification, retention, GDPR masking, cross-border transfer.',
        can: [
            'classify_data', 'set_retention_policy',
            'manage_gdpr_masking', 'manage_cross_border_rules',
        ],
        cannot: [
            'edit_emission_data', 'approve_cip', 'access_org_calculations',
            'validate_cip',
        ],
        sod_principle: 'Data boundary governance. Cannot alter carbon claims.',
    },

    global_risk_committee: {
        id: 'global_risk_committee',
        layer: 'L1',
        name: 'Global Risk Committee',
        icon: '⚡',
        description: 'Configures risk scoring weights and anomaly thresholds ONLY. Cannot override individual org CIP.',
        can: [
            'configure_risk_weights', 'set_anomaly_threshold',
            'review_global_risk_report', 'set_overclaim_alert_pct',
        ],
        cannot: [
            'override_individual_cip', 'modify_emission_data',
            'approve_cip', 'access_org_replay',
        ],
        sod_principle: 'Threshold policy only. Cannot override individual assessments.',
    },

    emission_engine: {
        id: 'emission_engine',
        layer: 'L1',
        name: 'Emission Engine [SYSTEM]',
        icon: '⚙️',
        description: 'Non-human. Deterministic calculation. Locked formula. Version-based. No manual override.',
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

    change_management_officer: {
        id: 'change_management_officer',
        layer: 'L1',
        name: 'Change Management Officer',
        icon: '📦',
        description: 'Approves system upgrades, tracks change requests, freezes deployment windows. ISO 27001 / SOC 2.',
        can: [
            'approve_system_upgrade', 'track_change_request',
            'freeze_deployment_window', 'view_release_notes',
        ],
        cannot: [
            'access_org_data', 'modify_emission_data',
            'approve_cip', 'modify_methodology',
        ],
        sod_principle: 'Manages system changes. Cannot touch business data.',
    },

    incident_response_lead: {
        id: 'incident_response_lead',
        layer: 'L1',
        name: 'Incident Response Lead',
        icon: '🚨',
        description: 'Activates incident protocol, freezes anchor process, triggers forensic logging.',
        can: [
            'activate_incident_protocol', 'freeze_anchor_process',
            'trigger_forensic_logging', 'view_system_logs',
        ],
        cannot: [
            'edit_emission_data', 'approve_cip',
            'modify_sealed_cip', 'access_business_data',
        ],
        sod_principle: 'Emergency response. Cannot edit data or approvals.',
    },
};

// ═══════════════════════════════════════════════════════════════════
// II. L2 — FEDERATION & INDEPENDENT VALIDATION LAYER
//     4 roles. Externalized authority. NOT org-controlled.
//     Validation must be federated, not org-controlled.
// ═══════════════════════════════════════════════════════════════════

const L2_FEDERATION = {
    ivu_validator: {
        id: 'ivu_validator',
        layer: 'L2',
        name: 'Independent Validation Unit (IVU)',
        icon: '✅',
        description: 'External validator. Issues validation status on CIPs. NOT a org employee. Federated.',
        can: [
            'validate_cip', 'issue_validation_status',
            'request_additional_evidence', 'view_methodology',
            'declare_conflict_of_interest',
        ],
        cannot: [
            'modify_emission_data', 'approve_compliance',
            'seal_passport', 'override_calculation',
            'be_created_by_org', 'be_deleted_by_org',
        ],
        replay_level: 3,
        federated: true,
        independence_rule: 'Validator does not belong to org IAM. Org cannot create or delete IVU.',
        sod_principle: 'Validates independently. Cannot modify data or approve compliance.',
    },

    ivu_registry_admin: {
        id: 'ivu_registry_admin',
        layer: 'L2',
        name: 'IVU Registry Admin',
        icon: '🏛️',
        description: 'Manages the validator registry and qualifications. Platform-level registry.',
        can: [
            'manage_validator_list', 'verify_ivu_qualification',
            'revoke_ivu_registration', 'view_ivu_audit_log',
        ],
        cannot: [
            'approve_cip_on_behalf', 'validate_cip',
            'modify_emission_data', 'access_company_data',
        ],
        federated: true,
        sod_principle: 'Manages who can validate. Cannot validate themselves.',
    },

    mgb_member: {
        id: 'mgb_member',
        layer: 'L2',
        name: 'Carbon Methodology Governance Board (MGB)',
        icon: '🌍',
        description: 'Federated. Proposes, votes, and freezes methodology + emission factors. NOT a org employee.',
        can: [
            'propose_methodology_version', 'vote_methodology',
            'freeze_emission_factor', 'publish_change_log',
            'review_factor_citations', 'set_effective_date',
        ],
        cannot: [
            'edit_sealed_cip', 'access_org_data',
            'modify_individual_passport', 'approve_cip',
        ],
        federated: true,
        sod_principle: 'Governs methodology globally. Cannot intervene at org level.',
    },

    blockchain_operator: {
        id: 'blockchain_operator',
        layer: 'L2',
        name: 'Blockchain Anchor Authority',
        icon: '⛓️',
        description: 'Anchors hashes and manages blockchain nodes. Federated for maximum trust.',
        can: [
            'anchor_hash', 'manage_nodes', 'view_anchor_log',
            'verify_chain_integrity', 'manage_worm_storage',
        ],
        cannot: [
            'create_cip', 'approve_cip', 'modify_emission_data',
            'seal_passport', 'access_company_calculations',
        ],
        federated: true,
        sod_principle: 'Anchor authority. Cannot create or modify carbon data.',
    },
};

// ═══════════════════════════════════════════════════════════════════
// III. L3 — ORG GOVERNANCE LAYER (Company-controlled)
//      15 roles. Operational chain + Governance/Oversight chain.
//      Full SoD enforced within this layer.
// ═══════════════════════════════════════════════════════════════════

const L3_ORG = {
    // ── A. Operational Chain ─────────────────────────────────────────
    carbon_officer: {
        id: 'carbon_officer',
        layer: 'L3',
        chain: 'operational',
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
        replay_level: 1,
        sod_principle: 'Submits data. Cannot approve what they submit.',
    },

    scm_analyst: {
        id: 'scm_analyst',
        layer: 'L3',
        chain: 'operational',
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

    data_steward: {
        id: 'data_steward',
        layer: 'L3',
        chain: 'operational',
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

    internal_reviewer: {
        id: 'internal_reviewer',
        layer: 'L3',
        chain: 'operational',
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

    compliance_officer: {
        id: 'compliance_officer',
        layer: 'L3',
        chain: 'operational',
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
        replay_level: 3,
        sod_principle: 'Approves. Cannot modify what they approve.',
    },

    export_officer: {
        id: 'export_officer',
        layer: 'L3',
        chain: 'operational',
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

    supplier_contributor: {
        id: 'supplier_contributor',
        layer: 'L3',
        chain: 'operational',
        name: 'Supplier Contributor',
        icon: '🏭',
        description: 'Scoped external input. Submits own supplier emission declaration. Org-isolated.',
        can: [
            'submit_supplier_emission', 'upload_supporting_docs',
        ],
        cannot: [
            'view_full_cip', 'approve_cip', 'view_system_benchmark',
            'validate_cip', 'seal_passport', 'modify_data',
            'view_other_suppliers',
        ],
        replay_level: 0,
        sod_principle: 'Scoped input only. Cannot see anything beyond own submission.',
    },

    // ── B. Governance & Oversight Chain ──────────────────────────────
    executive: {
        id: 'executive',
        layer: 'L3',
        chain: 'oversight',
        name: 'CEO / Executive',
        icon: '👔',
        description: 'View-only oversight + escalation only. Cannot edit data or approve CIP.',
        can: [
            'view_dashboard', 'view_risk_exposure',
            'view_compliance_status', 'escalate_to_board',
        ],
        cannot: [
            'edit_emission_data', 'approve_cip',
            'modify_methodology', 'seal_passport',
            'validate_cip',
        ],
        replay_level: 1,
        sod_principle: 'Strategic oversight. Cannot override operational decisions.',
    },

    company_risk_committee: {
        id: 'company_risk_committee',
        layer: 'L3',
        chain: 'oversight',
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
        replay_level: 2,
        sod_principle: 'Analyzes risk. Cannot rewrite history.',
    },

    ggc_member: {
        id: 'ggc_member',
        layer: 'L3',
        chain: 'oversight',
        name: 'Green Governance Council',
        icon: '🌿',
        description: 'Policy oversight and green governance committee.',
        can: [
            'view_governance_dashboard', 'review_policy',
            'recommend_changes',
        ],
        cannot: [
            'approve_cip', 'modify_data',
            'validate_cip', 'seal_passport',
        ],
        replay_level: 1,
        sod_principle: 'Policy advisory. Cannot execute operational decisions.',
    },

    board_observer: {
        id: 'board_observer',
        layer: 'L3',
        chain: 'oversight',
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
        layer: 'L3',
        chain: 'oversight',
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
        replay_level: 3,
        sod_principle: 'Monitors everything. Cannot change anything.',
    },

    legal_counsel: {
        id: 'legal_counsel',
        layer: 'L3',
        chain: 'oversight',
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

    esg_reporting_manager: {
        id: 'esg_reporting_manager',
        layer: 'L3',
        chain: 'oversight',
        name: 'ESG Reporting Manager',
        icon: '📈',
        description: 'Generates consolidated ESG reports, portfolio carbon reports, investor disclosures.',
        can: [
            'generate_esg_report', 'portfolio_carbon_report',
            'prepare_investor_disclosure', 'view_benchmark_data',
            'export_esg_pdf',
        ],
        cannot: [
            'modify_sealed_cip', 'approve_cip',
            'submit_emission_data', 'validate_cip',
            'modify_methodology',
        ],
        replay_level: 1,
        sod_principle: 'Reports on data. Cannot modify underlying CIPs.',
    },

    // ── C. Disclosure (CSRD/ESRS Required) ──────────────────────────
    disclosure_officer: {
        id: 'disclosure_officer',
        layer: 'L3',
        chain: 'disclosure',
        name: 'Disclosure Officer',
        icon: '📜',
        description: 'Final sign-off on public carbon statement. Links CIP to annual report. Certifies CSRD/ESRS alignment. Carries personal liability.',
        can: [
            'sign_off_disclosure', 'link_cip_to_annual_report',
            'certify_csrd_alignment', 'view_sealed_cip',
            'view_liability_mapping',
        ],
        cannot: [
            'modify_emission_data', 'recalculate_cip',
            'approve_cip', 'validate_cip',
            'seal_passport', 'override_methodology',
        ],
        replay_level: 1,
        carries_liability: true,
        sod_principle: 'Signs disclosure. Cannot modify data or calculation. Personally liable.',
    },
};

// ═══════════════════════════════════════════════════════════════════
// IV. L4 — PUBLIC & CAPITAL MARKET LAYER
//     3 roles. Read-only. Snapshot-based. Immutable view.
// ═══════════════════════════════════════════════════════════════════

const L4_CAPITAL_MARKET = {
    external_auditor: {
        id: 'external_auditor',
        layer: 'L4',
        name: 'External Auditor',
        icon: '🔏',
        description: 'Time-bound, logged, auto-revoked. Read-only snapshot + sandbox replay for EU/regulatory audit.',
        can: [
            'read_snapshot_capsule', 'verify_hash',
            'view_approval_flow', 'sandbox_replay',
            'view_audit_trail',
        ],
        cannot: [
            'modify_data', 'approve_cip',
            'submit_data', 'seal_passport',
            'validate_cip', 'access_live_data',
        ],
        replay_level: 2,
        time_bound: true,
        sod_principle: 'Read-only audit. Time-limited. Cannot modify anything.',
    },

    financial_viewer: {
        id: 'financial_viewer',
        layer: 'L4',
        name: 'Financial Institution Viewer',
        icon: '🏦',
        description: 'Bank/fund/trade finance. Scoped, NDA-bound. Carbon Integrity Score + selected CIP.',
        can: [
            'view_carbon_integrity_score', 'view_selected_cip',
            'verify_hash',
        ],
        cannot: [
            'view_supplier_confidential', 'modify_data',
            'approve_cip', 'validate_cip',
            'submit_data', 'access_internal_governance',
        ],
        replay_level: 1,
        sod_principle: 'Reads scoped carbon data. Cannot see supplier details or internal governance.',
    },

    public_verifier: {
        id: 'public_verifier',
        layer: 'L4',
        name: 'Public Verification',
        icon: '🔍',
        description: 'Buyer/marketplace. Verify CIP via QR, check hash, confirm seal status.',
        can: [
            'verify_cip_qr', 'check_hash',
            'confirm_seal_status',
        ],
        cannot: [
            'view_internal_governance', 'view_supplier_data',
            'modify_data', 'approve_cip',
            'validate_cip', 'submit_data',
        ],
        replay_level: 0,
        sod_principle: 'Public verification only. Cannot see internal structures.',
    },
};

// ═══════════════════════════════════════════════════════════════════
// V. 4-LAYER AUTHORITY MATRIX
// ═══════════════════════════════════════════════════════════════════

const AUTHORITY_MATRIX = {
    actions: [
        'Modify emission formula',
        'Submit data',
        'Validate CIP (IVU)',
        'Approve CIP',
        'Seal / Anchor',
        'Change methodology',
        'Export report',
        'Public verify',
        'Sign disclosure',
    ],
    layers: {
        L1: ['✔', '✖', '✖', '✖', '✖', 'Threshold', '✖', '✖', '✖'],
        L2: ['✖', '✖', '✔', '✖', 'Anchor', '✔', '✖', '✖', '✖'],
        L3: ['✖', '✔', '✖', '✔', '✖', '✖', '✔', '✖', '✔'],
        L4: ['✖', '✖', '✖', '✖', '✖', '✖', '✖', '✔', '✖'],
    },
    rule: 'No single layer has full-stack control. Cross-layer SoD enforced.',
};

// ═══════════════════════════════════════════════════════════════════
// VI. SEPARATION OF DUTIES MATRIX (Role-Level)
// ═══════════════════════════════════════════════════════════════════

const SOD_MATRIX = {
    actions: ['Submit', 'Pre-validate', 'Calculate', 'Review', 'Validate (IVU)', 'Approve', 'Seal', 'Anchor', 'Audit', 'Disclose', 'Observe'],
    roles: {
        // L3 Operational
        carbon_officer:     ['✅', '—', '—', '—', '❌', '❌', '❌', '❌', '—', '—', '—'],
        scm_analyst:        ['✅', '—', '—', '—', '❌', '❌', '❌', '❌', '—', '—', '—'],
        data_steward:       ['—', '✅', '—', '—', '❌', '❌', '❌', '❌', '—', '—', '—'],
        // L1 System
        emission_engine:    ['—', '—', '⚙️', '—', '—', '—', '—', '—', '—', '—', '—'],
        // L3 Operational
        internal_reviewer:  ['❌', '—', '—', '✅', '❌', '❌', '❌', '❌', '—', '—', '—'],
        // L2 Federation
        ivu_validator:      ['❌', '❌', '❌', '—', '✅', '❌', '❌', '❌', '—', '—', '—'],
        // L3 Operational
        compliance_officer: ['❌', '❌', '❌', '—', '❌', '✅', '❌', '❌', '—', '—', '—'],
        // L2 Federation
        blockchain_operator:['❌', '❌', '❌', '❌', '❌', '❌', '❌', '✅', '—', '—', '—'],
        // L3 Oversight
        internal_audit:     ['❌', '❌', '❌', '❌', '❌', '❌', '❌', '❌', '✅', '—', '—'],
        disclosure_officer: ['❌', '❌', '❌', '❌', '❌', '❌', '❌', '❌', '—', '✅', '—'],
        board_observer:     ['❌', '❌', '❌', '❌', '❌', '❌', '❌', '❌', '—', '—', '✅'],
        legal_counsel:      ['❌', '❌', '❌', '❌', '❌', '❌', '❌', '❌', '—', '—', '✅'],
    },
    note: 'Seal is automated after all gates pass. No single human can seal. Validation is federated (L2). Disclosure is separate from approval.',
};

// ═══════════════════════════════════════════════════════════════════
// VII. CIP LIFECYCLE — Role Gates (Cross-Layer)
// ═══════════════════════════════════════════════════════════════════

const CIP_LIFECYCLE = [
    { stage: 'ingested', action: 'Upload supply chain data', required_role: 'scm_analyst', layer: 'L3', gate: 'Data format validation' },
    { stage: 'draft', action: 'Submit emission data', required_role: 'carbon_officer', layer: 'L3', gate: 'Data completeness check' },
    { stage: 'pre_validated', action: 'Data quality check', required_role: 'data_steward', layer: 'L3', gate: 'Metadata quality pass' },
    { stage: 'calculated', action: 'Deterministic calculation', required_role: 'emission_engine', layer: 'L1', gate: 'Factor version lock' },
    { stage: 'reviewed', action: 'Internal review', required_role: 'internal_reviewer', layer: 'L3', gate: 'Anomaly check pass' },
    { stage: 'validated', action: 'Independent validation', required_role: 'ivu_validator', layer: 'L2', gate: 'IVU conflict-of-interest cleared' },
    { stage: 'approved', action: 'Compliance approval', required_role: 'compliance_officer', layer: 'L3', gate: 'IVU validation passed' },
    { stage: 'sealed', action: 'System seal (auto)', required_role: 'emission_engine', layer: 'L1', gate: 'All gates passed + risk < threshold' },
    { stage: 'anchored', action: 'Blockchain anchor', required_role: 'blockchain_operator', layer: 'L2', gate: 'CIP sealed' },
    { stage: 'disclosed', action: 'Public disclosure sign-off', required_role: 'disclosure_officer', layer: 'L3', gate: 'CIP anchored + CSRD alignment' },
];

// ═══════════════════════════════════════════════════════════════════
// VIII. REPLAY ACCESS CONTROL
// ═══════════════════════════════════════════════════════════════════

const REPLAY_ACCESS_LEVELS = [
    { level: 0, name: 'No Access', roles: ['supplier_contributor', 'public_verifier'], description: 'No replay access.' },
    { level: 1, name: 'View Only', roles: ['carbon_officer', 'scm_analyst', 'internal_reviewer', 'export_officer', 'board_observer', 'data_steward', 'legal_counsel', 'disclosure_officer', 'esg_reporting_manager', 'executive', 'ggc_member', 'financial_viewer'], description: 'Read historical CIP data. No simulation.' },
    { level: 2, name: 'Impact Simulation', roles: ['company_risk_committee', 'external_auditor'], description: 'What-if analysis. Sandbox only. No data modification.' },
    { level: 3, name: 'Full Lineage Forensic', roles: ['ivu_validator', 'compliance_officer', 'internal_audit'], description: 'Full reconstruction from snapshot capsule. Audit-grade access.' },
];

// ═══════════════════════════════════════════════════════════════════
// IX. METHODOLOGY CHANGE CONTROL (L2 Federated)
// ═══════════════════════════════════════════════════════════════════

const METHODOLOGY_CHANGE_FLOW = [
    { step: 1, action: 'Propose', actor: 'MGB Member (L2)', layer: 'L2', requires: 'Written proposal with impact analysis' },
    { step: 2, action: 'Board Vote', actor: 'MGB Full Board (L2)', layer: 'L2', requires: '≥75% approval (no conflicts)' },
    { step: 3, action: 'Factor Freeze', actor: 'MGB + System (L2/L1)', layer: 'L2', requires: 'Hash lock on factor set' },
    { step: 4, action: 'Publish', actor: 'MGB (L2)', layer: 'L2', requires: 'Change bulletin with effective date' },
    { step: 5, action: 'Org Adopt', actor: 'Company Admin (L3)', layer: 'L3', requires: 'Select version (cannot edit content)' },
];

// ═══════════════════════════════════════════════════════════════════
// X. ESCALATION HIERARCHY (Cross-Layer)
// ═══════════════════════════════════════════════════════════════════

const ESCALATION_CHAIN = [
    { trigger: 'Anomaly detected', escalates_from: 'carbon_officer (L3)', escalates_to: 'internal_reviewer (L3)', cross_layer: false },
    { trigger: 'Review flags high risk', escalates_from: 'internal_reviewer (L3)', escalates_to: 'ivu_validator (L2)', cross_layer: true },
    { trigger: 'IVU validation concern', escalates_from: 'ivu_validator (L2)', escalates_to: 'compliance_officer (L3)', cross_layer: true },
    { trigger: 'Compliance escalation', escalates_from: 'compliance_officer (L3)', escalates_to: 'company_risk_committee (L3)', cross_layer: false },
    { trigger: 'Risk exceeds threshold', escalates_from: 'company_risk_committee (L3)', escalates_to: 'global_risk_committee (L1)', cross_layer: true },
];

// ═══════════════════════════════════════════════════════════════════
// XI. ACCESS PRINCIPLES (Institutional Grade)
// ═══════════════════════════════════════════════════════════════════

const ACCESS_PRINCIPLES = [
    { id: 'AP-01', name: 'Least Privilege', description: 'Each role has minimum permissions needed.' },
    { id: 'AP-02', name: 'Zero Override', description: 'No role can bypass another role\'s gate.' },
    { id: 'AP-03', name: 'Version Lock', description: 'Methodology and factors are immutable once frozen.' },
    { id: 'AP-04', name: 'No Silent Admin Edit', description: 'All changes logged with actor + timestamp + hash_before + hash_after.' },
    { id: 'AP-05', name: 'No Emergency Backdoor', description: 'Emergency access requires logged multi-signature.' },
    { id: 'AP-06', name: 'L1 ≠ Business', description: 'Platform infrastructure cannot modify business data.' },
    { id: 'AP-07', name: 'Calculation ≠ Approval', description: 'Calculation is deterministic (L1). Approval is human (L3).' },
    { id: 'AP-08', name: 'Validation ≠ Seal', description: 'IVU validates (L2). System seals after all gates pass (L1).' },
    { id: 'AP-09', name: 'Federated Independence', description: 'L2 actors are not org employees. Cannot be created/deleted by org.' },
    { id: 'AP-10', name: 'Disclosure ≠ Modification', description: 'Disclosure officer signs but cannot modify underlying data.' },
    { id: 'AP-11', name: 'Litigation Traceability', description: 'Audit trail: actor_id, timestamp, hash_before, hash_after, signature, role, ip/device. Court-admissible.' },
];

// ═══════════════════════════════════════════════════════════════════
// XII. LIABILITY CONTAINMENT
// ═══════════════════════════════════════════════════════════════════

const LIABILITY_MATRIX = {
    trustchecker_responsible_for: [
        'Process integrity (L1)',
        'Governance enforcement (L1)',
        'Audit log preservation (L1)',
        'SoD enforcement (L1)',
        'Blockchain anchor integrity (L2)',
        'Federation independence guarantee (L2)',
    ],
    trustchecker_NOT_responsible_for: [
        'Scientific accuracy of emission factors (L2 MGB)',
        'Company input data quality (L3)',
        'IVU validation correctness (L2)',
        'Compliance decision accuracy (L3)',
        'Regulatory interpretation (L3)',
        'Disclosure accuracy (L3 Disclosure Officer)',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// XIII. EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

// Backward-compatible aliases
const PLATFORM_ROLES = L1_INFRASTRUCTURE;
const COMPANY_ROLES = { ...L3_ORG, ...L4_CAPITAL_MARKET };

function getAllRoles() {
    return {
        L1_infrastructure: L1_INFRASTRUCTURE,
        L2_federation: L2_FEDERATION,
        L3_org: L3_ORG,
        L4_capital_market: L4_CAPITAL_MARKET,
        // backward compat
        platform: PLATFORM_ROLES,
        company: COMPANY_ROLES,
    };
}

function getRoleById(roleId) {
    return L1_INFRASTRUCTURE[roleId]
        || L2_FEDERATION[roleId]
        || L3_ORG[roleId]
        || L4_CAPITAL_MARKET[roleId]
        || null;
}

function getRoleLayer(roleId) {
    const role = getRoleById(roleId);
    return role ? role.layer : null;
}

function getSoDMatrix() {
    return SOD_MATRIX;
}

function getAuthorityMatrix() {
    return AUTHORITY_MATRIX;
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
    if (!role) return 0;
    if (role.layer === 'L1' && !role.is_system) return 0;
    return role.replay_level || 0;
}

/**
 * Check if role is federated (L2 independence)
 */
function isFederated(roleId) {
    const role = getRoleById(roleId);
    return role ? !!role.federated : false;
}

/**
 * Validate CIP stage transition (cross-layer enforcement)
 */
function validateTransition(currentStage, targetStage, roleId) {
    const currentIdx = CIP_LIFECYCLE.findIndex(s => s.stage === currentStage);
    const targetIdx = CIP_LIFECYCLE.findIndex(s => s.stage === targetStage);
    if (currentIdx === -1 || targetIdx === -1) return { allowed: false, reason: 'Invalid stage' };
    if (targetIdx !== currentIdx + 1) return { allowed: false, reason: 'Must follow sequential lifecycle' };
    const target = CIP_LIFECYCLE[targetIdx];
    if (target.required_role !== roleId) {
        return { allowed: false, reason: `Stage "${targetStage}" requires role "${target.required_role}" (${target.layer}), got "${roleId}"` };
    }
    return { allowed: true, stage: targetStage, gate: target.gate, layer: target.layer };
}

module.exports = {
    // 4-Layer Containers
    L1_INFRASTRUCTURE,
    L2_FEDERATION,
    L3_ORG,
    L4_CAPITAL_MARKET,
    // Backward compat
    PLATFORM_ROLES,
    COMPANY_ROLES,
    // Matrices
    AUTHORITY_MATRIX,
    SOD_MATRIX,
    CIP_LIFECYCLE,
    REPLAY_ACCESS_LEVELS,
    ESCALATION_CHAIN,
    METHODOLOGY_CHANGE_FLOW,
    ACCESS_PRINCIPLES,
    LIABILITY_MATRIX,
    // Functions
    getAllRoles,
    getRoleById,
    getRoleLayer,
    getSoDMatrix,
    getAuthorityMatrix,
    getCipLifecycle,
    getReplayAccessLevels,
    getEscalationChain,
    getMethodologyChangeFlow,
    getAccessPrinciples,
    getLiabilityMatrix,
    canPerform,
    isBlocked,
    getReplayLevel,
    isFederated,
    validateTransition,
};
