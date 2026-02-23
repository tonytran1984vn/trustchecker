# TrustChecker — Enterprise Audit Specification (EAS v2.0)

## SCM Architecture — Audit-Ready, Explainable, Segregated Duty, Integration-Safe

---

## I. ARCHITECTURE OVERVIEW (6-Layer Audit-Oriented Model)

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1 — Presentation Layer (Role-Specific UI)            │
│  CEO | Ops | Risk | Compliance | Admin | SuperAdmin | IT    │
├──────────────────────────────────────────────────────────────┤
│  Layer 2 — Application Governance Layer                     │
│  RBAC | SoD | Approval Engine | Model Versioning | SLA      │
├──────────────────────────────────────────────────────────────┤
│  Layer 3 — Core Intelligence Engine                         │
│  Code Governance | Risk Engine | Decision Engine            │
│  Supply Route Engine | Forensic Investigation               │
├──────────────────────────────────────────────────────────────┤
│  Layer 4 — Data Integrity & Audit Layer                     │
│  Immutable Log | Hash Chain | Evidence Store | Export Sign  │
├──────────────────────────────────────────────────────────────┤
│  Layer 5 — Integration & Event Layer                        │
│  API Gateway | Webhook | Kafka | DLQ | Idempotency Control  │
├──────────────────────────────────────────────────────────────┤
│  Layer 6 — Infrastructure & Security Layer                  │
│  IAM | Encryption | KMS | Monitoring | Backup | DR          │
└──────────────────────────────────────────────────────────────┘
```

---

## II. CONTROL DOMAINS (6 Audit Domains)

| Domain | Audit Focus |
|---|---|
| Identity & Access | RBAC, SoD, least privilege, conditional access |
| Code Governance | Uniqueness, collision prevention, lifecycle immutability |
| Risk Model Governance | Versioning, explainability, deployment gate, drift |
| Operational Integrity | SLA, escalation, case freeze |
| Data Integrity | Immutability, tamper-proof, hash chain |
| Integration Security | API auth, retry, circuit breaker, ERP isolation |

---

## III. DOMAIN 1 — IDENTITY & ACCESS CONTROL

### 3.1 Role Segmentation
7 roles: Super Admin, Company Admin, CEO, Ops, Risk, Compliance, IT

### 3.2 Segregation of Duties (SoD)

| Action | Ops | Risk | Compliance | Admin |
|---|---|---|---|---|
| Generate Code | ❌ | ❌ | ❌ | ✅ |
| Change Weight | ❌ | Propose | Approve | ❌ |
| Lock Batch | ❌ | Propose | Approve | 4-Eyes |
| Close Case | Propose | Confirm | Validate | ❌ |
| Deploy Model | ❌ | Initiate | Co-sign | ❌ |
| Rollback Model | ❌ | Initiate | 4-Eyes | ❌ |

**No single role can:** Generate code + Adjust model + Approve revocation + Close counterfeit case.

---

## IV. DOMAIN 2 — CODE GOVERNANCE CONTROL

### 4.1 Code Structure
- Tenant ID (hidden salt) + Prefix + Sequential/Random ID + Check digit (CRC / HMAC-SHA256)
- Collision verification: Bloom filter (0.001% FP) → Redis SET → HMAC-SHA256 → tenant namespace isolation

### 4.2 Code Lifecycle State Machine
```
Generated → Printed → Activated → First Scan → (Flagged?) → Locked → Revoked
```
Each transition logs: Actor ID, Timestamp (UTC), IP, Role, Approval type, Hash pointer to previous event.

---

## V. DOMAIN 3 — RISK ENGINE GOVERNANCE

### 5.1 Model Versioning
Every weight configuration: Version ID, Effective date, Approved by, Test dataset reference, Performance metrics.

### 5.2 Deployment Gate
Risk Model cannot deploy unless: Sandbox TP ≥ 95%, FP reduction verified, Compliance co-signer signed.

### 5.3 Explainability Requirement
Each ERS outputs: score + top contributing factors + risk multiplier. Audit must reconstruct calculation.

### 5.4 Drift Detection
5 metrics monitored: TP rate, FP rate, Avg ERS, factor contribution shift, case volume delta. Alert threshold: ±3%.

---

## VI. DOMAIN 4 — OPERATIONAL CONTROL & ESCALATION

### 6.1 SLA Enforcement

| Stage | Owner | SLA |
|---|---|---|
| Event capture | System | <100ms |
| Ops review | Ops | 24h |
| Risk analysis | Risk | 4h |
| Compliance validation | Compliance | 8h |

SLA breach → auto-escalation.

### 6.2 Case Freeze
When case escalates to Compliance: Data snapshot locked, no edit allowed, only append log.

---

## VII. DOMAIN 5 — DATA INTEGRITY & IMMUTABILITY

### 7.1 Hash-Chained Event Log
`Hash = SHA256(previous_hash + event_payload)` — prevents tampering.

### 7.2 Evidence Package
Export contains: Scan logs, Risk factors, Timeline, Hash proof, Digital signature, Verification key.
Audit can re-verify hash independently.

---

## VIII. DOMAIN 6 — INTEGRATION SECURITY

### 8.1 API Security
OAuth2 / SAML SSO, Rate limiting, IP allowlist (ERP side), JWT short expiry (15min access, 7d refresh).

### 8.2 Event Resilience
Kafka buffer, Dead Letter Queue, Retry with exponential backoff (3 retries, 1s/5s/30s), Idempotency key per event.

### 8.3 ERP Isolation Principle
TrustChecker: Read-only for ERP master data. Never writes into ERP financial modules.

---

## IX. DATA GOVERNANCE POLICY (Gap 1 — Formal)

### 9.1 Data Classification

| Level | Classification | Examples | Handling |
|---|---|---|---|
| L1 — Public | Marketing metrics, public KPIs | Published reports | No restriction |
| L2 — Internal | Scan volumes, batch counts | Dashboards | Role-based, logged |
| L3 — Confidential | ERS scores, risk weights, case details | Investigation data | Encrypted, SoD-gated, audit trail |
| L4 — Restricted | Consumer IP, device fingerprint, PII | Raw scan logs | Masked by default, access logged, retention-limited |
| L5 — Regulated | Evidence packages, legal holds | Compliance exports | Encrypted, immutable, signed, 7-year retention |

### 9.2 Data Retention Schedule

| Data Category | Retention Period | Action at Expiry | Legal Basis |
|---|---|---|---|
| Scan events (raw) | 3 years | Archive to cold storage | Operational |
| Audit log | 7 years | Immutable, no deletion | SOX / ISO 27001 |
| Evidence packages | 7 years + legal hold | Immutable until release | Regulatory |
| Consumer IP / PII | 90 days | Auto-anonymize | GDPR Art. 5(1)(e) |
| Device fingerprints | 1 year | Hash-only retention | PDPA / GDPR |
| Risk model weights | Indefinite (versioned) | Archive, never delete | Model governance |
| Session/auth tokens | 30 days | Auto-purge | Security policy |
| Case data (closed) | 5 years | Archive | Legal / compliance |
| Integration logs | 1 year | Rotate | Operational |
| Cross-tenant analytics | 2 years (anonymized) | Aggregate only | Platform analytics |

### 9.3 Right-to-Erasure Workflow (GDPR Art. 17 / PDPA)

```
Data Subject Request → Verify Identity (2FA) → Scope Assessment
  ↓
Scope:
  - Consumer scan data → Anonymize IP, device, geo (retain hash-only)
  - Account data → Full deletion after 30-day hold
  - Evidence-linked data → CANNOT delete (legal hold exception)
  ↓
Execute: Anonymize fields → Generate deletion certificate → Audit log entry
  ↓
Respond: ≤30 days (GDPR) / ≤30 days (PDPA)
```

**Legal Hold Override:** If data is part of active case/evidence, deletion blocked. Data Subject notified of delay + legal basis.

### 9.4 PII Masking Rulebook

| Field | Default State | Unmasked When | Mask Method |
|---|---|---|---|
| Consumer IP | `192.168.x.x` → `192.168.*.*` | Risk role + case context | Last 2 octets zeroed |
| Device Fingerprint | `abc123...` → `abc1****` | Forensic case only | Truncate to 4 chars |
| Geo (exact lat/lng) | `10.762, 106.660` → `10.8, 106.7` | Risk/Forensic only | Round to 1 decimal |
| User Agent | Full | Never exposed to CEO | Field-level access |
| Email (if captured) | `u***@***.com` | Never in dashboard | Partial mask |
| Phone (if captured) | `+84***` | Never | First 3 digits only |

### 9.5 Cross-Border Data Storage

| Region | Storage | Controller | Legal Framework |
|---|---|---|---|
| Vietnam | VN-region cloud / on-prem | Tenant org | Vietnam Cybersecurity Law 2018 |
| EU/EEA | EU-region cloud | Tenant org | GDPR Chapter V |
| Singapore | SG-region cloud | Tenant org | PDPA |
| Cross-tenant analytics | Platform region (anonymized) | TrustChecker | Data Processing Agreement |

**Transfer Mechanism:** Standard Contractual Clauses (SCCs) for EU↔non-EU transfers. No raw PII in cross-tenant analytics.

---

## X. THREAT MODEL & SECURITY ARCHITECTURE (Gap 2)

### 10.1 STRIDE Threat Matrix

| Threat | Category | Attack Vector | Control | Layer |
|---|---|---|---|---|
| **S** — Spoofing | Identity | Stolen JWT, API key reuse | MFA, JWT 15min expiry, session binding, IP allowlist | L2/L6 |
| **T** — Tampering | Data | Modify scan event, alter risk score | SHA-256 hash chain, immutable audit log, blockchain seal | L4 |
| **R** — Repudiation | Audit | Deny action ("I didn't approve") | Actor ID + timestamp + IP in every log, signed evidence | L4 |
| **I** — Info Disclosure | Privacy | PII leak, weight exposure, API response leak | Field-level RBAC, PII masking, response filtering per role | L2/L3 |
| **D** — Denial of Service | Availability | API flood, scan burst, Kafka overflow | Rate limiting (1000/min), circuit breaker, DLQ, auto-scale | L5/L6 |
| **E** — Elevation of Privilege | Access | Operator → Admin escalation, cross-tenant access | SoD enforcement, tenant namespace isolation, ABAC policies | L2 |

### 10.2 OWASP Top 10 Mitigation

| # | Vulnerability | Mitigation |
|---|---|---|
| A01 | Broken Access Control | RBAC + ABAC + SoD + field-level permissions |
| A02 | Cryptographic Failures | AES-256 at rest, TLS 1.3 in transit, KMS-managed keys |
| A03 | Injection | Parameterized queries (Prisma ORM), input validation middleware |
| A04 | Insecure Design | Threat modeling (STRIDE), SoD-by-design, 4-Eyes approval |
| A05 | Security Misconfiguration | Helmet.js, CORS whitelist, env-based config, no default secrets |
| A06 | Vulnerable Components | Dependabot, `npm audit`, SBOM generation (CycloneDX) |
| A07 | Auth Failures | bcrypt password hashing, MFA (TOTP), account lockout after 5 attempts |
| A08 | Data Integrity Failures | Hash chain for events, signed evidence, deployment gate |
| A09 | Logging & Monitoring | Structured audit log, Prometheus metrics, alert on anomaly |
| A10 | SSRF | No user-controlled URLs in server-side requests, webhook URL validation |

### 10.3 Insider Risk Controls

| Risk | Detection | Response |
|---|---|---|
| Admin changes own role | Audit log alert + 2nd-party approval required | Auto-revert + incident ticket |
| Bulk data export by non-Compliance | Rate limiting on export API + role check | Block + alert to Security |
| Weight manipulation without approval | SoD enforcement — propose ≠ approve ≠ deploy | Block at API level |
| Off-hours access to Restricted data | Conditional access: time-based rules | Alert + session review |
| Cross-tenant data browsing | Tenant namespace isolation + query logging | Alert to Super Admin |

### 10.4 Key Management & Rotation

| Key Type | Rotation Cycle | Storage | Compromise Response |
|---|---|---|---|
| JWT signing key | 90 days | Environment variable / KMS | Rotate immediately, invalidate all sessions |
| API encryption key | 90 days | KMS (AWS/GCP) | Rotate + re-encrypt active data |
| Database encryption (at rest) | 180 days | Cloud KMS | Rotate + full backup re-encrypt |
| HMAC salt (code generation) | Never (immutable per tenant) | KMS | Revoke all codes from that tenant batch |
| TLS certificate | 365 days (auto-renew) | Let's Encrypt / DigiCert | Auto-renew via certbot |

### 10.5 Penetration Testing Cycle

| Type | Frequency | Scope | Provider |
|---|---|---|---|
| Automated DAST | Weekly | All API endpoints | OWASP ZAP / Burp Suite |
| Manual pen test | Bi-annual | Full application + infrastructure | External firm (NCC, Bishopfox, etc.) |
| Red team exercise | Annual | Social engineering + infrastructure | Contracted red team |
| Dependency scan | Every build | npm packages, Docker images | Snyk / Dependabot |

---

## XI. BUSINESS CONTINUITY & DISASTER RECOVERY (Gap 3)

### 11.1 Architecture

| Component | Config | Detail |
|---|---|---|
| Application tier | **Active-passive** with auto-failover | Primary: Region A, Standby: Region B |
| Database (PostgreSQL) | **Streaming replication** | Sync to standby, RPO ≤ 5min |
| Redis cache | **Sentinel cluster** | Auto-failover, 3-node minimum |
| File storage (evidence) | **Cross-region replication** | S3/GCS with versioning |
| Message queue (Kafka) | **Multi-AZ cluster** | 3 brokers, replication factor = 3 |

### 11.2 Backup Schedule

| Asset | Frequency | Retention | Storage | Encryption |
|---|---|---|---|---|
| PostgreSQL full backup | Daily 02:00 UTC | 30 days | Cross-region S3 | AES-256 |
| PostgreSQL WAL (incremental) | Continuous | 7 days | Same-region S3 | AES-256 |
| Evidence store | On creation (immutable) | 7 years | Cross-region S3 Glacier | AES-256 |
| Redis snapshot (RDB) | Every 6 hours | 7 days | Same-region | AES-256 |
| Application config | On every deployment | Indefinite (git) | Git repository | N/A |
| Audit log | Continuous + daily export | 7 years | Write-once storage (WORM) | AES-256 |

### 11.3 RPO / RTO Commitment

| Scenario | RPO | RTO | Mechanism |
|---|---|---|---|
| Single server failure | 0 (in-memory state) | < 5 min | Auto-restart (PM2/systemd) |
| Database failure | ≤ 5 min | ≤ 15 min | Streaming replica promotion |
| Full region outage | ≤ 15 min | ≤ 1 hour | Failover to Region B |
| Data corruption | 0 (WAL) | ≤ 30 min | Point-in-time recovery |
| Ransomware/total loss | ≤ 24 hours | ≤ 4 hours | Cross-region backup restore |

### 11.4 DR Test Protocol

| Test Type | Frequency | Last Test | Next Scheduled | Pass Criteria |
|---|---|---|---|---|
| Backup restore verify | Monthly | *[Date]* | *[Date + 30d]* | Data integrity hash match |
| Failover drill | Quarterly | *[Date]* | *[Date + 90d]* | RTO < 1hr achieved |
| Full DR simulation | Annual | *[Date]* | *[Date + 365d]* | All services operational < 4hr |
| Tabletop exercise | Bi-annual | *[Date]* | *[Date + 180d]* | Runbook validated |

> **Audit question:** "Last DR test date?"
> → DR Test Log maintained in `ops/dr-test-log.md` with date, participants, results, remediation items.

---

## XII. LEGAL ADMISSIBILITY SPECIFICATION (Gap 4)

### 12.1 Digital Signature Standard

| Component | Standard | Implementation |
|---|---|---|
| Hash algorithm | SHA-256 (NIST FIPS 180-4) | Node.js `crypto.createHash('sha256')` |
| Signature algorithm | RSA-2048 / ECDSA P-256 | Server-side signing key |
| Signature format | PKCS#7 (CMS) / JWS (RFC 7515) | Attached signature in evidence package |
| Key storage | KMS (HSM-backed where required) | AWS KMS / GCP Cloud KMS |

### 12.2 Time-Stamping Authority (TSA)

| Requirement | Specification |
|---|---|
| Protocol | RFC 3161 (Time-Stamp Protocol) |
| TSA provider | External: DigiCert TSA / FreeTSA / Sectigo |
| Binding | Each evidence package includes TSA response token |
| Verification | Third party can verify timestamp independently |
| Accuracy | ±1 second (NTP synced) |

**Implementation:**
```
Evidence Hash → Send to TSA → Receive TSA Response Token → Embed in Evidence Package
Verifier: Extract TSA token → Query TSA → Confirm timestamp + hash match
```

### 12.3 Hash Verification Tool (Public)

Evidence recipients can verify integrity using:

```bash
# Verify evidence hash chain
sha256sum evidence_scan_logs.json
# Compare with hash in evidence_manifest.json → hash_chain[last].payload_hash

# Verify digital signature
openssl dgst -sha256 -verify public_key.pem -signature evidence.sig evidence_scan_logs.json
```

**Public verification endpoint:** `GET /api/public/verify-evidence?hash=<sha256>` — returns match/mismatch + timestamp.

### 12.4 Chain-of-Custody Procedure

```
Step 1: Event Capture
  → System auto-logs: actor, timestamp, IP, device → immutable hash entry

Step 2: Case Assignment
  → Assigned investigator logged → cannot be changed after freeze

Step 3: Evidence Collection
  → Each piece: title, file hash, upload timestamp, uploader ID
  → Appended to case, never replaced

Step 4: Case Freeze (Compliance trigger)
  → All data snapshot locked → frozen_at timestamp → no edits permitted
  → Only append: notes, verdict

Step 5: Evidence Package Export
  → PDF + signed JSON + hash verification chain + TSA token
  → Package hash = SHA256(all component hashes concatenated)

Step 6: Handoff to Regulator/Legal
  → Export signed by Compliance officer → download logged
  → External party can verify: (a) hash chain, (b) TSA timestamp, (c) digital signature
```

### 12.5 Jurisdictional Admissibility

| Jurisdiction | Standard | Compliance |
|---|---|---|
| Vietnam | Electronic Transactions Law 2005 | Digital signature recognized |
| EU | eIDAS Regulation (EU 910/2014) | Advanced electronic signature (AdES) |
| Singapore | Electronic Transactions Act | SHA-256 + TSA recognized |
| USA | ESIGN Act / UETA | Digital signature valid |

---

## XIII. MODEL VALIDATION REPORT FRAMEWORK (Gap 5)

### 13.1 Validation Dataset Specification

| Parameter | Requirement | Current |
|---|---|---|
| Dataset size | ≥ 100,000 events | *[Insert actual count]* |
| Time span | ≥ 6 months of production data | *[Insert date range]* |
| Data source | Production scan events (anonymized) | Real data, PII-stripped |
| Synthetic data | ≤ 20% of total (for edge cases) | *[Insert %]* |
| Fraud prevalence | Must include ≥ 500 confirmed counterfeit cases | *[Insert count]* |
| Industry mix | ≥ 3 industries (FMCG, Pharma, Luxury) | *[Insert industries]* |
| Geographic coverage | ≥ 5 countries | *[Insert countries]* |

### 13.2 Benchmark Protocol

```
Phase 1: Data Preparation
  → Split: 70% train / 15% validation / 15% holdout test
  → Stratified by: industry, region, fraud type
  → No data leakage between splits

Phase 2: Model Training (on train set)
  → Apply current weight configuration
  → Log: version, timestamp, hyperparameters

Phase 3: Validation (on validation set)
  → Metrics: TP rate, FP rate, Precision, Recall, F1, AUC-ROC
  → Per-factor contribution analysis
  → Confusion matrix at ERS thresholds: 30, 60, 80

Phase 4: Holdout Test (final, one-time)
  → Report all metrics on unseen data
  → Compare against baseline model (previous version)

Phase 5: Production Monitoring (ongoing)
  → Weekly drift check: TP, FP, Avg ERS, factor contribution
  → Alert if any metric shifts > ±3% from validation baseline
```

### 13.3 Model Performance Report Template

| Metric | Threshold | Validation Result | Holdout Result | Status |
|---|---|---|---|---|
| True Positive Rate | ≥ 95% | *[value]* | *[value]* | ✅/❌ |
| False Positive Rate | ≤ 10% | *[value]* | *[value]* | ✅/❌ |
| Precision | ≥ 90% | *[value]* | *[value]* | ✅/❌ |
| Recall | ≥ 85% | *[value]* | *[value]* | ✅/❌ |
| F1 Score | ≥ 0.87 | *[value]* | *[value]* | ✅/❌ |
| AUC-ROC | ≥ 0.92 | *[value]* | *[value]* | ✅/❌ |
| P99 Latency | < 300ms | *[value]* | *[value]* | ✅/❌ |

### 13.4 Independent Validation Framework

| Requirement | Specification |
|---|---|
| Validator | External firm (Big 4, specialized ML audit firm, or university lab) |
| Scope | Model accuracy, bias detection, explainability, adversarial robustness |
| Frequency | Annual, or on major version change |
| Output | Signed Model Validation Certificate + Findings Report |
| Access | Validator receives: model weights, anonymized dataset, source code (read-only) |
| Confidentiality | NDA + data processing agreement required |

### 13.5 KPI Credibility Documentation

Each published KPI must include:

```
KPI: True Positive Rate = 97.8%
  ├─ Dataset: 127,842 events, Oct 2025 – Mar 2026
  ├─ Confirmed fraud cases: 612
  ├─ Method: Holdout test (15% split, stratified)
  ├─ Baseline comparison: v2.2.0 TP = 94.1% → v2.3.1 TP = 97.8% (+3.7%)
  ├─ Validated by: [Internal / External Firm Name]
  └─ Report reference: MVR-2026-Q1.pdf
```

Without this documentation → KPI has no audit weight.

---

## XIV. NON-FUNCTIONAL REQUIREMENTS

| Requirement | Spec |
|---|---|
| Uptime | ≥99.95% |
| P99 latency | <300ms |
| RPO | ≤15 min (full region), ≤5 min (single failure) |
| RTO | ≤1 hour (full region), ≤15 min (single failure) |
| Encryption at rest | AES-256 |
| Encryption in transit | TLS 1.3 |
| Key rotation | 90 days (JWT, API), 180 days (DB) |
| Audit retention | ≥7 years (immutable, WORM-compatible) |
| PII retention | ≤90 days (auto-anonymize) |
| Pen test cycle | Bi-annual external, weekly automated |

---

## XV. ENTERPRISE AUDIT CHECKLIST

- ✅ RBAC documented (7 roles, field-level)
- ✅ SoD matrix documented + enforced in API
- ✅ Model governance w/ version + rollback + drift + SoD
- ✅ Escalation SLA documented (8-stage, auto-escalation)
- ✅ Immutable logging (SHA-256 hash chain)
- ✅ Integration security (API auth, DLQ, circuit breaker)
- ✅ Data classification policy (5 levels, L1–L5)
- ✅ Data retention schedule (per-table, legal basis)
- ✅ Right-to-erasure workflow (GDPR Art. 17)
- ✅ PII masking rulebook (6 field types)
- ✅ Cross-border data storage rules
- ✅ Threat model (STRIDE 6-category)
- ✅ OWASP Top 10 mitigation map
- ✅ Insider risk controls (5 scenarios)
- ✅ Key management + rotation schedule
- ✅ Penetration testing cycle (4 types)
- ✅ BCP/DR architecture (active-passive, multi-AZ)
- ✅ Backup schedule (6 asset types)
- ✅ RPO/RTO commitment (5 scenarios)
- ✅ DR test protocol (4 test types)
- ✅ Legal admissibility (SHA-256, RSA-2048, RFC 3161 TSA)
- ✅ Chain-of-custody procedure (6 steps)
- ✅ Public hash verification tool
- ✅ Model validation framework (5-phase protocol)
- ✅ KPI credibility documentation standard
- ✅ Independent validation requirement (annual)
- ✅ Evidence export reproducible (PDF + JSON + hash + TSA token)

**Checklist: 27/27 items documented.**

---

## XVI. MATURITY LEVEL

| Level | Description | Status |
|---|---|---|
| Level 1 | Monitoring tool | ✅ Complete |
| Level 2 | Risk scoring tool | ✅ Complete |
| Level 3 | Governance platform | ✅ Complete |
| Level 3.5 | Audit-documented governance | ✅ **Current** (EAS v2.0) |
| Level 4 | Audit-certified trust infrastructure | ⬜ Requires: SOC2 + ISO 27001 + External pen test + Independent model validation |

### Path to Level 4:

| Action | Owner | Timeline | Status |
|---|---|---|---|
| SOC2 Type II audit | External auditor | 6–12 months | ⬜ Not started |
| ISO 27001 certification | External auditor | 6–12 months | ⬜ Not started |
| External penetration test | Security firm | 30 days | ⬜ RFP ready |
| Independent model validation | ML audit firm | 60 days | ⬜ Framework defined |
| DR test (first formal) | Internal ops | 7 days | ⬜ Runbook ready |
| GDPR DPA registration | Legal | 30 days | ⬜ Template ready |
