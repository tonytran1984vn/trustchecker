"""
Supply Chain AI Engine
Delay prediction (EWMA), inventory forecast (Holt method), bottleneck detection,
Dijkstra route optimization, partner risk scoring, PageRank, toxic node detection.
Ported from server/engines/scm-ai.js
"""

from __future__ import annotations

import math
import heapq
from collections import defaultdict, Counter
from datetime import datetime, timezone
from typing import Any


def predict_delay(shipments: list[dict]) -> dict:
    """Predict delivery delay using exponential weighted moving average."""
    if not shipments or len(shipments) < 2:
        return {"predicted_delay_hours": 0, "confidence": 0.5, "risk": "low"}

    delays = []
    for s in shipments:
        if s.get("actual_delivery") and s.get("estimated_delivery"):
            try:
                est = datetime.fromisoformat(str(s["estimated_delivery"]).replace("Z", "+00:00")).timestamp()
                act = datetime.fromisoformat(str(s["actual_delivery"]).replace("Z", "+00:00")).timestamp()
                delays.append((act - est) / 3600)
            except Exception:
                pass

    if not delays:
        return {"predicted_delay_hours": 0, "confidence": 0.6, "risk": "low"}

    alpha = 0.3
    ewma = delays[0]
    for d in delays[1:]:
        ewma = alpha * d + (1 - alpha) * ewma

    var = sum((d - ewma) ** 2 for d in delays) / len(delays)
    std = math.sqrt(var)
    conf = max(0.3, min(0.95, 1 - (std / (abs(ewma) + 1)) * 0.5))

    return {
        "predicted_delay_hours": round(ewma, 1),
        "std_deviation": round(std, 1),
        "confidence": round(conf, 2),
        "risk": "high" if ewma > 24 else ("medium" if ewma > 8 else "low"),
        "samples": len(delays),
    }


def forecast_inventory(history: list[dict], periods_ahead: int = 7) -> dict:
    """Inventory forecast using double exponential smoothing (Holt)."""
    if not history or len(history) < 3:
        return {"forecast": [], "trend": "stable", "confidence": 0.4, "alert": None}

    values = [h.get("quantity", 0) for h in history]
    alpha, beta = 0.4, 0.1
    level = values[0]
    trend = values[1] - values[0] if len(values) > 1 else 0

    for v in values[1:]:
        new_level = alpha * v + (1 - alpha) * (level + trend)
        trend = beta * (new_level - level) + (1 - beta) * trend
        level = new_level

    fc = []
    for i in range(1, periods_ahead + 1):
        pred = max(0, round(level + trend * i))
        fc.append({
            "period": i, "predicted": pred,
            "lower": max(0, round(level + trend * i - len(values) * 0.1 * i)),
            "upper": round(level + trend * i + len(values) * 0.1 * i),
        })

    last = fc[-1]["predicted"]
    trend_dir = "increasing" if trend > 1 else ("decreasing" if trend < -1 else "stable")
    alert = None
    if last < 10:
        alert = {"type": "understock", "message": "Stock predicted to reach critical low", "severity": "high"}
    elif last > 900:
        alert = {"type": "overstock", "message": "Stock predicted to exceed capacity", "severity": "medium"}

    return {
        "forecast": fc, "trend": trend_dir,
        "confidence": min(0.9, 0.5 + len(values) * 0.05),
        "current_level": values[-1], "alert": alert,
    }


def detect_bottlenecks(events: list[dict], partners: list[dict]) -> dict:
    """Detect supply chain bottlenecks via throughput analysis."""
    stats: dict[str, dict] = {}
    for e in events or []:
        key = e.get("partner_id") or e.get("location") or "unknown"
        if key not in stats:
            stats[key] = {"node": key, "events": 0, "types": defaultdict(int)}
        stats[key]["events"] += 1
        stats[key]["types"][e.get("event_type", "other")] += 1

    nodes = list(stats.values())
    if not nodes:
        return {"bottlenecks": [], "health": "healthy"}

    avg = sum(n["events"] for n in nodes) / len(nodes)
    partner_map = {p.get("id"): p.get("name") for p in (partners or [])}

    bottlenecks = []
    for n in nodes:
        ratio = n["events"] / avg if avg else 1
        bottlenecks.append({
            "node_id": n["node"], "node_name": partner_map.get(n["node"], n["node"]),
            "throughput": n["events"], "throughput_ratio": round(ratio, 2),
            "event_breakdown": dict(n["types"]),
            "is_bottleneck": ratio < 0.5 or ratio > 2.0,
            "severity": "critical" if ratio < 0.3 else ("high" if ratio < 0.5 else ("warning" if ratio > 2.0 else "normal")),
        })
    bottlenecks.sort(key=lambda b: b["throughput_ratio"])
    bc = sum(1 for b in bottlenecks if b["is_bottleneck"])
    return {"bottlenecks": bottlenecks, "health": "healthy" if bc == 0 else ("warning" if bc <= 2 else "critical"), "total_nodes": len(nodes), "bottleneck_count": bc}


def optimize_route(graph: list[dict], from_id: str, to_id: str) -> dict:
    """Dijkstra shortest path with risk-weighted edges (heapq optimized)."""
    if not graph:
        return {"path": [], "cost": 0, "optimized": False}

    adj: dict[str, list[tuple[str, float]]] = defaultdict(list)
    all_nodes: set[str] = set()
    for e in graph:
        f, t = e.get("from_node_id", ""), e.get("to_node_id", "")
        all_nodes.update((f, t))
        w = e.get("weight", 1) * (1 + e.get("risk_score", 0))
        adj[f].append((t, w))

    dist = {n: float("inf") for n in all_nodes}
    prev: dict[str, str | None] = {}
    dist[from_id] = 0
    visited: set[str] = set()
    # heapq priority queue: (cost, node)
    heap = [(0.0, from_id)]

    while heap:
        cost, node = heapq.heappop(heap)
        if node in visited:
            continue
        if node == to_id:
            break  # Early exit when target reached
        visited.add(node)
        for neighbor, weight in adj[node]:
            nc = cost + weight
            if nc < dist.get(neighbor, float("inf")):
                dist[neighbor] = nc
                prev[neighbor] = node
                heapq.heappush(heap, (nc, neighbor))

    # Path reconstruction: append + reverse (O(n) vs insert(0) O(n²))
    path = []
    cur: str | None = to_id
    while cur and cur != from_id:
        path.append(cur)
        cur = prev.get(cur)
    if cur == from_id:
        path.append(from_id)
    path.reverse()

    return {
        "path": path,
        "cost": round(dist.get(to_id, 0), 2),
        "optimized": len(path) > 0 and dist.get(to_id, float("inf")) != float("inf"),
        "hops": len(path) - 1,
    }


def score_partner_risk(partner: dict, alerts: list[dict], shipments: list[dict], violations: list[dict]) -> dict:
    """Composite multi-factor partner risk score."""
    score = 50
    kyc = partner.get("kyc_status")
    if kyc == "verified":
        score += 20
    elif kyc == "pending":
        score += 5
    ac = len(alerts or [])
    score -= min(30, ac * 5)

    completed = [s for s in (shipments or []) if s.get("status") == "delivered"]
    on_time = [s for s in completed if not s.get("actual_delivery") or not s.get("estimated_delivery") or s["actual_delivery"] <= s["estimated_delivery"]]
    rel = len(on_time) / len(completed) if completed else 0.5
    score += round(rel * 15)
    score -= min(20, len(violations or []) * 10)

    if partner.get("created_at"):
        try:
            created = datetime.fromisoformat(str(partner["created_at"]).replace("Z", "+00:00"))
            months = (datetime.now(timezone.utc) - created).days / 30
            score += min(10, int(months))
        except Exception:
            pass

    score = max(0, min(100, score))
    return {
        "score": score,
        "grade": "A" if score >= 80 else ("B" if score >= 60 else ("C" if score >= 40 else "D")),
        "risk_level": "low" if score >= 80 else ("medium" if score >= 60 else ("high" if score >= 40 else "critical")),
        "factors": {"kyc": kyc, "alert_count": ac, "delivery_reliability": f"{round(rel * 100)}%", "sla_violations": len(violations or []), "overall": score},
    }


def page_rank(nodes: list[dict], edges: list[dict], iterations: int = 20, damping: float = 0.85) -> dict[str, float]:
    """PageRank-style graph analysis (optimized: swap refs instead of new dict per iter)."""
    n = len(nodes)
    if n == 0:
        return {}
    ids = [nd.get("id") for nd in nodes]
    ranks = {nid: 1 / n for nid in ids}
    outgoing: dict[str, list[str]] = {nid: [] for nid in ids}
    incoming: dict[str, list[str]] = {nid: [] for nid in ids}
    # Pre-compute outgoing counts for denominator
    out_count: dict[str, int] = {nid: 0 for nid in ids}

    for e in edges:
        f, t = e.get("from_node_id"), e.get("to_node_id")
        if f in outgoing:
            outgoing[f].append(t)
            out_count[f] += 1
        if t in incoming:
            incoming[t].append(f)

    new_ranks = {nid: 0.0 for nid in ids}
    base = (1 - damping) / n

    for _ in range(iterations):
        for nid in ids:
            ir = sum(ranks[fid] / max(out_count[fid], 1) for fid in incoming[nid])
            new_ranks[nid] = base + damping * ir
        ranks, new_ranks = new_ranks, ranks  # Swap refs — zero allocation
    return ranks


def detect_toxic_nodes(nodes: list[dict], edges: list[dict], alerts: list[dict]) -> list[dict]:
    """Detect toxic suppliers using PageRank + centrality + risk."""
    ranks = page_rank(nodes, edges)
    in_d: Counter = Counter()
    out_d: Counter = Counter()
    for e in edges:
        f, t = e.get("from_node_id"), e.get("to_node_id")
        if t:
            in_d[t] += 1
        if f:
            out_d[f] += 1

    alert_map: Counter = Counter()
    for a in (alerts or []):
        k = a.get("partner_id") or a.get("product_id")
        if k:
            alert_map[k] += 1

    n = max(len(nodes) - 1, 1)
    result = []
    for nd in nodes:
        nid = nd.get("id")
        cent = (in_d[nid] + out_d[nid]) / n
        ac = alert_map[nid]
        tox = cent * 0.3 + (ac / 10) * 0.4 + (1 - nd.get("trust_score", 50) / 100) * 0.3
        result.append({
            "id": nid, "name": nd.get("name"), "type": nd.get("type"),
            "pagerank": round(ranks.get(nid, 0), 4), "centrality": round(cent, 2),
            "in_degree": in_d[nid], "out_degree": out_d[nid],
            "alert_count": ac, "trust_score": nd.get("trust_score", 50),
            "toxicity_score": round(tox, 2), "is_toxic": tox > 0.5,
            "risk_level": "critical" if tox > 0.7 else ("high" if tox > 0.5 else ("medium" if tox > 0.3 else "low")),
        })
    result.sort(key=lambda x: x["toxicity_score"], reverse=True)
    return result
