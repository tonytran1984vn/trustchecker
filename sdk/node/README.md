# @trustchecker/sdk

## Install
```bash
npm install @trustchecker/sdk
```

## Usage
```javascript
const { TrustCheckerClient } = require("@trustchecker/sdk");

const client = new TrustCheckerClient("https://tonytran.work");
await client.login("user@example.com", "password");

// Products
const products = await client.listProducts();

// Trust Dashboard
const dashboard = await client.getTrustDashboard();

// Network Intelligence
const suppliers = await client.searchSuppliers("Vietnam");
const intel = await client.getSupplierIntelligence("SupplierName");

// Score Validation
const id = await client.recordPrediction("supplier", "sup-123", 0.85, "low");
await client.validatePrediction(id.id, "no_incident");
const metrics = await client.getAccuracyMetrics();
```
