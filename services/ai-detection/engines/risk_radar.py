"""
Risk Radar Engine
8-vector supply chain risk assessment + heatmap.
Ported from server/engines/risk-radar.js
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any
import math


HIGH_RISK_REGIONS = {"CN": 35, "RU": 45, "IN": 20, "KR": 10, "TH": 15}
VECTOR_WEIGHTS = {
    "partner_risk": 0.20, "geographic_risk": 0.10, "route_risk": 0.15,
    "financial_risk": 0.15, "compliance_risk": 0.10, "cyber_risk": 0.10,
    "environmental_risk": 0.05, "supply_disruption": 0.15,
}


def _level(score: float) -> str:
    return "high" if score > 60 else ("medium" if score > 30 else "low")


# ─── Vector Assessors ──────────────────────────────────────────

def assess_partner_risk(partners: list, violations: list) -> dict:
    if not partners:
        return {"score": 0, "level": "low", "details": {}}
    n = len(partners)
    kyc_failed = sum(1 for p in partners if p.get("kyc_status") in ("failed", "pending"))
    low_trust = sum(1 for p in partners if p.get("trust_score", 50) < 50)
    viol = len(violations)
    score = min(100, kyc_failed / n * 40 + low_trust / n * 30 + min(viol, 10) * 3)
    return {
        "score": round(score, 1), "level": _level(score),
        "details": {
            "total_partners": n, "kyc_incomplete": kyc_failed,
            "low_trust_partners": low_trust, "sla_violations": viol,
            "avg_trust_score": round(sum(p.get("trust_score", 50) for p in partners) / n),
        },
    }


def assess_geographic_risk(partners: list, shipments: list) -> dict:
    conc: dict[str, int] = {}
    for p in partners:
        c = p.get("country", "XX")
        conc[c] = conc.get(c, 0) + 1
    total = len(partners) or 1
    hhi = sum((cnt / total) ** 2 for cnt in conc.values()) * 10000
    country_risk = sum(HIGH_RISK_REGIONS.get(p.get("country", ""), 5) for p in partners) / total if total else 0
    score = min(100, hhi / 100 + country_risk)
    return {
        "score": round(score, 1), "level": _level(score),
        "details": {
            "herfindahl_index": round(hhi),
            "concentration_warning": "High concentration — diversification needed" if hhi > 5000 else "Adequate diversification",
            "country_distribution": conc,
            "avg_country_risk": round(country_risk, 1),
        },
    }


def assess_route_risk(shipments: list) -> dict:
    if not shipments:
        return {"score": 0, "level": "low", "details": {}}
    late = [s for s in shipments if s.get("actual_delivery") and s.get("estimated_delivery") and s["actual_delivery"] > s["estimated_delivery"]]
    late_ids = {s.get("id") for s in late}
    in_transit = [s for s in shipments if s.get("status") in ("in_transit", "pending")]
    lr = len(late) / len(shipments)
    avg_delay = 0.0
    if late:
        delays = []
        for s in late:
            try:
                d1 = datetime.fromisoformat(str(s["actual_delivery"]).replace("Z", "+00:00"))
                d2 = datetime.fromisoformat(str(s["estimated_delivery"]).replace("Z", "+00:00"))
                delays.append((d1 - d2).total_seconds() / 3600)
            except Exception:
                pass
        avg_delay = sum(delays) / len(delays) if delays else 0.0

    carrier_stats: dict[str, dict] = {}
    for s in shipments:
        c = s.get("carrier", "Unknown")
        carrier_stats.setdefault(c, {"total": 0, "late": 0})
        carrier_stats[c]["total"] += 1
        if s.get("id") in late_ids:
            carrier_stats[c]["late"] += 1

    score = min(100, lr * 80 + min(avg_delay / 48, 1) * 20)
    return {
        "score": round(score, 1), "level": _level(score),
        "details": {
            "total_shipments": len(shipments), "late_shipments": len(late),
            "on_time_rate": f"{round((1 - lr) * 100)}%",
            "avg_delay_hours": round(avg_delay, 1), "in_transit": len(in_transit),
            "carrier_performance": [
                {"carrier": c, "total": s["total"], "late": s["late"], "reliability": f"{round((1 - s['late'] / s['total']) * 100)}%"}
                for c, s in carrier_stats.items()
            ],
        },
    }


def assess_financial_risk(leaks: list, violations: list) -> dict:
    n = len(leaks)
    price_dev = sum(abs(l["listing_price"] - l["authorized_price"]) / l["authorized_price"] for l in leaks if l.get("authorized_price") and l.get("listing_price"))
    penalty = sum(v.get("penalty_amount", 0) for v in violations)
    score = min(100, min(n * 5, 40) + (price_dev / n * 30 if n else 0) + min(penalty / 1000, 30))
    return {
        "score": round(score, 1), "level": _level(score),
        "details": {
            "leak_alerts": n,
            "avg_price_deviation": f"{round(price_dev / n * 100)}%" if n else "0%",
            "total_penalties": penalty,
            "gray_market_risk": "elevated" if n > 3 else "normal",
        },
    }


def assess_compliance_risk(certifications: list) -> dict:
    if not certifications:
        return {"score": 20, "level": "low", "details": {"message": "No certifications tracked"}}
    now = datetime.now(timezone.utc)
    expired = 0
    expiring = 0
    cutoff = now + timedelta(days=30)
    for c in certifications:
        raw = c.get("expiry_date")
        if not raw:
            continue
        try:
            dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        except Exception:
            continue
        if dt < now:
            expired += 1
        elif dt < cutoff:
            expiring += 1
    n = len(certifications)
    score = min(100, expired / n * 60 + expiring / n * 20 + 5)
    return {
        "score": round(score, 1), "level": _level(score),
        "details": {"total_certifications": n, "expired": expired, "expiring_30_days": expiring, "active": n - expired},
    }


def assess_cyber_risk(partners: list, alerts: list) -> dict:
    no_api = sum(1 for p in partners if not p.get("api_key"))
    fraud_a = sum(1 for a in alerts if a.get("alert_type") == "STATISTICAL_ANOMALY" or a.get("severity") == "high")
    score = min(100, no_api / max(len(partners), 1) * 30 + min(fraud_a * 8, 40) + 10)
    return {
        "score": round(score, 1), "level": _level(score),
        "details": {"partners_without_api_auth": no_api, "anomaly_alerts": fraud_a, "data_integrity": "blockchain_sealed"},
    }


def assess_environmental_risk(sustainability: list) -> dict:
    if not sustainability:
        return {"score": 30, "level": "medium", "details": {"message": "No ESG assessments — risk unmeasured"}}
    avg = sum(s.get("overall_score", 50) for s in sustainability) / len(sustainability)
    low = sum(1 for s in sustainability if s.get("overall_score", 50) < 50)
    score = round(max(0, 100 - avg))
    return {
        "score": score, "level": _level(score),
        "details": {"avg_esg_score": round(avg, 1), "products_assessed": len(sustainability), "low_performers": low, "carbon_risk": "elevated" if avg < 60 else "acceptable"},
    }


def assess_supply_disruption(inventory: list, partners: list, shipments: list) -> dict:
    suppliers = sum(1 for p in partners if p.get("type") in ("oem", "manufacturer"))
    ssr = 80 if suppliers <= 1 else (40 if suppliers == 2 else 10)
    low = sum(1 for i in inventory if i.get("quantity", 0) <= i.get("min_stock", 10))
    sr = low / len(inventory) if inventory else 0
    now_ts = datetime.now(timezone.utc)
    stuck = 0
    for s in shipments:
        if s.get("status") == "in_transit" and s.get("created_at"):
            try:
                c = datetime.fromisoformat(str(s["created_at"]).replace("Z", "+00:00"))
                if (now_ts - c).days > 14:
                    stuck += 1
            except Exception:
                pass
    score = min(100, ssr * 0.35 + sr * 100 * 0.35 + min(stuck * 10, 30) * 0.30)
    return {
        "score": round(score, 1), "level": _level(score),
        "details": {"supplier_diversity": suppliers, "single_source_dependencies": suppliers <= 1, "low_stock_items": low, "total_inventory_items": len(inventory), "stuck_shipments": stuck},
    }


# ─── Main Functions ───────────────────────────────────────────

def compute_radar(data: dict[str, Any] | None = None) -> dict:
    """Compute full risk radar — all 8 vectors."""
    data = data or {}
    partners = data.get("partners", [])
    shipments = data.get("shipments", [])
    violations = data.get("violations", [])
    leaks = data.get("leaks", [])
    alerts = data.get("alerts", [])
    inventory = data.get("inventory", [])
    certs = data.get("certifications", [])
    sust = data.get("sustainability", [])

    vectors = {
        "partner_risk": assess_partner_risk(partners, violations),
        "geographic_risk": assess_geographic_risk(partners, shipments),
        "route_risk": assess_route_risk(shipments),
        "financial_risk": assess_financial_risk(leaks, violations),
        "compliance_risk": assess_compliance_risk(certs),
        "cyber_risk": assess_cyber_risk(partners, alerts),
        "environmental_risk": assess_environmental_risk(sust),
        "supply_disruption": assess_supply_disruption(inventory, partners, shipments),
    }

    overall = sum(vectors[k]["score"] * w for k, w in VECTOR_WEIGHTS.items())

    return {
        "overall_threat_index": round(overall, 1),
        "threat_level": "critical" if overall > 70 else ("high" if overall > 50 else ("medium" if overall > 30 else "low")),
        "vectors": vectors,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def generate_heatmap(partners: list, shipments: list, leaks: list) -> list[dict]:
    """Generate risk heatmap by region."""
    region_map: dict[str, dict] = {}
    for p in partners:
        r = p.get("country") or p.get("region") or "Unknown"
        region_map.setdefault(r, {"partners": 0, "risk_score": 0, "leaks": 0, "shipments": 0})
        region_map[r]["partners"] += 1
        region_map[r]["risk_score"] += 100 - p.get("trust_score", 50)

    for l in leaks:
        r = l.get("region_detected", "Unknown")
        region_map.setdefault(r, {"partners": 0, "risk_score": 0, "leaks": 0, "shipments": 0})
        region_map[r]["leaks"] += 1
        region_map[r]["risk_score"] += (l.get("risk_score", 0.5)) * 20

    result = []
    for region, d in region_map.items():
        heat = round(min(100, d["risk_score"] / max(d["partners"], 1)))
        result.append({
            "region": region, "heat_score": heat, "partners": d["partners"],
            "leak_alerts": d["leaks"],
            "risk_level": "hot" if heat > 50 else ("warm" if heat > 25 else "cool"),
        })
    return sorted(result, key=lambda x: x["heat_score"], reverse=True)
