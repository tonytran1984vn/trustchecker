/**
 * TrustChecker — Data Ownership Engine v1.0
 * Data sovereignty policy, exit protocol, portability, revocation
 * 
 * Infrastructure must answer: Who owns the data? What happens when you leave?
 * GDPR Art. 17 (right to erasure) vs blockchain immutability = conflict to resolve.
 */

// ═══════════════════════════════════════════════════════════════════
// 1. DATA OWNERSHIP CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════

const DATA_OWNERSHIP = {
    title: 'Data Ownership — Who Owns What',

    classifications: [
        {
            data_type: 'Product/Supply Chain Data',
            owner: 'Tenant (data creator)',
            platform_rights: 'License to process during subscription. Revoked on exit.',
            portability: 'FULL — exportable in JSON/CSV at any time via API',
            on_exit: 'Tenant gets full export. Platform deletes within 30 days.',
            blockchain: 'Hash remains on-chain (immutable). Underlying data deleted.',
        },
        {
            data_type: 'Trust Score (Entity)',
            owner: 'Platform (calculated property)',
            platform_rights: 'Platform owns methodology + calculation. Score is platform IP.',
            portability: 'LIMITED — tenant can export their own score history but NOT the model that generated it',
            on_exit: 'Score history exported. Active score deactivated. NO negative score published post-exit.',
            blockchain: 'Score anchors remain for historical verification.',
        },
        {
            data_type: 'Verification Records',
            owner: 'Joint (Tenant data + Validator attestation)',
            platform_rights: 'Platform processes. Both parties retain rights to their contribution.',
            portability: 'PARTIAL — tenant gets their submission data. Validator attestation stays for integrity.',
            on_exit: 'Tenant submission data exported. Attestation records retained for audit (7 years minimum).',
            blockchain: 'Anchors remain permanently (immutability requirement).',
        },
        {
            data_type: 'Carbon Credit Records',
            owner: 'Registry (Verra/Gold Standard) → Tenant holds title',
            platform_rights: 'Platform is aggregation layer. Does NOT own credits.',
            portability: 'FULL — credit ownership transfers via registry, not platform',
            on_exit: 'Credits remain in registry. Platform records exported.',
            blockchain: 'Anchors remain for audit trail.',
        },
        {
            data_type: 'Governance Records (Votes, Amendments)',
            owner: 'Platform (institutional record)',
            platform_rights: 'Full ownership. These are governance artifacts, not tenant data.',
            portability: 'PUBLIC — published in transparency report',
            on_exit: 'Not applicable. Governance records persist regardless of any entity change.',
            blockchain: 'Permanent anchor. Cannot be deleted.',
        },
        {
            data_type: 'Audit Trail (Hash-Chain)',
            owner: 'Platform (integrity record)',
            platform_rights: 'Full ownership. Required for regulatory compliance.',
            portability: 'READ-ONLY access for relevant parties. Export available for regulatory requests.',
            on_exit: 'Retained for 7-10 years (regulatory minimum). Not deletable.',
            blockchain: 'Permanent. Breaking chain = integrity failure.',
        },
        {
            data_type: 'Personal Data (PII)',
            owner: 'Data Subject (individual)',
            platform_rights: 'Processing under GDPR lawful basis (contract/consent/legitimate interest)',
            portability: 'FULL — GDPR Art. 20 data portability right (machine-readable)',
            on_exit: 'Exported on request → deleted within 30 days. Right to erasure (Art. 17).',
            blockchain: 'NO PII on chain. Only hashes. Hash alone = not personal data (EDPB guidance).',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. EXIT PROTOCOL
// ═══════════════════════════════════════════════════════════════════

const EXIT_PROTOCOL = {
    title: 'Exit Protocol — Orderly Departure from Network',

    phases: [
        {
            phase: 1,
            name: 'Notice',
            duration: '14 days minimum notice period',
            actions: ['Tenant submits exit request via platform', 'Platform acknowledges within 24 hours', 'Outstanding settlements identified and queued for completion', 'Data export preparation begins'],
        },
        {
            phase: 2,
            name: 'Settlement Completion',
            duration: 'Up to 30 days',
            actions: ['All pending settlements processed to finality', 'Outstanding invoices issued', 'Carbon credits transferred to designated external wallet/registry account', 'Counterparty notifications sent'],
        },
        {
            phase: 3,
            name: 'Data Export',
            duration: '7 days after settlement completion',
            actions: ['Full data export package generated (JSON + CSV + PDF summary)', 'Trust score history exported', 'Verification records (tenant portion) included', 'Blockchain anchor references provided (for independent verification)'],
            export_format: {
                standard: 'JSON (machine-readable) + CSV (spreadsheet-compatible)',
                comprehensive: 'JSON + CSV + PDF summary report + blockchain anchor index',
                regulatory: 'Additional regulatory-format export if requested (xBRL for financial, SWIFT for settlement)',
            },
        },
        {
            phase: 4,
            name: 'Data Deletion',
            duration: '30 days after export confirmation',
            actions: ['Tenant data deleted from active databases', 'Backups containing tenant data marked for purge (retention cycle)', 'Confirmation of deletion sent to tenant', 'Audit trail entry: "Tenant X data deleted per exit protocol"'],
            exceptions: ['Regulatory-required records retained (7-10 years) — anonymized where possible', 'Blockchain anchors: hashes remain (immutable) but underlying data deleted', 'KYC/AML records: retained per legal obligation (5 years minimum)'],
        },
        {
            phase: 5,
            name: 'Post-Exit',
            duration: 'Ongoing',
            actions: ['No negative scoring published post-exit', 'Historical trust score marked as "Inactive — exited network"', 'Counterparties notified of entity departure', 'Re-entry possible with fresh onboarding (previous history NOT restored)'],
        },
    ],

    total_exit_timeline: '30-60 days from notice to complete data deletion',
};

// ═══════════════════════════════════════════════════════════════════
// 3. IMMUTABLE vs REVOCABLE CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════

const IMMUTABILITY = {
    title: 'What Can Be Deleted vs What Cannot',

    immutable: [
        { data: 'Blockchain anchor hashes', reason: 'On-chain data is immutable by design', gdpr_note: 'Hashes ≠ personal data (EDPB). No erasure obligation.' },
        { data: 'Settlement finality records', reason: 'Legal requirement — settlement is irreversible', gdpr_note: 'Anonymized after retention period.' },
        { data: 'Audit trail hash-chain', reason: 'Breaking chain = integrity failure = regulatory violation', gdpr_note: 'Contains system events, not PII by design.' },
        { data: 'Governance votes and amendments', reason: 'Institutional record. Public transparency requirement.', gdpr_note: 'Voter identities can be anonymized post-retention.' },
        { data: 'Slashing records', reason: 'Must be permanently verifiable for network integrity', gdpr_note: 'Validator IDs are institutional, not natural persons.' },
    ],

    revocable: [
        { data: 'Product/supply chain data', mechanism: 'Delete from DB. Hash on chain becomes orphaned (no underlying data).', timeline: '30 days post-exit' },
        { data: 'Personal data (PII)', mechanism: 'GDPR Art. 17 erasure. Delete from all systems including backups.', timeline: '30 days from request' },
        { data: 'Trust score (active)', mechanism: 'Deactivated on exit. Historical score anonymized after retention.', timeline: 'Immediate on exit' },
        { data: 'Session/login data', mechanism: 'Deleted immediately on account closure', timeline: 'Immediate' },
        { data: 'Analytics/usage data', mechanism: 'Anonymized or deleted per preference', timeline: '30 days' },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 4. MERKLE PROOF EXPORT — Cryptographic Portability
// ═══════════════════════════════════════════════════════════════════

const MERKLE_EXPORT = {
    title: 'Merkle Proof Export — Portable Cryptographic Proof of Data',

    design: {
        structure: 'Per-tenant Merkle tree. Leaf = SHA-256(record). Root anchored on blockchain.',
        export_contains: [
            'All leaf hashes (individual record proofs)',
            'Internal node hashes (tree structure)',
            'Merkle root + blockchain anchor transaction ID',
            'Inclusion proofs for each record (verify any record independently)',
            'Tree metadata: timestamp range, record count, schema version',
        ],
        verification: 'Any third party can verify: (1) record exists in tree, (2) tree root matches blockchain anchor, (3) anchor timestamp is authentic.',
        independence: 'Verification does NOT require platform access. Tree + anchor = self-contained proof.',
    },

    export_api: {
        endpoint: '/api/data-ownership/merkle-export/:tenant_id',
        output_format: 'JSON bundle: { merkle_root, anchor_tx_id, chain, leaves[], proofs[], metadata }',
        size_estimate: '~1KB per 1000 records (hashes only)',
    },

    use_cases: [
        'Tenant exits network but needs to prove historical data integrity to new platform',
        'Regulatory inquiry: tenant proves data existed at specific time without platform cooperation',
        'Dispute resolution: independent arbitrator verifies data using only the Merkle export',
        'Insurance claim: cryptographic proof of supply chain verification history',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 5. VERIFIABLE DELETION CERTIFICATE
// ═══════════════════════════════════════════════════════════════════

const DELETION_CERTIFICATE = {
    title: 'Verifiable Deletion Certificate — Proof That Data Is Gone',

    certificate_contents: {
        tenant_id: 'Anonymized tenant reference (hash of tenant ID)',
        deletion_timestamp: 'ISO 8601 timestamp of deletion execution',
        data_categories_deleted: 'List of data types deleted (per classification)',
        record_count: 'Number of records deleted per category',
        deletion_method: 'Cryptographic erasure (key destruction) OR physical deletion',
        retained_exceptions: 'List of data retained with legal basis (regulatory, audit trail)',
        merkle_root_pre_deletion: 'Merkle root before deletion (provable history)',
        merkle_root_post_deletion: 'Null or updated root (provable deletion)',
        blockchain_anchor: 'Deletion event anchored on-chain (immutable proof of when deletion occurred)',
    },

    signatories: [
        { role: 'Data Protection Officer', signs: 'Confirms GDPR compliance of deletion' },
        { role: 'CTO / Engineering', signs: 'Confirms technical execution of deletion' },
        { role: 'External Auditor', signs: 'Optional — confirms deletion verified during annual audit' },
    ],

    legal_weight: 'Certificate is admissible evidence of compliance with GDPR Art. 17 (right to erasure). Blockchain anchor provides tamper-proof timestamp.',
};

// ═══════════════════════════════════════════════════════════════════
// 6. DATA SOVEREIGNTY LAYER
// ═══════════════════════════════════════════════════════════════════

const SOVEREIGNTY = {
    title: 'Data Sovereignty — Jurisdiction Binding + Geo-Fencing',

    geo_fenced_storage: {
        principle: 'Data resides in the jurisdiction of the data subject / regulatory requirement',
        zones: [
            { zone: 'EU', storage: 'Ireland (Data Compliance Ltd)', regulation: 'GDPR', data_types: 'All PII for EU data subjects + EU tenant operational data' },
            { zone: 'APAC-SG', storage: 'Singapore (Technology Pte Ltd)', regulation: 'PDPA', data_types: 'SG/ASEAN tenant data, platform core data' },
            { zone: 'APAC-VN', storage: 'Vietnam (local partner or entity)', regulation: 'VN Cybersecurity Law', data_types: 'VN citizen PII, VN-origin supply chain data' },
            { zone: 'DACH', storage: 'Germany (Settlement GmbH)', regulation: 'BaFin + Bundesbank', data_types: 'Settlement records, financial data' },
        ],
        cross_zone_transfer: 'Only via SCCs (Standard Contractual Clauses) + DPIA. No raw PII transfer across zones.',
    },

    regulatory_override: {
        principle: 'Regulator can compel data access within their jurisdiction ONLY',
        modes: [
            { mode: 'Standard Request', authority: 'Formal regulatory inquiry', scope: 'Jurisdiction-specific data only', timeline: '<48h response' },
            { mode: 'Emergency Override', authority: 'Court order / national security', scope: 'Defined by court order scope', timeline: 'Immediate compliance' },
            { mode: 'Cross-Jurisdiction', authority: 'MLAT / bilateral treaty', scope: 'Per treaty terms', timeline: 'Per treaty timeline (typically 30-90 days)' },
        ],
        safeguards: [
            'Regulator A cannot access Regulator B jurisdiction data',
            'All regulatory access logged in tamper-evident audit trail',
            'Tenant notified of regulatory access (unless court-ordered gag)',
            'Data minimization: only data responsive to specific request provided',
        ],
    },

    cascade_revocation: {
        title: 'Revocation Tree — What Breaks When Data Is Revoked',
        cascades: [
            { trigger: 'Tenant data revoked', affects: ['Trust score deactivated', 'Linked verification records orphaned (attestation preserved)', 'Counterparty notifications sent', 'Carbon records unlinked (registry records unaffected)'], severity: 'MEDIUM' },
            { trigger: 'Validator attestation revoked', affects: ['Linked trust scores flagged for re-validation', 'Historical scores remain but marked "validator revoked"', 'Counterparties notified'], severity: 'HIGH' },
            { trigger: 'Blockchain anchor invalidated', affects: ['All records referencing anchor marked "unverifiable"', 'Re-anchoring process initiated', 'Integrity alert triggered'], severity: 'CRITICAL' },
            { trigger: 'PII erasure request', affects: ['Personal data deleted', 'Anonymized records remain', 'Hash on chain becomes orphaned but valid', 'Trust scores unaffected (calculated, not PII)'], severity: 'LOW' },
        ],
    },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class DataOwnershipEngine {
    getOwnership() { return DATA_OWNERSHIP; }
    getExitProtocol() { return EXIT_PROTOCOL; }
    getImmutability() { return IMMUTABILITY; }
    getMerkleExport() { return MERKLE_EXPORT; }
    getDeletionCertificate() { return DELETION_CERTIFICATE; }
    getSovereignty() { return SOVEREIGNTY; }

    getFullFramework() {
        return {
            title: 'Data Ownership & Portability — Infrastructure Sovereignty', version: '2.0',
            ownership: DATA_OWNERSHIP, exit_protocol: EXIT_PROTOCOL, immutability: IMMUTABILITY,
            merkle_export: MERKLE_EXPORT, deletion_certificate: DELETION_CERTIFICATE, sovereignty: SOVEREIGNTY,
        };
    }
}

module.exports = new DataOwnershipEngine();
