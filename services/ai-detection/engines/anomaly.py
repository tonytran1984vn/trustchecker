"""
Anomaly Detection Engine
Time-series pattern analysis: scan velocity, fraud spikes,
trust drops, geo dispersion.
Ported from server/engines/anomaly.js
"""

from __future__ import annotations

from bisect import bisect_right
from datetime import datetime, timezone
from typing import Any


THRESHOLDS = {
    "scan_velocity": {"warning": 50, "critical": 100},
    "fraud_spike": {"warning": 3, "critical": 5},
    "trust_drop": {"warning": 10, "critical": 20},
    "geo_dispersion": {"warning": 3, "critical": 5},
    "batch_anomaly": {"warning": 5, "critical": 10},
}


def _parse_ts(val) -> float:
    """Parse an ISO string to epoch ms."""
    if not val:
        return 0.0
    try:
        return datetime.fromisoformat(str(val).replace("Z", "+00:00")).timestamp() * 1000
    except Exception:
        return 0.0


def detect_scan_velocity(scan_events: list[dict], window_minutes: int = 60) -> list[dict]:
    """Detect scan velocity anomalies — too many scans in a short window.
    Optimized: O(n log n) using bisect instead of O(n²) brute force."""
    anomalies = []
    groups: dict[str, list[float]] = {}

    for s in scan_events:
        key = s.get("product_id", "unknown")
        groups.setdefault(key, []).append(_parse_ts(s.get("scanned_at") or s.get("created_at")))

    window_ms = window_minutes * 60 * 1000
    crit = THRESHOLDS["scan_velocity"]["critical"]
    warn = THRESHOLDS["scan_velocity"]["warning"]

    for product_id, times in groups.items():
        times.sort()
        max_count = 0
        # Sliding window via binary search: O(n log n)
        for i, t in enumerate(times):
            j = bisect_right(times, t + window_ms)
            count = j - i
            if count > max_count:
                max_count = count
        if max_count >= crit:
            anomalies.append({
                "type": "scan_velocity", "severity": "critical",
                "score": min(1.0, max_count / (crit * 2)),
                "source_type": "product", "source_id": product_id,
                "description": f"{max_count} scans in {window_minutes}min window (critical threshold: {crit})",
                "details": {"count": max_count, "window_minutes": window_minutes, "product_id": product_id},
            })
        elif max_count >= warn:
            anomalies.append({
                "type": "scan_velocity", "severity": "warning",
                "score": max_count / (crit * 2),
                "source_type": "product", "source_id": product_id,
                "description": f"{max_count} scans in {window_minutes}min — elevated velocity",
                "details": {"count": max_count, "window_minutes": window_minutes, "product_id": product_id},
            })

    return anomalies


def detect_fraud_spikes(fraud_alerts: list[dict]) -> list[dict]:
    """Detect fraud spikes — sudden increase in fraud alerts per product per day."""
    anomalies = []
    daily: dict[str, dict] = {}

    for a in fraud_alerts:
        day = str(a.get("created_at", ""))[:10]
        key = f"{a.get('product_id')}_{day}"
        if key not in daily:
            daily[key] = {"product_id": a.get("product_id"), "day": day, "count": 0}
        daily[key]["count"] += 1

    crit = THRESHOLDS["fraud_spike"]["critical"]
    warn = THRESHOLDS["fraud_spike"]["warning"]

    for g in daily.values():
        if g["count"] >= crit:
            anomalies.append({
                "type": "fraud_spike", "severity": "critical",
                "score": min(1.0, g["count"] / 10),
                "source_type": "product", "source_id": g["product_id"],
                "description": f"{g['count']} fraud alerts on {g['day']} (critical threshold: {crit})",
                "details": {"count": g["count"], "day": g["day"]},
            })
        elif g["count"] >= warn:
            anomalies.append({
                "type": "fraud_spike", "severity": "warning",
                "score": g["count"] / 10,
                "source_type": "product", "source_id": g["product_id"],
                "description": f"{g['count']} fraud alerts on {g['day']} — elevated",
                "details": {"count": g["count"], "day": g["day"]},
            })

    return anomalies


def detect_trust_drops(trust_scores: list[dict]) -> list[dict]:
    """Detect trust score drops."""
    anomalies = []
    groups: dict[str, list[dict]] = {}

    for ts in trust_scores:
        groups.setdefault(ts.get("product_id"), []).append({"score": ts.get("score", 0), "date": ts.get("calculated_at")})

    crit = THRESHOLDS["trust_drop"]["critical"]
    warn = THRESHOLDS["trust_drop"]["warning"]

    for pid, scores in groups.items():
        scores.sort(key=lambda s: s.get("date") or "")
        if len(scores) < 2:
            continue
        latest = scores[-1]["score"]
        previous = scores[-2]["score"]
        drop = previous - latest

        if drop >= crit:
            anomalies.append({
                "type": "trust_drop", "severity": "critical",
                "score": min(1.0, drop / 50),
                "source_type": "product", "source_id": pid,
                "description": f"Trust score dropped {drop} points ({previous} → {latest})",
                "details": {"previous_score": previous, "current_score": latest, "drop": drop},
            })
        elif drop >= warn:
            anomalies.append({
                "type": "trust_drop", "severity": "warning",
                "score": drop / 50,
                "source_type": "product", "source_id": pid,
                "description": f"Trust score declined {drop} points",
                "details": {"previous_score": previous, "current_score": latest, "drop": drop},
            })

    return anomalies


def detect_geo_dispersion(scan_events: list[dict], window_hours: int = 1) -> list[dict]:
    """Detect geographic dispersion anomalies.
    Optimized: O(n log n) using bisect instead of O(n²) brute force."""
    anomalies = []
    groups: dict[str, list[tuple[float, float, float]]] = {}

    for s in scan_events:
        if not s.get("latitude") or not s.get("longitude"):
            continue
        groups.setdefault(s.get("product_id"), []).append((
            _parse_ts(s.get("scanned_at") or s.get("created_at")),
            s["latitude"], s["longitude"],
        ))

    window_ms = window_hours * 3600 * 1000
    crit = THRESHOLDS["geo_dispersion"]["critical"]

    for pid, points in groups.items():
        points.sort()  # Sort by time (first element of tuple)
        times = [p[0] for p in points]  # Extract sorted times for bisect
        for i, (t, lat, lng) in enumerate(points):
            j = bisect_right(times, t + window_ms)
            in_window = points[i:j]
            unique = set(f"{round(pp[1])},{round(pp[2])}" for pp in in_window)
            if len(unique) >= crit:
                anomalies.append({
                    "type": "geo_dispersion", "severity": "critical",
                    "score": min(1.0, len(unique) / 10),
                    "source_type": "product", "source_id": pid,
                    "description": f"Scanned from {len(unique)} different locations within {window_hours}h",
                    "details": {"unique_locations": len(unique), "window_hours": window_hours},
                })
                break

    return anomalies


def run_full_scan(data: dict[str, Any]) -> dict:
    """Run full anomaly scan across all data sources."""
    scans = data.get("scans", [])
    fraud_alerts = data.get("fraudAlerts", [])
    trust_scores = data.get("trustScores", [])

    all_anomalies = (
        detect_scan_velocity(scans)
        + detect_fraud_spikes(fraud_alerts)
        + detect_trust_drops(trust_scores)
        + detect_geo_dispersion(scans)
    )

    sev_order = {"critical": 0, "warning": 1, "info": 2}
    all_anomalies.sort(key=lambda a: (sev_order.get(a["severity"], 3), -a.get("score", 0)))

    return {
        "total": len(all_anomalies),
        "critical": sum(1 for a in all_anomalies if a["severity"] == "critical"),
        "warning": sum(1 for a in all_anomalies if a["severity"] == "warning"),
        "anomalies": all_anomalies,
        "scanned_at": datetime.now(timezone.utc).isoformat(),
    }
