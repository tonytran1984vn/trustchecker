"""TrustChecker API Client"""
import json
import urllib.request
import urllib.error
from typing import Optional, List, Dict, Any
from .models import Product, TrustScore, Supplier, ScoreValidation


class TrustCheckerError(Exception):
    def __init__(self, message: str, status_code: int = 0):
        self.status_code = status_code
        super().__init__(message)


class TrustCheckerClient:
    """
    TrustChecker Enterprise API Client.
    
    Usage:
        client = TrustCheckerClient("https://tonytran.work")
        client.login("user@example.com", "password")
        products = client.list_products()
        dashboard = client.get_trust_dashboard()
    """
    
    def __init__(self, base_url: str, token: Optional[str] = None):
        self.base_url = base_url.rstrip("/")
        self.token = token
    
    def login(self, email: str, password: str) -> str:
        """Authenticate and store JWT token."""
        data = self._request("POST", "/api/auth/login", {"email": email, "password": password}, auth=False)
        self.token = data.get("token", "")
        return self.token
    
    # ── Products ──────────────────────────────────
    def list_products(self) -> List[Product]:
        data = self._request("GET", "/api/products")
        return [Product.from_dict(p) for p in data.get("products", data if isinstance(data, list) else [])]
    
    def create_product(self, name: str, sku: str, origin_country: str = "", **kwargs) -> Dict:
        body = {"name": name, "sku": sku, "origin_country": origin_country, **kwargs}
        return self._request("POST", "/api/products", body)
    
    # ── Trust ─────────────────────────────────────
    def get_trust_dashboard(self) -> TrustScore:
        data = self._request("GET", "/api/trust/dashboard")
        return TrustScore.from_dict(data)
    
    # ── Network Intelligence ──────────────────────
    def search_suppliers(self, query: str, limit: int = 20) -> List[Supplier]:
        data = self._request("GET", f"/api/network/search?q={query}&limit={limit}")
        return [Supplier.from_dict(s) for s in data.get("suppliers", [])]
    
    def get_supplier_intelligence(self, name: str) -> Optional[Supplier]:
        data = self._request("GET", f"/api/network/supplier/{name}")
        intel = data.get("intelligence")
        return Supplier.from_dict(intel) if intel else None
    
    def get_benchmarks(self) -> List[Dict]:
        data = self._request("GET", "/api/network/benchmarks")
        return data.get("benchmarks", [])
    
    # ── Score Validation ──────────────────────────
    def record_prediction(self, entity_type: str, entity_id: str, score: float, risk_level: str = "") -> str:
        data = self._request("POST", "/api/score-validation/record", {
            "entity_type": entity_type, "entity_id": entity_id,
            "predicted_score": score, "risk_level": risk_level
        })
        return data.get("id", "")
    
    def validate_prediction(self, validation_id: str, outcome: str) -> Dict:
        return self._request("POST", f"/api/score-validation/{validation_id}/validate", {"actual_outcome": outcome})
    
    def get_accuracy_metrics(self) -> List[Dict]:
        data = self._request("GET", "/api/score-validation/metrics")
        return data.get("metrics", [])
    
    # ── SSO ────────────────────────────────────────
    def get_sso_config(self) -> Optional[Dict]:
        data = self._request("GET", "/api/sso/config")
        return data.get("config")
    
    def configure_sso(self, provider: str, **kwargs) -> Dict:
        return self._request("PUT", "/api/sso/config", {"provider": provider, **kwargs})
    
    # ── Compliance ────────────────────────────────
    def get_compliance_summary(self) -> Dict:
        return self._request("GET", "/api/compliance-regtech/summary")
    
    def get_gdpr_status(self) -> Dict:
        return self._request("GET", "/api/compliance-gdpr/status")
    
    # ── Health ────────────────────────────────────
    def healthz(self) -> Dict:
        return self._request("GET", "/healthz", auth=False)
    
    # ── Internal ──────────────────────────────────
    def _request(self, method: str, path: str, body: Optional[Dict] = None, auth: bool = True) -> Dict:
        url = self.base_url + path
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if auth and self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        
        data = json.dumps(body).encode() if body else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            body_text = e.read().decode() if e.fp else ""
            try:
                err = json.loads(body_text)
            except:
                err = {"error": body_text}
            raise TrustCheckerError(err.get("error", str(e)), e.code)
        except urllib.error.URLError as e:
            raise TrustCheckerError(f"Connection error: {e.reason}")
