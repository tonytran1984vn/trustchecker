# Enterprise Blockchain Governance Diagram (EAS v2.0)
## TrustChecker Data Integrity Architecture — Board-Ready + Auditor-Ready

**Version:** 2.0
**Effective:** 2026-02-19
**Classification:** Internal — Board, Compliance, IT, Audit
**Standard:** Enterprise Audit Spec (EAS v2.0)
**Companion:** `BLOCKCHAIN_GOVERNANCE_POLICY.md`, `BLOCKCHAIN_IN_SCM.md`

---

## 1️⃣ ENTERPRISE BLOCKCHAIN GOVERNANCE DIAGRAM

```
                                 ┌────────────────────────────┐
                                 │        BOARD / CEO         │
                                 │  Strategic Oversight Only  │
                                 └──────────────┬─────────────┘
                                                │
                                       Trust Report / KPI
                                                │
                                                ▼
                                 ┌────────────────────────────┐
                                 │      COMPLIANCE OFFICER    │
                                 │  Legal Authorization Layer │
                                 └──────────────┬─────────────┘
                                                │ 4-eyes approval
                                                ▼
                                 ┌────────────────────────────┐
                                 │         RISK TEAM          │
                                 │ Material Risk Classifier   │
                                 └──────────────┬─────────────┘
                                                │ trigger seal request
                                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     TENANT GOVERNANCE ZONE (Zone A)                     │
│                                                                          │
│   Case Freeze → Evidence Packaging → Approval Token                     │
│                                                                          │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │ Signed request (no raw DB access)
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│               CRYPTOGRAPHIC CONTROL ZONE (Zone B)                       │
│                                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│  │ Hash Engine  │ → │ TSA Service  │ → │ HSM Signer   │                │
│  │ (Append-only)│   │ RFC 3161     │   │ Key Custody  │                │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                │
│         │                  │                  │                          │
│         ▼                  ▼                  ▼                          │
│     Seal Record        Time Proof        Digital Signature               │
│         │                                     │                          │
│         └──────────────► Anchor Provider ◄────┘                          │
│                              (Optional Public Chain)                     │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │ infra configuration only
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                 PLATFORM INFRASTRUCTURE ZONE (Zone C)                    │
│                                                                          │
│                     SUPER ADMIN (Infrastructure Custodian)               │
│                                                                          │
│   • Configure anchor provider                                            │
│   • Key rotation orchestration                                           │
│   • SLA monitoring                                                       │
│   • Health check                                                         │
│                                                                          │
│   ❌ No tenant evidence access                                           │
│   ❌ No seal creation                                                    │
│   ❌ No approval rights                                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ ROLE MATRIX — BLOCKCHAIN GOVERNANCE CONTROL MAP

| Role | Trigger Seal | Approve Seal | Access Hash | Access Evidence | Configure Anchor | Rotate Key |
|---|---|---|---|---|---|---|
| **Risk Team** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Compliance** | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **CEO** | ❌ | ❌ | Dashboard only | ❌ | ❌ | ❌ |
| **Super Admin** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **HSM** | Auto | Auto | Internal only | ❌ | ❌ | Auto |

> **Audit Rule:** Signer ≠ Approver ≠ Configurer ≠ Infrastructure Owner

---

## 3️⃣ BLOCKCHAIN CONTROL FLOW — ENTERPRISE STATE MACHINE

```
[Event Occurs]
        │
        ▼
[Risk Engine Score]
        │
        ├─ ERS < threshold → Log only
        │
        └─ ERS ≥ threshold
                │
                ▼
        [Risk Classification]
                │
                ▼
        [Compliance Approval]
                │
                ▼
        [Case Freeze State]
                │
                ▼
        [Seal Generation]
                │
                ├─ SHA-256 hash
                ├─ prevHash link
                ├─ TSA timestamp
                ├─ HSM signature
                │
                ▼
        [Anchor Policy Engine]
                │
                ├─ Internal only
                ├─ TSA only
                └─ Public anchor
                │
                ▼
        [Immutable Record]
                │
                ▼
        [Trust Report Updated]
```

---

## 4️⃣ GOVERNANCE ENFORCEMENT LAYERS

| Layer | Name | Capability | Controls |
|---|---|---|---|
| **L1** | Organizational Governance | SoD enforced, 4-eyes approval | Legal escalation matrix |
| **L2** | Cryptographic Governance | Append-only hash chain | prevHash continuity, Merkle batching |
| **L3** | Temporal Governance | RFC 3161 TSA timestamp | External time authority |
| **L4** | Identity Governance | HSM-backed RSA/ECDSA signing | Key rotation, Dual control ceremony |
| **L5** | External Trust | Optional public chain anchor | Independent verification portal |

---

## 5️⃣ ESCALATION MATRIX — ANCHOR POLICY

| Risk Level | Required Approvals | Seal Type | Anchor Type |
|---|---|---|---|
| **Medium** | Risk | Internal hash | None |
| **High** | Risk + Compliance | Hash + TSA | TSA |
| **Critical** | Risk + Compliance + Legal | Full seal | Public anchor |
| **Model Deploy** | Compliance | Hash + Signature | Optional TSA |
| **Evidence Export** | Compliance | Full seal | Mandatory TSA |

> CEO **không tham gia approve** — chỉ nhận Trust KPI.

---

## 6️⃣ ZERO-TRUST DESIGN PRINCIPLES

| # | Rule | Implementation |
|---|---|---|
| 1 | Super Admin Cannot See Tenant Data | Logical separation, encryption at rest, tenant key isolation |
| 2 | Risk Cannot Seal Directly | Risk only triggers; Seal service verifies approval token |
| 3 | Compliance Cannot Modify Event | Approval metadata sealed separately |
| 4 | No History Rewrite | prevHash verified, orphan detection, chain continuity validator |

---

## 7️⃣ AUDITOR VERIFICATION PATH

```
Auditor receives:
    Evidence Package
        │
        ▼
Verify Hash Integrity
        │
Verify Chain Continuity
        │
Verify TSA Timestamp
        │
Verify Digital Signature
        │
Verify Anchor TX ID
        │
Independent Validation Complete
```

> Không cần trust TrustChecker.

---

## 8️⃣ ENTERPRISE MATURITY MODEL

| Level | Description | Status Target |
|---|---|---|
| **L1** | Internal Hash Chain | Baseline |
| **L2** | TSA Integrated | Enterprise Ready |
| **L3** | HSM-backed Signing | Regulated Industry |
| **L4** | Public Anchor Hybrid | Cross-border |
| **L5** | External Audit Certified | IPO-grade |

---

## 9️⃣ STRATEGIC POSITIONING

Blockchain Layer trong SCM:
- Không phải core product
- Không phải marketing gimmick
- Là **Governance Infrastructure**

| Stakeholder | Value |
|---|---|
| **CEO** | Trust KPI |
| **Compliance** | Legal defensibility |
| **Risk** | Non-repudiation |
| **Investor** | Tamper-proof data governance |
| **Regulator** | Independent verification |

---

*Enterprise Audit Specification (EAS v2.0) — Layer 4: Data Integrity & Audit Layer.*
