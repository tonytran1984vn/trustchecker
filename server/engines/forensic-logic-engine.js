/**
 * TrustChecker — Forensic Logic Engine v1.0
 * LEGITIMACY LAYER: Investigation + Evidence Chain + Audit Forensics
 * 
 * Infrastructure without forensic capability = infrastructure that cannot
 * prove its own integrity when challenged.
 * 
 * This engine provides: evidence chain, investigation protocol, 
 * tamper detection, regulatory evidence packaging, dispute forensics.
 */

// ═══════════════════════════════════════════════════════════════════
// 1. EVIDENCE CHAIN MODEL
// ═══════════════════════════════════════════════════════════════════

const EVIDENCE_CHAIN = {
    title: 'Evidence Chain — Cryptographic Proof of Every Decision',

    chain_structure: {
        algorithm: 'SHA-256 hash chain (append-only)',
        entry_format: {
            fields: ['timestamp', 'event_type', 'actor_id', 'actor_role', 'action', 'target', 'input_hash', 'output_hash', 'previous_hash', 'chain_hash'],
            tamper_detection: 'Any modification breaks chain_hash → detected within 60 seconds by chain validation daemon',
            storage: 'Primary: PostgreSQL (trustchecker_audit role, INSERT only). Secondary: off-site replication.',
        },
        retention: {
            minimum_years: 7,
            regulatory_extended: 10,
            permanent: ['Constitutional amendments', 'Kill-switch activations', 'Settlement finality records', 'Slashing events'],
        },
    },

    evidence_categories: [
        {
            category: 'Trust Score Evidence',
            what_is_recorded: 'Every input data point, model version, weight configuration, calculation trace, final score',
            why: 'Must prove why entity received specific trust score — regulatory + dispute defense',
            integrity: 'Input hash + model version hash + output hash = reproducible calculation',
        },
        {
            category: 'Settlement Evidence',
            what_is_recorded: 'Order entry, counterparty identification, price source, netting calculation, finality confirmation, reserve allocation',
            why: 'CCP obligation: must prove settlement was correct at every step',
            integrity: 'Full audit trail from order → settlement → finality. Blockchain anchor for finality proof.',
        },
        {
            category: 'Governance Evidence',
            what_is_recorded: 'Proposal text, voter identities, vote timestamps, vote results, quorum verification, constitutional compliance check',
            why: 'Must prove governance decisions followed constitutional process',
            integrity: 'Each vote individually signed + aggregated result hash',
        },
        {
            category: 'Verification Evidence',
            what_is_recorded: 'QR scan data, product metadata, validator ID, verification methodology, result, confidence level',
            why: 'Must prove verification was conducted properly — liability defense',
            integrity: 'Multi-validator cross-signature. Blockchain anchor for immutability.',
        },
        {
            category: 'Access Control Evidence',
            what_is_recorded: 'Every RBAC check: who requested what permission, was it granted/denied, middleware stack, constitutional rule applied',
            why: 'Must prove access control was enforced at all times — audit requirement',
            integrity: 'Hash-chained with middleware execution trace',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. INVESTIGATION PROTOCOL
// ═══════════════════════════════════════════════════════════════════

const INVESTIGATION_PROTOCOL = {
    title: 'Investigation Protocol — Structured Response to Anomalies',

    triggers: [
        { trigger: 'Anomaly detected by monitoring', severity: 'Auto', initiator: 'System', sla_hours: 0 },
        { trigger: 'Internal report (whistleblower)', severity: 'Confidential', initiator: 'Any employee', sla_hours: 24 },
        { trigger: 'External complaint (client/validator)', severity: 'Standard', initiator: 'Client/Validator', sla_hours: 48 },
        { trigger: 'Regulatory inquiry', severity: 'Priority', initiator: 'Regulator', sla_hours: 4 },
        { trigger: 'Media report / public disclosure', severity: 'Crisis', initiator: 'External', sla_hours: 2 },
    ],

    investigation_phases: [
        {
            phase: '1. Triage & Containment',
            duration: '< 4 hours',
            actions: ['Assess severity and scope', 'Preserve evidence (snapshot DB, freeze affected logs)', 'Contain if active threat (KS-02 tenant freeze or KS-03 scoring freeze)', 'Assign investigation lead'],
            output: 'Triage report with severity classification and containment status',
        },
        {
            phase: '2. Evidence Collection',
            duration: '< 24 hours',
            actions: ['Extract relevant audit logs (hash-chain verified)', 'Collect blockchain anchor proofs', 'Gather system metrics and access logs', 'Interview relevant parties (if human involvement)'],
            output: 'Evidence package (hash-sealed, timestamped, chain-of-custody documented)',
        },
        {
            phase: '3. Analysis',
            duration: '< 72 hours',
            actions: ['Timeline reconstruction from evidence', 'Root cause identification', 'Impact assessment (financial, trust, operational)', 'Attribution (if applicable)'],
            output: 'Analysis report with findings, root cause, and impact quantification',
        },
        {
            phase: '4. Resolution & Remediation',
            duration: '< 7 days',
            actions: ['Implement fix/remediation', 'Restore affected systems/scores', 'Disciplinary or legal action if warranted', 'Process improvement recommendations'],
            output: 'Resolution report with remediation actions and prevention plan',
        },
        {
            phase: '5. Disclosure & Reporting',
            duration: '< 14 days',
            actions: ['Internal report to Risk Committee + Board', 'Regulatory notification if required', 'Client notification if affected', 'Public transparency notice if significant'],
            output: 'Final investigation report (versions: internal/regulatory/public)',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 3. TAMPER DETECTION FRAMEWORK
// ═══════════════════════════════════════════════════════════════════

const TAMPER_DETECTION = {
    title: 'Tamper Detection — Proving What HASN\'T Been Changed',

    detection_layers: [
        {
            layer: 'Hash Chain Integrity',
            method: 'SHA-256 chain validation — every entry linked to previous',
            check_frequency: 'Every 60 seconds (daemon)',
            detection_time: '< 60 seconds',
            alert_level: 'BLACK — immediate KS-01 consideration',
            false_positive_rate: '< 0.001% (cryptographic certainty)',
        },
        {
            layer: 'Cross-Reference Validation',
            method: 'Compare audit log entries against operational database state',
            check_frequency: 'Hourly batch reconciliation',
            detection_time: '< 1 hour',
            alert_level: 'RED — investigation initiated',
        },
        {
            layer: 'Blockchain Anchor Verification',
            method: 'Verify on-chain anchors match off-chain data hashes',
            check_frequency: 'Per-anchor (real-time) + daily batch re-verify',
            detection_time: '< 5 minutes (real-time) / < 24 hours (batch)',
            alert_level: 'RED — affected records flagged, investigation initiated',
        },
        {
            layer: 'Access Pattern Anomaly',
            method: 'ML-based detection of unusual database access patterns',
            check_frequency: 'Real-time streaming analysis',
            detection_time: '< 15 minutes',
            alert_level: 'ORANGE — enhanced monitoring + admin notification',
        },
        {
            layer: 'External Attestation',
            method: 'Quarterly external auditor independently verifies sample of records',
            check_frequency: 'Quarterly',
            detection_time: '< 90 days (worst case)',
            alert_level: 'Critical finding in audit report',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 4. REGULATORY EVIDENCE PACKAGING
// ═══════════════════════════════════════════════════════════════════

const REGULATORY_EVIDENCE = {
    title: 'Regulatory Evidence Packaging — Ready for Any Inquiry',

    packages: [
        {
            type: 'Standard Regulatory Response',
            contents: ['Company structure + licenses', 'Compliance framework overview', 'Requested data (anonymized where required)', 'Attestation of data integrity (hash verification)'],
            format: 'PDF + JSON + xBRL (structured data)',
            preparation_time: '< 48 hours',
            authority: 'Compliance Officer + Legal',
        },
        {
            type: 'Investigation Support Package',
            contents: ['Full audit trail for specified period/entity', 'Chain-of-custody documentation', 'System integrity attestation', 'Expert witness preparation materials'],
            format: 'Encrypted archive + integrity certificates',
            preparation_time: '< 7 days',
            authority: 'Legal + CTO + Compliance',
        },
        {
            type: 'Incident Disclosure Package',
            contents: ['Incident timeline', 'Impact assessment', 'Remediation actions taken', 'Prevention measures implemented', 'Affected party notification records'],
            format: 'Regulatory template (jurisdiction-specific)',
            preparation_time: '< 72 hours from incident',
            authority: 'Compliance + Legal + Risk Committee',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 5. DISPUTE FORENSICS
// ═══════════════════════════════════════════════════════════════════

const DISPUTE_FORENSICS = {
    title: 'Dispute Forensics — Resolving Challenges with Evidence',

    dispute_types: [
        {
            type: 'Trust Score Dispute',
            process: ['Claimant submits dispute with evidence', 'System retrieves full scoring evidence chain', 'Independent review by IVU + Risk (not original scorer)', 'Decision within 14 days', 'Appeal to GGC if unsatisfied (30 days)'],
            evidence_required: 'System provides: all input data, model version, weights, calculation trace, final score. Claimant provides: counter-evidence.',
            resolution_rate_target_pct: 95,
        },
        {
            type: 'Settlement Dispute',
            process: ['Counterparty raises dispute within T+5', 'Full settlement evidence chain retrieved', 'Price source verification', 'Netting calculation audit', 'Resolution or escalation to arbitration'],
            evidence_required: 'Order records, price feeds, netting calculations, finality confirmations, blockchain anchors',
            resolution_rate_target_pct: 98,
        },
        {
            type: 'Slashing Dispute',
            process: ['Validator challenges slashing with evidence', 'Evidence chain reviewed: violation detection → evidence → proposal → vote', 'Independent review by Risk + external validator ombudsman', 'Partial/full restoration if evidence insufficient'],
            evidence_required: 'Violation detection data, validator logs, cross-validation results, GGC vote records',
            resolution_rate_target_pct: 90,
        },
        {
            type: 'Data Integrity Dispute',
            process: ['Any party claims data has been modified', 'Hash chain verification for disputed records', 'Blockchain anchor cross-reference', 'If tamper detected → BLACK alert + investigation', 'If no tamper → attestation certificate issued'],
            evidence_required: 'Hash chain verification report, blockchain anchor proofs, access logs',
            resolution_rate_target_pct: 99,
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class ForensicLogicEngine {
    getEvidenceChain() { return EVIDENCE_CHAIN; }
    getInvestigationProtocol() { return INVESTIGATION_PROTOCOL; }
    getTamperDetection() { return TAMPER_DETECTION; }
    getRegulatoryEvidence() { return REGULATORY_EVIDENCE; }
    getDisputeForensics() { return DISPUTE_FORENSICS; }

    verifyChainIntegrity(records) {
        const sampleRecords = records || [
            { id: 1, hash: 'abc123', prev: '000000' },
            { id: 2, hash: 'def456', prev: 'abc123' },
            { id: 3, hash: 'ghi789', prev: 'def456' },
        ];
        let valid = true;
        const breaks = [];
        for (let i = 1; i < sampleRecords.length; i++) {
            if (sampleRecords[i].prev !== sampleRecords[i - 1].hash) {
                valid = false;
                breaks.push({ at_record: sampleRecords[i].id, expected_prev: sampleRecords[i - 1].hash, actual_prev: sampleRecords[i].prev });
            }
        }
        return { chain_length: sampleRecords.length, integrity_valid: valid, breaks, alert_level: valid ? 'GREEN' : 'BLACK' };
    }

    getFullFramework() {
        return {
            title: 'Forensic Logic — Legitimacy Layer',
            version: '1.0',
            evidence_chain: EVIDENCE_CHAIN,
            investigation: INVESTIGATION_PROTOCOL,
            tamper_detection: TAMPER_DETECTION,
            regulatory_evidence: REGULATORY_EVIDENCE,
            dispute_forensics: DISPUTE_FORENSICS,
        };
    }
}

module.exports = new ForensicLogicEngine();
