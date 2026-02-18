"""
TrustChecker AI Detection Service
FastAPI microservice for real-time fraud, anomaly, and risk detection.

Engines: Fraud Detection, Anomaly Detector, Risk Radar
"""

from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Any
import time

from prometheus_fastapi_instrumentator import Instrumentator

from engines import fraud, anomaly, risk_radar

app = FastAPI(
    title="TrustChecker AI Detection",
    version="1.0.0",
    description="Real-time fraud, anomaly, and risk detection engines",
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "ai-detection",
        "version": "1.0.0",
        "engines": ["fraud", "anomaly", "risk_radar"],
    }


# ─── Fraud Detection ─────────────────────────────────────────
class FraudAnalyzeRequest(BaseModel):
    scan_event: dict[str, Any]
    context: dict[str, Any] = Field(default_factory=dict)

@app.post("/fraud/analyze")
async def fraud_analyze(req: FraudAnalyzeRequest):
    return fraud.analyze(req.scan_event, req.context)


# ─── Anomaly Detection ───────────────────────────────────────
class AnomalyScanRequest(BaseModel):
    data: dict[str, Any]

class AnomalyVelocityRequest(BaseModel):
    scan_events: list[dict[str, Any]]
    window_minutes: int = 60

class AnomalyFraudSpikesRequest(BaseModel):
    fraud_alerts: list[dict[str, Any]]

class AnomalyTrustDropsRequest(BaseModel):
    trust_scores: list[dict[str, Any]]

class AnomalyGeoRequest(BaseModel):
    scan_events: list[dict[str, Any]]
    window_hours: int = 1

@app.post("/anomaly/full-scan")
async def anomaly_full_scan(req: AnomalyScanRequest):
    return anomaly.run_full_scan(req.data)

@app.post("/anomaly/scan-velocity")
async def anomaly_scan_velocity(req: AnomalyVelocityRequest):
    return anomaly.detect_scan_velocity(req.scan_events, req.window_minutes)

@app.post("/anomaly/fraud-spikes")
async def anomaly_fraud_spikes(req: AnomalyFraudSpikesRequest):
    return anomaly.detect_fraud_spikes(req.fraud_alerts)

@app.post("/anomaly/trust-drops")
async def anomaly_trust_drops(req: AnomalyTrustDropsRequest):
    return anomaly.detect_trust_drops(req.trust_scores)

@app.post("/anomaly/geo-dispersion")
async def anomaly_geo(req: AnomalyGeoRequest):
    return anomaly.detect_geo_dispersion(req.scan_events, req.window_hours)


# ─── Risk Radar ──────────────────────────────────────────────
class RiskRadarRequest(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)

class RiskHeatmapRequest(BaseModel):
    partners: list[dict[str, Any]] = []
    shipments: list[dict[str, Any]] = []
    leaks: list[dict[str, Any]] = []

@app.post("/risk-radar/compute")
async def radar_compute(req: RiskRadarRequest):
    return risk_radar.compute_radar(req.data)

@app.post("/risk-radar/heatmap")
async def radar_heatmap(req: RiskHeatmapRequest):
    return risk_radar.generate_heatmap(req.partners, req.shipments, req.leaks)
