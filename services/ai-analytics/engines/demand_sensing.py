"""
CUSUM Demand Sensing Engine
Change-point detection for demand pattern shifts.
Ported from server/engines/advanced-scm-ai.js → demandSensing()
"""

import math
from typing import Any


def detect(sales_history: list, threshold: float = 2.0) -> dict:
    """
    CUSUM Change-Point Detection for Demand Sensing.

    Args:
        sales_history: List of numbers or dicts with quantity/value keys
        threshold: Detection threshold in standard deviations
    """
    if not sales_history or len(sales_history) < 5:
        return {"change_points": [], "current_trend": "stable", "alert": None}

    values = [
        (s if isinstance(s, (int, float)) else s.get("quantity", s.get("value", 0)))
        for s in sales_history
    ]
    mean = sum(values) / len(values)
    std = math.sqrt(sum((v - mean) ** 2 for v in values) / len(values)) or 1

    k = 0.5 * std  # Allowance
    h = threshold * std  # Threshold

    cusum_pos = 0.0
    cusum_neg = 0.0
    change_points = []

    for i, v in enumerate(values):
        cusum_pos = max(0, cusum_pos + (v - mean) - k)
        cusum_neg = max(0, cusum_neg - (v - mean) - k)

        if cusum_pos > h:
            change_points.append({
                "index": i, "direction": "increase",
                "magnitude": round(cusum_pos / std, 2),
                "value": values[i], "baseline": round(mean, 2),
            })
            cusum_pos = 0

        if cusum_neg > h:
            change_points.append({
                "index": i, "direction": "decrease",
                "magnitude": round(cusum_neg / std, 2),
                "value": values[i], "baseline": round(mean, 2),
            })
            cusum_neg = 0

    recent5 = values[-5:]
    recent_mean = sum(recent5) / len(recent5)
    trend_pct = ((recent_mean - mean) / (mean or 1)) * 100

    current_trend = "stable"
    alert = None
    if trend_pct > 15:
        current_trend = "surge"
        alert = {"type": "demand_surge", "severity": "high", "message": f"Demand up {round(trend_pct)}% vs baseline"}
    elif trend_pct > 5:
        current_trend = "increasing"
    elif trend_pct < -15:
        current_trend = "drop"
        alert = {"type": "demand_drop", "severity": "high", "message": f"Demand down {round(abs(trend_pct))}% vs baseline"}
    elif trend_pct < -5:
        current_trend = "decreasing"

    return {
        "baseline_mean": round(mean, 2),
        "baseline_stddev": round(std, 2),
        "current_trend": current_trend,
        "trend_pct": round(trend_pct, 1),
        "change_points": change_points,
        "total_shifts_detected": len(change_points),
        "alert": alert,
        "recent_values": recent5,
        "cusum_threshold": round(h, 2),
    }
