# Carbon Integrity Engine — Role & Account Registry

> **Version**: v3.0 Institutional Grade  
> **Architecture**: 4-Layer Governance  
> **Password (all accounts)**: `123qaz12`  
> **Total**: 38 roles · 198 permissions · 804 mappings · 32 test users

---

## L1 — PLATFORM INFRASTRUCTURE (7 roles)

> TrustChecker-controlled. Zero business authority. Infra, security, thresholds only.

| # | Role | Display Name | Email | Mô tả |
|---|---|---|---|---|
| 1 | `super_admin` | Super Admin | `admin@trustchecker.io` | Platform lifecycle, observability. **KHÔNG** có quyền business |
| 2 | `platform_security` | Platform Security Officer | `security@trustchecker.io` | Key rotation, incident, privileged access monitor |
| 3 | `data_gov_officer` | Data Governance Officer | `datagov@trustchecker.io` | Data classification, retention, GDPR masking, cross-border |
| 4 | `global_risk_committee` | Global Risk Committee | `globalrisk@trustchecker.io` | Risk scoring weights + anomaly thresholds ONLY. Không override CIP |
| 5 | `emission_engine` | Emission Engine [SYSTEM] | *(non-human)* | Deterministic calc. Locked formula. Không manual override |
| 6 | `change_management_officer` | Change Management Officer | `changemgmt@trustchecker.io` | System upgrade, change request, deploy freeze. ISO 27001/SOC 2 |
| 7 | `incident_response_lead` | Incident Response Lead | `incident@trustchecker.io` | Incident protocol, anchor freeze, forensic logging |

**Boundary Rule**: *Platform cannot alter or approve any tenant-level carbon claim.*

---

## L2 — FEDERATION & INDEPENDENT VALIDATION (4 roles)

> Externalized authority. NOT tenant-controlled. Federated independence.

| # | Role | Display Name | Email | Mô tả |
|---|---|---|---|---|
| 8 | `ivu_validator` | Independent Validation Unit | `ivu@demo.trustchecker.io` | External validator. Validate/reject CIP. **KHÔNG** thuộc tenant IAM |
| 9 | `ivu_registry_admin` | IVU Registry Admin | `ivuadmin@trustchecker.io` | Quản lý validator registry. Không validate CIP |
| 10 | `mgb_member` | Methodology Governance Board | `mgb@demo.trustchecker.io` | Methodology governance. Federated. Không access tenant data |
| 11 | `blockchain_operator` | Blockchain Anchor Authority | `blockchain@demo.trustchecker.io` | Anchor hashes. Federated for trust. Không create/modify CIP |

**Independence Rule**: *Validation must be federated, not tenant-controlled. Tenant cannot create or delete IVU.*

---

## L3 — TENANT GOVERNANCE (16 roles)

> Company-controlled. Operational + Oversight + Disclosure chains.

### A. Operational Chain

| # | Role | Display Name | Email | Mô tả |
|---|---|---|---|---|
| 12 | `company_admin` | Company Admin | `admin@demo.trustchecker.io` | Tenant IAM controller. Quản lý roles/users trong boundary |
| 13 | `carbon_officer` | Carbon Officer | `carbon@demo.trustchecker.io` | Submit emission data, initiate CIP draft. **Không** approve |
| 14 | `scm_analyst` | SCM Analyst | `scm@demo.trustchecker.io` | Upload supply chain data. **Không** approve/validate |
| 15 | `data_steward` | Data Steward | `datasteward@demo.trustchecker.io` | Validate data completeness BEFORE CIP. **Không** approve/seal |
| 16 | `internal_reviewer` | Internal Reviewer | `reviewer@demo.trustchecker.io` | Review data quality, flag anomaly. **Không** approve/seal |
| 17 | `compliance_officer` | Compliance Officer | `compliance@demo.trustchecker.io` | Approve CIP, confirm compliance, authorize seal |
| 18 | `export_officer` | Export Officer | `export@demo.trustchecker.io` | Export report, share CIP, generate PDF. Read-only |
| 19 | `supplier_contributor` | Supplier Contributor | `supplier@demo.trustchecker.io` | Scoped input. Submit own supplier emission only. Tenant-isolated |

### B. Governance & Oversight Chain

| # | Role | Display Name | Email | Mô tả |
|---|---|---|---|---|
| 20 | `executive` | CEO / Executive | `ceo@demo.trustchecker.io` | View-only oversight + escalation. **Không** edit/approve |
| 21 | `risk_committee` | Company Risk Committee | `riskcom@demo.trustchecker.io` | Replay, what-if simulation, impact analysis |
| 22 | `ggc_member` | Green Governance Council | `ggc@demo.trustchecker.io` | Policy oversight committee |
| 23 | `board_observer` | Board Observer | `board@demo.trustchecker.io` | Read-only strategic oversight. **Không** influence decisions |
| 24 | `auditor` | Internal Audit | `auditor@demo.trustchecker.io` | Full audit trail, SoD violations, forensic replay. **Không** modify |
| 25 | `legal_counsel` | Legal Counsel | `legal@demo.trustchecker.io` | Sealed CIP + liability view for disclosure. **Không** modify |
| 26 | `esg_reporting_manager` | ESG Reporting Manager | `esgmanager@demo.trustchecker.io` | ESG reports, portfolio carbon, investor disclosure |

### C. Disclosure (CSRD/ESRS Required)

| # | Role | Display Name | Email | Mô tả |
|---|---|---|---|---|
| 27 | `disclosure_officer` | Disclosure Officer | `disclosure@demo.trustchecker.io` | Final sign-off public carbon statement. Link CIP to annual report. Certify CSRD/ESRS. **Chịu liability cá nhân** |

### D. Other Business Roles

| # | Role | Display Name | Email | Mô tả |
|---|---|---|---|---|
| 28 | `ops_manager` | Operations Manager | `ops@demo.trustchecker.io` | Day-to-day operational management |
| 29 | `risk_officer` | Risk Officer | `risk@demo.trustchecker.io` | Risk monitoring + risk report |
| 30 | `developer` | Developer | `dev@demo.trustchecker.io` | Technical development, no business authority |
| 31 | `operator` | Operator | *(no seed user)* | Minimal operational access |
| 32 | `viewer` | Viewer | *(no seed user)* | Read-only minimal access |

---

## L4 — PUBLIC & CAPITAL MARKET (3 roles)

> Read-only. Snapshot-based. Immutable view. No write permission.

| # | Role | Display Name | Email | Mô tả |
|---|---|---|---|---|
| 33 | `external_auditor` | External Auditor | `extauditor@demo.trustchecker.io` | Time-bound, logged, auto-revoked. Snapshot + sandbox replay |
| 34 | `financial_viewer` | Financial Institution Viewer | `finviewer@demo.trustchecker.io` | Bank/fund. NDA-bound. Carbon Integrity Score + selected CIP |
| 35 | `public_verifier` | Public Verification | `publicverify@demo.trustchecker.io` | QR verify, hash check, seal status. Minimal auth |

---

## AUTHORITY MATRIX

| Action | L1 | L2 | L3 | L4 |
|---|---|---|---|---|
| Modify emission formula | ✔ | ✖ | ✖ | ✖ |
| Submit data | ✖ | ✖ | ✔ | ✖ |
| Validate CIP (IVU) | ✖ | ✔ | ✖ | ✖ |
| Approve CIP | ✖ | ✖ | ✔ | ✖ |
| Seal / Anchor | ✖ | ✔ | ✖ | ✖ |
| Change methodology | Threshold | ✔ | ✖ | ✖ |
| Sign disclosure | ✖ | ✖ | ✔ | ✖ |
| Export report | ✖ | ✖ | ✔ | ✖ |
| Public verify | ✖ | ✖ | ✖ | ✔ |

> **Không có tầng nào có full-stack control. Không ai có quyền Submit + Validate + Approve + Seal.**

---

## CIP LIFECYCLE (Cross-Layer)

```
scm_analyst (L3) → carbon_officer (L3) → data_steward (L3) → emission_engine (L1)
→ internal_reviewer (L3) → ivu_validator (L2) → compliance_officer (L3)
→ emission_engine (L1) [seal] → blockchain_operator (L2) [anchor]
→ disclosure_officer (L3) [sign-off]
```

---

## CONTROL PRINCIPLES

1. **No Single Actor Control** — Không ai Submit + Validate + Approve + Seal
2. **Federated Validation** — Validator không thuộc tenant
3. **Version Lock** — Emission factor + methodology version-locked
4. **Litigation Traceability** — actor_id, timestamp, hash_before, hash_after, signature, role, ip/device
5. **Disclosure ≠ Modification** — Sign-off ≠ edit
6. **L1 ≠ Business** — Platform infrastructure cannot modify business data
7. **Calculation ≠ Approval** — Deterministic (L1) vs Human (L3)
8. **Validation ≠ Seal** — IVU validates (L2), System seals (L1)
9. **Federation ≠ Tenant** — L2 independence from L3
