# TrustChecker — Platform Architecture

## Enterprise Anti-Counterfeit & Supply Chain Risk Governance

---

## I. POSITIONING — Risk & Trust Overlay Layer

TrustChecker **không phải ERP**, không phải WMS, không phải mini-SAP.

TrustChecker là **Risk & Trust Overlay Layer** — một lớp trí tuệ phản gian lận nằm **trên** ERP hiện có của doanh nghiệp.

### 6-Layer Architecture (EAS v1.0)
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


### Cạnh tranh:
| Platform | Mạnh | Yếu | TrustChecker khác biệt |
|---|---|---|---|
| IBM Food Trust | Network traceability | Không có Risk Engine chủ động | Risk-driven, không chỉ trace |
| SAP IBP | Planning + ERP sâu | Không có anti-counterfeit | Code Governance + Risk Intelligence |
| Authentix | Anti-counterfeit vật lý | Không có digital layer | Full digital + physical bridge |

---

## II. CORE MODULES (Lõi — Không thể thiếu)

### 🔐 Module 1: Code Governance & Lifecycle
**Đây là root of trust** — mỗi sản phẩm có một mã duy nhất, traceable từ lúc sinh ra đến khi hết hạn.

| Trang | Chức năng |
|---|---|
| Code Format Rules | Template-driven: pattern, prefix, check digit (Luhn/HMAC/CRC) |
| Code Generate | Bulk generation theo rule — không free-text, collision check |
| Batch Assignment | Bind mã → batch + 10 metadata fields |
| Code Lifecycle | 7 stages: Generated → Printed → Activated → Scanned → Flagged → Locked → Revoked |
| Code Audit Log | Immutable hash-chain, signed export |

**Governance controls:** 4-Eyes (bulk), 6-Eyes (revoke), RBAC per action.

---

### 🧠 Module 2: Risk Scoring Engine (4-Tier + Advanced Models)
**Deterministic + Explainable + ML-upgradable**

#### Tier Architecture:
```
Tier 1: Event Risk Score (ERS)    — Per scan: Σ(Weight × Factor × Decay × Recal)
Tier 2: Batch Risk Score (BRS)    — Per batch: AVG(ERS) × ClusterMultiplier
Tier 3: Channel Risk Score (CRS)  — Per distributor: Duplicates / Units
Tier 4: Brand Risk Index (BRI)    — Enterprise-wide weighted
```

#### 12 Scoring Factors (4 categories):
| Category | Factors | Weight Range |
|---|---|---|
| A. Scan Frequency | Scan count, Time gap, Burst scan | 0.85–1.0× |
| B. Geo Risk | Distance anomaly, Cross-country, Out-of-zone | 0.9–1.2× |
| C. Device/Technical | Device repeat, IP cluster, Bot signature | 0.7–1.5× |
| D. Behavioral | Night burst, Flagged IP, Counterfeit zone | 0.8–1.3× |

#### Advanced Models (beyond rule-based):

**Risk Decay Function:**
```
effective_score = raw_score × e^(-λt)
λ = 0.015 (half-life ≈ 46 days)
```
Score giảm tự nhiên nếu không có event mới. Scan lần 2 sau 6 tháng ≠ scan lần 2 sau 3 phút.

**Dynamic Recalibration:**
```
adjusted_weight = base_weight × (1 + α × FP_rate_factor)
Review cycle: weekly
```
Nếu factor X tạo quá nhiều false positive → auto-giảm weight. Nếu factor Y bắt đúng fraud → auto-tăng weight.

**Historical Weighting:**
```
context_multiplier = f(time_gap, geo_consistency, device_match)
Same device + same city + 6 months later → multiplier 0.3×
Different device + different country + 3 minutes → multiplier 2.5×
```

**False Positive Feedback Loop:**
```
Case closed as "False Positive"
  → Extract factor contributions
  → Reduce weight of contributing factors by 5-10%
  → Log adjustment in calibration audit
  → Next review: validate if FP rate decreased
```

---

### ⚡ Module 3: Decision Engine & Auto-Response
```
ERS 0-30:   Log only (auto, <15ms)
ERS 31-60:  Soft case → Ops (auto, <30ms)
ERS 61-80:  High-risk case → Risk team (auto, <50ms)
ERS 81-100: Lock batch → Compliance + CEO (auto, <100ms)
```
SLA: <300ms P99. Auto-execution: 99.8%.

---

### 📋 Module 4: Case Workflow (Investigation Pipeline)
```
Ops Review (24h SLA) → Risk Review (4h) → Compliance (8h) → IT (2h) → Resolution
```
Verdicts: Confirmed / False Positive / Inconclusive
- False Positive → feeds back to Risk Engine calibration
- Confirmed → Evidence package + Legal hold + Regulator report

---

### 📊 Module 5: Brand Risk Dashboard (CEO Layer)
CEO thấy **3 cột**: WHAT → SO WHAT → NOW WHAT
- Brand Risk Index (BRI) trend
- First Scan Rate vs target
- Revenue Protected ($M)
- Top risk regions + heatmap
- Decision cards (approve/deny actions)
- **Classified duplicate rate** (not raw!) → Adjusted Risk Rate 2.3%

---

### 🗺 Module 6: Supply Route Engine
**Route definition + Channel integrity + Code collision prevention**

| Trang | Chức năng |
|---|---|
| Route Map | Factory → WH → Distributor → Retail (5 active routes) |
| Channel Integrity Rules | 5 rules: geo-fence violation, cross-route, reverse flow, unauthorized region, distributor concentration |
| Code Collision Prevention | Bloom filter (0.001% FP) → Redis SET → HMAC-SHA256 → tenant namespace isolation |
| Route Breach Monitor | Real-time alerts when code scanned outside authorized route |

**Logic chính:** Nếu mã batch A xuất hiện ngoài vùng X → auto-flag distributor + create case.

---

### 🔬 Module 7: Forensic Investigation
**Timeline forensic cho Ops & Risk — scan chain visualization + evidence builder**

| Trang | Chức năng |
|---|---|
| Scan Chain Timeline | Chuỗi scan theo thời gian: scan #1 → #2 → #3 với time diff + geo distance |
| Device Comparison Matrix | So sánh device hash, OS, screen, IP, user agent giữa các scan |
| ERS Factor Contribution | Factor breakdown với progress bar — audit có thể reconstruct score |
| Evidence Package Builder | Export PDF + signed JSON + hash verification chain + case freeze |

**EAS compliance:** Mỗi ERS phải output explainable factor contribution. Audit có thể tái tạo tính toán.

---

### 🔒 Module 8: Model Governance (Enterprise)
**Risk Model lifecycle: versioning + approval + sandbox + rollback + drift detection**

| Trang | Chức năng |
|---|---|
| Model Version History | v2.2.0 → v2.3.0 → v2.3.1 (prod) → v2.4.0-rc1 (sandbox) |
| Pending Change Requests | Queue chờ approval từ Risk Lead — SoD enforced |
| Sandbox Simulation | Test trên 30-day historical data. Gate: TP ≥95%, FP <10% |
| Version Compare (A/B) | Side-by-side weight diff giữa 2 version |
| Rollback | Emergency rollback về version cũ — 4-Eyes approval required |
| Drift Detection | 5 metrics (TP, FP, Avg ERS, factor contribution, case volume) với threshold alert |
| SoD Enforcement | No single role can propose + approve + deploy — minimum 2-party governance |

**SoD Matrix (Model Changes):**

| Action | Ops | Risk Analyst | Risk Lead | Compliance | Admin |
|---|---|---|---|---|---|
| Propose weight change | ❌ | ✅ | ✅ | ❌ | ❌ |
| Approve weight change | ❌ | ❌ | ✅ | ✅ Co-approve | ❌ |
| Deploy to production | ❌ | ❌ | ✅ + Compliance | ✅ Co-sign | ❌ |
| Emergency rollback | ❌ | ❌ | ✅ Initiate | ✅ 4-Eyes | ❌ |

---

### 🌍 Module 9: Industry Benchmark Engine (Super Admin only)
**Cross-tenant anonymized intelligence — no SKU or product detail exposed**

| Trang | Chức năng |
|---|---|
| Tenant Risk Heatmap | 5 tenants across 4 industries, BRI + adjusted rate comparison |
| Industry Benchmarks | FMCG 1.0% adj vs Pharmaceutical 4.2% vs Luxury 8.8% |
| Fraud Pattern Library | Cross-tenant patterns: Cambodia Ring, Myanmar Border Run, Bot Farm VN |
| Model Drift Monitor | 5 metrics with threshold — alert khi G2 FP contribution vượt ±3% |
| Global FP Tracker | Weekly FP trend: 14.1% → 8.2% over 4 weeks |

**Nguyên tắc:** Super Admin nhìn pattern hệ sinh thái. Không nhìn SKU cụ thể.

---

## III. INTEGRATION MODULES (Kết nối ERP — không thay thế)

Các module này **không phải core**. Chúng là connector layer — dữ liệu đến từ ERP, TrustChecker chỉ hiển thị và overlay risk.

| Module | Source | TrustChecker Role |
|---|---|---|
| Procurement (PO/Contract) | SAP/Oracle ERP | Display POs + overlay supplier risk score |
| Warehouse (Stock/Transfer) | WMS / SAP WM | Display inventory + overlay code activation status |
| Quality Control (QC) | QMS / SAP QM | Display inspections + link QC result → batch risk |
| Demand Planning | SAP IBP / Oracle | Display forecast + link to reorder trigger |
| Supplier Scoring | ERP + External | **Core enrichment**: TrustChecker adds Trust + Quality dimensions on top of ERP data |
| Shipment Tracking | 3PL APIs / TMS | Display tracking + overlay geo risk scoring |

**Nguyên tắc:** TrustChecker KHÔNG thay ERP. TrustChecker OVERLAY risk intelligence lên dữ liệu ERP.

---

## IV. SCM = DATA INTELLIGENCE BACKBONE (Vai trò theo persona)

SCM không phải "module theo dõi hàng hóa". SCM là **Data Intelligence Backbone** — xương sống dữ liệu phục vụ từng tầng quyền lực khác nhau.

| Role | SCM = | Time Horizon | Data Level |
|---|---|---|---|
| **Super Admin** | Ecosystem risk & engine governance | Real-time + Monthly | Cross-tenant aggregated, no SKU |
| **Company Admin** | Supply chain architecture & rule control | Weekly + Config | Full config, no case handling |
| **CEO** | Strategic integrity & revenue protection | Monthly + Quarterly | Aggregated KPI only, no raw data |
| **Ops** | Real-time monitoring & field action | Hourly + Daily | Full scan detail + ERP overlay |
| **Risk** | Risk modeling & anomaly detection | Weekly + Monthly | Full model + analytical access |
| **Compliance** | Audit trail & evidence packaging | Monthly + On-demand | Audit read + signed export |
| **IT** | Stability, security, integration | Real-time + Daily | Infrastructure only, no business data |

### Nguyên tắc phân tầng:
- **Super Admin** nhìn pattern hệ sinh thái, không nhìn SKU cụ thể
- **CEO** nhìn KPI aggregated (BRI, classified dup rate), không nhìn raw scan
- **Ops** xử lý nhanh theo ngày, không chỉnh risk model
- **Risk** phân tích + tinh chỉnh model, không generate code hay quản lý kho
- **Compliance** chỉ read + export evidence, không tạo case hay sửa weight
- **IT** chỉ infrastructure, không access business data

---

## V. DATA ACCESS MATRIX (Tóm tắt)

35 resources × 7 roles. Legend: ✅ Full | 👁 Read-only | 📊 Aggregated | — No access | ✅* With approval

| Resource | Super Admin | Company Admin | CEO | Ops | Risk | Compliance | IT |
|---|---|---|---|---|---|---|---|
| Raw scan log | ✅ | ✅ | — | ✅ | ✅ | 👁 | 👁 |
| Consumer IP | ✅ | — | — | — | 👁 | 👁 | ✅ |
| ERS per event | ✅ | 👁 | — | 👁 | ✅ | 👁 | — |
| BRI (Brand Risk) | ✅ | ✅ | ✅ | 📊 | ✅ | ✅ | — |
| Scoring weights | ✅ | 👁 | — | — | ✅ | 👁 | — |
| Code generation | — | ✅ | — | — | — | — | — |
| Lock/Revoke batch | — | ✅* | — | — | ✅* | — | — |
| Evidence export | ✅ | — | — | — | 👁 | ✅ | — |
| Cross-tenant data | ✅ | — | — | — | — | — | — |
| API keys | ✅ | — | — | — | — | — | ✅ |

Chi tiết đầy đủ: `sa/data-access-matrix.js` (35 resources × 6 domains)

---

## VI. ESCALATION FLOW (8 Stages)

```
Stage 1: Event Capture    (System, <50ms)   → Raw event + ERS
Stage 2: Risk Scoring     (Engine, <100ms)  → ERS 0-100 + factors
Stage 3: Decision         (Engine, <300ms)  → log / case / lock
Stage 4: Case Creation    (System, <1min)   → Assigned to Ops
Stage 5: Ops Triage       (Ops, 24h SLA)    → Validate / escalate / FP
Stage 6: Risk Analysis    (Risk, 4h SLA)    → Counterfeit probability
Stage 7: Compliance       (Comp, 8h SLA)    → Evidence + legal hold
Stage 8: Resolution       (Risk+Comp)       → Verdict → FP feedback to model
```

### Handoff Rules:
| From | → To | Trigger |
|---|---|---|
| Ops → Risk | ERS > 60 OR pattern match |
| Risk → Compliance | Confirmed counterfeit OR regulatory |
| Compliance → CEO | Brand impact > $100K OR multi-region |
| Risk → IT | Bot detected OR API abuse |
| Any → Super Admin | Cross-tenant pattern detected |

---

## VII. CODE LIFECYCLE (7 States)

```
Generated → Printed → Activated → First Scanned → Flagged → Locked → Revoked

Mỗi transition:
  - Actor (who)
  - Timestamp (when)
  - IP address (where)
  - Approval type (how: auto / 4-Eyes / 6-Eyes)
  - Hash chain (integrity: SHA-256)
```

---

## VIII. DUPLICATE CLASSIFICATION

Không phải tất cả duplicate là counterfeit. Raw dup rate 5.8% → phân loại:

| Type | % | Adjusted Rate | Signals | Action |
|---|---|---|---|---|
| 👤 Consumer Curiosity | 60% | 3.5% (benign) | Same device, same city, gap >24h | Exclude from risk KPI |
| 🔀 Channel Leakage | 20% | 1.2% (ops) | Wrong geo vs distributor zone | Flag distributor |
| 🚨 Counterfeit | 15% | 0.87% (real threat) | New device + country + short gap | Lock + case + CEO |
| ❓ Unclassified | 5% | 0.23% | Ambiguous | Analyst review |

**CEO Dashboard:** hiển thị **Adjusted Risk Rate 2.3%**, không phải raw 5.8%.

---

## IX. ENTERPRISE READINESS

| Requirement | Status |
|---|---|
| SSO (SAML/OIDC) | ✅ Azure AD integration |
| RBAC + SoD | ✅ 7 roles, field-level access matrix |
| Immutable Audit | ✅ Hash-chained, signed export |
| Risk Model Governance | ✅ Versioning, sandbox, approval gate, rollback, drift, SoD |
| Integration Resilience | ✅ Circuit breaker, DLQ, idempotency, 6 connectors |
| Duplicate Classification | ✅ 4-category (curiosity/leakage/counterfeit/unknown) |
| Escalation Flow | ✅ 8-stage, role-based handoff with SLA |
| Data Access Matrix | ✅ 35 resources × 7 roles, field-level |
| Supply Route Engine | ✅ Route definition, 5 channel integrity rules, collision prevention |
| Forensic Investigation | ✅ Scan chain timeline, device comparison, evidence package |
| Industry Benchmark | ✅ Cross-tenant heatmap, fraud pattern library, model drift |
| EAS v2.0 | ✅ 6-layer, 6-domain, 27-item audit checklist |
| Data Governance Policy | ✅ 5-level classification, retention schedule, GDPR Art. 17, PII masking |
| Threat Model | ✅ STRIDE matrix, OWASP Top 10, insider risk, key rotation |
| BCP/DR | ✅ Active-passive, backup schedule, RPO/RTO × 5 scenarios, DR test protocol |
| Legal Admissibility | ✅ SHA-256 + RSA-2048 + RFC 3161 TSA + chain-of-custody |
| Model Validation | ✅ 5-phase benchmark, performance template, independent validation framework |
| ML Engine (Risk AI) | ✅ Feature store, AUC/ROC/confusion matrix, training pipeline, validation report |
| Code Governance Hardening | ✅ Shannon entropy, per-tenant rate limits, HMAC-SHA256 central registry |
| Supply Route Tactical Depth | ✅ What-if simulation, historical replay, integrity scoring index, reverse flow |
| Data Integrity Add-on | ✅ Blockchain seal engine, public verification portal, CEO trust report, chain-agnostic anchor |
| Blockchain Governance | ✅ Role structure (SoD), zero-trust zones, escalation model, liability framework, maturity levels |
| ISO 27001 alignment | ⚠ Architecture ready, certification pending |
| SOC2 alignment | ⚠ Controls designed, audit pending |
| Multi-tenant | ✅ Org-level isolation |

---

## X. KPIs

| KPI | Target | Current |
|---|---|---|
| Risk Scoring Latency | <300ms P99 | 89ms |
| Auto-Decision Rate | >95% | 99.8% |
| False Positive Rate | <10% | 8.2% (after recalibration) |
| First Scan Rate | >95% | 94.2% |
| Raw Duplicate Rate | <5% | 5.8% |
| **Adjusted Risk Rate** | **<3%** | **2.3%** (classified) |
| Case Resolution SLA | <24h avg | 22h |
| Integration Uptime | >99.5% | 99.7% |
| Model Accuracy (TP) | ≥95% | 97.8% |

---

## XI. TỔNG KẾT

> TrustChecker = **Risk & Trust Overlay Layer**
> Không thay ERP. Không cạnh tranh SAP.
> SCM = **Data Intelligence Backbone** phục vụ 7 persona.
> Core: Code Governance + Risk Engine + Case Workflow + Compliance
> Integration: ERP overlay (SAP, Oracle, WMS, Kafka)
> Governance: Model versioning + Data Access Matrix + Escalation Flow
> Enterprise Audit: **EAS v2.0** (6-layer, 6-domain, SoD-enforced, 27-item audit checklist)
> **171 pages** across 8 modes. **74 SCM backend API endpoints (376 total platform).** **13 new DB tables.**
> Full system description: `SYSTEM_DESCRIPTION.md`

### Enterprise Premium Features:
| Feature | Frontend | Backend | Status |
|---|---|---|---|
| Industry Benchmark Engine | `sa/industry-benchmark.js` | `/api/scm/classify/benchmark` | ✅ Full stack |
| Forensic Investigation | `risk/forensic-investigation.js` | `/api/scm/forensic/*` (6 endpoints) | ✅ Full stack |
| Supply Route Engine | `ca/supply-route-engine.js` | `/api/scm/supply/*` (13 endpoints) | ✅ Full stack |
| Model Governance | `risk/model-governance.js` | `/api/scm/model/*` (11 endpoints) | ✅ Full stack |
| Duplicate Classification | `ops/duplicate-alerts.js` | `/api/scm/classify/*` (5 endpoints) | ✅ Full stack |
| **ML Engine (Risk AI)** | — | `/api/scm/ml/*` (10 endpoints) | ✅ Backend |
| **Code Governance Hardening** | — | `/api/scm/code-gov/*` (9 endpoints) | ✅ Backend |
| **Data Integrity Add-on** | `it/evidence-verify.js`, `exec/trust-report.js`, `it/anchor-config.js`, `it/governance-dashboard.js` | `/api/scm/integrity/*` (20 endpoints) | ✅ Full stack |
| Enterprise Audit Spec | `EAS_AUDIT_SPECIFICATION.md` | — | ✅ v2.0 (5 gaps closed) |

### Backend API Summary (74 SCM endpoints):
| Mount Path | Endpoints | Purpose |
|---|---|---|
| `/api/scm/supply/*` | 13 | Routes CRUD, channel rules, breaches, simulation, replay, integrity index |
| `/api/scm/model/*` | 11 | Model versioning, deploy (SoD), rollback (4-Eyes), drift |
| `/api/scm/ml/*` | 10 | Feature store, AUC/ROC/confusion matrix, training pipeline |
| `/api/scm/code-gov/*` | 9 | Shannon entropy, rate limits, HMAC-SHA256 central registry |
| `/api/scm/forensic/*` | 6 | Scan chain, evidence (SHA-256 hash chain), case freeze |
| `/api/scm/classify/*` | 5 | Auto-classify duplicates, stats, benchmark |
| `/api/scm/integrity/*` | 20 | **Blockchain seal, governance v2.0, role matrix, SoD, zones, layers, escalation, maturity, auditor path** |

### Database Tables (13 new):
| Category | Tables |
|---|---|
| Supply Route | `supply_routes`, `channel_rules`, `route_breaches`, `route_simulations` |
| Risk Model | `risk_models`, `model_change_requests` |
| Forensic | `forensic_cases` |
| Classification | `duplicate_classifications` |
| ML Engine | `feature_store`, `model_performance`, `training_runs` |
| Code Governance | `code_registry`, `generation_limits` |

### Maturity Level:
| Level | Description | Status |
|---|---|---|
| Level 1 | Monitoring tool | ✅ Complete |
| Level 2 | Risk scoring tool | ✅ Complete |
| Level 3 | Governance platform | ✅ Complete |
| Level 3.5 | Audit-documented governance | ✅ **Current** (EAS v2.0) |
| Level 4 | Audit-certified trust infrastructure | ⬜ SOC2 + ISO 27001 + Pen test + Model validation |

### Path to Level 4:
| Action | Timeline | Status |
|---|---|---|
| SOC2 Type II audit | 6–12 months | ⬜ Controls designed |
| ISO 27001 certification | 6–12 months | ⬜ Architecture ready |
| External penetration test | 30 days | ⬜ RFP ready |
| Independent model validation | 60 days | ⬜ Framework defined (EAS v2.0 §XIII) |
| DR test (first formal) | 7 days | ⬜ Runbook ready (EAS v2.0 §XI) |
