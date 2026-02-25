/**
 * RBAC Seed v2 — Hierarchical Multi-Tenant Model
 *
 * Seeds:
 *   1. Platform-level permissions (platform:*)
 *   2. Tenant management permissions (tenant:*)
 *   3. Business permissions (product:*, scan:*, etc.)
 *   4. System roles (super_admin, company_admin)
 *   5. Default tenant (TrustChecker Demo) with Company Admin
 *   6. Default business roles within the demo tenant
 *   7. Test users for each role
 *
 * Safe to re-run: uses INSERT OR IGNORE throughout.
 */

const db = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PERMISSIONS — 3 Levels
// ═══════════════════════════════════════════════════════════════════════════════

const PERMISSIONS = [
    // ── Platform Level (SuperAdmin only) ────────────────────────────────────────
    { resource: 'platform', action: 'tenant_create', scope: 'global', level: 'platform', desc: 'Create new tenant/company' },
    { resource: 'platform', action: 'tenant_suspend', scope: 'global', level: 'platform', desc: 'Suspend a tenant' },
    { resource: 'platform', action: 'tenant_delete', scope: 'global', level: 'platform', desc: 'Delete a tenant' },
    { resource: 'platform', action: 'tenant_list', scope: 'global', level: 'platform', desc: 'List all tenants' },
    { resource: 'platform', action: 'billing_update', scope: 'global', level: 'platform', desc: 'Update billing/plan' },
    { resource: 'platform', action: 'feature_flag', scope: 'global', level: 'platform', desc: 'Manage feature flags' },
    { resource: 'platform', action: 'audit_view_all', scope: 'global', level: 'platform', desc: 'View global audit logs' },
    { resource: 'platform', action: 'admin_reset', scope: 'global', level: 'platform', desc: 'Reset Company Admin password' },
    { resource: 'platform', action: 'support_override', scope: 'global', level: 'platform', desc: 'Temporary tenant access' },

    // ── Tenant Management Level (Company Admin) ─────────────────────────────────
    { resource: 'tenant', action: 'user_create', scope: 'tenant', level: 'tenant', desc: 'Create users in tenant' },
    { resource: 'tenant', action: 'user_update', scope: 'tenant', level: 'tenant', desc: 'Update tenant users' },
    { resource: 'tenant', action: 'user_delete', scope: 'tenant', level: 'tenant', desc: 'Remove users from tenant' },
    { resource: 'tenant', action: 'user_list', scope: 'tenant', level: 'tenant', desc: 'List tenant users' },
    { resource: 'tenant', action: 'role_create', scope: 'tenant', level: 'tenant', desc: 'Create custom roles' },
    { resource: 'tenant', action: 'role_update', scope: 'tenant', level: 'tenant', desc: 'Update custom roles' },
    { resource: 'tenant', action: 'role_delete', scope: 'tenant', level: 'tenant', desc: 'Delete custom roles' },
    { resource: 'tenant', action: 'role_list', scope: 'tenant', level: 'tenant', desc: 'List tenant roles' },
    { resource: 'tenant', action: 'role_assign', scope: 'tenant', level: 'tenant', desc: 'Assign roles to users' },
    { resource: 'tenant', action: 'policy_create', scope: 'tenant', level: 'tenant', desc: 'Create tenant policies' },
    { resource: 'tenant', action: 'audit_view', scope: 'tenant', level: 'tenant', desc: 'View tenant audit logs' },
    { resource: 'tenant', action: 'settings_update', scope: 'tenant', level: 'tenant', desc: 'Update tenant settings' },

    // ── Business Level (custom roles use these) ─────────────────────────────────
    // Dashboard
    { resource: 'dashboard', action: 'view', scope: 'tenant', level: 'business', desc: 'View dashboard' },
    // Products
    { resource: 'product', action: 'view', scope: 'tenant', level: 'business', desc: 'View products' },
    { resource: 'product', action: 'create', scope: 'tenant', level: 'business', desc: 'Create products' },
    { resource: 'product', action: 'update', scope: 'tenant', level: 'business', desc: 'Edit products' },
    { resource: 'product', action: 'delete', scope: 'tenant', level: 'business', desc: 'Delete products' },
    { resource: 'product', action: 'export', scope: 'tenant', level: 'business', desc: 'Export products' },
    // QR / Scanning
    { resource: 'scan', action: 'view', scope: 'tenant', level: 'business', desc: 'View scan history' },
    { resource: 'scan', action: 'create', scope: 'tenant', level: 'business', desc: 'Perform scans' },
    { resource: 'qr', action: 'generate', scope: 'tenant', level: 'business', desc: 'Generate QR codes' },
    // Evidence
    { resource: 'evidence', action: 'view', scope: 'tenant', level: 'business', desc: 'View evidence vault' },
    { resource: 'evidence', action: 'upload', scope: 'tenant', level: 'business', desc: 'Upload evidence' },
    { resource: 'evidence', action: 'verify', scope: 'tenant', level: 'business', desc: 'Verify evidence' },
    { resource: 'evidence', action: 'delete', scope: 'tenant', level: 'business', desc: 'Delete evidence' },
    // Trust & Ratings (Stakeholder)
    { resource: 'trust_score', action: 'view', scope: 'tenant', level: 'business', desc: 'View trust scores' },
    { resource: 'stakeholder', action: 'view', scope: 'tenant', level: 'business', desc: 'View stakeholder info' },
    { resource: 'stakeholder', action: 'manage', scope: 'tenant', level: 'business', desc: 'Manage stakeholders' },
    // Supply Chain
    { resource: 'supply_chain', action: 'view', scope: 'tenant', level: 'business', desc: 'View supply chain map' },
    { resource: 'supply_chain', action: 'manage', scope: 'tenant', level: 'business', desc: 'Manage supply chain' },
    { resource: 'inventory', action: 'view', scope: 'tenant', level: 'business', desc: 'View inventory' },
    { resource: 'inventory', action: 'update', scope: 'tenant', level: 'business', desc: 'Update inventory' },
    { resource: 'logistics', action: 'view', scope: 'tenant', level: 'business', desc: 'View logistics' },
    { resource: 'logistics', action: 'manage', scope: 'tenant', level: 'business', desc: 'Manage logistics' },
    { resource: 'partner', action: 'view', scope: 'tenant', level: 'business', desc: 'View partners' },
    { resource: 'partner', action: 'manage', scope: 'tenant', level: 'business', desc: 'Manage partners' },
    { resource: 'epcis', action: 'view', scope: 'tenant', level: 'business', desc: 'View EPCIS events' },
    { resource: 'epcis', action: 'create', scope: 'tenant', level: 'business', desc: 'Create EPCIS events' },
    { resource: 'trustgraph', action: 'view', scope: 'tenant', level: 'business', desc: 'View TrustGraph' },
    { resource: 'digital_twin', action: 'view', scope: 'tenant', level: 'business', desc: 'View Digital Twin' },
    { resource: 'digital_twin', action: 'simulate', scope: 'tenant', level: 'business', desc: 'Run simulations' },
    // Risk & Intelligence
    { resource: 'fraud', action: 'view', scope: 'tenant', level: 'business', desc: 'View fraud alerts' },
    { resource: 'fraud', action: 'resolve', scope: 'tenant', level: 'business', desc: 'Resolve fraud cases' },
    { resource: 'fraud_case', action: 'create', scope: 'tenant', level: 'business', desc: 'Create fraud cases' },
    { resource: 'fraud_case', action: 'approve', scope: 'tenant', level: 'business', desc: 'Approve fraud cases' },
    { resource: 'risk_radar', action: 'view', scope: 'tenant', level: 'business', desc: 'View risk radar' },
    { resource: 'anomaly', action: 'view', scope: 'tenant', level: 'business', desc: 'View anomaly monitor' },
    { resource: 'anomaly', action: 'create', scope: 'tenant', level: 'business', desc: 'Create anomaly scan' },
    { resource: 'anomaly', action: 'resolve', scope: 'tenant', level: 'business', desc: 'Resolve anomalies' },
    { resource: 'leak_monitor', action: 'view', scope: 'tenant', level: 'business', desc: 'View leak monitor' },
    { resource: 'ai_analytics', action: 'view', scope: 'tenant', level: 'business', desc: 'View AI analytics' },
    { resource: 'kyc', action: 'view', scope: 'tenant', level: 'business', desc: 'View KYC data' },
    { resource: 'kyc', action: 'manage', scope: 'tenant', level: 'business', desc: 'Manage KYC' },
    // Sustainability & Compliance
    { resource: 'esg', action: 'view', scope: 'tenant', level: 'business', desc: 'View ESG/carbon data' },
    { resource: 'esg', action: 'export', scope: 'tenant', level: 'business', desc: 'Export ESG reports' },
    { resource: 'esg', action: 'manage', scope: 'tenant', level: 'business', desc: 'Manage ESG data (DID/VC, carbon offsets, credit pipeline)' },
    { resource: 'sustainability', action: 'view', scope: 'tenant', level: 'business', desc: 'View sustainability' },
    { resource: 'sustainability', action: 'create', scope: 'tenant', level: 'business', desc: 'Assess product sustainability' },
    { resource: 'sustainability', action: 'manage', scope: 'tenant', level: 'business', desc: 'Issue green certifications' },
    { resource: 'compliance', action: 'view', scope: 'tenant', level: 'business', desc: 'View compliance' },
    { resource: 'compliance', action: 'manage', scope: 'tenant', level: 'business', desc: 'Manage compliance' },
    { resource: 'report', action: 'view', scope: 'tenant', level: 'business', desc: 'View reports' },
    { resource: 'report', action: 'export', scope: 'tenant', level: 'business', desc: 'Export reports' },
    // Digital Assets
    { resource: 'blockchain', action: 'view', scope: 'tenant', level: 'business', desc: 'View blockchain seals' },
    { resource: 'blockchain', action: 'create', scope: 'tenant', level: 'business', desc: 'Create blockchain seals' },
    { resource: 'nft', action: 'view', scope: 'tenant', level: 'business', desc: 'View NFT certificates' },
    { resource: 'nft', action: 'mint', scope: 'tenant', level: 'business', desc: 'Mint NFT certificates' },
    { resource: 'wallet', action: 'view', scope: 'tenant', level: 'business', desc: 'View wallet' },
    { resource: 'wallet', action: 'manage', scope: 'tenant', level: 'business', desc: 'Manage wallet' },
    // Platform & Integration
    { resource: 'api_key', action: 'view', scope: 'tenant', level: 'business', desc: 'View API keys' },
    { resource: 'api_key', action: 'manage', scope: 'tenant', level: 'business', desc: 'Manage API keys' },
    { resource: 'webhook', action: 'view', scope: 'tenant', level: 'business', desc: 'View webhooks' },
    { resource: 'webhook', action: 'manage', scope: 'tenant', level: 'business', desc: 'Manage webhooks' },
    { resource: 'notification', action: 'view', scope: 'tenant', level: 'business', desc: 'View notifications' },
    // Admin & Billing (tenant-level admin)
    { resource: 'billing', action: 'view', scope: 'tenant', level: 'business', desc: 'View billing' },
    { resource: 'settings', action: 'view', scope: 'tenant', level: 'business', desc: 'View settings' },
    { resource: 'settings', action: 'update', scope: 'tenant', level: 'business', desc: 'Update settings' },

    // ── Governance Permissions (Trust Graph + Data Lineage + Model Risk) ───────
    // Trust Graph Governance
    { resource: 'graph_schema', action: 'propose', scope: 'tenant', level: 'business', desc: 'Propose graph schema change RFC' },
    { resource: 'graph_schema', action: 'approve', scope: 'tenant', level: 'business', desc: 'Approve graph schema change' },
    { resource: 'graph_schema', action: 'reject', scope: 'tenant', level: 'business', desc: 'Reject graph schema change' },
    { resource: 'graph_schema', action: 'deploy', scope: 'tenant', level: 'business', desc: 'Deploy graph schema change' },
    { resource: 'graph_weight', action: 'propose', scope: 'tenant', level: 'business', desc: 'Propose weight recalibration' },
    { resource: 'graph_weight', action: 'approve', scope: 'tenant', level: 'business', desc: 'Approve weight recalibration' },
    { resource: 'graph_override', action: 'request', scope: 'tenant', level: 'business', desc: 'Request trust graph override' },
    { resource: 'graph_override', action: 'approve', scope: 'tenant', level: 'business', desc: 'Approve trust graph override' },
    { resource: 'graph_snapshot', action: 'create', scope: 'tenant', level: 'business', desc: 'Create graph snapshot' },
    { resource: 'graph_snapshot', action: 'view', scope: 'tenant', level: 'business', desc: 'View graph snapshots' },
    // Data Lineage
    { resource: 'lineage', action: 'view', scope: 'tenant', level: 'business', desc: 'View decision lineage' },
    { resource: 'lineage', action: 'replay', scope: 'tenant', level: 'business', desc: 'Replay decision for determinism check' },
    { resource: 'lineage', action: 'impact', scope: 'tenant', level: 'business', desc: 'Run contamination impact analysis' },
    { resource: 'lineage', action: 'export', scope: 'tenant', level: 'business', desc: 'Export lineage for regulatory' },
    // Risk Model Governance
    { resource: 'risk_model', action: 'create', scope: 'tenant', level: 'business', desc: 'Create risk model' },
    { resource: 'risk_model', action: 'deploy', scope: 'tenant', level: 'business', desc: 'Deploy risk model' },
    { resource: 'risk_model', action: 'approve', scope: 'tenant', level: 'business', desc: 'Approve risk model' },
    { resource: 'risk_model', action: 'validate', scope: 'tenant', level: 'business', desc: 'Validate risk model (IVU)' },
    // IVU Model Certification
    { resource: 'model_certification', action: 'issue', scope: 'tenant', level: 'business', desc: 'Issue model certification' },
    { resource: 'feature_drift', action: 'monitor', scope: 'tenant', level: 'business', desc: 'Monitor feature drift' },
    { resource: 'bias_audit', action: 'perform', scope: 'tenant', level: 'business', desc: 'Perform model bias audit' },
    // Carbon Lifecycle (separated from blockchain)
    { resource: 'carbon_data', action: 'upload', scope: 'tenant', level: 'business', desc: 'Upload carbon emission data' },
    { resource: 'emission_model', action: 'submit', scope: 'tenant', level: 'business', desc: 'Submit emission model' },
    { resource: 'carbon_credit', action: 'request_mint', scope: 'tenant', level: 'business', desc: 'Request carbon credit mint' },
    { resource: 'carbon_credit', action: 'approve_mint', scope: 'tenant', level: 'business', desc: 'Approve carbon credit mint' },
    { resource: 'carbon_credit', action: 'anchor', scope: 'tenant', level: 'business', desc: 'Anchor carbon credit on chain' },
    { resource: 'carbon_credit', action: 'verify', scope: 'tenant', level: 'business', desc: 'Verify carbon credit chain' },
    // Blockchain Governance
    { resource: 'blockchain_anchor', action: 'create', scope: 'tenant', level: 'business', desc: 'Create blockchain anchor' },
    { resource: 'blockchain_anchor', action: 'verify', scope: 'tenant', level: 'business', desc: 'Verify blockchain anchor' },
    // LRGF Governance
    { resource: 'lrgf_case', action: 'view', scope: 'tenant', level: 'business', desc: 'View L-RGF cases' },
    { resource: 'lrgf_case', action: 'assign', scope: 'tenant', level: 'business', desc: 'Assign L-RGF cases' },
    { resource: 'lrgf_case', action: 'override', scope: 'tenant', level: 'business', desc: 'Override L-RGF decision' },
    { resource: 'evidence', action: 'freeze', scope: 'tenant', level: 'business', desc: 'Freeze evidence chain' },
    { resource: 'evidence', action: 'seal', scope: 'tenant', level: 'business', desc: 'Seal evidence (blockchain)' },
    // Compliance Governance (v2)
    { resource: 'compliance', action: 'freeze', scope: 'tenant', level: 'business', desc: 'Freeze compliance data' },
    { resource: 'regulatory_export', action: 'approve', scope: 'tenant', level: 'business', desc: 'Approve regulatory export' },
    { resource: 'gdpr_masking', action: 'execute', scope: 'tenant', level: 'business', desc: 'Execute GDPR masking' },
    // Audit (v2.1)
    { resource: 'audit_log', action: 'view', scope: 'tenant', level: 'business', desc: 'View audit logs' },
    { resource: 'lineage', action: 'view_summary', scope: 'tenant', level: 'business', desc: 'View lineage summary (non-full)' },

    // ── Platform Security Permissions (L5) ────────────────────────────────────
    { resource: 'key', action: 'rotate', scope: 'global', level: 'platform', desc: 'Rotate cryptographic keys' },
    { resource: 'privileged_access', action: 'monitor', scope: 'global', level: 'platform', desc: 'Monitor privileged access' },
    { resource: 'session_recording', action: 'review', scope: 'global', level: 'platform', desc: 'Review session recordings' },
    { resource: 'api_access', action: 'approve', scope: 'global', level: 'platform', desc: 'Approve API access requests' },
    { resource: 'incident', action: 'declare', scope: 'global', level: 'platform', desc: 'Declare security incident' },
    { resource: 'incident', action: 'resolve', scope: 'global', level: 'platform', desc: 'Resolve security incident' },
    { resource: 'support_session', action: 'initiate', scope: 'global', level: 'platform', desc: 'Initiate support session' },
    { resource: 'support_session', action: 'approve', scope: 'global', level: 'platform', desc: 'Approve support session' },

    // ── Data Governance Permissions (L5) ──────────────────────────────────────
    { resource: 'data_classification', action: 'define', scope: 'global', level: 'platform', desc: 'Define data classification' },
    { resource: 'data_classification', action: 'approve', scope: 'global', level: 'platform', desc: 'Approve data classification' },
    { resource: 'retention_policy', action: 'approve', scope: 'global', level: 'platform', desc: 'Approve data retention policy' },
    { resource: 'gdpr_masking', action: 'configure', scope: 'global', level: 'platform', desc: 'Configure GDPR masking rules' },
    { resource: 'cross_border_transfer', action: 'approve', scope: 'global', level: 'platform', desc: 'Approve cross border data transfer' },
    { resource: 'lineage_export', action: 'approve', scope: 'global', level: 'platform', desc: 'Approve lineage export' },
    { resource: 'lineage_export', action: 'execute', scope: 'global', level: 'platform', desc: 'Execute lineage export' },

    // ── Emergency / System Permissions (L5) ───────────────────────────────────
    { resource: 'emergency_freeze', action: 'trigger', scope: 'global', level: 'platform', desc: 'Trigger emergency freeze' },
    { resource: 'system_config', action: 'update', scope: 'global', level: 'platform', desc: 'Update system configuration' },
    { resource: 'platform_metrics', action: 'view', scope: 'global', level: 'platform', desc: 'View platform metrics' },
    { resource: 'system_health', action: 'view', scope: 'global', level: 'platform', desc: 'View system health' },
    { resource: 'node_status', action: 'view', scope: 'global', level: 'platform', desc: 'View node status' },
    { resource: 'blockchain_integrity', action: 'view', scope: 'global', level: 'platform', desc: 'View blockchain integrity' },
    { resource: 'lineage_registry', action: 'integrity_check', scope: 'global', level: 'platform', desc: 'Lineage registry integrity check' },

    // ── CIE v2.0 — Carbon Integrity Engine Permissions ───────────────────────
    // Platform-level CIE (MGB, Global Risk)
    { resource: 'cie_methodology', action: 'propose', scope: 'global', level: 'platform', desc: 'Propose methodology version change' },
    { resource: 'cie_methodology', action: 'vote', scope: 'global', level: 'platform', desc: 'Vote on methodology change' },
    { resource: 'cie_methodology', action: 'freeze', scope: 'global', level: 'platform', desc: 'Freeze emission factor set' },
    { resource: 'cie_methodology', action: 'publish', scope: 'global', level: 'platform', desc: 'Publish methodology change bulletin' },
    { resource: 'cie_risk_config', action: 'set_weights', scope: 'global', level: 'platform', desc: 'Configure global risk scoring weights' },
    { resource: 'cie_risk_config', action: 'set_threshold', scope: 'global', level: 'platform', desc: 'Set global anomaly threshold' },
    { resource: 'cie_ivu_registry', action: 'manage', scope: 'global', level: 'platform', desc: 'Manage IVU validator registry' },
    { resource: 'cie_ivu_registry', action: 'verify_qual', scope: 'global', level: 'platform', desc: 'Verify IVU qualification' },
    // Tenant-level CIE (SoD-enforced)
    { resource: 'cie_passport', action: 'submit', scope: 'tenant', level: 'business', desc: 'Submit emission data and create CIP draft' },
    { resource: 'cie_passport', action: 'calculate', scope: 'tenant', level: 'business', desc: 'Execute deterministic emission calculation (system)' },
    { resource: 'cie_passport', action: 'review', scope: 'tenant', level: 'business', desc: 'Review CIP data quality' },
    { resource: 'cie_passport', action: 'validate', scope: 'tenant', level: 'business', desc: 'Validate CIP (IVU only)' },
    { resource: 'cie_passport', action: 'approve', scope: 'tenant', level: 'business', desc: 'Approve CIP for sealing (Compliance only)' },
    { resource: 'cie_passport', action: 'seal', scope: 'tenant', level: 'business', desc: 'Seal CIP (system auto after all gates pass)' },
    { resource: 'cie_passport', action: 'view', scope: 'tenant', level: 'business', desc: 'View CIP passport' },
    { resource: 'cie_anchor', action: 'create', scope: 'tenant', level: 'business', desc: 'Anchor CIP hash to blockchain' },
    { resource: 'cie_snapshot', action: 'view', scope: 'tenant', level: 'business', desc: 'View snapshot capsule' },
    { resource: 'cie_replay', action: 'view', scope: 'tenant', level: 'business', desc: 'View-only replay (Level 1)' },
    { resource: 'cie_replay', action: 'simulate', scope: 'tenant', level: 'business', desc: 'What-if simulation replay (Level 2)' },
    { resource: 'cie_replay', action: 'forensic', scope: 'tenant', level: 'business', desc: 'Full lineage forensic replay (Level 3)' },
    { resource: 'cie_export', action: 'report', scope: 'tenant', level: 'business', desc: 'Export CIE report / PDF' },
    { resource: 'cie_export', action: 'share', scope: 'tenant', level: 'business', desc: 'Share CIP externally' },
    // CIE v2.1 — Enterprise Ready permissions
    { resource: 'cie_data', action: 'validate_completeness', scope: 'tenant', level: 'business', desc: 'Validate data completeness (Data Steward)' },
    { resource: 'cie_data', action: 'reject_incomplete', scope: 'tenant', level: 'business', desc: 'Reject incomplete submission (Data Steward)' },
    { resource: 'cie_data', action: 'manage_metadata', scope: 'tenant', level: 'business', desc: 'Manage metadata quality (Data Steward)' },
    { resource: 'cie_audit', action: 'view_trail', scope: 'tenant', level: 'business', desc: 'View full CIE audit trail' },
    { resource: 'cie_audit', action: 'view_sod_violations', scope: 'tenant', level: 'business', desc: 'View SoD violation attempts' },
    { resource: 'cie_audit', action: 'view_change_history', scope: 'tenant', level: 'business', desc: 'View CIE change history' },
    { resource: 'cie_liability', action: 'view', scope: 'tenant', level: 'business', desc: 'View liability mapping and responsibility allocation' },
    { resource: 'cie_escalation', action: 'view_history', scope: 'tenant', level: 'business', desc: 'View escalation history' },
    // CIE v2.5 — Supply Chain + Audit Ready permissions
    { resource: 'cie_supplier', action: 'submit_emission', scope: 'tenant', level: 'business', desc: 'Submit supplier emission declaration' },
    { resource: 'cie_supplier', action: 'upload_docs', scope: 'tenant', level: 'business', desc: 'Upload supplier supporting documents' },
    { resource: 'cie_esg', action: 'generate_report', scope: 'tenant', level: 'business', desc: 'Generate consolidated ESG report' },
    { resource: 'cie_esg', action: 'portfolio_carbon', scope: 'tenant', level: 'business', desc: 'Extract portfolio carbon report' },
    { resource: 'cie_esg', action: 'investor_disclosure', scope: 'tenant', level: 'business', desc: 'Prepare investor disclosure' },
    { resource: 'cie_external_audit', action: 'read_snapshot', scope: 'tenant', level: 'business', desc: 'Read-only snapshot capsule (external auditor)' },
    { resource: 'cie_external_audit', action: 'sandbox_replay', scope: 'tenant', level: 'business', desc: 'Limited sandbox replay (external auditor)' },
    // CIE v3.0 — Institutional Grade permissions
    { resource: 'cie_finance', action: 'view_score', scope: 'tenant', level: 'business', desc: 'View Carbon Integrity Score (financial institution)' },
    { resource: 'cie_finance', action: 'view_selected_cip', scope: 'tenant', level: 'business', desc: 'View selected CIP (no supplier confidential data)' },
    { resource: 'cie_public', action: 'verify_qr', scope: 'platform', level: 'business', desc: 'Public QR verification (unauthenticated)' },
    { resource: 'cie_public', action: 'check_hash', scope: 'platform', level: 'business', desc: 'Public hash check (unauthenticated)' },
    { resource: 'cie_change_mgmt', action: 'approve_upgrade', scope: 'platform', level: 'platform', desc: 'Approve system upgrade request' },
    { resource: 'cie_change_mgmt', action: 'track_request', scope: 'platform', level: 'platform', desc: 'Track change request' },
    { resource: 'cie_change_mgmt', action: 'freeze_deploy', scope: 'platform', level: 'platform', desc: 'Freeze deployment window' },
    { resource: 'cie_incident', action: 'activate_protocol', scope: 'platform', level: 'platform', desc: 'Activate incident protocol' },
    { resource: 'cie_incident', action: 'freeze_anchor', scope: 'platform', level: 'platform', desc: 'Freeze blockchain anchor process' },
    { resource: 'cie_incident', action: 'trigger_forensic', scope: 'platform', level: 'platform', desc: 'Trigger forensic logging' },
    // CIE v3.0 — Disclosure Officer permissions
    { resource: 'cie_disclosure', action: 'sign_off', scope: 'tenant', level: 'business', desc: 'Final sign-off public carbon statement' },
    { resource: 'cie_disclosure', action: 'link_annual_report', scope: 'tenant', level: 'business', desc: 'Link CIP to annual report' },
    { resource: 'cie_disclosure', action: 'certify_csrd', scope: 'tenant', level: 'business', desc: 'Certify CSRD/ESRS alignment' },
    { resource: 'cie_disclosure', action: 'view_liability', scope: 'tenant', level: 'business', desc: 'View liability mapping for disclosure' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SYSTEM ROLES
// ═══════════════════════════════════════════════════════════════════════════════

const SYSTEM_ROLES = [
    // ── L1 — Platform Infrastructure ──────────────────────────────
    { name: 'super_admin', display: 'Super Admin', type: 'system', is_system: 1, tenant_id: null, desc: 'L1 Infra — platform lifecycle, observability, NOT business authority', mfa_policy: 'required' },
    { name: 'platform_security', display: 'Platform Security Officer', type: 'system', is_system: 1, tenant_id: null, desc: 'L1 Infra — key rotation, incident, privileged access monitor', mfa_policy: 'required' },
    { name: 'data_gov_officer', display: 'Data Governance Officer', type: 'system', is_system: 1, tenant_id: null, desc: 'L1 Infra — classification, retention, GDPR masking, cross-border transfer', mfa_policy: 'required' },
    { name: 'global_risk_committee', display: 'Global Risk Committee', type: 'system', is_system: 1, tenant_id: null, desc: 'L1 Infra — risk scoring weights + anomaly thresholds ONLY. Cannot override CIP.', mfa_policy: 'required' },
    { name: 'emission_engine', display: 'Emission Engine [SYSTEM]', type: 'system', is_system: 1, tenant_id: null, desc: 'L1 SYSTEM — non-human. Deterministic calculation. Locked formula. No manual override.', mfa_policy: 'none' },
    { name: 'change_management_officer', display: 'Change Management Officer', type: 'system', is_system: 1, tenant_id: null, desc: 'L1 Infra — system upgrades, change requests, deployment freeze. ISO 27001 / SOC 2.', mfa_policy: 'required' },
    { name: 'incident_response_lead', display: 'Incident Response Lead', type: 'system', is_system: 1, tenant_id: null, desc: 'L1 Infra — incident protocol, anchor freeze, forensic logging. Cannot edit data.', mfa_policy: 'required' },
    // ── L2 — Federation & Independent Validation ──────────────────
    { name: 'ivu_registry_admin', display: 'IVU Registry Admin', type: 'system', is_system: 1, tenant_id: null, desc: 'L2 Federation — validator registry. Cannot validate CIP.', mfa_policy: 'required' },
    { name: 'mgb_member', display: 'Methodology Governance Board', type: 'system', is_system: 1, tenant_id: null, desc: 'L2 Federation — methodology governance. NOT tenant employee. Cannot access tenant data.', mfa_policy: 'required' },
    { name: 'blockchain_operator', display: 'Blockchain Anchor Authority', type: 'system', is_system: 1, tenant_id: null, desc: 'L2 Federation — anchor hashes. Federated for trust. Cannot create/modify CIP.', mfa_policy: 'required' },
    // ── L3 — Tenant (template) ────────────────────────────────────
    { name: 'org_owner', display: 'Organization Owner', type: 'system', is_system: 1, tenant_id: '__TEMPLATE__', desc: 'L3 Tenant — Legal representative. Appoints/removes Company Admin. Does not participate in daily operations.', mfa_policy: 'required' },
    { name: 'company_admin', display: 'Company Admin', type: 'system', is_system: 1, tenant_id: '__TEMPLATE__', desc: 'L3 Tenant — Operational IAM controller. Manages roles/users/config within boundary. CANNOT grant governance permissions (SoD, compliance, risk deploy).', mfa_policy: 'required' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DEFAULT BUSINESS ROLES (seeded per tenant)
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_BUSINESS_ROLES = [
    // ── L3: Tenant Security Officer (enterprise optional) ─────────────────────
    {
        name: 'security_officer',
        display: 'Tenant Security Officer',
        desc: 'L3 Tenant — Monitors SoD conflicts, privilege escalation, access anomalies. Approves/rejects high-risk role assignments. Cannot modify data or approve business workflows.',
        permissions: [
            'dashboard:view', 'audit_log:view',
            'trust_score:view', 'risk_radar:view',
            'compliance:view', 'report:view',
            // Lineage (read-only forensic)
            'lineage:view', 'lineage:view_summary',
            // CIE audit
            'cie_audit:view_trail', 'cie_audit:view_sod_violations', 'cie_audit:view_change_history',
            'cie_escalation:view_history',
        ],
    },
    {
        name: 'executive',
        display: 'Executive / CEO',
        desc: 'CIE v2.0 — View-only oversight. CIP status, risk heatmap, benchmark, governance transparency. Trigger escalation, approve strategic disclosure. CANNOT edit data/methodology/approve CIP.',
        permissions: [
            'dashboard:view', 'trust_score:view', 'stakeholder:view',
            'risk_radar:view', 'fraud:view',
            'esg:view', 'sustainability:view', 'compliance:view',
            'report:view', 'report:export',
            // CIE oversight permissions (VIEW ONLY)
            'cie_passport:view',
            'cie_replay:view',
            'cie_snapshot:view',
            'cie_export:report', 'cie_export:share',
        ],
    },
    {
        name: 'ops_manager',
        display: 'Operations Manager',
        desc: 'Full operations & supply chain access',
        permissions: [
            'dashboard:view', 'product:view', 'product:create', 'product:update', 'product:export',
            'scan:view', 'scan:create', 'qr:generate',
            'evidence:view', 'evidence:upload', 'evidence:verify',
            'trust_score:view', 'stakeholder:view', 'stakeholder:manage',
            'supply_chain:view', 'supply_chain:manage',
            'inventory:view', 'inventory:update',
            'logistics:view', 'logistics:manage',
            'partner:view', 'partner:manage',
            'epcis:view', 'epcis:create',
            'trustgraph:view', 'digital_twin:view', 'digital_twin:simulate',
        ],
    },
    {
        name: 'risk_officer',
        display: 'Risk Officer',
        desc: 'Risk monitoring and fraud investigation',
        permissions: [
            'dashboard:view',
            'fraud:view', 'fraud:resolve', 'fraud_case:create',
            'risk_radar:view',
            'anomaly:view', 'anomaly:create', 'anomaly:resolve',
            'leak_monitor:view',
            'ai_analytics:view',
            'kyc:view', 'kyc:manage',
        ],
    },
    {
        name: 'compliance_officer',
        display: 'Compliance Officer',
        desc: 'CIE v2.0 — Final CIP compliance approval. Cannot modify calculation or override IVU.',
        permissions: [
            'dashboard:view',
            'esg:view', 'esg:export', 'esg:manage',
            'sustainability:view',
            'compliance:view', 'compliance:manage', 'compliance:freeze',
            'regulatory_export:approve',
            'gdpr_masking:execute',
            'graph_weight:approve',
            'carbon_credit:approve_mint',
            'lineage:view', 'lineage:replay', 'lineage:export',
            'report:view', 'report:export',
            'audit_log:view',
            // CIE SoD permissions
            'cie_passport:approve', 'cie_passport:view',
            'cie_replay:forensic',
            'cie_snapshot:view',
        ],
    },
    {
        name: 'developer',
        display: 'Developer',
        desc: 'API and integration management',
        permissions: [
            'dashboard:view',
            'api_key:view', 'api_key:manage',
            'webhook:view', 'webhook:manage',
            'blockchain:view',
            'product:view', 'scan:view',
        ],
    },
    {
        name: 'operator',
        display: 'Operator',
        desc: 'Day-to-day operational tasks',
        permissions: [
            'dashboard:view',
            'product:view', 'product:create', 'product:update',
            'scan:view', 'scan:create', 'qr:generate',
            'evidence:view', 'evidence:upload',
            'inventory:view',
        ],
    },
    {
        name: 'viewer',
        display: 'Viewer',
        desc: 'Read-only access',
        permissions: [
            'dashboard:view', 'product:view', 'scan:view',
            'trust_score:view', 'report:view',
        ],
    },

    // ── L4: Global Governance Roles ──────────────────────────────────────────────
    {
        name: 'ggc_member',
        display: 'Graph Governance Committee',
        desc: 'Structural governance — schema approve/reject, NOT scoring logic',
        permissions: [
            'dashboard:view', 'trustgraph:view',
            'graph_schema:propose', 'graph_schema:approve', 'graph_schema:reject',
            'graph_snapshot:view',
            'lineage:view',
            'compliance:view', 'report:view', 'report:export',
        ],
    },
    {
        name: 'risk_committee',
        display: 'Risk Committee',
        desc: 'Decision logic owner — risk scoring, weight proposals, lineage replay, contamination analysis',
        permissions: [
            'dashboard:view', 'risk_radar:view',
            'fraud:view', 'fraud:resolve', 'fraud_case:create', 'fraud_case:approve',
            'anomaly:view', 'anomaly:resolve',
            'graph_weight:propose', 'graph_override:request', 'graph_override:approve',
            'graph_snapshot:view',
            'risk_model:create', 'risk_model:approve',
            'lineage:view', 'lineage:replay', 'lineage:impact',
            'lrgf_case:view', 'lrgf_case:assign', 'lrgf_case:override',
            'evidence:view',
        ],
    },
    {
        name: 'ivu_validator',
        display: 'Independent Validation Unit (IVU)',
        desc: 'CIE v2.0 — Independent CIP validation. Issues validation status. Cannot modify data or approve compliance.',
        permissions: [
            'dashboard:view',
            'risk_model:validate',
            'model_certification:issue',
            'feature_drift:monitor',
            'bias_audit:perform',
            'lineage:view', 'lineage:replay',
            'graph_snapshot:view', 'trustgraph:view',
            'anomaly:view',
            'report:view',
            // CIE SoD permissions
            'cie_passport:validate', 'cie_passport:view',
            'cie_replay:forensic',
            'cie_snapshot:view',
        ],
    },
    {
        name: 'scm_analyst',
        display: 'Supply Chain Analyst (SCM)',
        desc: 'Route risk analysis, supply chain graph, partner scoring',
        permissions: [
            'dashboard:view',
            'supply_chain:view', 'supply_chain:manage',
            'logistics:view', 'logistics:manage',
            'partner:view', 'partner:manage',
            'epcis:view', 'epcis:create',
            'trustgraph:view', 'digital_twin:view', 'digital_twin:simulate',
            'risk_radar:view',
            'graph_snapshot:view',
            'carbon_credit:verify',
        ],
    },
    {
        name: 'blockchain_operator',
        display: 'Blockchain Node Operator',
        desc: 'Anchoring, hash verification, snapshot integrity — sees hash+timestamp+signature only',
        permissions: [
            'dashboard:view',
            'blockchain:view', 'blockchain:create',
            'blockchain_anchor:create', 'blockchain_anchor:verify',
            'graph_snapshot:view',
            'nft:view',
            'carbon_credit:anchor', 'carbon_credit:verify',
        ],
    },
    // ── L3: Tenant Governance ──────────────────────────────────────────────────
    {
        name: 'carbon_officer',
        display: 'Carbon Officer',
        desc: 'CIE v2.0 — Operational submitter. Submit emission data, initiate CIP draft. Cannot approve/seal/modify methodology.',
        permissions: [
            'dashboard:view',
            'carbon_data:upload',
            'emission_model:submit',
            'carbon_credit:request_mint',
            'carbon_credit:verify',
            'esg:view', 'esg:manage',
            'sustainability:view',
            // CIE SoD permissions
            'cie_passport:submit', 'cie_passport:view',
            'cie_replay:view',
            'cie_snapshot:view',
        ],
    },
    // ── CIE v2.0 Roles (Company Admin creates users and assigns these) ────────
    {
        name: 'mgb_member',
        display: 'Methodology Governance Board (MGB)',
        desc: 'CIE v2.0 — Proposes/votes methodology versions, freezes emission factors. Cannot edit sealed CIP or tenant data.',
        permissions: [
            'dashboard:view',
            'cie_methodology:propose', 'cie_methodology:vote', 'cie_methodology:freeze', 'cie_methodology:publish',
            'cie_passport:view',
            'compliance:view', 'report:view',
        ],
    },
    {
        name: 'internal_reviewer',
        display: 'Internal Reviewer',
        desc: 'CIE v2.0 — Reviews CIP data quality, comments, requests revision. Cannot seal or approve.',
        permissions: [
            'dashboard:view',
            'cie_passport:review', 'cie_passport:view',
            'cie_replay:view',
            'cie_snapshot:view',
            'esg:view', 'compliance:view',
        ],
    },
    {
        name: 'export_officer',
        display: 'Export Officer',
        desc: 'CIE v2.0 — Exports reports, shares CIP, generates PDF. Cannot modify sealed CIP.',
        permissions: [
            'dashboard:view',
            'cie_passport:view',
            'cie_export:report', 'cie_export:share',
            'cie_snapshot:view',
            'cie_replay:view',
            'report:view', 'report:export',
            'esg:view', 'esg:export',
        ],
    },
    // ── L1: Audit Role ──────────────────────────────────────────────────────────
    {
        name: 'auditor',
        display: 'Internal Audit',
        desc: 'CIE v2.1 — Full audit trail, SoD violation attempts, change history, replay log. Cannot modify or approve.',
        permissions: [
            'dashboard:view',
            'audit_log:view',
            'lineage:view_summary',
            'lineage:view', 'lineage:replay',
            'compliance:view',
            'report:view',
            // CIE audit permissions
            'cie_passport:view',
            'cie_replay:forensic',
            'cie_snapshot:view',
            'cie_audit:view_trail',
            'cie_audit:view_sod_violations',
            'cie_audit:view_change_history',
            'cie_escalation:view_history',
        ],
    },
    // ── CIE v2.1 Enterprise Ready Roles ──────────────────────────────────────────
    {
        name: 'board_observer',
        display: 'Board Observer',
        desc: 'CIE v2.1 — Read-only strategic oversight for Board/Audit Committee. View dashboard, risk, compliance, escalation. Cannot trigger, approve, or modify.',
        permissions: [
            'dashboard:view',
            'trust_score:view',
            'risk_radar:view',
            'compliance:view',
            'report:view',
            // CIE view-only
            'cie_passport:view',
            'cie_replay:view',
            'cie_snapshot:view',
            'cie_escalation:view_history',
        ],
    },
    {
        name: 'data_steward',
        display: 'Data Steward',
        desc: 'CIE v2.1 — Validate data completeness, reject incomplete submissions, manage metadata quality. Acts BEFORE Carbon Officer. Cannot approve passport.',
        permissions: [
            'dashboard:view',
            'cie_data:validate_completeness',
            'cie_data:reject_incomplete',
            'cie_data:manage_metadata',
            'cie_passport:view',
            'cie_snapshot:view',
            'cie_replay:view',
            'carbon_data:upload',
            'esg:view',
        ],
    },
    {
        name: 'legal_counsel',
        display: 'Legal Counsel',
        desc: 'CIE v2.1 — View sealed CIP, methodology version, liability mapping, responsibility allocation. Cannot modify or approve. Critical for public disclosure and regulatory inquiry.',
        permissions: [
            'dashboard:view',
            'compliance:view',
            'report:view',
            // CIE legal view
            'cie_passport:view',
            'cie_snapshot:view',
            'cie_replay:view',
            'cie_liability:view',
            'cie_audit:view_trail',
            'cie_escalation:view_history',
        ],
    },
    // ── CIE v2.5 Supply Chain + Audit Ready Roles ────────────────────────────
    {
        name: 'supplier_contributor',
        display: 'Supplier Contributor',
        desc: 'CIE v2.5 — Scoped external input. Submit own supplier emission declaration + upload docs. Cannot view full CIP, approve, or see system benchmarks. Tenant-isolated.',
        permissions: [
            'dashboard:view',
            'cie_supplier:submit_emission',
            'cie_supplier:upload_docs',
        ],
    },
    {
        name: 'esg_reporting_manager',
        display: 'ESG Reporting Manager',
        desc: 'CIE v2.5 — Generate consolidated ESG reports, portfolio carbon reports, investor disclosures. Cannot modify sealed CIP.',
        permissions: [
            'dashboard:view',
            'esg:view', 'esg:manage',
            'sustainability:view',
            'report:view', 'report:export',
            'cie_passport:view',
            'cie_snapshot:view',
            'cie_esg:generate_report',
            'cie_esg:portfolio_carbon',
            'cie_esg:investor_disclosure',
            'cie_export:report',
        ],
    },
    {
        name: 'external_auditor',
        display: 'External Auditor',
        desc: 'CIE v2.5 — Time-bound, logged, auto-revoked. Read-only snapshot, verify hash, view approval flow, sandbox replay. Cannot modify anything.',
        permissions: [
            'dashboard:view',
            'cie_passport:view',
            'cie_snapshot:view',
            'cie_external_audit:read_snapshot',
            'cie_external_audit:sandbox_replay',
            'cie_replay:simulate',
            'cie_audit:view_trail',
            'cie_audit:view_change_history',
        ],
    },
    // ── CIE v3.0 Institutional Grade Roles ───────────────────────────────
    {
        name: 'financial_viewer',
        display: 'Financial Institution Viewer',
        desc: 'CIE v3.0 — Scoped, NDA-bound. View Carbon Integrity Score + selected CIP + verify hash. Cannot view supplier confidential data.',
        permissions: [
            'dashboard:view',
            'cie_finance:view_score',
            'cie_finance:view_selected_cip',
            'cie_passport:view',
            'cie_snapshot:view',
        ],
    },
    {
        name: 'public_verifier',
        display: 'Public Verification',
        desc: 'CIE v3.0 — Buyer/marketplace. Verify CIP via QR, check hash, confirm seal status. Cannot view internal governance. Minimal authentication.',
        permissions: [
            'dashboard:view',
            'cie_public:verify_qr',
            'cie_public:check_hash',
            'cie_passport:view',
        ],
    },
    // ── CIE v3.0 Disclosure (CSRD/ESRS Required) ─────────────────
    {
        name: 'disclosure_officer',
        display: 'Disclosure Officer',
        desc: 'CIE v3.0 — Final sign-off public carbon statement. Links CIP to annual report. Certifies CSRD/ESRS alignment. Carries personal liability.',
        permissions: [
            'dashboard:view',
            'cie_disclosure:sign_off',
            'cie_disclosure:link_annual_report',
            'cie_disclosure:certify_csrd',
            'cie_disclosure:view_liability',
            'cie_passport:view',
            'cie_snapshot:view',
        ],
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4. DEFAULT TENANT + TEST USERS
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_TENANT = {
    id: 'tenant-demo-001',
    name: 'TrustChecker Demo',
    slug: 'trustchecker-demo',
    plan: 'enterprise',
    feature_flags: JSON.stringify({
        trustgraph: true,
        digital_twin: true,
        blockchain: true,
        nft: true,
        ai_analytics: true,
        consortium: true,
    }),
};

const TEST_USERS = [
    { email: 'admin@demo.trustchecker.io', role: 'admin', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'company_admin', must_change_password: 1 },
    { email: 'ceo@demo.trustchecker.io', role: 'executive', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'executive', must_change_password: 1 },
    { email: 'ops@demo.trustchecker.io', role: 'ops_manager', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'ops_manager', must_change_password: 1 },
    { email: 'risk@demo.trustchecker.io', role: 'risk_officer', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'risk_officer', must_change_password: 1 },
    { email: 'compliance@demo.trustchecker.io', role: 'compliance_officer', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'compliance_officer', must_change_password: 1 },
    { email: 'dev@demo.trustchecker.io', role: 'developer', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'developer', must_change_password: 1 },
    // Governance roles
    { email: 'ggc@demo.trustchecker.io', role: 'ggc_member', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'ggc_member', must_change_password: 1 },
    { email: 'riskcom@demo.trustchecker.io', role: 'risk_committee', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'risk_committee', must_change_password: 1 },
    { email: 'ivu@demo.trustchecker.io', role: 'ivu_validator', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'ivu_validator', must_change_password: 1 },
    { email: 'scm@demo.trustchecker.io', role: 'scm_analyst', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'scm_analyst', must_change_password: 1 },
    { email: 'carbon@demo.trustchecker.io', role: 'carbon_officer', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'carbon_officer', must_change_password: 1 },
    // L1 Platform roles
    { email: 'security@trustchecker.io', role: 'platform_security', user_type: 'platform', password: '123qaz12', company: 'TrustChecker', rbac_role: 'platform_security', must_change_password: 1 },
    { email: 'datagov@trustchecker.io', role: 'data_gov_officer', user_type: 'platform', password: '123qaz12', company: 'TrustChecker', rbac_role: 'data_gov_officer', must_change_password: 1 },
    // L2 Federation roles
    { email: 'ivu@demo.trustchecker.io', role: 'ivu_validator', user_type: 'platform', password: '123qaz12', company: 'TrustChecker', rbac_role: 'ivu_validator', must_change_password: 1 },
    // L3 Tenant CIE roles
    { email: 'reviewer@demo.trustchecker.io', role: 'internal_reviewer', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'internal_reviewer', must_change_password: 1 },
    { email: 'export@demo.trustchecker.io', role: 'export_officer', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'export_officer', must_change_password: 1 },
    // L5 Platform CIE roles
    { email: 'globalrisk@trustchecker.io', role: 'global_risk_committee', user_type: 'platform', password: '123qaz12', company: 'TrustChecker', rbac_role: 'global_risk_committee', must_change_password: 1 },
    { email: 'ivuadmin@trustchecker.io', role: 'ivu_registry_admin', user_type: 'platform', password: '123qaz12', company: 'TrustChecker', rbac_role: 'ivu_registry_admin', must_change_password: 1 },
    // CIE v2.1 roles
    { email: 'board@demo.trustchecker.io', role: 'board_observer', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'board_observer', must_change_password: 1 },
    { email: 'datasteward@demo.trustchecker.io', role: 'data_steward', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'data_steward', must_change_password: 1 },
    { email: 'legal@demo.trustchecker.io', role: 'legal_counsel', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'legal_counsel', must_change_password: 1 },
    // CIE v2.5 roles
    { email: 'supplier@demo.trustchecker.io', role: 'supplier_contributor', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'supplier_contributor', must_change_password: 1 },
    { email: 'esgmanager@demo.trustchecker.io', role: 'esg_reporting_manager', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'esg_reporting_manager', must_change_password: 1 },
    { email: 'extauditor@demo.trustchecker.io', role: 'external_auditor', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'external_auditor', must_change_password: 1 },
    // CIE v3.0 roles
    { email: 'finviewer@demo.trustchecker.io', role: 'financial_viewer', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'financial_viewer', must_change_password: 1 },
    { email: 'publicverify@demo.trustchecker.io', role: 'public_verifier', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'public_verifier', must_change_password: 1 },
    { email: 'disclosure@demo.trustchecker.io', role: 'disclosure_officer', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'disclosure_officer', must_change_password: 1 },
    // L2 Federation roles (test accounts)
    { email: 'mgb@demo.trustchecker.io', role: 'mgb_member', user_type: 'platform', password: '123qaz12', company: 'TrustChecker', rbac_role: 'mgb_member', must_change_password: 1 },
    { email: 'blockchain@demo.trustchecker.io', role: 'blockchain_operator', user_type: 'platform', password: '123qaz12', company: 'TrustChecker', rbac_role: 'blockchain_operator', must_change_password: 1 },
    // L5 Platform CIE v3.0 roles
    { email: 'changemgmt@trustchecker.io', role: 'change_management_officer', user_type: 'platform', password: '123qaz12', company: 'TrustChecker', rbac_role: 'change_management_officer', must_change_password: 1 },
    { email: 'incident@trustchecker.io', role: 'incident_response_lead', user_type: 'platform', password: '123qaz12', company: 'TrustChecker', rbac_role: 'incident_response_lead', must_change_password: 1 },
    // Auditor (upgraded to Internal Audit)
    { email: 'auditor@demo.trustchecker.io', role: 'auditor', user_type: 'tenant', password: '123qaz12', company: 'TrustChecker Demo', rbac_role: 'auditor', must_change_password: 1 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function seed() {
    console.log('⏳ Waiting for DB...');
    await db._readyPromise;
    console.log('✅ DB ready\n');

    // ── Ensure new columns exist (safe ALTER for existing DBs) ──────────────
    const safeAlter = async (table, col, type) => {
        try { await db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); }
        catch (_) { /* column already exists */ }
    };
    await safeAlter('organizations', 'feature_flags', "TEXT DEFAULT '{}'");
    await safeAlter('organizations', 'sod_waivers', "TEXT DEFAULT '{}'");
    await safeAlter('users', 'user_type', "TEXT DEFAULT 'tenant'");
    await safeAlter('users', 'must_change_password', 'INTEGER DEFAULT 0');
    await safeAlter('users', 'password_changed_at', 'TEXT');
    await safeAlter('rbac_roles', 'is_system', 'INTEGER DEFAULT 0');
    await safeAlter('rbac_roles', 'mfa_policy', "TEXT DEFAULT 'optional'");
    await safeAlter('rbac_permissions', 'level', "TEXT DEFAULT 'business'");

    // ── Ensure audit_log table exists with required columns ────────────────
    await db.run(`CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        actor_id TEXT,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT
    )`);
    // Add columns that may be missing from older schema
    await safeAlter('audit_log', 'actor_email', 'TEXT');
    await safeAlter('audit_log', 'actor_role', 'TEXT');
    await safeAlter('audit_log', 'resource', 'TEXT');
    await safeAlter('audit_log', 'resource_id', 'TEXT');
    await safeAlter('audit_log', 'user_agent', 'TEXT');
    await safeAlter('audit_log', 'severity', "TEXT DEFAULT 'info'");
    await safeAlter('audit_log', 'tenant_id', 'TEXT');
    await safeAlter('audit_log', 'created_at', 'TEXT');
    // Indexes (safe — won't fail if column doesn't exist, index creation is idempotent)
    try { await db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_email)'); } catch (_) { }
    try { await db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log(tenant_id)'); } catch (_) { }

    // ── Mark existing super_admin as platform user_type ─────────────────────
    await db.run("UPDATE users SET user_type = 'platform' WHERE role = 'super_admin'");

    // ── 1. Seed Permissions ─────────────────────────────────────────────────
    console.log('🔑 Seeding permissions (3 levels)...');
    const permIds = {};
    for (const p of PERMISSIONS) {
        const id = `perm-${p.resource}-${p.action}-${p.scope}`;
        const key = `${p.resource}:${p.action}`;
        await db.run(
            `INSERT OR IGNORE INTO rbac_permissions (id, resource, action, scope, level, description) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, p.resource, p.action, p.scope, p.level, p.desc]
        );
        permIds[key] = id;
    }
    const levels = { platform: 0, tenant: 0, business: 0 };
    PERMISSIONS.forEach(p => levels[p.level]++);
    console.log(`  ✓ ${PERMISSIONS.length} permissions (platform: ${levels.platform}, tenant: ${levels.tenant}, business: ${levels.business})\n`);

    // ── 2. Seed System Roles ────────────────────────────────────────────────
    console.log('👑 Seeding system roles...');
    for (const r of SYSTEM_ROLES) {
        const id = `role-${r.name}`;
        await db.run(
            `INSERT OR IGNORE INTO rbac_roles (id, tenant_id, name, display_name, type, is_system, mfa_policy, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, r.tenant_id, r.name, r.display, r.type, r.is_system, r.mfa_policy || 'optional', r.desc]
        );
        console.log(`  ✓ ${r.display} (${r.name}) [${r.type}]`);
    }

    // super_admin gets platform + tenant + observability BUT NOT business authority
    // v2.0: Super Admin is Infrastructure Custodian, not business authority
    const SA_FORBIDDEN = new Set([
        'fraud_case:approve', 'risk_model:create', 'risk_model:approve', 'risk_model:deploy',
        'graph_weight:propose', 'graph_weight:approve', 'carbon_credit:request_mint',
        'carbon_credit:approve_mint', 'carbon_credit:anchor',
        'lineage:replay', 'lineage:view', 'lineage:impact',
        'trust_score:view', 'evidence:seal',
        'model_certification:issue', 'bias_audit:perform',
    ]);
    let saCount = 0;
    for (const p of PERMISSIONS) {
        const key = `${p.resource}:${p.action}`;
        if (!SA_FORBIDDEN.has(key)) {
            const pid = permIds[key];
            if (pid) {
                await db.run('INSERT OR IGNORE INTO rbac_role_permissions (role_id, permission_id) VALUES (?, ?)', ['role-super_admin', pid]);
                saCount++;
            }
        }
    }
    console.log(`  → super_admin: ${saCount} permissions (infrastructure, NOT business authority)\n`);

    // platform_security: security control subset
    const SECURITY_PERMS = [
        'key:rotate', 'privileged_access:monitor', 'session_recording:review',
        'api_access:approve', 'incident:declare', 'incident:resolve',
        'support_session:approve',
        'platform_metrics:view', 'system_health:view', 'node_status:view',
    ];
    let secCount = 0;
    for (const pk of SECURITY_PERMS) {
        const pid = permIds[pk];
        if (pid) {
            await db.run('INSERT OR IGNORE INTO rbac_role_permissions (role_id, permission_id) VALUES (?, ?)', ['role-platform_security', pid]);
            secCount++;
        }
    }
    console.log(`  → platform_security: ${secCount} permissions (security control)\n`);

    // data_gov_officer: data boundary subset
    const DATA_GOV_PERMS = [
        'data_classification:define', 'data_classification:approve',
        'retention_policy:approve', 'gdpr_masking:configure',
        'cross_border_transfer:approve', 'lineage_export:approve',
        'platform_metrics:view',
    ];
    let dgCount = 0;
    for (const pk of DATA_GOV_PERMS) {
        const pid = permIds[pk];
        if (pid) {
            await db.run('INSERT OR IGNORE INTO rbac_role_permissions (role_id, permission_id) VALUES (?, ?)', ['role-data_gov_officer', pid]);
            dgCount++;
        }
    }
    console.log(`  → data_gov_officer: ${dgCount} permissions (data boundary)\n`);

    // CIE v2.0 — global_risk_committee: risk scoring + anomaly
    const GRC_PERMS = ['cie_risk_config:set_weights', 'cie_risk_config:set_threshold', 'platform_metrics:view'];
    let grcCount = 0;
    for (const pk of GRC_PERMS) {
        const pid = permIds[pk];
        if (pid) {
            await db.run('INSERT OR IGNORE INTO rbac_role_permissions (role_id, permission_id) VALUES (?, ?)', ['role-global_risk_committee', pid]);
            grcCount++;
        }
    }
    console.log(`  → global_risk_committee: ${grcCount} permissions (CIE risk config)\n`);

    // CIE v2.0 — ivu_registry_admin: validator registry
    const IRA_PERMS = ['cie_ivu_registry:manage', 'cie_ivu_registry:verify_qual'];
    let iraCount = 0;
    for (const pk of IRA_PERMS) {
        const pid = permIds[pk];
        if (pid) {
            await db.run('INSERT OR IGNORE INTO rbac_role_permissions (role_id, permission_id) VALUES (?, ?)', ['role-ivu_registry_admin', pid]);
            iraCount++;
        }
    }
    console.log(`  → ivu_registry_admin: ${iraCount} permissions (CIE IVU registry)\n`);

    // CIE v2.0 — emission_engine [SYSTEM]: deterministic calc + seal (non-human)
    const EE_PERMS = ['cie_passport:calculate', 'cie_passport:seal'];
    let eeCount = 0;
    for (const pk of EE_PERMS) {
        const pid = permIds[pk];
        if (pid) {
            await db.run('INSERT OR IGNORE INTO rbac_role_permissions (role_id, permission_id) VALUES (?, ?)', ['role-emission_engine', pid]);
            eeCount++;
        }
    }
    console.log(`  → emission_engine [SYSTEM]: ${eeCount} permissions (deterministic calc + seal — non-human)\n`);

    // CIE v3.0 — change_management_officer: system upgrades + change tracking
    const CMO_PERMS = ['cie_change_mgmt:approve_upgrade', 'cie_change_mgmt:track_request', 'cie_change_mgmt:freeze_deploy'];
    let cmoCount = 0;
    for (const pk of CMO_PERMS) {
        const pid = permIds[pk];
        if (pid) {
            await db.run('INSERT OR IGNORE INTO rbac_role_permissions (role_id, permission_id) VALUES (?, ?)', ['role-change_management_officer', pid]);
            cmoCount++;
        }
    }
    console.log(`  → change_management_officer: ${cmoCount} permissions (system change control)\n`);

    // CIE v3.0 — incident_response_lead: incident protocol + anchor freeze
    const IRL_PERMS = ['cie_incident:activate_protocol', 'cie_incident:freeze_anchor', 'cie_incident:trigger_forensic'];
    let irlCount = 0;
    for (const pk of IRL_PERMS) {
        const pid = permIds[pk];
        if (pid) {
            await db.run('INSERT OR IGNORE INTO rbac_role_permissions (role_id, permission_id) VALUES (?, ?)', ['role-incident_response_lead', pid]);
            irlCount++;
        }
    }
    console.log(`  → incident_response_lead: ${irlCount} permissions (incident response)\n`);

    // company_admin template gets ALL tenant + business permissions (NOT platform)
    const tenantAndBizPerms = PERMISSIONS.filter(p => p.level !== 'platform');
    for (const p of tenantAndBizPerms) {
        const pid = permIds[`${p.resource}:${p.action}`];
        await db.run('INSERT OR IGNORE INTO rbac_role_permissions (role_id, permission_id) VALUES (?, ?)', ['role-company_admin', pid]);
    }
    console.log(`  → company_admin: ${tenantAndBizPerms.length} permissions (tenant + business)\n`);

    // ── 3. Seed Default Tenant ──────────────────────────────────────────────
    console.log('🏢 Seeding default tenant...');
    await db.run(
        `INSERT OR IGNORE INTO organizations (id, name, slug, plan, feature_flags, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [DEFAULT_TENANT.id, DEFAULT_TENANT.name, DEFAULT_TENANT.slug, DEFAULT_TENANT.plan, DEFAULT_TENANT.feature_flags, 'active']
    );
    console.log(`  ✓ ${DEFAULT_TENANT.name} (${DEFAULT_TENANT.slug}) [${DEFAULT_TENANT.plan}]\n`);

    // ── 4. Seed Business Roles (within demo tenant) ────────────────────────
    console.log('📋 Seeding business roles for demo tenant...');
    const roleMap = {}; // name → role_id
    for (const r of DEFAULT_BUSINESS_ROLES) {
        const roleId = `role-${DEFAULT_TENANT.id}-${r.name}`;
        roleMap[r.name] = roleId;
        await db.run(
            `INSERT OR IGNORE INTO rbac_roles (id, tenant_id, name, display_name, type, is_system, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [roleId, DEFAULT_TENANT.id, r.name, r.display, 'tenant', 0, r.desc]
        );

        // Map permissions
        let mapped = 0;
        for (const permKey of r.permissions) {
            const pid = permIds[permKey];
            if (pid) {
                await db.run('INSERT OR IGNORE INTO rbac_role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, pid]);
                mapped++;
            } else {
                console.warn(`    ⚠ Permission not found: ${permKey}`);
            }
        }
        console.log(`  ✓ ${r.display}: ${mapped} permissions`);
    }

    // Also create a company_admin role for this specific tenant
    const companyAdminRoleId = `role-${DEFAULT_TENANT.id}-company_admin`;
    roleMap['company_admin'] = companyAdminRoleId;
    await db.run(
        `INSERT OR IGNORE INTO rbac_roles (id, tenant_id, name, display_name, type, is_system, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [companyAdminRoleId, DEFAULT_TENANT.id, 'company_admin', 'Company Admin', 'system', 1, 'Tenant administrator']
    );
    for (const p of tenantAndBizPerms) {
        const pid = permIds[`${p.resource}:${p.action}`];
        await db.run('INSERT OR IGNORE INTO rbac_role_permissions (role_id, permission_id) VALUES (?, ?)', [companyAdminRoleId, pid]);
    }
    console.log(`  ✓ Company Admin (tenant-scoped): ${tenantAndBizPerms.length} permissions\n`);

    // ── 5. Seed Test Users ──────────────────────────────────────────────────
    console.log('👤 Creating test users...');
    let totalUsers = 0;
    for (const u of TEST_USERS) {
        const existing = await db.get('SELECT id FROM users WHERE email = ?', [u.email]);
        let userId;

        if (existing) {
            userId = existing.id;
            // Update role, user_type, org_id, must_change_password
            await db.run('UPDATE users SET role = ?, user_type = ?, org_id = ?, email = ?, must_change_password = ? WHERE id = ?',
                [u.role, u.user_type, DEFAULT_TENANT.id, u.email, u.must_change_password || 0, userId]);
            console.log(`  ↻ ${u.email} (updated → ${u.role})`);
        } else {
            userId = uuidv4();
            const displayName = u.email.split('@')[0];
            const hash = await bcrypt.hash(u.password, 12);
            await db.run(
                'INSERT OR IGNORE INTO users (id, username, email, password_hash, role, user_type, company, org_id, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [userId, displayName, u.email, hash, u.role, u.user_type, u.company, DEFAULT_TENANT.id, u.must_change_password || 0]
            );
            console.log(`  ✓ ${u.email} (${u.role}) [${u.user_type}]`);
        }

        // Assign RBAC role
        const rbacRoleId = roleMap[u.rbac_role];
        if (rbacRoleId) {
            await db.run('INSERT OR IGNORE INTO rbac_user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)', [userId, rbacRoleId, 'seed-script']);
        }
        totalUsers++;
    }

    // ── 6. Link existing admin user to platform role + set email ──────────
    const adminUser = await db.get("SELECT id FROM users WHERE role = 'super_admin'");
    if (adminUser) {
        await db.run("UPDATE users SET user_type = 'platform', email = COALESCE(NULLIF(email, ''), 'admin@trustchecker.io') WHERE id = ?", [adminUser.id]);
        await db.run('INSERT OR IGNORE INTO rbac_user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)',
            [adminUser.id, 'role-super_admin', 'seed-script']);
        console.log(`  ✓ admin → super_admin (platform) linked [email: admin@trustchecker.io]`);
    }

    // ── Summary ─────────────────────────────────────────────────────────────
    const totalRoles = await db.get('SELECT COUNT(*) as c FROM rbac_roles');
    const totalPerms = await db.get('SELECT COUNT(*) as c FROM rbac_permissions');
    const totalMaps = await db.get('SELECT COUNT(*) as c FROM rbac_role_permissions');
    const totalUR = await db.get('SELECT COUNT(*) as c FROM rbac_user_roles');

    console.log(`
═══════════════════════════════════════════
  RBAC v2 SEED COMPLETE (Hierarchical Multi-Tenant)

  Tenants:       1 (${DEFAULT_TENANT.name})
  Roles:         ${totalRoles?.c || '?'}
  Permissions:   ${totalPerms?.c || '?'} (P:${levels.platform} T:${levels.tenant} B:${levels.business})
  Mappings:      ${totalMaps?.c || '?'}
  User→Roles:    ${totalUR?.c || '?'}
  Users Created: ${totalUsers}
═══════════════════════════════════════════
`);

    // ── Flush to disk ───────────────────────────────────────────────────────
    if (typeof db.save === 'function') {
        console.log('💾 Saving database to disk...');
        await db.save();
        console.log('✅ Database saved.');
    }

    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
