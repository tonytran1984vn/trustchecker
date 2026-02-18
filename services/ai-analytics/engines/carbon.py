"""
Carbon & ESG Engine
Scope 1/2/3 emissions, carbon passport, GRI reporting, partner ESG leaderboard.
Ported from server/engines/carbon-engine.js
"""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Any

# ─── Emission factors ─────────────────────────────────────────
TRANSPORT_EMISSION_FACTORS = {
    "air": 0.602, "air_short": 1.128,
    "sea": 0.016, "sea_container": 0.012,
    "road": 0.062, "road_electric": 0.025,
    "rail": 0.022, "rail_electric": 0.008,
    "multimodal": 0.045,
}

WAREHOUSE_FACTORS = {"cold_storage": 0.85, "ambient": 0.15, "automated": 0.35}

MANUFACTURING_FACTORS = {
    "F&B": 2.5, "Electronics": 15.0, "Fashion": 8.0,
    "Healthcare": 5.0, "Industrial": 20.0, "Agriculture": 1.8, "Energy": 25.0,
}


def _estimate_distance(shipment: dict) -> int:
    lat = shipment.get("current_lat")
    lng = shipment.get("current_lng")
    if lat and lng:
        R = 6371
        lat1 = math.radians(10.8)
        lat2 = math.radians(lat)
        d_lat = lat2 - lat1
        d_lon = math.radians(lng - 106.6)
        a = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
        return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))
    return 500


def _carbon_grade(kg: float) -> str:
    if kg <= 5: return "A+"
    if kg <= 10: return "A"
    if kg <= 20: return "B"
    if kg <= 40: return "C"
    if kg <= 70: return "D"
    return "F"


def _overall_esg_grade(scope_data: dict | None, leaderboard: list | None) -> str:
    if not scope_data or not leaderboard:
        return "N/A"
    total = scope_data.get("total_emissions_kgCO2e", 0)
    avg_p = sum(p.get("esg_score", 50) for p in leaderboard) / len(leaderboard) if leaderboard else 50
    combined = (100 - min(100, total / 10)) * 0.5 + avg_p * 0.5
    return "A" if combined >= 80 else ("B" if combined >= 60 else ("C" if combined >= 40 else "D"))


def calculate_footprint(product: dict, shipments: list | None = None, events: list | None = None, partner: dict | None = None) -> dict:
    """Calculate product carbon footprint (cradle-to-gate)."""
    shipments = shipments or []
    events = events or []
    category = product.get("category", "General")

    scope1 = {
        "type": "scope_1", "label": "Direct Emissions (Manufacturing)",
        "value": MANUFACTURING_FACTORS.get(category, 5.0), "unit": "kgCO2e",
        "source": "DEFRA Manufacturing Factors 2025",
    }

    wh_type = "cold_storage" if category in ("Healthcare", "F&B") else "ambient"
    storage_days = sum(1 for e in events if e.get("event_type") in ("store", "receive")) * 3
    wh_emissions = WAREHOUSE_FACTORS[wh_type] * storage_days * 0.5
    scope2 = {
        "type": "scope_2", "label": "Indirect Emissions (Energy/Warehousing)",
        "value": round(wh_emissions, 2), "unit": "kgCO2e",
        "storage_days": storage_days, "warehouse_type": wh_type,
    }

    transport_total = 0.0
    breakdown = []
    for s in shipments:
        carrier = (s.get("carrier") or "").lower()
        mode = "road"
        if "fedex" in carrier or "dhl" in carrier:
            mode = "air"
        elif "maersk" in carrier or "cosco" in carrier:
            mode = "sea"
        elif "rail" in carrier or "train" in carrier:
            mode = "rail"
        dist = _estimate_distance(s)
        emissions = TRANSPORT_EMISSION_FACTORS.get(mode, 0.062) * dist * 0.05
        transport_total += emissions
        breakdown.append({"shipment_id": s.get("id"), "carrier": s.get("carrier"), "mode": mode, "distance_km": dist, "emissions_kgCO2e": round(emissions, 2)})

    scope3 = {"type": "scope_3", "label": "Value Chain Emissions (Transport/Distribution)", "value": round(transport_total, 2), "unit": "kgCO2e", "transport_breakdown": breakdown}

    total = scope1["value"] + scope2["value"] + scope3["value"]

    return {
        "product_id": product.get("id"), "product_name": product.get("name"),
        "total_footprint_kgCO2e": round(total, 2), "grade": _carbon_grade(total),
        "scopes": [scope1, scope2, scope3],
        "scope_breakdown": {
            "scope_1_pct": round(scope1["value"] / total * 100) if total else 0,
            "scope_2_pct": round(scope2["value"] / total * 100) if total else 0,
            "scope_3_pct": round(scope3["value"] / total * 100) if total else 0,
        },
        "equivalent": {
            "trees_needed": round(total / 22, 1),
            "driving_km": round(total / 0.192, 1),
            "smartphone_charges": round(total / 0.008),
        },
        "methodology": "GHG Protocol Corporate Standard + DEFRA 2025 Factors",
        "assessed_at": datetime.now(timezone.utc).isoformat(),
    }


def aggregate_by_scope(products: list, shipments: list, events: list) -> dict:
    """Scope 1/2/3 aggregation across supply chain (optimized: pre-built lookups)."""
    s1 = s2 = s3 = 0.0
    rankings = []

    # Pre-index events by product_id: O(events) once instead of O(products × events)
    events_by_product: dict[str, list] = defaultdict(list)
    for e in events:
        pid = e.get("product_id")
        if pid:
            events_by_product[pid].append(e)

    # Pre-index shipments by batch_id: O(shipments) once
    ships_by_batch: dict[str, list] = defaultdict(list)
    for s in shipments:
        bid = s.get("batch_id")
        if bid:
            ships_by_batch[bid].append(s)

    for p in products:
        pid = p.get("id")
        p_events = events_by_product.get(pid, [])
        batch_ids = {e.get("batch_id") for e in p_events if e.get("batch_id")}
        p_ships = []
        for bid in batch_ids:
            p_ships.extend(ships_by_batch.get(bid, []))
        fp = calculate_footprint(p, p_ships, p_events)
        s1 += fp["scopes"][0]["value"]
        s2 += fp["scopes"][1]["value"]
        s3 += fp["scopes"][2]["value"]
        rankings.append({"product_id": pid, "name": p.get("name"), "category": p.get("category"), "total": fp["total_footprint_kgCO2e"], "grade": fp["grade"]})

    total = s1 + s2 + s3
    rankings.sort(key=lambda x: x["total"], reverse=True)
    return {
        "total_emissions_kgCO2e": round(total, 2), "total_emissions_tonnes": round(total / 1000, 2),
        "scope_1": {"total": round(s1, 2), "pct": round(s1 / total * 100) if total else 0, "label": "Direct Manufacturing"},
        "scope_2": {"total": round(s2, 2), "pct": round(s2 / total * 100) if total else 0, "label": "Energy & Warehousing"},
        "scope_3": {"total": round(s3, 2), "pct": round(s3 / total * 100) if total else 0, "label": "Transport & Distribution"},
        "products_assessed": len(rankings), "product_rankings": rankings,
        "reduction_targets": {
            "paris_aligned_2030": round(total * 0.55, 2),
            "net_zero_2050": round(total * 0.1, 2),
        },
    }


def partner_leaderboard(partners: list, shipments: list, violations: list) -> list[dict]:
    """Partner ESG leaderboard (optimized: pre-indexed lookups)."""
    result = []

    # Pre-index shipments by partner_id (both from/to): O(shipments) once
    ships_by_partner: dict[str, list] = defaultdict(list)
    for s in shipments:
        fp = s.get("from_partner_id")
        tp = s.get("to_partner_id")
        if fp:
            ships_by_partner[fp].append(s)
        if tp and tp != fp:
            ships_by_partner[tp].append(s)

    # Pre-index violations by partner_id: O(violations) once
    viols_by_partner: dict[str, int] = defaultdict(int)
    for v in violations:
        pid = v.get("partner_id")
        if pid:
            viols_by_partner[pid] += 1

    for p in partners:
        pid = p.get("id")
        p_ships = ships_by_partner.get(pid, [])
        late = sum(1 for s in p_ships if s.get("actual_delivery") and s.get("estimated_delivery") and s["actual_delivery"] > s["estimated_delivery"])
        viols = viols_by_partner[pid]

        tw = (p.get("trust_score", 50)) / 100 * 40
        rw = (1 - late / len(p_ships)) * 30 if p_ships else 15
        cw = max(0, 30 - viols * 10)
        esg = round(min(100, tw + rw + cw))

        result.append({
            "partner_id": pid, "name": p.get("name"), "country": p.get("country"), "type": p.get("type"),
            "esg_score": esg, "grade": "A" if esg >= 80 else ("B" if esg >= 60 else ("C" if esg >= 40 else "D")),
            "metrics": {
                "trust_score": p.get("trust_score", 50),
                "shipment_reliability": f"{round((1 - late / len(p_ships)) * 100)}%" if p_ships else "N/A",
                "sla_violations": viols, "kyc_status": p.get("kyc_status"),
            },
        })
    result.sort(key=lambda x: x["esg_score"], reverse=True)
    return result


def generate_gri_report(data: dict) -> dict:
    """Generate GRI-format ESG report."""
    sd = data.get("scopeData", {})
    lb = data.get("leaderboard", [])
    certs = data.get("certifications", [])
    now = datetime.now(timezone.utc)
    return {
        "report_standard": "GRI Universal Standards 2021",
        "reporting_period": {"from": (now - timedelta(days=365)).strftime("%Y-%m-%d"), "to": now.strftime("%Y-%m-%d")},
        "disclosures": {
            "GRI 305-1": {"title": "Direct GHG Emissions (Scope 1)", "value": sd.get("scope_1", {}).get("total", 0), "unit": "kgCO2e"},
            "GRI 305-2": {"title": "Energy Indirect GHG Emissions (Scope 2)", "value": sd.get("scope_2", {}).get("total", 0), "unit": "kgCO2e"},
            "GRI 305-3": {"title": "Other Indirect GHG Emissions (Scope 3)", "value": sd.get("scope_3", {}).get("total", 0), "unit": "kgCO2e"},
            "GRI 305-5": {"title": "Reduction of GHG Emissions", "value": sd.get("reduction_targets", {}).get("paris_aligned_2030", 0), "unit": "kgCO2e", "note": "2030 Paris-aligned target (45% reduction)"},
            "GRI 308-1": {"title": "Supplier Environmental Assessment", "value": len(lb), "unit": "suppliers assessed"},
            "GRI 414-1": {"title": "Supplier Social Assessment", "value": sum(1 for p in lb if p.get("grade") in ("A", "B")), "unit": "suppliers passing"},
        },
        "certifications_tracked": len(certs),
        "overall_esg_grade": _overall_esg_grade(sd, lb),
        "generated_at": now.isoformat(),
    }
