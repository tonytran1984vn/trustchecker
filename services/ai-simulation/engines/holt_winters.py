"""
Holt-Winters Triple Exponential Smoothing
Seasonal decomposition for demand forecasting.
Ported from server/engines/advanced-scm-ai.js → holtWintersTriple()
"""

import math
from typing import Any


def forecast(
    data: list[float],
    season_length: int = 7,
    periods_ahead: int = 14,
    params: dict[str, float] | None = None,
) -> dict:
    """
    Holt-Winters Triple Exponential Smoothing.

    Args:
        data: Historical numeric values
        season_length: Seasonality period (7 for weekly, 12 for monthly)
        periods_ahead: Number of periods to forecast
        params: Optional {alpha, beta, gamma} smoothing parameters
    """
    params = params or {}
    alpha = params.get("alpha", 0.3)
    beta = params.get("beta", 0.1)
    gamma = params.get("gamma", 0.3)

    if not data or len(data) < season_length * 2:
        return {"forecast": [], "trend": "insufficient_data", "confidence": 0.3}

    n = len(data)

    # Initialize seasonal indices
    num_complete = n // season_length
    seasons = [0.0] * season_length
    for i in range(season_length):
        total = sum(data[j * season_length + i] for j in range(num_complete))
        seasons[i] = total / num_complete

    avg_season = sum(seasons) / season_length
    seasons = [s / avg_season if avg_season > 0 else 1.0 for s in seasons]

    # Initialize level and trend
    level = data[0]
    trend = (data[season_length] - data[0]) / season_length if n > season_length else 0.0
    seasonal = list(seasons)

    # Fitted values
    fitted = []
    for i in range(n):
        s = seasonal[i % season_length]
        prev_level = level

        level = alpha * (data[i] / (s or 1)) + (1 - alpha) * (level + trend)
        trend = beta * (level - prev_level) + (1 - beta) * trend
        seasonal[i % season_length] = gamma * (data[i] / (level or 1)) + (1 - gamma) * s

        fitted.append(max(0.0, (prev_level + trend) * s))

    # Error metrics
    errors = [abs(data[i] - fitted[i]) for i in range(n)]
    mae = sum(errors) / len(errors)
    nonzero = [i for i in range(n) if data[i] > 0]
    mape = (sum(errors[i] / data[i] for i in nonzero) / len(nonzero) * 100) if nonzero else 0.0

    # Forecast
    fc = []
    for i in range(1, periods_ahead + 1):
        s = seasonal[(n + i - 1) % season_length]
        predicted = max(0.0, (level + trend * i) * s)
        ci = mae * 1.96 * math.sqrt(i)
        fc.append({
            "period": i,
            "predicted": round(predicted, 2),
            "lower": max(0.0, round(predicted - ci, 2)),
            "upper": round(predicted + ci, 2),
            "seasonal_factor": round(s, 3),
        })

    trend_dir = "increasing" if trend > 0.5 else ("decreasing" if trend < -0.5 else "stable")
    confidence = max(0.3, min(0.95, 1 - mape / 100))

    return {
        "forecast": fc,
        "trend": trend_dir,
        "trend_value": round(trend, 2),
        "confidence": round(confidence, 2),
        "error_metrics": {"mae": round(mae, 2), "mape": round(mape, 2)},
        "seasonal_pattern": [{"index": i, "factor": round(s, 3)} for i, s in enumerate(seasonal)],
        "data_points": n,
        "season_length": season_length,
    }
