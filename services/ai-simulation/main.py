"""
TrustChecker AI Simulation Service
FastAPI microservice for CPU-intensive supply chain simulations.

Engines: Monte Carlo, Digital Twin, Holt-Winters, What-If
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Any
import time

from prometheus_fastapi_instrumentator import Instrumentator

from engines import monte_carlo, digital_twin, holt_winters, what_if

app = FastAPI(
    title="TrustChecker AI Simulation",
    version="1.0.0",
    description="CPU-intensive supply chain simulation engines",
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


# ─── Health ───────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "ai-simulation",
        "version": "1.0.0",
        "engines": ["monte_carlo", "digital_twin", "holt_winters", "what_if"],
    }


# ─── Monte Carlo ─────────────────────────────────────────────────
class MonteCarloRequest(BaseModel):
    params: dict[str, Any] = Field(default_factory=dict)
    simulations: int = Field(default=1000, ge=1, le=200000)

@app.post("/monte-carlo/run")
async def run_monte_carlo(req: MonteCarloRequest):
    t0 = time.time()
    result = monte_carlo.run(req.params, req.simulations)
    result["_latency_ms"] = round((time.time() - t0) * 1000)
    return result


# ─── Digital Twin ─────────────────────────────────────────────────
class DigitalTwinBuildRequest(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)

class DigitalTwinKPIRequest(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)

class DigitalTwinAnomalyRequest(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)

class DigitalTwinDisruptionRequest(BaseModel):
    model: dict[str, Any]
    scenario: dict[str, Any]

@app.post("/digital-twin/build")
async def build_twin(req: DigitalTwinBuildRequest):
    return digital_twin.build_model(req.data)

@app.post("/digital-twin/kpis")
async def compute_kpis(req: DigitalTwinKPIRequest):
    return digital_twin.compute_kpis(req.data)

@app.post("/digital-twin/anomalies")
async def detect_anomalies(req: DigitalTwinAnomalyRequest):
    return digital_twin.detect_anomalies(req.data)

@app.post("/digital-twin/simulate")
async def simulate_disruption(req: DigitalTwinDisruptionRequest):
    return digital_twin.simulate_disruption(req.model, req.scenario)


# ─── Holt-Winters ─────────────────────────────────────────────────
class HoltWintersRequest(BaseModel):
    data: list[float]
    season_length: int = 7
    periods_ahead: int = 14
    params: dict[str, float] = Field(default_factory=dict)

@app.post("/holt-winters/forecast")
async def hw_forecast(req: HoltWintersRequest):
    return holt_winters.forecast(req.data, req.season_length, req.periods_ahead, req.params)


# ─── What-If ──────────────────────────────────────────────────────
class WhatIfRequest(BaseModel):
    scenario: dict[str, Any]
    current_state: dict[str, Any] = Field(default_factory=dict)

@app.post("/what-if/simulate")
async def what_if_simulate(req: WhatIfRequest):
    return what_if.simulate(req.scenario, req.current_state)
