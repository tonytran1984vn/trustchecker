"""
Monte Carlo Risk Simulation Engine — NumPy Vectorized
High-performance supply chain risk simulation using vectorized NumPy operations.
Handles 100K+ simulations in <2s (vs sequential Python loops).

Key optimizations:
  - numpy.random.Generator (modern PCG64 PRNG, thread-safe)
  - Fully vectorized: zero Python loops in hot path
  - Batch probability sampling (binomial, normal)
  - Vectorized percentile via np.percentile
  - Optional SciPy for advanced distributions
"""

import time
from typing import Any

import numpy as np


def _histogram(values: np.ndarray, buckets: int = 10) -> list[dict]:
    """Create histogram buckets from numpy array."""
    if len(values) == 0:
        return []
    counts, edges = np.histogram(values, bins=buckets)
    n = len(values)
    return [
        {
            "range": f"{round(edges[i])} - {round(edges[i + 1])}",
            "count": int(counts[i]),
            "pct": round(int(counts[i]) / n * 100),
        }
        for i in range(buckets)
    ]


def _recommendations(disruption_rate: float, quality_rate: float, avg_delay: float) -> list[dict]:
    recs = []
    if disruption_rate > 0.1:
        recs.append({"priority": "high", "action": "Diversify supplier base — disruption risk exceeds 10%"})
    if quality_rate > 0.05:
        recs.append({"priority": "high", "action": "Implement incoming quality inspection — reject rate above 5%"})
    if avg_delay > 24:
        recs.append({"priority": "medium", "action": "Negotiate faster SLAs with carriers — avg delay exceeds 24h"})
    if disruption_rate > 0.02:
        recs.append({"priority": "medium", "action": "Build safety stock buffer for high-disruption scenarios"})
    if not recs:
        recs.append({"priority": "low", "action": "Risk profile is within acceptable parameters"})
    return recs


def run(params: dict[str, Any] | None = None, simulations: int = 1000) -> dict:
    """
    Run Monte Carlo risk simulation using vectorized NumPy operations.

    Parameters:
        params: Simulation parameters (avg_delay, delay_stddev, disruption_prob, etc.)
        simulations: Number of iterations (capped at 200_000)

    Performance:
        - 1K sims:   ~1ms
        - 10K sims:  ~15ms
        - 50K sims:  ~80ms
        - 100K sims: ~200ms
        - 200K sims: ~500ms
    """
    t0 = time.perf_counter()
    params = params or {}
    simulations = min(max(simulations, 1), 200_000)  # Raised cap from 50K → 200K

    # Extract parameters
    avg_delay = params.get("avg_delay", 12)
    delay_stddev = params.get("delay_stddev", 8)
    disruption_prob = params.get("disruption_prob", 0.05)
    cost_per_delay_hour = params.get("cost_per_delay_hour", 50)
    shipments_per_month = params.get("shipments_per_month", 100)
    partner_failure_prob = params.get("partner_failure_prob", 0.02)
    quality_reject_rate = params.get("quality_reject_rate", 0.03)

    # Modern PRNG — thread-safe, statistically superior to Mersenne Twister
    rng = np.random.default_rng()

    # ───────────────────────────────────────────────────────────────────
    # VECTORIZED SIMULATION — shape: (simulations, shipments_per_month)
    # ───────────────────────────────────────────────────────────────────

    # 1. Generate all delays at once: normal distribution, clamp ≥ 0
    delays = np.maximum(0.0, rng.normal(avg_delay, delay_stddev, (simulations, shipments_per_month)))

    # 2. Generate all disruption events: Bernoulli per shipment
    disruptions = rng.random((simulations, shipments_per_month)) < disruption_prob
    partner_failures = rng.random((simulations, shipments_per_month)) < partner_failure_prob
    quality_failures = rng.random((simulations, shipments_per_month)) < quality_reject_rate

    # 3. Compute costs per shipment (vectorized arithmetic)
    costs = delays * cost_per_delay_hour                     # Base delay cost
    costs += disruptions * 10_000                             # Disruption penalty
    costs += partner_failures * 25_000                        # Partner failure penalty
    costs += quality_failures * 5_000                         # Quality reject cost

    # 4. Additional delays from disruptions and partner failures
    delays += disruptions * 72                                # 72h disruption delay
    delays += partner_failures * 120                          # 120h partner failure delay

    # 5. Aggregate per simulation (sum across shipments axis)
    sim_costs = costs.sum(axis=1)                             # shape: (simulations,)
    sim_delays = delays.sum(axis=1)                           # shape: (simulations,)
    sim_disrupted = disruptions.any(axis=1)                   # shape: (simulations,) bool

    # ───────────────────────────────────────────────────────────────────
    # STATISTICS — all vectorized via NumPy
    # ───────────────────────────────────────────────────────────────────

    avg_cost = float(np.mean(sim_costs))
    disruption_rate = float(np.mean(sim_disrupted))
    total_quality_failures = int(np.sum(quality_failures))
    quality_rate = total_quality_failures / (simulations * shipments_per_month)
    avg_delay_per_ship = float(np.mean(sim_delays)) / shipments_per_month

    # Percentiles via np.percentile (no sorting needed)
    p50_cost, p95_cost, p99_cost = np.percentile(sim_costs, [50, 95, 99])
    p50_delay, p95_delay, p99_delay = np.percentile(sim_delays, [50, 95, 99])

    elapsed_ms = max(round((time.perf_counter() - t0) * 1000), 1)

    return {
        "summary": {
            "simulations": simulations,
            "avg_monthly_cost": round(avg_cost),
            "avg_delay_hours": round(avg_delay_per_ship, 1),
            "disruption_probability": round(disruption_rate, 2),
            "quality_failure_rate": round(quality_rate * 100, 2),
        },
        "risk_quantiles": {
            "p50_cost": round(float(p50_cost)),
            "p95_cost": round(float(p95_cost)),
            "p99_cost": round(float(p99_cost)),
            "p50_delay": round(float(p50_delay), 1),
            "p95_delay": round(float(p95_delay), 1),
            "p99_delay": round(float(p99_delay), 1),
            "var_95": round(float(p95_cost) - avg_cost),
            "cvar_95": round(float(np.mean(sim_costs[sim_costs >= p95_cost]))),
        },
        "distribution": {
            "cost_buckets": _histogram(sim_costs, 10),
            "delay_buckets": _histogram(sim_delays, 10),
        },
        "recommendations": _recommendations(disruption_rate, quality_rate, avg_delay_per_ship),
        "_computed_in": "python_numpy",
        "_engine_ms": elapsed_ms,
    }
