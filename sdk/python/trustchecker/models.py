"""Data models for TrustChecker SDK"""
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime


@dataclass
class Product:
    id: str
    name: str
    sku: Optional[str] = None
    origin_country: Optional[str] = None
    trust_score: Optional[float] = None
    created_at: Optional[str] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Product":
        return cls(id=d.get("id", ""), name=d.get("name", ""), sku=d.get("sku"),
                   origin_country=d.get("origin_country"), trust_score=d.get("trust_score"),
                   created_at=d.get("created_at"))


@dataclass
class TrustScore:
    overall_score: float
    risk_level: str
    factors: Dict[str, Any] = field(default_factory=dict)
    last_updated: Optional[str] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "TrustScore":
        return cls(overall_score=d.get("trust_score", d.get("overall_score", 0)),
                   risk_level=d.get("risk_level", "unknown"),
                   factors=d.get("factors", {}), last_updated=d.get("last_updated"))


@dataclass
class Supplier:
    supplier_name: str
    country: Optional[str] = None
    network_score: float = 0.0
    evaluating_orgs: int = 0
    score_confidence: str = "insufficient"

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Supplier":
        return cls(supplier_name=d.get("supplier_name", ""), country=d.get("country"),
                   network_score=d.get("network_score", 0), evaluating_orgs=d.get("evaluating_organizations", d.get("evaluating_orgs", 0)),
                   score_confidence=d.get("score_confidence", "insufficient"))


@dataclass
class ScoreValidation:
    id: str
    entity_type: str
    predicted_score: float
    actual_outcome: Optional[str] = None
    accuracy_delta: Optional[float] = None
    validation_status: str = "pending"

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ScoreValidation":
        return cls(id=d.get("id", ""), entity_type=d.get("entity_type", ""),
                   predicted_score=d.get("predicted_score", 0), actual_outcome=d.get("actual_outcome"),
                   accuracy_delta=d.get("accuracy_delta"), validation_status=d.get("validation_status", "pending"))
