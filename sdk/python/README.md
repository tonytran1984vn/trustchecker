# TrustChecker Python SDK

## Installation
```bash
pip install trustchecker  # or: pip install -e sdk/python/
```

## Quick Start
```python
from trustchecker import TrustCheckerClient

client = TrustCheckerClient("https://tonytran.work")
client.login("user@example.com", "password")

# Get trust dashboard
dashboard = client.get_trust_dashboard()
print(f"Trust Score: {dashboard.overall_score}")

# Search supplier network intelligence
suppliers = client.search_suppliers("Vietnam")
for s in suppliers:
    print(f"{s.supplier_name}: {s.network_score}")

# Record & validate predictions
vid = client.record_prediction("supplier", "sup-123", 0.85, "low")
client.validate_prediction(vid, "no_incident")
metrics = client.get_accuracy_metrics()
```
