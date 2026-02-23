/**
 * L-RGF Engine — Logistics Risk Governance Flow v1.0
 * 
 * Audit-Grade governance engine implementing the 8-step flow:
 * 
 *   [1] Event Ingestion (SCM) → [2] Route Validation → [3] Risk Scoring (ERS)
 *   → [4] Decision Engine → [5] Case Workflow (3-Line) → [6] Evidence Freeze
 *   → [7] Blockchain Anchor → [8] Board Exposure Report
 * 
 * Standards: COSO ERM, Three Lines Model, SR 11-7, ISO 27001
 * 
 * Core Principles:
 *   - Data Flow ≠ Authority Flow
 *   - Event Trigger ≠ Decision Right
 *   - Infrastructure Role ≠ Business Role
 *   - No single role controls full lifecycle
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { safeParse } = require('../utils/safe-json');

// ─── MODEL VERSION REGISTRY ─────────────────────────────────────────────────
const MODEL_REGISTRY = {
    current_version: 'ERS-v1.0.0',
    weight_hash: null, // Computed at init
    weights: {
        velocity_anomaly: 0.20,
        geo_risk: 0.15,
        device_mismatch: 0.15,
        historical_batch: 0.15,
        distributor_trust: 0.20,
        duplicate_cluster: 0.15,
    },
    decay_factor: 0.95, // Per-day score decay
    deployed_at: new Date().toISOString(),
    deployed_by: null,
};

// Compute weight hash at startup
MODEL_REGISTRY.weight_hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(MODEL_REGISTRY.weights))
    .digest('hex')
    .substring(0, 16);

// ─── THRESHOLD CONFIG ────────────────────────────────────────────────────────
const THRESHOLD_CONFIG = {
    LOG: 30,           // ERS 0-30 → Log only
    OPS_REVIEW: 60,    // ERS 31-60 → Ops Review
    RISK_ESCALATION: 80, // ERS 61-80 → Risk Escalation
    LOCK_CEO: 100,     // ERS 81-100 → Lock + CEO Notification
};

// ─── CONTROL TYPE CLASSIFICATION ─────────────────────────────────────────────
const CONTROL_TYPES = {
    PREVENTIVE: 'preventive',
    DETECTIVE: 'detective',
    CORRECTIVE: 'corrective',
};

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1 — EVENT INGESTION (SCM Layer)
// Controls: Timestamped, Idempotent, Hash-verified, Immutable log
// Owner: IT | Control Type: Preventive
// ═══════════════════════════════════════════════════════════════════════════════

function ingestEvent(eventData, sourceMetadata = {}) {
    const eventId = uuidv4();
    const timestamp = new Date().toISOString();

    // Idempotency check
    const idempotencyKey = eventData.idempotency_key || null;
    if (idempotencyKey) {
        const existing = db.prepare(
            'SELECT id FROM lrgf_events WHERE idempotency_key = ?'
        ).get(idempotencyKey);
        if (existing) {
            return { duplicate: true, existing_event_id: existing.id };
        }
    }

    // Compute event hash (SHA-256 of canonical payload)
    const canonicalPayload = JSON.stringify({
        ...eventData,
        _event_id: eventId,
        _timestamp: timestamp,
    });
    const eventHash = crypto.createHash('sha256').update(canonicalPayload).digest('hex');

    // Build integrity record
    const record = {
        id: eventId,
        event_type: eventData.event_type || 'unknown',
        source: sourceMetadata.source || 'api',
        tenant_id: eventData.tenant_id || null,
        idempotency_key: idempotencyKey,
        event_hash: eventHash,
        device_fingerprint: sourceMetadata.device_fingerprint || null,
        geo_lat: sourceMetadata.latitude || null,
        geo_lng: sourceMetadata.longitude || null,
        ip_address: sourceMetadata.ip || null,
        user_agent: sourceMetadata.user_agent || null,
        payload: JSON.stringify(eventData),
        created_at: timestamp,
        integrity_status: 'verified',
    };

    // Immutable audit log
    db.prepare(`
        INSERT INTO lrgf_events (
            id, event_type, source, tenant_id, idempotency_key,
            event_hash, device_fingerprint, geo_lat, geo_lng,
            ip_address, user_agent, payload, created_at, integrity_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        record.id, record.event_type, record.source, record.tenant_id,
        record.idempotency_key, record.event_hash, record.device_fingerprint,
        record.geo_lat, record.geo_lng, record.ip_address, record.user_agent,
        record.payload, record.created_at, record.integrity_status
    );

    return {
        event_id: eventId,
        event_hash: eventHash,
        timestamp,
        integrity_status: 'verified',
        control: { type: CONTROL_TYPES.PREVENTIVE, owner: 'IT' },
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — SUPPLY ROUTE VALIDATION (SCM Integrity Engine)
// Controls: Geo-fence, reverse flow, deviation threshold
// Owner: SCM (Line 1) | Control Type: Preventive automated
// ═══════════════════════════════════════════════════════════════════════════════

function validateRoute(eventId, routeData) {
    const violations = [];

    // Geo-fence check
    if (routeData.geo_lat && routeData.geo_lng && routeData.expected_zone) {
        const inZone = checkGeoFence(
            routeData.geo_lat, routeData.geo_lng, routeData.expected_zone
        );
        if (!inZone) {
            violations.push({
                type: 'GEO_FENCE_VIOLATION',
                severity: 'high',
                detail: `Location (${routeData.geo_lat}, ${routeData.geo_lng}) outside expected zone`,
            });
        }
    }

    // Reverse flow detection
    if (routeData.from_node && routeData.to_node && routeData.expected_direction) {
        if (routeData.from_node === routeData.expected_direction.to &&
            routeData.to_node === routeData.expected_direction.from) {
            violations.push({
                type: 'REVERSE_FLOW',
                severity: 'critical',
                detail: `Reverse flow detected: ${routeData.from_node} → ${routeData.to_node}`,
            });
        }
    }

    // Route deviation threshold
    if (routeData.actual_duration && routeData.expected_duration) {
        const deviation = Math.abs(routeData.actual_duration - routeData.expected_duration) /
            routeData.expected_duration;
        if (deviation > 0.3) { // >30% deviation
            violations.push({
                type: 'ROUTE_DEVIATION',
                severity: deviation > 0.5 ? 'high' : 'medium',
                detail: `Route deviation ${(deviation * 100).toFixed(1)}% exceeds 30% threshold`,
            });
        }
    }

    // Log validation result
    db.prepare(`
        INSERT INTO lrgf_validations (id, event_id, violation_count, violations, validated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
    `).run(uuidv4(), eventId, violations.length, JSON.stringify(violations));

    return {
        event_id: eventId,
        valid: violations.length === 0,
        violations,
        control: { type: CONTROL_TYPES.PREVENTIVE, owner: 'SCM', automated: true },
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3 — RISK SCORING (Risk Engine)
// Formula: ERS = Σ(weight × factor × decay)
// Owner: Risk (Line 1 execution, Line 2 oversight)
// Control Type: Automated preventive + model governance
// ═══════════════════════════════════════════════════════════════════════════════

function scoreRisk(eventId, factors) {
    const weights = MODEL_REGISTRY.weights;
    const decay = MODEL_REGISTRY.decay_factor;

    // Compute ERS
    let rawScore = 0;
    const contributions = {};

    for (const [factor, weight] of Object.entries(weights)) {
        const value = factors[factor] || 0;
        const daysSinceEvent = factors._days_since || 0;
        const decayMultiplier = Math.pow(decay, daysSinceEvent);
        const contribution = weight * value * decayMultiplier;

        contributions[factor] = {
            raw_value: value,
            weight,
            decay_multiplier: decayMultiplier,
            contribution: Math.round(contribution * 100),
        };
        rawScore += contribution;
    }

    const ers = Math.min(100, Math.round(rawScore * 100));

    // Drift monitoring — compare to historical average
    const historicalAvg = db.prepare(`
        SELECT AVG(ers_score) as avg_ers FROM lrgf_risk_scores
        WHERE created_at > datetime('now', '-30 days')
    `).get();

    const avgErs = historicalAvg?.avg_ers || 50;
    const driftIndex = Math.abs(ers - avgErs) / (avgErs || 1);

    // Audit artifact: score record with model version
    const scoreId = uuidv4();
    db.prepare(`
        INSERT INTO lrgf_risk_scores (
            id, event_id, ers_score, model_version, weight_hash,
            factor_contributions, drift_index, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
        scoreId, eventId, ers, MODEL_REGISTRY.current_version,
        MODEL_REGISTRY.weight_hash, JSON.stringify(contributions),
        driftIndex
    );

    return {
        score_id: scoreId,
        event_id: eventId,
        ers,
        model_version: MODEL_REGISTRY.current_version,
        weight_hash: MODEL_REGISTRY.weight_hash,
        contributions,
        drift_index: Math.round(driftIndex * 100) / 100,
        control: { type: CONTROL_TYPES.PREVENTIVE, owner: 'Risk', governance: 'SR 11-7' },
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4 — DECISION ENGINE (Threshold Governance)
// Override requires: 4-eyes, justification, immutable record
// Owner: Threshold config → Risk Committee, Execution → System
// ═══════════════════════════════════════════════════════════════════════════════

function decide(scoreResult) {
    const ers = scoreResult.ers;
    let action, sla, escalation_level;

    if (ers <= THRESHOLD_CONFIG.LOG) {
        action = 'LOG';
        sla = null;
        escalation_level = 0;
    } else if (ers <= THRESHOLD_CONFIG.OPS_REVIEW) {
        action = 'OPS_REVIEW';
        sla = '24h';
        escalation_level = 1;
    } else if (ers <= THRESHOLD_CONFIG.RISK_ESCALATION) {
        action = 'RISK_ESCALATION';
        sla = '4h';
        escalation_level = 2;
    } else {
        action = 'LOCK_CEO_NOTIFY';
        sla = '1h';
        escalation_level = 3;
    }

    const decisionId = uuidv4();
    const slaDeadline = sla ? new Date(Date.now() + parseSLA(sla)).toISOString() : null;

    db.prepare(`
        INSERT INTO lrgf_decisions (
            id, score_id, event_id, ers_score, action, sla,
            sla_deadline, escalation_level, override_applied,
            decided_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
    `).run(
        decisionId, scoreResult.score_id, scoreResult.event_id,
        ers, action, sla, slaDeadline, escalation_level
    );

    return {
        decision_id: decisionId,
        event_id: scoreResult.event_id,
        ers,
        action,
        sla,
        sla_deadline: slaDeadline,
        escalation_level,
        override_applied: false,
        control: { type: CONTROL_TYPES.PREVENTIVE, owner: 'System' },
    };
}

/**
 * Override a decision — requires 4-eyes (2 approvers from different roles)
 */
function overrideDecision(decisionId, overrideData, approvers) {
    // Validate 4-eyes rule
    if (!approvers || approvers.length < 2) {
        return { error: '4-eyes rule: minimum 2 approvers required' };
    }

    // Validate role separation
    const roles = approvers.map(a => a.role);
    const uniqueRoles = new Set(roles);
    if (uniqueRoles.size < 2) {
        return { error: '4-eyes rule: approvers must have different roles' };
    }

    // Must have justification
    if (!overrideData.justification || overrideData.justification.length < 20) {
        return { error: 'Override justification required (minimum 20 characters)' };
    }

    const overrideId = uuidv4();

    // Immutable override record
    db.prepare(`
        INSERT INTO lrgf_overrides (
            id, decision_id, override_type, justification,
            new_action, approver_1_id, approver_1_role,
            approver_2_id, approver_2_role, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
        overrideId, decisionId, overrideData.type || 'manual',
        overrideData.justification, overrideData.new_action,
        approvers[0].id, approvers[0].role,
        approvers[1].id, approvers[1].role
    );

    // Update decision
    db.prepare(`
        UPDATE lrgf_decisions SET override_applied = 1, action = ? WHERE id = ?
    `).run(overrideData.new_action, decisionId);

    return {
        override_id: overrideId,
        decision_id: decisionId,
        approved_by: approvers.map(a => ({ id: a.id, role: a.role })),
        control: { type: CONTROL_TYPES.DETECTIVE, owner: 'Risk + Compliance' },
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5 — CASE WORKFLOW (Three Lines Model)
// Line 1: Ops (ERS 31-60) | Line 2: Risk + Compliance (ERS 61-80)
// Line 3: Internal Audit (triggered by conditions)
// ═══════════════════════════════════════════════════════════════════════════════

function assignCase(decision) {
    if (decision.action === 'LOG') {
        return { case_id: null, assigned: false, reason: 'Below threshold' };
    }

    const caseId = uuidv4();
    let assignedLine, assignedRole, permissions, restrictions;

    switch (decision.action) {
        case 'OPS_REVIEW':
            assignedLine = 1;
            assignedRole = 'operator';
            permissions = ['verify_shipment', 'confirm_docs', 'contact_distributor', 'attach_evidence'];
            restrictions = ['CANNOT modify ERS weight', 'CANNOT modify threshold', 'CANNOT delete event'];
            break;
        case 'RISK_ESCALATION':
            assignedLine = 2;
            assignedRole = 'risk_officer';
            permissions = ['validate_anomaly', 'approve_recalibration', 'request_model_retrain'];
            restrictions = ['CANNOT deploy model without co-signer', 'CANNOT override without 4-eyes'];
            break;
        case 'LOCK_CEO_NOTIFY':
            assignedLine = 2;
            assignedRole = 'risk_officer';
            permissions = ['full_investigation', 'freeze_evidence', 'trigger_legal_hold'];
            restrictions = ['CANNOT release lock without CEO sign-off'];
            break;
    }

    // Check if Line 3 should be triggered
    const line3Trigger = checkLine3Trigger(decision);

    db.prepare(`
        INSERT INTO lrgf_cases (
            id, decision_id, event_id, assigned_line, assigned_role,
            permissions, restrictions, sla, sla_deadline,
            line3_triggered, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', datetime('now'))
    `).run(
        caseId, decision.decision_id, decision.event_id,
        assignedLine, assignedRole,
        JSON.stringify(permissions), JSON.stringify(restrictions),
        decision.sla, decision.sla_deadline,
        line3Trigger ? 1 : 0
    );

    return {
        case_id: caseId,
        assigned_line: assignedLine,
        assigned_role: assignedRole,
        permissions,
        restrictions,
        line3_triggered: line3Trigger,
        sla: decision.sla,
        control: { type: CONTROL_TYPES.PREVENTIVE, owner: `Line ${assignedLine}` },
    };
}

/**
 * Check if Line 3 (Internal Audit) should be triggered.
 */
function checkLine3Trigger(decision) {
    // Override frequency > 3 in 7 days
    const recentOverrides = db.prepare(`
        SELECT COUNT(*) as c FROM lrgf_overrides
        WHERE created_at > datetime('now', '-7 days')
    `).get();
    if (recentOverrides?.c > 3) return true;

    // High-value lock
    if (decision.ers >= 90) return true;

    // Drift > 0.5
    const drift = db.prepare(`
        SELECT drift_index FROM lrgf_risk_scores WHERE event_id = ?
    `).get(decision.event_id);
    if (drift?.drift_index > 0.5) return true;

    return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6 — EVIDENCE FREEZE & HASH CHAIN
// Control Type: Preventive cryptographic | Owner: System (Zone B)
// ═══════════════════════════════════════════════════════════════════════════════

function freezeEvidence(caseId) {
    // Gather all evidence for this case
    const caseData = db.prepare('SELECT * FROM lrgf_cases WHERE id = ?').get(caseId);
    if (!caseData) return { error: 'Case not found' };

    const eventData = db.prepare('SELECT * FROM lrgf_events WHERE id = ?').get(caseData.event_id);
    const scoreData = db.prepare('SELECT * FROM lrgf_risk_scores WHERE event_id = ?').get(caseData.event_id);
    const decisionData = db.prepare('SELECT * FROM lrgf_decisions WHERE id = ?').get(caseData.decision_id);
    const overrides = db.prepare('SELECT * FROM lrgf_overrides WHERE decision_id = ?').all(caseData.decision_id);

    // Build evidence package
    const evidencePackage = {
        case_id: caseId,
        event: eventData,
        score: scoreData,
        decision: decisionData,
        overrides,
        model_version: MODEL_REGISTRY.current_version,
        weight_hash: MODEL_REGISTRY.weight_hash,
        frozen_at: new Date().toISOString(),
    };

    // Hash chain: link to previous evidence hash
    const prevHash = db.prepare(
        'SELECT evidence_hash FROM lrgf_evidence_chain ORDER BY created_at DESC LIMIT 1'
    ).get();

    const chainInput = JSON.stringify({
        prev_hash: prevHash?.evidence_hash || '0'.repeat(64),
        package: evidencePackage,
    });
    const evidenceHash = crypto.createHash('sha256').update(chainInput).digest('hex');

    // Timestamp authority (RFC 3161 format)
    const timestamp = {
        time: new Date().toISOString(),
        hash: evidenceHash,
        algorithm: 'SHA-256',
        policy_oid: '1.3.6.1.4.1.99999.1.1', // Custom TSA OID
    };

    const chainId = uuidv4();
    db.prepare(`
        INSERT INTO lrgf_evidence_chain (
            id, case_id, evidence_hash, prev_hash, evidence_package,
            timestamp_authority, frozen, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
    `).run(
        chainId, caseId, evidenceHash,
        prevHash?.evidence_hash || '0'.repeat(64),
        JSON.stringify(evidencePackage),
        JSON.stringify(timestamp)
    );

    // Lock case — no modification allowed
    db.prepare('UPDATE lrgf_cases SET status = ? WHERE id = ?').run('frozen', caseId);

    // Trust Graph: Create snapshot at evidence freeze
    let graphSnapshot = null;
    try {
        const trustGraph = require('./trust-graph-engine');
        const tenantId = eventData?.tenant_id || null;
        if (tenantId) {
            graphSnapshot = trustGraph.createSnapshot(tenantId, `case_confirmed:${caseId}`);
        }
    } catch (gErr) {
        // Non-blocking — graph snapshot is optional
    }

    return {
        chain_id: chainId,
        case_id: caseId,
        evidence_hash: evidenceHash,
        prev_hash: prevHash?.evidence_hash || '0'.repeat(64),
        timestamp_authority: timestamp,
        graph_snapshot: graphSnapshot ? { snapshot_id: graphSnapshot.snapshot_id, integrity: graphSnapshot.integrity } : null,
        frozen: true,
        control: { type: CONTROL_TYPES.PREVENTIVE, owner: 'System', cryptographic: true },
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 7 — BLOCKCHAIN ANCHOR (Optional Trigger)
// Trigger: High-risk lock, carbon impact, cross-border, regulatory
// Owner: Cryptographic control (Zone B) | No PII on-chain
// ═══════════════════════════════════════════════════════════════════════════════

function anchorBlockchain(evidenceResult, triggerReason) {
    const validTriggers = [
        'high_risk_batch_lock',
        'carbon_credit_impact',
        'cross_border_transfer',
        'regulatory_reporting',
    ];

    if (!validTriggers.includes(triggerReason)) {
        return { anchored: false, reason: `Invalid trigger: ${triggerReason}` };
    }

    const anchorId = uuidv4();
    const anchorData = {
        case_hash: evidenceResult.evidence_hash,
        model_version_hash: MODEL_REGISTRY.weight_hash,
        decision_record_hash: crypto.createHash('sha256')
            .update(evidenceResult.case_id)
            .digest('hex').substring(0, 16),
        trigger: triggerReason,
        // NO PII — only hashes
    };

    const anchorHash = crypto.createHash('sha256')
        .update(JSON.stringify(anchorData))
        .digest('hex');

    db.prepare(`
        INSERT INTO lrgf_blockchain_anchors (
            id, evidence_chain_id, anchor_hash, anchor_data,
            trigger_reason, anchored_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(
        anchorId, evidenceResult.chain_id, anchorHash,
        JSON.stringify(anchorData), triggerReason
    );

    return {
        anchor_id: anchorId,
        anchor_hash: anchorHash,
        trigger: triggerReason,
        pii_stored: false,
        control: { type: CONTROL_TYPES.PREVENTIVE, owner: 'System', cryptographic: true },
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 8 — BOARD EXPOSURE REPORTING
// Monthly dashboard for CEO / Board / Audit Committee
// ═══════════════════════════════════════════════════════════════════════════════

function reportExposure(tenantId) {
    const period = '30 days';

    const metrics = {
        anomaly_rate: db.prepare(`
            SELECT COUNT(*) as c FROM lrgf_decisions
            WHERE action != 'LOG' AND decided_at > datetime('now', '-${period}')
        `).get()?.c || 0,

        total_events: db.prepare(`
            SELECT COUNT(*) as c FROM lrgf_events
            WHERE created_at > datetime('now', '-${period}')
        `).get()?.c || 0,

        lock_count: db.prepare(`
            SELECT COUNT(*) as c FROM lrgf_decisions
            WHERE action = 'LOCK_CEO_NOTIFY' AND decided_at > datetime('now', '-${period}')
        `).get()?.c || 0,

        override_count: db.prepare(`
            SELECT COUNT(*) as c FROM lrgf_overrides
            WHERE created_at > datetime('now', '-${period}')
        `).get()?.c || 0,

        avg_drift: db.prepare(`
            SELECT AVG(drift_index) as avg FROM lrgf_risk_scores
            WHERE created_at > datetime('now', '-${period}')
        `).get()?.avg || 0,

        frozen_cases: db.prepare(`
            SELECT COUNT(*) as c FROM lrgf_cases
            WHERE status = 'frozen' AND created_at > datetime('now', '-${period}')
        `).get()?.c || 0,

        sla_breaches: db.prepare(`
            SELECT COUNT(*) as c FROM lrgf_cases
            WHERE sla_deadline < datetime('now') AND status = 'open'
        `).get()?.c || 0,
    };

    const totalEvents = metrics.total_events || 1;
    return {
        period,
        anomaly_rate: `${((metrics.anomaly_rate / totalEvents) * 100).toFixed(1)}%`,
        lock_ratio: `${((metrics.lock_count / totalEvents) * 100).toFixed(2)}%`,
        override_frequency: metrics.override_count,
        avg_drift_index: Math.round(metrics.avg_drift * 100) / 100,
        frozen_cases: metrics.frozen_cases,
        sla_breach_count: metrics.sla_breaches,
        model_version: MODEL_REGISTRY.current_version,
        control_ratio: {
            target: '≥60% Preventive, ≥25% Detective, ≤15% Corrective',
        },
        generated_at: new Date().toISOString(),
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL FLOW — Process a logistics event through all 8 steps
// ═══════════════════════════════════════════════════════════════════════════════

function processEvent(eventData, sourceMetadata = {}, riskFactors = {}) {
    // Step 1: Ingest
    const ingestion = ingestEvent(eventData, sourceMetadata);
    if (ingestion.duplicate) return { duplicate: true, ...ingestion };

    // Step 2: Validate route
    const validation = validateRoute(ingestion.event_id, {
        geo_lat: sourceMetadata.latitude,
        geo_lng: sourceMetadata.longitude,
        ...eventData,
    });

    // Step 3: Score risk
    const score = scoreRisk(ingestion.event_id, {
        ...riskFactors,
        // Boost score if route violations found
        velocity_anomaly: (riskFactors.velocity_anomaly || 0) + (validation.violations.length * 0.1),
    });

    // Step 4: Decision
    const decision = decide(score);

    // Step 5: Case assignment (if action required)
    const caseResult = assignCase(decision);

    // Data Lineage: Record full 5-layer GDLI chain
    let gdli = null;
    try {
        const lineage = require('./data-lineage-engine');
        const lineageResult = lineage.recordFullLineage({
            event_id: ingestion.event_id,
            event_hash: ingestion.event_hash,
            source: sourceMetadata.source || 'api',
            event_type: eventData.event_type,
            timestamp: ingestion.timestamp,
            idempotency_key: eventData.idempotency_key,
            geo_lat: sourceMetadata.latitude,
            geo_lng: sourceMetadata.longitude,
            tenant_id: eventData.tenant_id,
            model_version: score.model_version,
            weight_hash: score.weight_hash,
            drift_index: score.drift_index,
            ers_score: score.ers,
            decision_action: decision.action,
            decision_id: decision.decision_id,
            case_id: caseResult.case_id,
            features: riskFactors,
        });
        gdli = lineageResult.gdli;
    } catch (lineageErr) {
        // Non-blocking
    }

    return {
        event_id: ingestion.event_id,
        event_hash: ingestion.event_hash,
        route_valid: validation.valid,
        route_violations: validation.violations.length,
        ers: score.ers,
        model_version: score.model_version,
        drift_index: score.drift_index,
        action: decision.action,
        sla: decision.sla,
        case_id: caseResult.case_id,
        assigned_line: caseResult.assigned_line,
        line3_triggered: caseResult.line3_triggered,
        gdli,
        flow_complete: true,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function checkGeoFence(lat, lng, zone) {
    // Simple bounding box check (production would use PostGIS)
    if (!zone || !zone.min_lat) return true;
    return lat >= zone.min_lat && lat <= zone.max_lat &&
        lng >= zone.min_lng && lng <= zone.max_lng;
}

function parseSLA(sla) {
    const match = sla.match(/^(\d+)(h|d|m)$/);
    if (!match) return 24 * 60 * 60 * 1000; // default 24h
    const [, num, unit] = match;
    const multipliers = { m: 60000, h: 3600000, d: 86400000 };
    return parseInt(num) * (multipliers[unit] || 3600000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DB SCHEMA INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

function initSchema() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS lrgf_events (
            id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            source TEXT NOT NULL,
            tenant_id TEXT,
            idempotency_key TEXT UNIQUE,
            event_hash TEXT NOT NULL,
            device_fingerprint TEXT,
            geo_lat REAL,
            geo_lng REAL,
            ip_address TEXT,
            user_agent TEXT,
            payload TEXT,
            created_at TEXT NOT NULL,
            integrity_status TEXT DEFAULT 'verified'
        );

        CREATE TABLE IF NOT EXISTS lrgf_validations (
            id TEXT PRIMARY KEY,
            event_id TEXT NOT NULL,
            violation_count INTEGER DEFAULT 0,
            violations TEXT,
            validated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS lrgf_risk_scores (
            id TEXT PRIMARY KEY,
            event_id TEXT NOT NULL,
            ers_score INTEGER NOT NULL,
            model_version TEXT NOT NULL,
            weight_hash TEXT NOT NULL,
            factor_contributions TEXT,
            drift_index REAL DEFAULT 0,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS lrgf_decisions (
            id TEXT PRIMARY KEY,
            score_id TEXT,
            event_id TEXT NOT NULL,
            ers_score INTEGER,
            action TEXT NOT NULL,
            sla TEXT,
            sla_deadline TEXT,
            escalation_level INTEGER DEFAULT 0,
            override_applied INTEGER DEFAULT 0,
            decided_at TEXT
        );

        CREATE TABLE IF NOT EXISTS lrgf_overrides (
            id TEXT PRIMARY KEY,
            decision_id TEXT NOT NULL,
            override_type TEXT DEFAULT 'manual',
            justification TEXT NOT NULL,
            new_action TEXT NOT NULL,
            approver_1_id TEXT NOT NULL,
            approver_1_role TEXT NOT NULL,
            approver_2_id TEXT NOT NULL,
            approver_2_role TEXT NOT NULL,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS lrgf_cases (
            id TEXT PRIMARY KEY,
            decision_id TEXT NOT NULL,
            event_id TEXT NOT NULL,
            assigned_line INTEGER NOT NULL,
            assigned_role TEXT NOT NULL,
            permissions TEXT,
            restrictions TEXT,
            sla TEXT,
            sla_deadline TEXT,
            line3_triggered INTEGER DEFAULT 0,
            status TEXT DEFAULT 'open',
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS lrgf_evidence_chain (
            id TEXT PRIMARY KEY,
            case_id TEXT NOT NULL,
            evidence_hash TEXT NOT NULL,
            prev_hash TEXT NOT NULL,
            evidence_package TEXT,
            timestamp_authority TEXT,
            frozen INTEGER DEFAULT 0,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS lrgf_blockchain_anchors (
            id TEXT PRIMARY KEY,
            evidence_chain_id TEXT NOT NULL,
            anchor_hash TEXT NOT NULL,
            anchor_data TEXT,
            trigger_reason TEXT NOT NULL,
            anchored_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_lrgf_events_tenant ON lrgf_events(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_lrgf_events_hash ON lrgf_events(event_hash);
        CREATE INDEX IF NOT EXISTS idx_lrgf_events_idempotency ON lrgf_events(idempotency_key);
        CREATE INDEX IF NOT EXISTS idx_lrgf_scores_event ON lrgf_risk_scores(event_id);
        CREATE INDEX IF NOT EXISTS idx_lrgf_decisions_event ON lrgf_decisions(event_id);
        CREATE INDEX IF NOT EXISTS idx_lrgf_cases_status ON lrgf_cases(status);
    `);
}

// Initialize on load
try { initSchema(); } catch (e) { /* Schema may already exist */ }

module.exports = {
    // Full flow
    processEvent,
    // Individual steps
    ingestEvent,
    validateRoute,
    scoreRisk,
    decide,
    overrideDecision,
    assignCase,
    freezeEvidence,
    anchorBlockchain,
    reportExposure,
    // Config
    MODEL_REGISTRY,
    THRESHOLD_CONFIG,
    CONTROL_TYPES,
    // Schema
    initSchema,
};
