"""
Digital Twin Engine
Virtual supply chain model: topology builder, KPI computation,
anomaly detection, disruption simulation.
Ported from server/engines/digital-twin.js
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from collections import defaultdict
from typing import Any
import copy
import json


def build_model(data: dict[str, Any] | None = None) -> dict:
    """Build supply chain digital twin from live data."""
    data = data or {}
    partners = data.get("partners", [])
    products = data.get("products", [])
    batches = data.get("batches", [])
    shipments = data.get("shipments", [])
    inventory = data.get("inventory", [])
    events = data.get("events", [])
    seals = data.get("seals", [])

    # Pre-build inventory lookup by partner_id: O(partners + inventory) vs O(partners × inventory)
    inv_by_partner: dict[str, int] = defaultdict(int)
    for i in inventory:
        pid = i.get("partner_id")
        if pid:
            inv_by_partner[pid] += i.get("quantity", 0)

    # Node layer
    nodes = []
    for p in partners:
        nodes.append({
            "id": p.get("id"),
            "name": p.get("name"),
            "type": p.get("type", "partner"),
            "country": p.get("country"),
            "trust_score": p.get("trust_score", 50),
            "status": p.get("status", "active"),
            "inventory_level": inv_by_partner[p.get("id")],
        })

    # Edge layer
    flow_map: dict[str, dict] = {}
    for s in shipments:
        key = f"{s.get('from_partner_id')}→{s.get('to_partner_id')}"
        if key not in flow_map:
            flow_map[key] = {"count": 0, "volume": 0, "delays": 0}
        flow_map[key]["count"] += 1
        if s.get("status") == "delivered" and s.get("actual_delivery") and s.get("estimated_delivery"):
            if s["actual_delivery"] > s["estimated_delivery"]:
                flow_map[key]["delays"] += 1

    edges = []
    for key, stats in flow_map.items():
        from_node, to_node = key.split("→")
        cnt = stats["count"]
        edges.append({
            "from_node": from_node,
            "to_node": to_node,
            "shipment_count": cnt,
            "delay_rate": round(stats["delays"] / cnt * 100) if cnt else 0,
            "reliability": round((1 - stats["delays"] / cnt) * 100) if cnt else 100,
        })

    in_transit = [s for s in shipments if s.get("status") == "in_transit"]
    total_inv = sum(i.get("quantity", 0) for i in inventory)
    low_stock = sum(1 for i in inventory if i.get("quantity", 0) <= i.get("min_stock", 10))

    overall = "healthy" if low_stock == 0 and len(in_transit) < 20 else ("critical" if low_stock > 5 else "warning")
    inv_health = "optimal" if low_stock == 0 else ("stress" if low_stock <= 3 else "critical")
    logistics = "flowing" if len(in_transit) < 10 else ("congested" if len(in_transit) < 30 else "blocked")

    return {
        "type": "DigitalTwin",
        "version": "1.0",
        "snapshot_time": datetime.now(timezone.utc).isoformat(),
        "topology": {
            "nodes": len(nodes),
            "edges": len(edges),
            "node_details": nodes,
            "edge_details": edges,
        },
        "state": {
            "products_tracked": len(products),
            "batches_active": sum(1 for b in batches if b.get("status") != "completed"),
            "batches_total": len(batches),
            "shipments_in_transit": len(in_transit),
            "total_inventory_units": total_inv,
            "low_stock_alerts": low_stock,
            "blockchain_seals": len(seals),
            "total_events": len(events),
        },
        "health": {
            "overall": overall,
            "inventory": inv_health,
            "logistics": logistics,
            "integrity": "blockchain_verified" if seals else "unverified",
        },
    }


def compute_kpis(data: dict[str, Any] | None = None) -> dict:
    """Compute Key Performance Indicators for the supply chain."""
    data = data or {}
    shipments = data.get("shipments", [])
    inventory = data.get("inventory", [])
    events = data.get("events", [])
    batches = data.get("batches", [])

    delivered = [s for s in shipments if s.get("status") == "delivered"]
    on_time = [
        s for s in delivered
        if s.get("actual_delivery") and s.get("estimated_delivery")
        and s["actual_delivery"] <= s["estimated_delivery"]
    ]
    perfect_order_rate = round(len(on_time) / len(delivered) * 100) if delivered else 0

    total_demand = sum(i.get("max_stock", 100) for i in inventory)
    total_stock = sum(i.get("quantity", 0) for i in inventory)
    fill_rate = min(100, round(total_stock / total_demand * 100)) if total_demand else 0

    avg_cycle = 0.0
    if delivered:
        cycles = []
        for s in delivered:
            if s.get("actual_delivery") and s.get("created_at"):
                try:
                    d1 = datetime.fromisoformat(s["actual_delivery"].replace("Z", "+00:00"))
                    d2 = datetime.fromisoformat(s["created_at"].replace("Z", "+00:00"))
                    cycles.append((d1 - d2).total_seconds() / 86400)
                except Exception:
                    pass
        if cycles:
            avg_cycle = round(sum(cycles) / len(cycles), 1)

    sell_ship = [e for e in events if e.get("event_type") in ("sell", "ship")]
    avg_inv = total_stock / max(len(inventory), 1)
    turnover = round(len(sell_ship) / avg_inv, 2) if avg_inv else 0

    est_revenue = len(sell_ship) * 50
    inv_value = total_stock * 30
    gmroi = round(est_revenue / inv_value, 2) if inv_value else 0

    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    # Single-pass: parse datetime once per event, count recent
    recent_events = 0
    for e in events:
        dt = _parse_dt(e.get("created_at"))
        if dt and dt > cutoff:
            recent_events += 1
    velocity = round(recent_events / 7, 1)

    sealed = sum(1 for e in events if e.get("blockchain_seal_id"))
    integrity = round(sealed / len(events) * 100) if events else 0

    def _status(val, bench, higher_better=True):
        if higher_better:
            return "excellent" if val >= bench else ("good" if val >= bench * 0.84 else "needs_improvement")
        return "excellent" if val <= bench else ("good" if val <= bench * 2.3 else "needs_improvement")

    return {
        "kpis": {
            "perfect_order_rate": {"value": perfect_order_rate, "unit": "%", "benchmark": 95, "status": _status(perfect_order_rate, 95)},
            "fill_rate": {"value": fill_rate, "unit": "%", "benchmark": 98, "status": _status(fill_rate, 98)},
            "avg_cycle_time": {"value": avg_cycle, "unit": "days", "benchmark": 3, "status": _status(avg_cycle, 3, False)},
            "inventory_turnover": {"value": turnover, "unit": "x", "benchmark": 6, "status": _status(turnover, 6)},
            "gmroi": {"value": gmroi, "unit": "ratio", "benchmark": 2, "status": _status(gmroi, 2)},
            "sc_velocity": {"value": velocity, "unit": "events/day", "benchmark": 10, "status": "high" if velocity >= 10 else ("normal" if velocity >= 3 else "low")},
            "blockchain_integrity": {"value": integrity, "unit": "%", "benchmark": 90, "status": "excellent" if integrity >= 90 else ("partial" if integrity >= 50 else "low")},
        },
        "overall_score": round((perfect_order_rate + fill_rate + integrity) / 3),
        "data_points": {"shipments": len(shipments), "inventory_items": len(inventory), "events": len(events), "batches": len(batches)},
        "computed_at": datetime.now(timezone.utc).isoformat(),
    }


def detect_anomalies(data: dict[str, Any] | None = None) -> dict:
    """Detect discrepancies between twin model and reality."""
    data = data or {}
    inventory = data.get("inventory", [])
    shipments = data.get("shipments", [])
    events = data.get("events", [])
    anomalies = []

    # Single pass: check both understock and overstock in one loop
    for i in inventory:
        qty = i.get("quantity", 0)
        min_s = i.get("min_stock", 10)
        max_s = i.get("max_stock", 1000)
        if qty <= min_s:
            anomalies.append({
                "type": "inventory_critical",
                "severity": "critical" if qty == 0 else "high",
                "entity_type": "inventory",
                "entity_id": i.get("id"),
                "message": f"Stock level ({qty}) at or below minimum ({min_s})",
                "recommended_action": "Trigger emergency replenishment order",
            })
        elif qty > max_s:
            anomalies.append({
                "type": "overstock",
                "severity": "medium",
                "entity_type": "inventory",
                "entity_id": i.get("id"),
                "message": f"Stock level ({qty}) exceeds maximum ({max_s})",
                "recommended_action": "Review demand forecast and adjust procurement plan",
            })

    now = datetime.now(timezone.utc)
    for s in shipments:
        if s.get("status") == "in_transit" and s.get("created_at"):
            created = _parse_dt(s["created_at"])
            if created:
                days = (now - created).total_seconds() / 86400
                if days > 14:
                    anomalies.append({
                        "type": "shipment_stuck",
                        "severity": "critical" if days > 30 else "high",
                        "entity_type": "shipment",
                        "entity_id": s.get("id"),
                        "message": f"Shipment stuck in transit for {round(days)} days",
                        "recommended_action": "Contact carrier and activate contingency plan",
                    })

    # Single-pass datetime parsing for event activity check
    cutoff_24h = now - timedelta(hours=24)
    recent = 0
    for e in events:
        dt = _parse_dt(e.get("created_at"))
        if dt and dt > cutoff_24h:
            recent += 1
    if events and recent == 0:
        anomalies.append({
            "type": "chain_stalled",
            "severity": "medium",
            "entity_type": "system",
            "entity_id": "global",
            "message": "No supply chain events recorded in the last 24 hours",
            "recommended_action": "Verify data ingestion pipeline and partner connectivity",
        })

    sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    anomalies.sort(key=lambda a: sev_order.get(a["severity"], 3))

    return {
        "total_anomalies": len(anomalies),
        "by_severity": {
            "critical": sum(1 for a in anomalies if a["severity"] == "critical"),
            "high": sum(1 for a in anomalies if a["severity"] == "high"),
            "medium": sum(1 for a in anomalies if a["severity"] == "medium"),
        },
        "anomalies": anomalies,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }


def simulate_disruption(model: dict, scenario: dict) -> dict:
    """Simulate disruption scenario on the digital twin."""
    dtype = scenario.get("type")
    target_id = scenario.get("target_id")
    duration_days = scenario.get("duration_days", 7)
    clone = copy.deepcopy(model)

    if dtype == "node_offline":
        node = next((n for n in clone.get("topology", {}).get("node_details", []) if n.get("id") == target_id), None)
        if node:
            node["status"] = "offline"
            node["trust_score"] = max(0, node.get("trust_score", 50) - 30)
            affected = [
                e for e in clone["topology"].get("edge_details", [])
                if e.get("from_node") == target_id or e.get("to_node") == target_id
            ]
            return {
                "disrupted_node": node.get("name"),
                "affected_connections": len(affected),
                "estimated_impact": {
                    "shipments_delayed": sum(e.get("shipment_count", 0) for e in affected),
                    "recovery_days": duration_days,
                    "alternative_routes": len(clone["topology"].get("edge_details", [])) - len(affected),
                },
                "modified_model": clone,
            }
        return {"error": "Target node not found"}

    if dtype == "capacity_reduction":
        state = clone.get("state", {})
        state["total_inventory_units"] = round(state.get("total_inventory_units", 0) * 0.5)
        clone.get("health", {})["overall"] = "stress"
        return {
            "type": "capacity_reduction",
            "inventory_reduced_to": state["total_inventory_units"],
            "days_of_stock": round(state["total_inventory_units"] / max(state.get("products_tracked", 1), 1)),
            "modified_model": clone,
        }

    return {"error": "Unknown disruption type", "supported": ["node_offline", "capacity_reduction"]}


def _parse_dt(val) -> datetime | None:
    if not val:
        return None
    try:
        return datetime.fromisoformat(str(val).replace("Z", "+00:00"))
    except Exception:
        return None
