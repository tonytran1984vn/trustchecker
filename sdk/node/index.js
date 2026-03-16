/**
 * TrustChecker Node.js SDK v1.0
 * Enterprise API client for supply chain trust intelligence.
 *
 * Usage:
 *   const { TrustCheckerClient } = require("@trustchecker/sdk");
 *   const client = new TrustCheckerClient("https://tonytran.work");
 *   await client.login("user@example.com", "password");
 *   const products = await client.listProducts();
 */
var http = require("http");
var https = require("https");
var url = require("url");

function TrustCheckerClient(baseUrl, token) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token || null;
}

// ── Auth ──
TrustCheckerClient.prototype.login = function(email, password) {
    var self = this;
    return this._request("POST", "/api/auth/login", { email: email, password: password }, false).then(function(data) {
        self.token = data.token;
        return data.token;
    });
};

// ── Products ──
TrustCheckerClient.prototype.listProducts = function() {
    return this._request("GET", "/api/products");
};

TrustCheckerClient.prototype.createProduct = function(product) {
    return this._request("POST", "/api/products", product);
};

// ── Trust ──
TrustCheckerClient.prototype.getTrustDashboard = function() {
    return this._request("GET", "/api/trust/dashboard");
};

// ── Network Intelligence ──
TrustCheckerClient.prototype.searchSuppliers = function(query, limit) {
    return this._request("GET", "/api/network/search?q=" + encodeURIComponent(query) + "&limit=" + (limit || 20));
};

TrustCheckerClient.prototype.getSupplierIntelligence = function(name) {
    return this._request("GET", "/api/network/supplier/" + encodeURIComponent(name));
};

TrustCheckerClient.prototype.getBenchmarks = function() {
    return this._request("GET", "/api/network/benchmarks");
};

// ── Score Validation ──
TrustCheckerClient.prototype.recordPrediction = function(entityType, entityId, score, riskLevel) {
    return this._request("POST", "/api/score-validation/record", {
        entity_type: entityType, entity_id: entityId,
        predicted_score: score, risk_level: riskLevel || ""
    });
};

TrustCheckerClient.prototype.validatePrediction = function(validationId, outcome) {
    return this._request("POST", "/api/score-validation/" + validationId + "/validate", { actual_outcome: outcome });
};

TrustCheckerClient.prototype.getAccuracyMetrics = function() {
    return this._request("GET", "/api/score-validation/metrics");
};

// ── SSO ──
TrustCheckerClient.prototype.getSSOConfig = function() {
    return this._request("GET", "/api/sso/config");
};

TrustCheckerClient.prototype.configureSSO = function(config) {
    return this._request("PUT", "/api/sso/config", config);
};

// ── Compliance ──
TrustCheckerClient.prototype.getComplianceSummary = function() {
    return this._request("GET", "/api/compliance-regtech/summary");
};

// ── Health ──
TrustCheckerClient.prototype.healthz = function() {
    return this._request("GET", "/healthz", null, false);
};

// ── Internal ──
TrustCheckerClient.prototype._request = function(method, path, body, auth) {
    var self = this;
    if (auth === undefined) auth = true;
    var parsed = new URL(self.baseUrl + path);
    var isHttps = parsed.protocol === "https:";
    var options = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: method,
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        timeout: 30000
    };
    if (auth && self.token) {
        options.headers["Authorization"] = "Bearer " + self.token;
    }

    return new Promise(function(resolve, reject) {
        var mod = isHttps ? https : http;
        var req = mod.request(options, function(res) {
            var chunks = [];
            res.on("data", function(c) { chunks.push(c); });
            res.on("end", function() {
                var raw = Buffer.concat(chunks).toString();
                try {
                    var data = JSON.parse(raw);
                    if (res.statusCode >= 400) {
                        var err = new Error(data.error || "API Error " + res.statusCode);
                        err.statusCode = res.statusCode;
                        err.body = data;
                        reject(err);
                    } else {
                        resolve(data);
                    }
                } catch(e) {
                    reject(new Error("Invalid JSON: " + raw.substring(0, 200)));
                }
            });
        });
        req.on("error", reject);
        req.on("timeout", function() { req.destroy(); reject(new Error("Request timeout")); });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

module.exports = { TrustCheckerClient: TrustCheckerClient };
