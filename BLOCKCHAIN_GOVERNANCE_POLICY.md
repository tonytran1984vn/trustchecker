# Blockchain Governance & Anchor Policy
## TrustChecker Enterprise Data Integrity Framework

**Version:** 1.0
**Effective:** 2026-02-19
**Classification:** Internal — Compliance & IT
**Review Cycle:** Annual or upon anchor incident
**Companion Docs:** `BLOCKCHAIN_GOVERNANCE_DIAGRAM.md` (Role Structure, SoD, Zero-Trust Zones), `BLOCKCHAIN_IN_SCM.md` (Architecture)

---

## I. RISK CLASSIFICATION MATRIX — Seal Policy

> Ai quyết định cái gì là material? → Ma trận này.

| Risk Level | ERS Score | Financial Impact | Legal Exposure | Seal Requirement | Auto/Manual |
|---|---|---|---|---|---|
| **Low** | < 30 | < $10K | None | ❌ No seal | N/A |
| **Medium** | 30 – 60 | $10K – $100K | Internal review | 🔒 Internal hash only | Auto |
| **High** | 60 – 80 | > $100K | Distributor dispute / partner liability | 🔒 Internal hash + ⏱ TSA timestamp | Auto |
| **Critical** | > 80 | Regulatory action | Legal escalation / fraud prosecution | 🔒 Hash + ⏱ TSA + 🌐 Public anchor | Auto + notify compliance |

### Event Type → Risk Level Override
| Event Type | Minimum Seal Level | Rationale |
|---|---|---|
| `fraud_alert` | High | Potential legal escalation |
| `route_breach` (critical/high severity) | High | Supply chain liability |
| `evidence_sealed` | Critical | Legal admissibility requirement |
| `model_deployed` / `model_rollback` | High | Audit trail for model governance |
| `case_frozen` | Critical | Evidence preservation |
| `batch_locked` | Medium | Operational integrity |
| `code_generated` | Medium | Anti-counterfeit proof |
| Normal scan event | Low | No seal — volume too high, hash chain sufficient |

### Approval Authority
| Decision | Authority | Escalation |
|---|---|---|
| Change seal policy for Low/Medium | IT Admin | No escalation needed |
| Change seal policy for High | IT Admin + Compliance Officer | Co-sign required |
| Change seal policy for Critical | CTO + Compliance + Legal | Board notification |
| Disable sealing entirely | CEO + CTO | Board approval required |
| Switch public anchor provider | IT Admin + Compliance | Change request + 30-day notice |

---

## II. ANCHOR PROVIDER GOVERNANCE

### 2.1 Provider Selection Criteria

| Criteria | Weight | Evaluation Method |
|---|---|---|
| Chain stability (uptime) | 25% | Historical uptime data (>99.9%) |
| Finality guarantee | 20% | Block confirmation time |
| Regulatory compliance | 20% | Jurisdiction analysis |
| Cost predictability | 15% | Gas fee volatility analysis |
| Enterprise adoption | 10% | Fortune 500 usage |
| Ecosystem risk | 10% | Fork history, governance model |

### 2.2 Default Configurations by Market

| Market | Default Provider | Rationale |
|---|---|---|
| **Vietnam** | TSA-only | Regulator chưa có chuẩn public chain. TSA đủ cho audit VN. |
| **ASEAN** | TSA + Polygon (optional) | Mix: TSA cho compliance, Polygon cho cross-border proof |
| **EU** | TSA + Polygon | eIDAS-compliant TSA required. Public anchor for GDPR audit trail |
| **US/Global** | TSA + Ethereum (batched) | Highest trust for Fortune 500. Merkle batch to control cost |

### 2.3 Anchor SLA

| Metric | Target | Measurement |
|---|---|---|
| Seal-to-anchor latency | < 1 hour (batched) / < 5 min (realtime) | Monitoring dashboard |
| Anchor success rate | > 99.5% | Monthly report |
| Failover activation | < 30 seconds | Auto-detect + TSA fallback |
| Data integrity (hash match) | 100% | Continuous verification |
| Anchor provider uptime | > 99.9% | Provider SLA |

---

## III. KEY MANAGEMENT & ROTATION

### 3.1 Key Inventory

| Key Type | Purpose | Storage | Rotation Cycle |
|---|---|---|---|
| Seal signing key (RSA-2048) | Sign blockchain seals | HSM / AWS KMS / Vault | Annual |
| TSA authentication | Authenticate with TSA provider | Environment variable (encrypted) | 6 months |
| Public anchor wallet key | Submit transactions to public chain | HSM / Hardware wallet | Annual |
| HMAC secret (SHA-256) | Code registry collision detection | Environment variable | 6 months |
| API signing key | Evidence package signature | HSM / KMS | Annual |

### 3.2 Key Rotation Process

```
1. Generate new key pair (offline, air-gapped machine preferred)
2. Test new key on staging environment
3. Deploy new key to production (dual-key period: 7 days)
4. Verify all seals use new key
5. Revoke old key
6. Log rotation event in audit trail
7. Notify compliance team
```

### 3.3 Key Compromise Response

| Step | Action | Timeline | Owner |
|---|---|---|---|
| 1 | Detect: abnormal signing activity | Real-time alert | IT/SOC |
| 2 | Contain: disable compromised key | < 15 minutes | IT Admin |
| 3 | Activate: switch to backup key | < 30 minutes | IT Admin |
| 4 | Assess: audit all seals since last known-good | < 4 hours | Compliance |
| 5 | Communicate: notify affected parties | < 24 hours | Legal + CTO |
| 6 | Remediate: re-seal affected evidence | < 72 hours | IT + Compliance |
| 7 | Post-mortem: root cause + prevention | < 7 days | CISO |

---

## IV. INCIDENT RESPONSE — ANCHOR FAILURE

### 4.1 Anchor Provider Failure
```
Primary anchor unavailable
  ├─ Auto-detect (health check fails 3x in 5 min)
  ├─ Auto-failover to TSA-only
  ├─ Alert IT Admin + Compliance
  ├─ Continue sealing (hash chain unaffected)
  └─ When primary recovers:
       ├─ Batch-anchor all missed seals
       ├─ Verify chain integrity
       └─ Close incident
```

### 4.2 Chain Fork Handling
```
Public chain forks
  ├─ Detect: monitoring agent detects fork event
  ├─ Pause: stop new anchor submissions
  ├─ Evaluate: which fork has our anchor transactions?
  ├─ Decision: follow canonical chain (majority consensus)
  ├─ If anchors on orphan fork:
  │    └─ Re-anchor affected seals on canonical chain
  └─ Resume: normal anchoring
  └─ Post-incident: report to compliance

Note: Internal hash chain is NEVER affected by external chain events.
```

### 4.3 Government Blockchain Ban Scenario
```
Government bans public blockchain usage
  ├─ Immediate: disable public anchor (1 click in admin)
  ├─ Hash chain continues (no disruption)
  ├─ TSA timestamps continue (independent of blockchain)
  ├─ Existing anchors remain valid (immutable on-chain)
  ├─ Communicate to stakeholders: "evidence integrity unaffected"
  └─ Legal review: assess impact on existing evidence admissibility

Design Principle: TrustChecker NEVER depends on public blockchain.
Public anchor is optional premium. Removal = zero impact on core function.
```

---

## V. INSURANCE & LIABILITY FRAMEWORK

### 5.1 Service Level Agreement (Data Integrity)

| SLA Metric | Commitment | Remedy |
|---|---|---|
| Hash chain availability | 99.95% uptime | Service credit (pro-rata) |
| Seal processing | < 500ms P99 | Priority engineering |
| Chain integrity verification | 100% accuracy | Full investigation + re-seal |
| Evidence package delivery | < 24 hours from request | Expedited processing |
| Data retention | Per retention schedule | Contractual guarantee |

### 5.2 Liability Framework

| Scenario | TrustChecker Liability | Customer Responsibility |
|---|---|---|
| Hash chain tampered (internal fault) | Full remediation + re-seal + notification | Report to regulator if required |
| Public anchor provider failure | Re-anchor on recovery. No data loss. | Accept temporary TSA-only mode |
| Evidence rejected by court | Provide technical expert witness | Engage own legal counsel |
| Key compromise (our fault) | Full incident response + remediation | Cooperate with investigation |
| Key compromise (customer misuse) | Technical support only | Full liability |
| Regulatory change | Adapt within compliance timeline | Update internal policies |

### 5.3 Liability Cap

> Liability is capped at **12 months of subscription fees** or **$500,000**, whichever is greater, for data integrity failures attributable to TrustChecker system faults.
>
> This cap does NOT apply to:
> - Gross negligence
> - Willful misconduct
> - Breach of confidentiality

### 5.4 Evidence Retention Guarantee

| Data Type | Retention | Legal Basis |
|---|---|---|
| Blockchain seals | 7 years minimum | Audit requirement |
| Evidence packages | 10 years minimum | Legal admissibility |
| TSA timestamps | Lifetime of seal | RFC 3161 compliance |
| Audit logs | 7 years | SOC2 / ISO 27001 |
| Public anchor proofs | Permanent (on-chain) | Immutable by design |

### 5.5 DR & Backup for Data Integrity Layer

| Component | Backup Frequency | Recovery Target | Test Frequency |
|---|---|---|---|
| Hash chain (SQLite/PostgreSQL) | Real-time replication | RPO: 0, RTO: < 1 hour | Quarterly |
| Seal signing keys | Encrypted backup in secondary HSM | RTO: < 30 min | Semi-annual |
| TSA tokens | Stored with evidence package | RPO: 0 | With package |
| Anchor transaction receipts | Replicated to secondary region | RPO: 0, RTO: < 4 hours | Quarterly |

---

## VI. VIETNAM MARKET POSITIONING

### 6.1 Regulatory Landscape (2026)

| Aspect | VN Status | Implication |
|---|---|---|
| Public blockchain | Không có quy định rõ ràng | Không nên mặc định. Dùng TSA. |
| Digital signature | Luật GDĐT 2005, nghị định 130/2018 | Chữ ký số đủ pháp lý |
| TSA (thời gian chứng thực) | Được công nhận | TSA đủ cho chứng cứ |
| SHA-256/RSA-2048 | Được chấp nhận | Tiêu chuẩn quốc tế |
| GDPR equivalent | PDPA VN (dự thảo) | Hash-only = compliant |

### 6.2 Default Configuration cho VN

```
Provider:         tsa_only   (không phí gas, không phụ thuộc chain)
Fallback:         none       (TSA đã là minimum)
Anchor Frequency: daily      (batch 1 lần/ngày)
TSA Provider:     freetsa    (miễn phí, đủ chuẩn RFC 3161)
Public Anchor:    disabled   (bật khi khách hàng yêu cầu cụ thể)
```

### 6.3 Khi nào bật Public Anchor cho VN?

| Trigger | Provider | Rationale |
|---|---|---|
| MNC yêu cầu (Fortune 500 client) | Polygon | Chi phí thấp, proof đủ mạnh |
| Cross-border dispute > $100K | Ethereum (batch) | Highest trust, pháp lý quốc tế |
| Big4 audit requirement | Polygon/Ethereum | Auditor yêu cầu on-chain proof |
| Regulatory directive | Per directive | Follow regulator guidance |

---

## VII. CHANGE MANAGEMENT

### 7.1 Governance Changes Require

| Change Type | Approval | Notice Period |
|---|---|---|
| Anchor provider switch | IT + Compliance co-sign | 30 days |
| Seal policy modification | CTO + Legal | 14 days |
| Key rotation | IT Admin | 7 days |
| Module enable/disable | Admin (logged) | Immediate |
| TSA provider switch | IT Admin | 7 days |
| New event type for sealing | Compliance + Engineering | 14 days |

### 7.2 Audit Trail for All Changes

Every governance change is:
1. Logged in `audit_log` table
2. Sealed with blockchain seal (meta-seal — seal of governance change)
3. Timestamped via TSA
4. Notified to compliance team
5. Included in quarterly governance report

---

*This document is part of TrustChecker Enterprise Audit Specification (EAS v2.0). Reference: Layer 4 — Data Integrity & Audit Layer.*
