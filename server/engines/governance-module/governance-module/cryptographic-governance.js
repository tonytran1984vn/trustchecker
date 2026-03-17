/**
 * TrustChecker — Cryptographic Governance Engine v1.0
 * INFRASTRUCTURE LAYER: Keys Are the Real Crown Jewels
 * 
 * Infrastructure dies from key compromise, not from business failure.
 * 
 * This engine models: HSM cluster architecture, multi-sig policy,
 * root key recovery, key rotation, cryptographic ceremonies,
 * zero-trust network architecture.
 */

// ═══════════════════════════════════════════════════════════════════
// 1. HSM CLUSTER ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════

const HSM_ARCHITECTURE = {
    title: 'Hardware Security Module Architecture — Key Material Never Leaves Hardware',

    design: {
        primary_hsm: {
            model: 'Thales Luna Network HSM 7 (or equivalent: AWS CloudHSM for cloud-first)',
            location: 'Primary data center (co-located with application servers)',
            function: 'Active key operations: signing, anchoring, settlement finality',
            fips_level: 'FIPS 140-2 Level 3 (physical tamper-evident + tamper-responsive)',
        },
        backup_hsm: {
            model: 'Same specification as primary',
            location: 'Geographically separated (different AZ, ideally different country)',
            function: 'Hot standby for failover. Synchronized key material.',
            failover_time: '< 30 seconds automatic failover',
        },
        cold_hsm: {
            model: 'Air-gapped HSM (offline)',
            location: 'Bank-grade vault (safety deposit box or dedicated security facility)',
            function: 'Root key storage ONLY. Never connected to network. Used only during key ceremony.',
            access: 'Requires physical presence of 3 of 5 key custodians (Shamir Secret Sharing)',
        },
    },

    key_hierarchy: [
        { level: 'Root Key', purpose: 'Master key — signs all child keys. NEVER used directly.', stored_in: 'Cold HSM only', rotation: 'Every 5 years (ceremony)', backup: '3-of-5 Shamir shares in separate bank vaults' },
        { level: 'Intermediate CA Key', purpose: 'Signs operational keys. Bridge between root and daily operations.', stored_in: 'Primary + Backup HSM', rotation: 'Annual', backup: 'HSM replication' },
        { level: 'Operational Signing Key', purpose: 'Signs transactions, anchors, API responses.', stored_in: 'Primary HSM', rotation: 'Quarterly', backup: 'Backup HSM replication' },
        { level: 'TLS/mTLS Keys', purpose: 'Encrypt inter-service and external API communication.', stored_in: 'Application server (generated in HSM)', rotation: 'Monthly (automated)', backup: 'Regenerable' },
        { level: 'Database Encryption Key', purpose: 'Encrypt data at rest in PostgreSQL.', stored_in: 'HSM-managed (key wrapping)', rotation: 'Annual', backup: 'HSM replication + offline backup' },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. MULTI-SIG POLICY DESIGN
// ═══════════════════════════════════════════════════════════════════

const MULTISIG_POLICY = {
    title: 'Multi-Signature Policy — No Single Point of Cryptographic Failure',

    policies: [
        {
            operation: 'Root Key Ceremony',
            threshold: '3 of 5 key custodians',
            custodians: ['CEO/Founder', 'CTO', 'Risk Committee Chair', 'Independent Board Member', 'External Security Auditor'],
            ceremony_requirements: ['Physical presence required (no remote)', 'Air-gapped room', 'Witness: external auditor', 'Video-recorded + hash-signed log'],
        },
        {
            operation: 'Blockchain Anchor Signing',
            threshold: '2 of 3 operational signers',
            signers: ['Primary HSM (automated)', 'Backup signer (CTO key)', 'Emergency signer (Risk Committee key)'],
            automation: 'Normal operations: primary HSM auto-signs. 2-of-3 only for exceptional cases or key compromise.',
        },
        {
            operation: 'Settlement Finality Confirmation',
            threshold: '2 of 2 (dual-key)',
            signers: ['Settlement engine (automated)', 'Risk validation service (automated)'],
            override: 'No manual override. Both systems must agree. If disagreement → settlement held → human review.',
        },
        {
            operation: 'Kill-Switch KS-01 (Full Network Freeze)',
            threshold: '2 of 3 authorized parties',
            signers: ['CTO emergency key', 'Risk Committee Chair key', 'Crisis Council Chair key'],
            storage: 'Separate HSM partitions per signer. No single person can access 2 keys.',
        },
        {
            operation: 'Capital Reserve Drawdown',
            threshold: '3 of 3 (unanimous)',
            signers: ['GGC Chair key', 'Risk Committee Chair key', 'Independent Trustee key'],
            rationale: 'Capital Reserve is bankruptcy-remote. Highest protection threshold.',
        },
        {
            operation: 'Database Master Key Rotation',
            threshold: '2 of 3',
            signers: ['CTO', 'DBA (if exists)', 'Security Officer'],
            frequency: 'Annual + on-demand if compromise suspected',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 3. ROOT KEY RECOVERY PROTOCOL
// ═══════════════════════════════════════════════════════════════════

const KEY_RECOVERY = {
    title: 'Root Key Recovery — Survive Catastrophic Key Loss',

    scenario: 'Both primary and backup HSMs destroyed. Cold HSM root key is only recovery path.',

    recovery_protocol: [
        { step: 1, action: 'Declare KEY COMPROMISE event → L5 escalation', authority: 'Any 2 of 5 custodians', timeline: 'Immediate' },
        { step: 2, action: 'Contact all 5 key custodians', authority: 'Crisis Council', timeline: '< 4 hours', note: 'Custodians located in different cities/countries for resilience' },
        { step: 3, action: 'Retrieve Shamir shares from bank vaults', authority: '3 of 5 custodians (physical)', timeline: '24-72 hours (depends on geography)' },
        { step: 4, action: 'Assemble in secure facility (air-gapped room)', authority: 'All present custodians + witness', timeline: 'Scheduled within 5 business days' },
        { step: 5, action: 'Reconstruct root key in cold HSM', authority: 'Ceremony Master (Security Officer)', timeline: '2-4 hours' },
        { step: 6, action: 'Generate new intermediate keys', authority: 'Ceremony Master + CTO', timeline: '2-4 hours' },
        { step: 7, action: 'Deploy new operational keys to new primary/backup HSMs', authority: 'CTO + Operations', timeline: '4-8 hours' },
        { step: 8, action: 'Re-establish all signing capabilities', authority: 'Engineering team', timeline: '4-8 hours' },
        { step: 9, action: 'Post-recovery audit + new Shamir share generation', authority: 'Full ceremony protocol', timeline: 'Within 7 days' },
    ],

    total_recovery_time: '3-10 business days (depending on custodian availability)',
    during_recovery: 'Platform operates in READ-ONLY mode. No new anchoring, no settlement finality. Verification continues with cached scores.',
};

// ═══════════════════════════════════════════════════════════════════
// 4. KEY ROTATION SCHEDULE
// ═══════════════════════════════════════════════════════════════════

const KEY_ROTATION = {
    title: 'Key Rotation Schedule — Automatic Where Possible',

    schedule: [
        { key_type: 'TLS/mTLS certificates', rotation: 'Monthly', method: 'Automated (cert-manager / Let\'s Encrypt)', downtime: 'Zero (graceful rotation)' },
        { key_type: 'API signing keys', rotation: 'Quarterly', method: 'Automated via HSM key generation', downtime: 'Zero (dual-key overlap period)' },
        { key_type: 'Database encryption key', rotation: 'Annual', method: 'HSM-managed re-encryption', downtime: '< 1 hour (during maintenance window)' },
        { key_type: 'Operational signing key', rotation: 'Quarterly', method: 'HSM ceremony (lightweight — 2 of 3)', downtime: '< 30 minutes' },
        { key_type: 'Intermediate CA key', rotation: 'Annual', method: 'Key ceremony (3 of 5 custodians)', downtime: 'Maintenance window (planned)' },
        { key_type: 'Root key', rotation: 'Every 5 years', method: 'Full key ceremony (cold HSM)', downtime: 'Planned maintenance (4-8 hours)' },
    ],

    emergency_rotation: {
        trigger: 'Suspected key compromise OR custodian departure',
        process: 'Immediate rotation of affected key level + all child keys derivated from it',
        timeline: '< 24 hours for operational keys, < 7 days for intermediate, full ceremony for root',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 5. CRYPTOGRAPHIC CEREMONY PROTOCOL
// ═══════════════════════════════════════════════════════════════════

const CEREMONY_PROTOCOL = {
    title: 'Cryptographic Ceremony — Formal Process for Key Events',

    ceremony_types: [
        {
            type: 'Root Key Generation',
            frequency: 'Once (initial) + every 5 years',
            participants_required: 5,
            participants_present: 'All 5 custodians + 1 witness (external auditor) + 1 ceremony master (Security Officer)',
            location: 'Air-gapped secure room (no network, no cameras except official recording)',
            equipment: ['Cold HSM (air-gapped)', 'Shamir Secret Sharing tool (air-gapped laptop)', '5 tamper-evident envelopes for shares', 'Hardware RNG (not software)'],
            duration: '4-6 hours',
            output: ['Root key in cold HSM', '5 Shamir shares in sealed envelopes', 'Ceremony log (hash-signed)', 'Video recording (stored in vault)'],
        },
        {
            type: 'Intermediate Key Generation',
            frequency: 'Annual',
            participants_required: 3,
            participants_present: '3 of 5 custodians + ceremony master',
            location: 'Secure room with cold HSM temporarily connected',
            duration: '2-3 hours',
        },
        {
            type: 'Emergency Key Revocation',
            frequency: 'On-demand (compromise suspected)',
            participants_required: 2,
            participants_present: '2 of 5 custodians (fastest availability)',
            location: 'Can be remote if air-gapped HSM accessible via secure courier',
            duration: '4-24 hours (depends on geography)',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 6. ZERO-TRUST NETWORK ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════

const ZERO_TRUST = {
    title: 'Zero-Trust Architecture — Trust Nothing, Verify Everything',

    principles: [
        { principle: 'Never trust, always verify', implementation: 'Every API request authenticated + authorized. No "trusted network" concept.' },
        { principle: 'Least privilege access', implementation: 'RBAC with 143 granular permissions. No blanket access. Time-limited elevated access.' },
        { principle: 'Assume breach', implementation: 'Hash-chain integrity checks every 60s. Tamper detection across 5 layers. Incident response < 4 hours.' },
        { principle: 'Micro-segmentation', implementation: 'Services communicate via mTLS. Inter-service authentication mandatory. No shared credentials.' },
        { principle: 'Continuous verification', implementation: 'Session tokens expire. Re-authentication for sensitive operations. Behavioral anomaly detection.' },
    ],

    implementation: {
        identity: 'Every service, user, and device has unique identity. No shared accounts.',
        network: 'mTLS between all services. No plaintext internal communication.',
        data: 'Encryption at rest (AES-256) + in transit (TLS 1.3). Field-level encryption for PII.',
        application: 'Input validation at every boundary. Output encoding. CSP headers.',
        monitoring: 'Centralized logging with tamper-evident chain. Real-time alerting. SIEM integration.',
    },

    maturity_assessment: {
        current_level: 'Level 2 — Partial (application-level controls strong, infrastructure-level gaps exist)',
        target_level: 'Level 4 — Advanced (full zero-trust with HSM + micro-segmentation)',
        gap: 'HSM implementation, mTLS between all services, micro-segmentation deployment',
        timeline: '6-12 months to reach Level 3, 12-24 months to Level 4',
    },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class CryptographicGovernanceEngine {
    getHSMArchitecture() { return HSM_ARCHITECTURE; }
    getMultisigPolicy() { return MULTISIG_POLICY; }
    getKeyRecovery() { return KEY_RECOVERY; }
    getKeyRotation() { return KEY_ROTATION; }
    getCeremonyProtocol() { return CEREMONY_PROTOCOL; }
    getZeroTrust() { return ZERO_TRUST; }

    assessKeyHealth(keys_rotated_on_schedule, hsm_operational, custodians_available) {
        const rotated = keys_rotated_on_schedule !== false;
        const hsm = hsm_operational !== false;
        const custodians = custodians_available || 5;
        const health = rotated && hsm && custodians >= 3 ? 'HEALTHY' : custodians >= 3 ? 'WARNING' : 'CRITICAL';
        return {
            key_rotation_current: rotated,
            hsm_operational: hsm,
            custodians_available: custodians,
            shamir_threshold_met: custodians >= 3,
            overall_health: health,
            recommendation: health === 'CRITICAL' ? 'IMMEDIATE: recruit additional key custodians' : health === 'WARNING' ? 'Schedule overdue key rotations' : 'No action required',
        };
    }

    getFullFramework() {
        return {
            title: 'Cryptographic Governance — Infrastructure-Grade Key Management',
            version: '1.0',
            hsm: HSM_ARCHITECTURE,
            multisig: MULTISIG_POLICY,
            key_recovery: KEY_RECOVERY,
            key_rotation: KEY_ROTATION,
            ceremony: CEREMONY_PROTOCOL,
            zero_trust: ZERO_TRUST,
        };
    }
}

module.exports = new CryptographicGovernanceEngine();
