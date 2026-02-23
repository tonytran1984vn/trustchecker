# Data Lineage Access Control — Role Matrix

**Lineage = Neutral Truth Engine — Immutable, Append-only, No role owns it.**

---

## 9-Role Permission Matrix

| Role | Access Level | Replay | Impact Analysis | Modify |
|---|---|---|---|---|
| **SA** | Metadata only | 🚫 | 🚫 | 🚫 |
| **Admin Company** | Tenant summary | 🚫 | 🚫 | 🚫 |
| **CEO** | Dashboard only | 🚫 | 🚫 | 🚫 |
| **Risk Committee** | Full chain | ✅ | ✅ | 🚫 |
| **Compliance** | Full chain | ✅ | ✅ | 🚫 |
| **IVU** | Full chain | ✅ | Limited | 🚫 |
| **Ops** | Decision outcome | 🚫 | 🚫 | 🚫 |
| **IT** | Ingestion only | 🚫 | 🚫 | 🚫 |
| **Blockchain Op** | Hash reference | 🚫 | 🚫 | 🚫 |

## Access Control Verification

```
RISK_COMMITTEE   replay_decision              ✅ ALLOWED
ADMIN_COMPANY    replay_decision              🚫 DENIED
SA               modify_lineage               🚫 DENIED
OPS              view_lineage                 🚫 DENIED
COMPLIANCE       view_full_lineage            ✅ ALLOWED
IVU              modify_lineage               🚫 DENIED
```

## Why Admin Company Cannot Replay

If Admin Company can replay:
- Test fake data inputs
- Find threshold bypass paths
- Optimize to evade system

**Lineage transparency ≠ reverse engineering access.**

## Governed Operations

| Function | Role Check | Rate Limit | Audit Log |
|---|---|---|---|
| `governedReplay()` | Risk/Compliance/IVU only | 20/hour | ✅ |
| `governedViewLineage()` | 7 depth levels by role | — | ✅ |
| `governedContamination()` | Risk/Compliance only | — | ✅ |

## SoD (rbac.js): 18 conflict pairs

```
lineage:record ↔ lineage:modify
lineage:replay ↔ lineage:delete
lineage:view_full ↔ lineage:export_without_approval
lineage:approve_export ↔ lineage:perform_export
```

## DB: lineage_access_log (privileged read tracking)

All lineage reads by any role → logged with actor, action, target GDLI, timestamp.
