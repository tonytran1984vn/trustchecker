"""
Fraud Detection Engine
Multi-layer: rule-based + statistical + pattern detection.
Ported from server/engines/fraud.js

NOTE: The JS version does direct DB queries. The Python version is
pure-function: all data is passed in via the request payload.
The Node.js adapter pre-fetches data and sends it to this service.
"""

from __future__ import annotations
import math
import uuid
from datetime import datetime, timezone
from typing import Any


# Thresholds
SCAN_FREQUENCY_THRESHOLD = 10
SCAN_BURST_THRESHOLD = 5
GEO_DISTANCE_THRESHOLD = 500  # km
DUPLICATE_DEVICE_THRESHOLD = 3
ZSCORE_THRESHOLD = 2.5


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in km."""
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def run_rules(scan_event: dict, context: dict) -> dict:
    """Layer 1: Rule-based detection."""
    alerts = []
    score = 0.0

    hourly_count = context.get("hourly_scan_count", 0)
    if hourly_count > SCAN_FREQUENCY_THRESHOLD:
        score += 0.4
        alerts.append({
            "type": "HIGH_FREQUENCY_SCAN",
            "severity": "high",
            "description": f"QR code scanned {hourly_count} times in the last hour (threshold: {SCAN_FREQUENCY_THRESHOLD})",
            "details": {"count": hourly_count, "threshold": SCAN_FREQUENCY_THRESHOLD},
        })

    burst_count = context.get("burst_scan_count", 0)
    if burst_count > SCAN_BURST_THRESHOLD:
        score += 0.3
        alerts.append({
            "type": "SCAN_BURST",
            "severity": "critical",
            "description": f"Burst detected: {burst_count} scans in 5 minutes",
            "details": {"count": burst_count},
        })

    qr_status = context.get("qr_status")
    if qr_status == "revoked":
        score += 0.8
        alerts.append({
            "type": "REVOKED_QR",
            "severity": "critical",
            "description": "Attempted scan of a revoked QR code",
            "details": {"qr_status": qr_status},
        })

    product_status = context.get("product_status")
    if product_status == "recalled":
        score += 0.6
        alerts.append({
            "type": "RECALLED_PRODUCT",
            "severity": "high",
            "description": "Scan of a recalled product",
            "details": {"product_status": product_status},
        })

    return {"score": min(1.0, score), "alerts": alerts}


def run_statistical(scan_event: dict, context: dict) -> dict:
    """Layer 2: Statistical anomaly detection."""
    alerts = []
    score = 0.0

    daily_counts = context.get("daily_scan_counts", [])
    today_count = context.get("today_scan_count", 0)

    if len(daily_counts) > 3 and sum(daily_counts) > 5:
        mean = sum(daily_counts) / len(daily_counts)
        std_dev = math.sqrt(sum((c - mean) ** 2 for c in daily_counts) / len(daily_counts))

        if std_dev > 0:
            z_score = (today_count - mean) / std_dev
            if z_score > ZSCORE_THRESHOLD:
                score += 0.5
                alerts.append({
                    "type": "STATISTICAL_ANOMALY",
                    "severity": "medium",
                    "description": f"Scan frequency z-score {z_score:.2f} exceeds threshold {ZSCORE_THRESHOLD}",
                    "details": {"z_score": round(z_score, 2), "mean": round(mean, 2), "std_dev": round(std_dev, 2), "today_count": today_count},
                })

    unique_products = context.get("device_unique_products", 0)
    if unique_products > DUPLICATE_DEVICE_THRESHOLD:
        score += 0.3
        alerts.append({
            "type": "DEVICE_ANOMALY",
            "severity": "medium",
            "description": f"Single device scanned {unique_products} different products in 1 hour",
            "details": {"unique_products": unique_products},
        })

    return {"score": min(1.0, score), "alerts": alerts}


def run_patterns(scan_event: dict, context: dict) -> dict:
    """Layer 3: Pattern-based detection."""
    alerts = []
    score = 0.0

    lat = scan_event.get("latitude")
    lon = scan_event.get("longitude")
    recent = context.get("recent_scan")

    if lat and lon and recent and recent.get("latitude"):
        dist = haversine(lat, lon, recent["latitude"], recent["longitude"])
        time_diff_h = context.get("time_diff_hours", 999)
        if time_diff_h < 1 and dist > GEO_DISTANCE_THRESHOLD:
            score += 0.7
            alerts.append({
                "type": "GEO_VELOCITY_ANOMALY",
                "severity": "critical",
                "description": f"QR scanned {dist:.0f}km apart within {time_diff_h * 60:.0f} minutes",
                "details": {"distance_km": round(dist), "time_hours": round(time_diff_h, 2)},
            })

    hour = scan_event.get("hour", datetime.now(timezone.utc).hour)
    if 2 <= hour <= 5:
        score += 0.1
        alerts.append({
            "type": "OFF_HOURS_SCAN",
            "severity": "low",
            "description": f"Scan at unusual hour: {hour}:00",
            "details": {"hour": hour},
        })

    return {"score": min(1.0, score), "alerts": alerts}


def explain(factors: dict, alerts: list) -> dict:
    """Generate explainability report."""
    top = sorted(factors.items(), key=lambda x: x[1], reverse=True)
    return {
        "top_factors": [{"factor": k, "contribution": f"{v * 100:.1f}%"} for k, v in top],
        "alert_count": len(alerts),
        "severity_breakdown": {
            "critical": sum(1 for a in alerts if a["severity"] == "critical"),
            "high": sum(1 for a in alerts if a["severity"] == "high"),
            "medium": sum(1 for a in alerts if a["severity"] == "medium"),
            "low": sum(1 for a in alerts if a["severity"] == "low"),
        },
    }


def analyze(scan_event: dict, context: dict | None = None) -> dict:
    """
    Run full fraud analysis on a scan event.

    The `context` dict is pre-fetched by the Node.js adapter and contains:
      - hourly_scan_count, burst_scan_count, qr_status, product_status
      - daily_scan_counts, today_scan_count, device_unique_products
      - recent_scan, time_diff_hours
    """
    context = context or {}
    t0 = datetime.now(timezone.utc)

    rule_res = run_rules(scan_event, context)
    stat_res = run_statistical(scan_event, context)
    pat_res = run_patterns(scan_event, context)

    all_alerts = rule_res["alerts"] + stat_res["alerts"] + pat_res["alerts"]
    factors = {
        "rules": rule_res["score"],
        "statistical": stat_res["score"],
        "patterns": pat_res["score"],
    }

    fraud_score = min(1.0, factors["rules"] * 0.4 + factors["statistical"] * 0.35 + factors["patterns"] * 0.25)

    elapsed = (datetime.now(timezone.utc) - t0).total_seconds() * 1000

    return {
        "fraudScore": round(fraud_score, 3),
        "alerts": all_alerts,
        "factors": factors,
        "processingTimeMs": round(elapsed, 1),
        "explainability": explain(factors, all_alerts),
    }
