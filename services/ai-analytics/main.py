"""
TrustChecker AI Analytics Service
FastAPI microservice for batch analytics: Carbon/ESG, SCM AI, Demand Sensing.
"""

from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Any

from prometheus_fastapi_instrumentator import Instrumentator

from engines import carbon, scm_ai, demand_sensing

app = FastAPI(
    title="TrustChecker AI Analytics",
    version="1.0.0",
    description="Batch supply chain analytics, carbon, and demand sensing engines",
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "ai-analytics",
        "version": "1.0.0",
        "engines": ["carbon", "scm_ai", "demand_sensing"],
    }


# ─── Carbon / ESG ────────────────────────────────────────────
class FootprintRequest(BaseModel):
    product: dict[str, Any]
    shipments: list[dict[str, Any]] = []
    events: list[dict[str, Any]] = []

class AggregateRequest(BaseModel):
    products: list[dict[str, Any]]
    shipments: list[dict[str, Any]] = []
    events: list[dict[str, Any]] = []

class LeaderboardRequest(BaseModel):
    partners: list[dict[str, Any]]
    shipments: list[dict[str, Any]] = []
    violations: list[dict[str, Any]] = []

class GRIRequest(BaseModel):
    data: dict[str, Any]

@app.post("/carbon/footprint")
async def footprint(req: FootprintRequest):
    return carbon.calculate_footprint(req.product, req.shipments, req.events)

@app.post("/carbon/aggregate")
async def aggregate(req: AggregateRequest):
    return carbon.aggregate_by_scope(req.products, req.shipments, req.events)

@app.post("/carbon/leaderboard")
async def leaderboard(req: LeaderboardRequest):
    return carbon.partner_leaderboard(req.partners, req.shipments, req.violations)

@app.post("/carbon/gri-report")
async def gri_report(req: GRIRequest):
    return carbon.generate_gri_report(req.data)


# ─── SCM AI ──────────────────────────────────────────────────
class DelayRequest(BaseModel):
    shipments: list[dict[str, Any]]

class InventoryRequest(BaseModel):
    history: list[dict[str, Any]]
    periods_ahead: int = 7

class BottleneckRequest(BaseModel):
    events: list[dict[str, Any]]
    partners: list[dict[str, Any]] = []

class RouteRequest(BaseModel):
    graph: list[dict[str, Any]]
    from_id: str
    to_id: str

class PartnerRiskRequest(BaseModel):
    partner: dict[str, Any]
    alerts: list[dict[str, Any]] = []
    shipments: list[dict[str, Any]] = []
    violations: list[dict[str, Any]] = []

class PageRankRequest(BaseModel):
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    iterations: int = 20
    damping: float = 0.85

class ToxicNodesRequest(BaseModel):
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    alerts: list[dict[str, Any]] = []

@app.post("/scm/predict-delay")
async def predict_delay(req: DelayRequest):
    return scm_ai.predict_delay(req.shipments)

@app.post("/scm/forecast-inventory")
async def forecast_inventory(req: InventoryRequest):
    return scm_ai.forecast_inventory(req.history, req.periods_ahead)

@app.post("/scm/bottlenecks")
async def bottlenecks(req: BottleneckRequest):
    return scm_ai.detect_bottlenecks(req.events, req.partners)

@app.post("/scm/optimize-route")
async def optimize_route(req: RouteRequest):
    return scm_ai.optimize_route(req.graph, req.from_id, req.to_id)

@app.post("/scm/partner-risk")
async def partner_risk(req: PartnerRiskRequest):
    return scm_ai.score_partner_risk(req.partner, req.alerts, req.shipments, req.violations)

@app.post("/scm/pagerank")
async def pagerank(req: PageRankRequest):
    return scm_ai.page_rank(req.nodes, req.edges, req.iterations, req.damping)

@app.post("/scm/toxic-nodes")
async def toxic_nodes(req: ToxicNodesRequest):
    return scm_ai.detect_toxic_nodes(req.nodes, req.edges, req.alerts)


# ─── Demand Sensing ──────────────────────────────────────────
class DemandSensingRequest(BaseModel):
    sales_history: list[Any]
    threshold: float = 2.0

@app.post("/demand/detect")
async def demand_detect(req: DemandSensingRequest):
    return demand_sensing.detect(req.sales_history, req.threshold)
