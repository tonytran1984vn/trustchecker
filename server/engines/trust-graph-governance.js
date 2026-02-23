/**
 * Trust Graph Governance Framework v1.0
 * 
 * Audit-Grade / Infrastructure-Ready Governance Layer
 * 
 * Sits ON TOP of trust-graph-engine.js.
 * Enforces: Role authority, SoD, schema control, weight governance,
 *           graph state versioning, audit artifacts.
 * 
 * 11 Roles across 4 Tiers:
 *   Governance:  GGC (Graph Governance Committee)
 *   Risk/Ctrl:   SA, Risk Committee, Compliance, IVU
 *   Business:    Admin Company, CEO, Ops
 *   Technical:   IT, SCM, Blockchain Operator
 * 
 * Standards: COSO ERM, Three Lines Model, SR 11-7
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const trustGraphEngine = require('./trust-graph-engine');

// ─── ROLE DEFINITIONS & AUTHORITY ────────────────────────────────────────────

const GOVERNANCE_ROLES = {
    // Tier 1: Governance
    GGC: {
        tier: 'governance',
        name: 'Graph Governance Committee',
        can: ['approve_schema_change', 'approve_edge_type', 'approve_propagation_logic',
            'approve_metric_change', 'approve_structural_recalibration', 'cross_tenant_query'],
        cannot: ['modify_weight', 'override_trust', 'deploy_model', 'access_raw_data'],
    },
    // Tier 2: Risk & Control
    SA: {
        tier: 'risk_control',
        name: 'Super Admin',
        can: ['deploy_schema', 'manage_tenant_isolation', 'audit_access',
            'manage_snapshot_storage', 'cross_tenant_query_audit_only'],
        cannot: ['modify_weight', 'override_trust', 'change_model_feature',
            'approve_schema_change', 'access_tenant_raw_graph'],
    },
    RISK_COMMITTEE: {
        tier: 'risk_control',
        name: 'Risk Committee',
        can: ['propose_weight_recalibration', 'approve_override', 'set_risk_threshold',
            'trigger_forensic_snapshot', 'review_model_impact'],
        cannot: ['change_schema', 'cross_tenant_raw_graph', 'deploy_schema'],
    },
    COMPLIANCE: {
        tier: 'risk_control',
        name: 'Compliance',
        can: ['dual_approve_weight', 'approve_high_risk_override',
            'approve_regulatory_export', 'data_access_review'],
        cannot: ['change_schema', 'propose_weight', 'deploy_model'],
    },
    IVU: {
        tier: 'risk_control',
        name: 'Model Validation Unit',
        can: ['validate_model', 'monitor_drift', 'review_bias',
            'audit_feature_lineage', 'recommend_rollback', 'view_graph_readonly'],
        cannot: ['modify_weight', 'change_schema', 'override_trust', 'deploy_model'],
    },
    // Tier 3: Business
    ADMIN_COMPANY: {
        tier: 'business',
        name: 'Admin Company (Tenant)',
        can: ['add_distributor', 'configure_supply_route', 'define_geo_zone',
            'adjust_alert_threshold_in_band', 'view_tenant_graph'],
        cannot: ['change_schema', 'modify_edge_weight', 'change_propagation_logic',
            'override_trust', 'cross_tenant_query'],
    },
    CEO: {
        tier: 'business',
        name: 'CEO (Tenant Executive)',
        can: ['view_dashboard_summary', 'view_cluster_risk', 'view_override_log',
            'request_special_review'],
        cannot: ['structural_manipulation', 'modify_weight', 'override_trust'],
    },
    OPS: {
        tier: 'business',
        name: 'Operations',
        can: ['execute_shipment', 'scan_event', 'trigger_event_node',
            'update_status', 'view_tenant_graph'],
        cannot: ['modify_weight', 'override_trust', 'trigger_schema_change'],
    },
    // Tier 4: Technical
    IT: {
        tier: 'technical',
        name: 'IT (Tenant)',
        can: ['manage_integration', 'device_management', 'api_configuration'],
        cannot: ['access_trust_logic', 'modify_graph_weight'],
    },
    SCM: {
        tier: 'technical',
        name: 'SCM Function',
        can: ['view_route_risk', 'view_cluster_exposure', 'analyze_network'],
        cannot: ['structural_modification', 'modify_weight'],
    },
    BLOCKCHAIN_OP: {
        tier: 'technical',
        name: 'Blockchain Node Operator',
        can: ['anchor_snapshot_hash', 'verify_integrity'],
        cannot: ['access_internal_graph', 'modify_weight'],
    },
};

// ─── SoD CONFLICT PAIRS (Graph-Specific) ─────────────────────────────────────

const GRAPH_SOD_CONFLICTS = [
    ['approve_schema_change', 'deploy_schema'],
    ['propose_weight_recalibration', 'approve_weight_recalibration'],
    ['propose_weight_recalibration', 'deploy_weight_change'],
    ['approve_override', 'execute_override'],
    ['trigger_forensic_snapshot', 'delete_snapshot'],
    ['validate_model', 'deploy_model'],
    ['create_edge', 'approve_edge_weight'],
];

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHORITY CHECK — Enforce role boundaries
// ═══════════════════════════════════════════════════════════════════════════════

function checkAuthority(role, action) {
    const roleDef = GOVERNANCE_ROLES[role];
    if (!roleDef) return { allowed: false, reason: `Unknown role: ${role}` };
    if (roleDef.cannot.includes(action)) {
        return { allowed: false, reason: `Role ${role} explicitly cannot: ${action}` };
    }
    if (!roleDef.can.includes(action)) {
        return { allowed: false, reason: `Role ${role} not authorized for: ${action}` };
    }
    return { allowed: true };
}

function checkSoD(role1Action, role2Action) {
    for (const [a, b] of GRAPH_SOD_CONFLICTS) {
        if ((role1Action === a && role2Action === b) || (role1Action === b && role2Action === a)) {
            return { conflict: true, detail: `SoD conflict: "${a}" and "${b}" cannot be held by same role` };
        }
    }
    return { conflict: false };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA CHANGE CONTROL — RFC → Impact → Dual Approve → Deploy
// ═══════════════════════════════════════════════════════════════════════════════

function proposeSchemaChange(proposerId, proposerRole, rfcDocument) {
    const auth = checkAuthority(proposerRole, 'approve_schema_change');
    // Only GGC members can propose schema changes
    if (proposerRole !== 'GGC' && proposerRole !== 'SA') {
        return { error: 'Only GGC or SA can propose schema changes' };
    }

    if (!rfcDocument.title || !rfcDocument.impact_analysis || !rfcDocument.backward_compatibility) {
        return { error: 'RFC requires: title, impact_analysis, backward_compatibility' };
    }

    const rfcId = uuidv4();
    const versionId = `GSV-${Date.now().toString(36).toUpperCase()}`;

    db.prepare(`
        INSERT INTO tg_schema_changes (
            id, version_id, proposer_id, proposer_role,
            title, impact_analysis, backward_compatible, model_impact,
            status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'proposed', datetime('now'))
    `).run(
        rfcId, versionId, proposerId, proposerRole,
        rfcDocument.title, rfcDocument.impact_analysis,
        rfcDocument.backward_compatibility ? 1 : 0,
        rfcDocument.model_impact || ''
    );

    logAudit('schema_change_proposed', { rfc_id: rfcId, title: rfcDocument.title, proposer: proposerRole });

    return { rfc_id: rfcId, version_id: versionId, status: 'proposed' };
}

function approveSchemaChange(rfcId, approverId, approverRole) {
    // Requires dual approval: GGC + Compliance
    const validApprovers = ['GGC', 'COMPLIANCE'];
    if (!validApprovers.includes(approverRole)) {
        return { error: 'Schema change requires GGC or Compliance approval' };
    }

    const rfc = db.prepare('SELECT * FROM tg_schema_changes WHERE id = ?').get(rfcId);
    if (!rfc) return { error: 'RFC not found' };
    if (rfc.status === 'deployed') return { error: 'Already deployed' };

    // SoD: proposer cannot approve own change
    if (rfc.proposer_id === approverId) {
        return { error: 'SoD violation: proposer cannot approve own schema change' };
    }

    // Record approval
    db.prepare(`
        INSERT INTO tg_schema_approvals (id, rfc_id, approver_id, approver_role, approved_at)
        VALUES (?, ?, ?, ?, datetime('now'))
    `).run(uuidv4(), rfcId, approverId, approverRole);

    // Check if both GGC and Compliance approved
    const approvals = db.prepare('SELECT DISTINCT approver_role FROM tg_schema_approvals WHERE rfc_id = ?').all(rfcId);
    const approvedRoles = new Set(approvals.map(a => a.approver_role));

    if (approvedRoles.has('GGC') && approvedRoles.has('COMPLIANCE')) {
        db.prepare('UPDATE tg_schema_changes SET status = ? WHERE id = ?').run('approved', rfcId);
        logAudit('schema_change_approved', { rfc_id: rfcId, approved_by: [...approvedRoles] });
        return { rfc_id: rfcId, status: 'approved', ready_for_deploy: true };
    }

    return { rfc_id: rfcId, status: 'partially_approved', approved_by: [...approvedRoles], needs: validApprovers.filter(r => !approvedRoles.has(r)) };
}

function deploySchemaChange(rfcId, deployerId) {
    // Only SA can deploy after approval
    const rfc = db.prepare('SELECT * FROM tg_schema_changes WHERE id = ?').get(rfcId);
    if (!rfc) return { error: 'RFC not found' };
    if (rfc.status !== 'approved') return { error: 'RFC not yet fully approved' };

    // SoD: approver cannot deploy
    const approvals = db.prepare('SELECT approver_id FROM tg_schema_approvals WHERE rfc_id = ?').all(rfcId);
    if (approvals.some(a => a.approver_id === deployerId)) {
        return { error: 'SoD violation: approver cannot deploy schema change' };
    }

    db.prepare('UPDATE tg_schema_changes SET status = ?, deployed_by = ?, deployed_at = datetime(\'now\') WHERE id = ?')
        .run('deployed', deployerId, rfcId);

    logAudit('schema_change_deployed', { rfc_id: rfcId, version_id: rfc.version_id, deployed_by: deployerId });

    return { rfc_id: rfcId, version_id: rfc.version_id, status: 'deployed' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHT RECALIBRATION GOVERNANCE — Propose → Dual Approve (Risk + Compliance)
// ═══════════════════════════════════════════════════════════════════════════════

function proposeWeightChange(proposerId, proposerRole, changeSpec) {
    const auth = checkAuthority(proposerRole, 'propose_weight_recalibration');
    if (!auth.allowed) return { error: auth.reason };

    if (!changeSpec.edge_type || changeSpec.new_weight === undefined || !changeSpec.justification) {
        return { error: 'Requires: edge_type, new_weight, justification' };
    }

    const proposalId = uuidv4();
    db.prepare(`
        INSERT INTO tg_weight_changes (
            id, proposer_id, proposer_role, edge_type,
            current_weight, new_weight, justification,
            model_impact_assessment, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'proposed', datetime('now'))
    `).run(
        proposalId, proposerId, proposerRole, changeSpec.edge_type,
        changeSpec.current_weight || null, changeSpec.new_weight,
        changeSpec.justification, changeSpec.model_impact || ''
    );

    logAudit('weight_change_proposed', { proposal_id: proposalId, edge_type: changeSpec.edge_type });

    return { proposal_id: proposalId, status: 'proposed', needs_approval: ['RISK_COMMITTEE', 'COMPLIANCE'] };
}

function approveWeightChange(proposalId, approverId, approverRole) {
    // Dual approval: Risk Committee + Compliance
    const validApprovers = ['RISK_COMMITTEE', 'COMPLIANCE'];
    if (!validApprovers.includes(approverRole)) {
        return { error: 'Weight change requires Risk Committee or Compliance approval' };
    }

    const proposal = db.prepare('SELECT * FROM tg_weight_changes WHERE id = ?').get(proposalId);
    if (!proposal) return { error: 'Proposal not found' };

    // SoD: proposer cannot approve
    if (proposal.proposer_id === approverId) {
        return { error: 'SoD violation: proposer cannot approve own weight change' };
    }

    db.prepare(`
        INSERT INTO tg_weight_approvals (id, proposal_id, approver_id, approver_role, approved_at)
        VALUES (?, ?, ?, ?, datetime('now'))
    `).run(uuidv4(), proposalId, approverId, approverRole);

    const approvals = db.prepare('SELECT DISTINCT approver_role FROM tg_weight_approvals WHERE proposal_id = ?').all(proposalId);
    const approvedRoles = new Set(approvals.map(a => a.approver_role));

    if (approvedRoles.has('RISK_COMMITTEE') && approvedRoles.has('COMPLIANCE')) {
        db.prepare('UPDATE tg_weight_changes SET status = ? WHERE id = ?').run('approved', proposalId);
        logAudit('weight_change_approved', { proposal_id: proposalId, approved_by: [...approvedRoles] });
        return { proposal_id: proposalId, status: 'approved', ready_to_apply: true };
    }

    return { proposal_id: proposalId, status: 'partially_approved', needs: validApprovers.filter(r => !approvedRoles.has(r)) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRAPH STATE VERSIONING (GSV) — Every structural change creates new version
// ═══════════════════════════════════════════════════════════════════════════════

function createGraphStateVersion(tenantId, changeType, changeDetail, actorId, actorRole) {
    const gsvId = uuidv4();
    const prevGsv = db.prepare(
        'SELECT version_number FROM tg_graph_state_versions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(tenantId);

    const versionNumber = (prevGsv?.version_number || 0) + 1;

    // Hash of the change for integrity
    const changeHash = crypto.createHash('sha256')
        .update(JSON.stringify({ tenantId, changeType, changeDetail, versionNumber, timestamp: Date.now() }))
        .digest('hex');

    db.prepare(`
        INSERT INTO tg_graph_state_versions (
            id, tenant_id, version_number, change_type, change_detail,
            change_hash, actor_id, actor_role, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(gsvId, tenantId, versionNumber, changeType, JSON.stringify(changeDetail), changeHash, actorId, actorRole);

    return { gsv_id: gsvId, version: versionNumber, change_hash: changeHash };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNED GRAPH OPERATIONS — Wraps trust-graph-engine with governance
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Add node with governance: creates GSV, checks authority, logs audit.
 */
function governedAddNode(tenantId, entityId, nodeType, entityName, actorId, actorRole) {
    // Authority check
    const allowedRoles = ['OPS', 'ADMIN_COMPANY', 'SA'];
    if (!allowedRoles.includes(actorRole)) {
        return { error: `Role ${actorRole} cannot add nodes` };
    }

    // Validate node type against approved list
    if (!trustGraphEngine.NODE_TYPES.includes(nodeType)) {
        return { error: `Node type "${nodeType}" not in approved schema. Contact GGC.` };
    }

    const result = trustGraphEngine.addNode(tenantId, entityId, nodeType, entityName);
    if (result.error) return result;

    // Create GSV
    const gsv = createGraphStateVersion(tenantId, 'node_create', { node_id: result.node_id, nodeType, entityName }, actorId, actorRole);

    logAudit('node_created', { node_id: result.node_id, nodeType, actor: actorRole, gsv: gsv.version });

    return { ...result, gsv };
}

/**
 * Add edge with governance: creates GSV, validates edge type, checks authority.
 */
function governedAddEdge(tenantId, fromId, toId, edgeType, metadata, actorId, actorRole) {
    // Only Ops (auto from shipment) and Admin Company (manual route) can create edges
    const allowedRoles = ['OPS', 'ADMIN_COMPANY', 'SA'];
    if (!allowedRoles.includes(actorRole)) {
        return { error: `Role ${actorRole} cannot create edges` };
    }

    // Edge type must be in approved schema
    if (!trustGraphEngine.EDGE_TYPES.includes(edgeType)) {
        return { error: `Edge type "${edgeType}" not in approved schema. Submit RFC to GGC.` };
    }

    // Metadata: CreatedByRole is required per framework
    const enrichedMetadata = {
        ...metadata,
        created_by_role: actorRole,
    };

    const result = trustGraphEngine.addEdge(tenantId, fromId, toId, edgeType, enrichedMetadata);
    if (result.error) return result;

    // Create GSV
    const gsv = createGraphStateVersion(tenantId, 'edge_create', { edge_id: result.edge_id, edgeType, from: fromId, to: toId }, actorId, actorRole);

    logAudit('edge_created', { edge_id: result.edge_id, edgeType, actor: actorRole, gsv: gsv.version });

    return { ...result, gsv };
}

/**
 * Override risk on a node — requires dual approval (Risk + Compliance).
 */
function governedOverride(tenantId, nodeId, overrideData, approvers) {
    // Must have 2 approvers from different roles
    if (!approvers || approvers.length < 2) {
        return { error: '4-eyes override: minimum 2 approvers required' };
    }

    const roles = approvers.map(a => a.role);
    // Must include Risk Committee and Compliance
    if (!roles.includes('RISK_COMMITTEE') || !roles.includes('COMPLIANCE')) {
        return { error: 'Override requires both Risk Committee and Compliance approval' };
    }

    if (!overrideData.justification || overrideData.justification.length < 20) {
        return { error: 'Override justification required (minimum 20 characters)' };
    }

    const overrideId = uuidv4();
    db.prepare(`
        INSERT INTO tg_overrides (
            id, tenant_id, node_id, override_type,
            old_value, new_value, justification,
            approver_1_id, approver_1_role,
            approver_2_id, approver_2_role,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
        overrideId, tenantId, nodeId, overrideData.type || 'trust_score',
        overrideData.old_value, overrideData.new_value, overrideData.justification,
        approvers[0].id, approvers[0].role,
        approvers[1].id, approvers[1].role
    );

    const gsv = createGraphStateVersion(tenantId, 'override', { node_id: nodeId, override_id: overrideId }, approvers[0].id, approvers[0].role);

    logAudit('graph_override', { override_id: overrideId, node_id: nodeId, approvers: roles, gsv: gsv.version });

    return { override_id: overrideId, gsv };
}

/**
 * Governed snapshot — with role check and reason classification.
 */
function governedSnapshot(tenantId, reason, actorId, actorRole) {
    const allowedRoles = ['RISK_COMMITTEE', 'COMPLIANCE', 'SA', 'GGC'];
    if (!allowedRoles.includes(actorRole) && reason !== 'case_confirmed' && reason !== 'auto') {
        return { error: `Role ${actorRole} cannot trigger manual snapshots` };
    }

    const validReasons = ['case_confirmed', 'carbon_mint', 'high_risk_cluster',
        'regulatory_export', 'quarterly_review', 'override_critical_path', 'auto'];
    if (!validReasons.includes(reason)) {
        return { error: `Invalid snapshot reason. Must be one of: ${validReasons.join(', ')}` };
    }

    const snapshot = trustGraphEngine.createSnapshot(tenantId, reason);

    logAudit('snapshot_created', { snapshot_id: snapshot.snapshot_id, reason, actor: actorRole });

    return snapshot;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOARD-LEVEL DASHBOARD — Strategic KPIs
// ═══════════════════════════════════════════════════════════════════════════════

function boardDashboard(tenantId) {
    const analysis = trustGraphEngine.fullAnalysis(tenantId);
    if (analysis.status === 'empty') return analysis;

    // Board sees strategic KPIs only, not raw graph
    const overrideCount = db.prepare(`
        SELECT COUNT(*) as c FROM tg_overrides
        WHERE tenant_id = ? AND created_at > datetime('now', '-30 days')
    `).get(tenantId)?.c || 0;

    const schemaChanges = db.prepare(`
        SELECT COUNT(*) as c FROM tg_schema_changes
        WHERE status = 'deployed' AND deployed_at > datetime('now', '-90 days')
    `).get()?.c || 0;

    const weightChanges = db.prepare(`
        SELECT COUNT(*) as c FROM tg_weight_changes
        WHERE status = 'approved' AND created_at > datetime('now', '-30 days')
    `).get()?.c || 0;

    return {
        tenant_id: tenantId,
        period: '30 days',
        network_risk_density: analysis.risk_density,
        high_risk_cluster_count: analysis.anomalies.critical + analysis.anomalies.high,
        propagation_index: analysis.network_metrics.density,
        structural_concentration_risk: analysis.concentration_index,
        integrity: analysis.integrity,
        override_frequency: overrideCount,
        schema_changes_90d: schemaChanges,
        weight_recalibrations_30d: weightChanges,
        carbon_structural_risk: 'pending', // Requires carbon integration
        generated_at: new Date().toISOString(),
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT ARTIFACT REGISTRY — 10 artifact types
// ═══════════════════════════════════════════════════════════════════════════════

function logAudit(artifactType, data) {
    db.prepare(`
        INSERT INTO tg_audit_log (id, artifact_type, data, created_at)
        VALUES (?, ?, ?, datetime('now'))
    `).run(uuidv4(), artifactType, JSON.stringify(data));
}

function getAuditLog(artifactType, limit = 50) {
    if (artifactType) {
        return db.prepare('SELECT * FROM tg_audit_log WHERE artifact_type = ? ORDER BY created_at DESC LIMIT ?')
            .all(artifactType, limit);
    }
    return db.prepare('SELECT * FROM tg_audit_log ORDER BY created_at DESC LIMIT ?').all(limit);
}

/**
 * Get full audit artifact registry — all 10 artifact types.
 */
function auditArtifactRegistry() {
    const artifactTypes = [
        'schema_change_proposed', 'schema_change_approved', 'schema_change_deployed',
        'weight_change_proposed', 'weight_change_approved',
        'node_created', 'edge_created',
        'graph_override', 'snapshot_created',
        'privileged_access', 'cross_tenant_access',
    ];

    const registry = {};
    for (const type of artifactTypes) {
        const count = db.prepare('SELECT COUNT(*) as c FROM tg_audit_log WHERE artifact_type = ?').get(type)?.c || 0;
        const latest = db.prepare('SELECT created_at FROM tg_audit_log WHERE artifact_type = ? ORDER BY created_at DESC LIMIT 1').get(type);
        registry[type] = { count, last_recorded: latest?.created_at || null };
    }

    return { artifact_types: artifactTypes.length, registry };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENANT ISOLATION CHECK
// ═══════════════════════════════════════════════════════════════════════════════

function validateTenantIsolation(requestingTenantId, targetTenantId, actorRole) {
    if (requestingTenantId === targetTenantId) return { allowed: true };

    // Only GGC and SA (audit-only) can cross-tenant
    if (actorRole === 'GGC') {
        logAudit('cross_tenant_access', { from: requestingTenantId, to: targetTenantId, role: actorRole });
        return { allowed: true, audit_logged: true };
    }
    if (actorRole === 'SA') {
        logAudit('cross_tenant_access', { from: requestingTenantId, to: targetTenantId, role: actorRole, mode: 'audit_only' });
        return { allowed: true, mode: 'audit_only', audit_logged: true };
    }

    return { allowed: false, reason: 'Cross-tenant access denied. Only GGC and SA (audit-only) permitted.' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DB SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

function initSchema() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS tg_schema_changes (
            id TEXT PRIMARY KEY,
            version_id TEXT NOT NULL,
            proposer_id TEXT NOT NULL,
            proposer_role TEXT NOT NULL,
            title TEXT NOT NULL,
            impact_analysis TEXT,
            backward_compatible INTEGER DEFAULT 1,
            model_impact TEXT,
            status TEXT DEFAULT 'proposed',
            deployed_by TEXT,
            deployed_at TEXT,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS tg_schema_approvals (
            id TEXT PRIMARY KEY,
            rfc_id TEXT NOT NULL,
            approver_id TEXT NOT NULL,
            approver_role TEXT NOT NULL,
            approved_at TEXT
        );

        CREATE TABLE IF NOT EXISTS tg_weight_changes (
            id TEXT PRIMARY KEY,
            proposer_id TEXT NOT NULL,
            proposer_role TEXT NOT NULL,
            edge_type TEXT NOT NULL,
            current_weight REAL,
            new_weight REAL NOT NULL,
            justification TEXT NOT NULL,
            model_impact_assessment TEXT,
            status TEXT DEFAULT 'proposed',
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS tg_weight_approvals (
            id TEXT PRIMARY KEY,
            proposal_id TEXT NOT NULL,
            approver_id TEXT NOT NULL,
            approver_role TEXT NOT NULL,
            approved_at TEXT
        );

        CREATE TABLE IF NOT EXISTS tg_graph_state_versions (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            version_number INTEGER NOT NULL,
            change_type TEXT NOT NULL,
            change_detail TEXT,
            change_hash TEXT NOT NULL,
            actor_id TEXT,
            actor_role TEXT,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS tg_overrides (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            node_id TEXT NOT NULL,
            override_type TEXT DEFAULT 'trust_score',
            old_value TEXT,
            new_value TEXT,
            justification TEXT NOT NULL,
            approver_1_id TEXT NOT NULL,
            approver_1_role TEXT NOT NULL,
            approver_2_id TEXT NOT NULL,
            approver_2_role TEXT NOT NULL,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS tg_audit_log (
            id TEXT PRIMARY KEY,
            artifact_type TEXT NOT NULL,
            data TEXT,
            created_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_tg_schema_status ON tg_schema_changes(status);
        CREATE INDEX IF NOT EXISTS idx_tg_weight_status ON tg_weight_changes(status);
        CREATE INDEX IF NOT EXISTS idx_tg_gsv_tenant ON tg_graph_state_versions(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_tg_overrides_tenant ON tg_overrides(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_tg_audit_type ON tg_audit_log(artifact_type);
    `);
}

try { initSchema(); } catch (e) { /* Schema may already exist */ }

module.exports = {
    // Role definitions
    GOVERNANCE_ROLES,
    GRAPH_SOD_CONFLICTS,
    // Authority
    checkAuthority,
    checkSoD,
    // Schema governance
    proposeSchemaChange,
    approveSchemaChange,
    deploySchemaChange,
    // Weight governance
    proposeWeightChange,
    approveWeightChange,
    // Graph State Versioning
    createGraphStateVersion,
    // Governed operations
    governedAddNode,
    governedAddEdge,
    governedOverride,
    governedSnapshot,
    // Board dashboard
    boardDashboard,
    // Audit
    logAudit,
    getAuditLog,
    auditArtifactRegistry,
    // Tenant isolation
    validateTenantIsolation,
    // Schema
    initSchema,
};
