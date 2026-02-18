"""
What-If Scenario Simulation
Simulates hypothetical supply chain disruptions.
Ported from server/engines/advanced-scm-ai.js → whatIfSimulation()
"""

import math
import random
from datetime import datetime, timezone
from typing import Any


def simulate(scenario: dict[str, Any], current_state: dict[str, Any] | None = None) -> dict:
    """
    Simulate a hypothetical supply chain event.

    Supported scenario types:
      - partner_failure
      - route_blocked
      - demand_spike
      - quality_recall
    """
    current_state = current_state or {}
    sc_type = scenario.get("type", "partner_failure")
    duration_days = scenario.get("duration_days", 7)
    demand_spike_pct = scenario.get("demand_spike_pct", 0)

    total_partners = current_state.get("total_partners", 6)
    total_shipments = current_state.get("total_shipments_monthly", 100)
    avg_order_value = current_state.get("avg_order_value", 500)
    current_inventory = current_state.get("current_inventory", 1000)
    daily_demand = current_state.get("daily_demand", 50)
    redundant_partners = current_state.get("redundant_partners", 2)

    impact: dict[str, Any] = {}

    if sc_type == "partner_failure":
        partner_share = 1 / total_partners
        affected = round(total_shipments * partner_share)
        recovery = math.ceil(duration_days * 0.6) if redundant_partners > 0 else duration_days * 2
        revenue_loss = affected * avg_order_value
        inv_impact = daily_demand * recovery

        impact = {
            "affected_shipments": affected,
            "revenue_at_risk": revenue_loss,
            "recovery_days": recovery,
            "inventory_shortfall": max(0, inv_impact - current_inventory),
            "mitigation": "Redistribute to backup partners" if redundant_partners > 0 else "CRITICAL: No backup partners available",
            "severity": "critical" if redundant_partners == 0 else "high",
        }

    elif sc_type == "route_blocked":
        reroute_cost = total_shipments * 0.3 * avg_order_value * 0.15
        delay_days = math.ceil(duration_days * 0.5)
        impact = {
            "affected_shipments": round(total_shipments * 0.3),
            "reroute_cost": round(reroute_cost),
            "additional_delay_days": delay_days,
            "sla_violations_expected": round(total_shipments * 0.3 * 0.4),
            "mitigation": "Activate alternative routes and notify downstream partners",
            "severity": "high",
        }

    elif sc_type == "demand_spike":
        spiked = daily_demand * (1 + demand_spike_pct / 100)
        days_of_stock = int(current_inventory / spiked) if spiked > 0 else 999
        shortfall = max(0.0, spiked * duration_days - current_inventory)
        impact = {
            "current_daily_demand": daily_demand,
            "spiked_daily_demand": round(spiked),
            "days_of_stock_remaining": days_of_stock,
            "total_shortfall": round(shortfall),
            "revenue_at_risk": round(shortfall * avg_order_value / daily_demand) if daily_demand else 0,
            "mitigation": "Accelerate replenishment orders" if days_of_stock > 3 else "URGENT: Emergency sourcing required",
            "severity": "critical" if days_of_stock <= 3 else ("high" if days_of_stock <= 7 else "medium"),
        }

    elif sc_type == "quality_recall":
        recall_pct = 0.15 + random.random() * 0.1
        units = round(current_inventory * recall_pct)
        impact = {
            "units_recalled": units,
            "recall_cost": round(units * avg_order_value * 0.3),
            "brand_damage_score": "severe" if recall_pct > 0.2 else "moderate",
            "recovery_weeks": math.ceil(duration_days / 7) + 2,
            "regulatory_risk": "Notify FDA/EU authorities within 72 hours",
            "mitigation": "Activate batch traceability, quarantine affected stock",
            "severity": "critical",
        }

    else:
        impact = {
            "error": "Unknown scenario type",
            "supported": ["partner_failure", "route_blocked", "demand_spike", "quality_recall"],
        }

    return {
        "scenario": {"type": sc_type, "duration_days": duration_days, **scenario},
        "impact": impact,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "confidence": round(0.7 + random.random() * 0.15, 2),
    }
