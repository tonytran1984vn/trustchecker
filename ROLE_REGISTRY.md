# TrustChecker — ROLE_REGISTRY v2.1

**Infrastructure-Grade | Audit-Ready | Neutral Trust Architecture**

**18 roles × 143 permissions × 24 SoD pairs × 13 lineage ACL entries**

---

## Design Principles

1. **Platform ≠ Business** — SA cannot approve fraud or mint carbon
2. **Governance ≠ Execution** — L4 governs, L2 operates
3. **Validation ≠ Deployment** — IVU validates, cannot deploy
4. **Anchoring ≠ Minting** — Blockchain anchors, cannot approve mint
5. **Observability ≠ Data Access** — Security sees access logs, not data
6. **No role has create + approve + deploy power**
7. **SoD waivers available** — Tenant-scoped, time-limited, audit-logged

---

## Role Hierarchy (L1-L5 Authority Map)

```
L5  Platform Layer
     ├── Super Admin (Infrastructure Custodian)
     ├── Platform Security Officer
     └── Data Governance Officer

L4  Global Governance Layer
     ├── GGC Member (Graph Governance Committee)
     ├── Risk Committee (Decision Logic Owner)
     ├── Compliance Officer (Legal Defender, 17 perms)
     └── IVU (Independent Validation Unit)

L3  Tenant Governance Layer
     ├── Company Admin (Tenant IAM)
     ├── Executive / CEO
     └── Carbon Officer

L2  Operational Layer
     ├── Operations Manager
     ├── Risk Officer
     └── SCM Analyst

L1  Technical Execution Layer
     ├── Developer
     ├── Blockchain Operator
     ├── Operator
     ├── Auditor (read-only, 5 perms)
     └── Viewer
```

---

## L5 — Platform Layer

### 🔴 1. Super Admin
- **Purpose:** Infrastructure Custodian — NOT business authority
- **Forbidden (16):** fraud_case:approve, risk_model:create/approve/deploy, graph_weight:propose/approve, carbon_credit:request_mint/approve_mint/anchor, lineage:replay/view/impact, trust_score:view, evidence:seal, model_certification:issue, bias_audit:perform
- **Sidebar:** Full access

### 🛡 2. Platform Security Officer (10 perms)
- **Allowed:** key:rotate, privileged_access:monitor, session_recording:review, api_access:approve, incident:declare/resolve, support_session:approve, platform_metrics:view, system_health:view, node_status:view
- **Sidebar:** Dashboard, Fraud, KYC, Evidence, Leak Monitor, TrustGraph, Compliance, Anomaly, Reports

### 📊 3. Data Governance Officer (7 perms)
- **Allowed:** data_classification:define/approve, retention_policy:approve, gdpr_masking:configure, cross_border_transfer:approve, lineage_export:approve, platform_metrics:view
- **Sidebar:** Dashboard, Sustainability, Compliance, Reports, Carbon

---

## L4 — Global Governance

### 🏛 4. GGC Member
- Schema governance (propose/approve/reject), NOT scoring logic

### ⚖ 5. Risk Committee
- Decision Logic Owner — risk scoring, weight proposals, lineage replay + impact analysis

### 🟣 6. Compliance Officer (17 perms — upgraded v2.1)
- **Upgraded permissions:** compliance:freeze, regulatory_export:approve, gdpr_masking:execute, graph_weight:approve (dual control), carbon_credit:approve_mint, lineage:view/replay/export, audit_log:view

### 🔬 7. IVU (Independent Validation Unit)
- Model certification, feature drift, bias audit — structurally isolated

---

## L3 — Tenant Governance

### 🟠 8. Company Admin — Tenant IAM, full sidebar
### 🟡 9. Executive / CEO — Dashboard + reports overview
### 🌱 10. Carbon Officer — Emission data, mint request → Compliance approve → IVU validate → Blockchain anchor

---

## L2 — Operational

### 🟢 11. Operations Manager — 27 perms, full ops sidebar
### 🔵 12. Risk Officer — Fraud investigation, anomaly resolve
### 📦 13. SCM Analyst — Route risk, partner scoring, full SCM sidebar

---

## L1 — Technical Execution

### ⚙ 14. Developer — API/integration (8 perms)
### ⛓ 15. Blockchain Operator — Anchor/verify only
### 🔧 16. Operator — Day-to-day tasks
### 🔍 17. Auditor (5 perms — NEW v2.1)
- **Purpose:** Read-only audit trail for external/internal auditors
- **Permissions:** dashboard:view, audit_log:view, lineage:view_summary, compliance:view, report:view
- **Cannot:** Export, modify, replay, view full chain
- **Sidebar:** Dashboard, Compliance, Reports only

### 👁 18. Viewer — Read-only (5 perms)

---

## SoD Conflict Matrix (24 Pairs)

| # | Permission A | Permission B |
|---|---|---|
| 1 | fraud_case:create | fraud_case:approve |
| 2 | payment:create | payment:approve |
| 3 | user:create | user:approve |
| 4 | role:create | role:approve |
| 5 | risk_model:create | risk_model:deploy |
| 6 | risk_model:deploy | risk_model:approve |
| 7 | evidence:create | evidence:seal |
| 8 | compliance:freeze | compliance:export |
| 9 | threshold:configure | threshold:override |
| 10 | event:ingest | event:delete |
| 11 | case:assign | case:close |
| 12 | graph_schema:approve | graph_schema:deploy |
| 13 | graph_weight:propose | graph_weight:approve |
| 14 | graph_override:request | graph_override:approve |
| 15 | lineage:record | lineage:modify |
| 16 | lineage:replay | lineage:delete |
| 17 | lineage:view_full | lineage:export_without_approval |
| 18 | lineage:approve_export | lineage:perform_export |
| 19 | carbon_credit:request_mint | carbon_credit:approve_mint |
| 20 | carbon_credit:approve_mint | carbon_credit:anchor |
| 21 | support_session:initiate | support_session:approve |
| 22 | incident:declare | incident:resolve |
| 23 | data_classification:define | data_classification:approve |
| 24 | lineage_export:approve | lineage_export:execute |

### SoD Waiver Mechanism
Small orgs (<50 people) can request waivers via API:
- `GET /api/sod/conflicts` — List all 24 conflict pairs
- `GET /api/sod/waivers` — List active waivers
- `POST /api/sod/waivers` — Create waiver (pair + reason + expiry)
- `DELETE /api/sod/waivers` — Remove waiver

Waivers are tenant-scoped, time-limited, and fully audit-logged.

---

## Lineage Access Matrix (13 entries)

| Role | Access | Replay | Impact | Modify |
|---|---|---|---|---|
| Super Admin | Metadata only | ❌ | ❌ | ❌ |
| Platform Security | None | ❌ | ❌ | ❌ |
| Data Gov Officer | Summary | ❌ | ❌ | ❌ |
| Risk Committee | **Full 5-layer** | ✅ | ✅ | ❌ |
| Compliance | **Full 5-layer** | ✅ | ❌ | ❌ |
| IVU | **Full 5-layer** | ✅ | Limited | ❌ |
| Company Admin | Tenant summary | ❌ | ❌ | ❌ |
| CEO | Dashboard only | ❌ | ❌ | ❌ |
| Carbon Officer | Decision only | ❌ | ❌ | ❌ |
| Ops/Operator | Decision outcome | ❌ | ❌ | ❌ |
| Auditor | Summary + audit log | ❌ | ❌ | ❌ |
| IT/Developer | Ingestion only | ❌ | ❌ | ❌ |
| Blockchain Op | Hash only | ❌ | ❌ | ❌ |

---

## API Endpoints (v2.1)

| Endpoint | Method | Permission | Description |
|---|---|---|---|
| /api/audit-log | GET | audit_log:view | Paginated audit entries |
| /api/audit-log/stats | GET | audit_log:view | Summary statistics |
| /api/audit-log/export | GET | compliance:manage | CSV export |
| /api/sod/conflicts | GET | role:create | List all SoD pairs |
| /api/sod/waivers | GET | role:create | List tenant waivers |
| /api/sod/waivers | POST | role:create | Create waiver |
| /api/sod/waivers | DELETE | role:create | Remove waiver |

---

## Test Accounts (15)

| Email | Role | Type |
|---|---|---|
| admin@trustchecker.io | super_admin | platform |
| security@trustchecker.io | platform_security | platform |
| datagov@trustchecker.io | data_gov_officer | platform |
| admin@demo.trustchecker.io | company_admin | tenant |
| ceo@demo.trustchecker.io | executive | tenant |
| ops@demo.trustchecker.io | ops_manager | tenant |
| risk@demo.trustchecker.io | risk_officer | tenant |
| compliance@demo.trustchecker.io | compliance_officer | tenant |
| dev@demo.trustchecker.io | developer | tenant |
| ggc@demo.trustchecker.io | ggc_member | tenant |
| riskcom@demo.trustchecker.io | risk_committee | tenant |
| ivu@demo.trustchecker.io | ivu_validator | tenant |
| scm@demo.trustchecker.io | scm_analyst | tenant |
| blockchain@demo.trustchecker.io | blockchain_operator | tenant |
| carbon@demo.trustchecker.io | carbon_officer | tenant |
| auditor@demo.trustchecker.io | auditor | tenant |

---

## Maturity Level

- ✔ Enterprise-grade separation (18 roles, 5 tiers)
- ✔ Regulated-ready control structure (24 SoD pairs)
- ✔ Infrastructure-neutral positioning (SA ≠ business)
- ✔ Audit defensible architecture (audit-log API, lineage ACL)
- ✔ SoD waiver mechanism for small orgs
- Compatible with: Nasdaq, DTCC, ISO 27001 governance patterns
