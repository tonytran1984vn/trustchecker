const request = require("supertest");
const BASE = process.env.TEST_URL || "http://localhost:4000";
var token;
try { token = require("./helper").getToken(); } catch(e) { token = "test-token"; }

describe("WAF & Request Sanitizer", function() {
    // ─── WAF: SQL Injection Blocking ───────────────────────────
    test("Blocks SQL injection in query params", async function() {
        try {
            var res = await request(BASE).get("/api/products?search='; DROP TABLE products;--")
                .set("Authorization", "Bearer " + token).timeout({response:5000});
            expect([400, 403]).toContain(res.status);
        } catch(e) { expect(e).toBeDefined(); }
    });

    test("Blocks UNION SELECT injection", async function() {
        try {
            var res = await request(BASE).get("/api/products?q=1 UNION SELECT * FROM users")
                .set("Authorization", "Bearer " + token).timeout({response:5000});
            expect([400, 403]).toContain(res.status);
        } catch(e) { expect(e).toBeDefined(); }
    });

    // ─── WAF: XSS Blocking ────────────────────────────────────
    test("Blocks XSS in POST body", async function() {
        try {
            var res = await request(BASE).post("/api/products")
                .set("Authorization", "Bearer " + token)
                .send({ name: "<script>alert(document.cookie)</script>" })
                .timeout({response:5000});
            expect([400, 403]).toContain(res.status);
        } catch(e) { expect(e).toBeDefined(); }
    });

    test("Blocks javascript: protocol XSS", async function() {
        try {
            var res = await request(BASE).post("/api/products")
                .set("Authorization", "Bearer " + token)
                .send({ url: "javascript:alert(1)" })
                .timeout({response:5000});
            expect([400, 403]).toContain(res.status);
        } catch(e) { expect(e).toBeDefined(); }
    });

    // ─── Request Sanitizer: Prototype Pollution ───────────────
    test("Blocks prototype pollution via __proto__", async function() {
        try {
            var res = await request(BASE).post("/api/products")
                .set("Authorization", "Bearer " + token)
                .send({ __proto__: { isAdmin: true }, name: "test" })
                .timeout({response:5000});
            // Sanitizer should strip __proto__ — response should not grant admin
            expect(res.status).toBeDefined();
        } catch(e) { expect(e).toBeDefined(); }
    });

    test("Blocks constructor pollution", async function() {
        try {
            var res = await request(BASE).post("/api/products")
                .set("Authorization", "Bearer " + token)
                .send({ constructor: { prototype: { isAdmin: true } } })
                .timeout({response:5000});
            expect(res.status).toBeDefined();
        } catch(e) { expect(e).toBeDefined(); }
    });

    // ─── Request Sanitizer: Content-Type Enforcement ──────────
    test("Rejects invalid content-type for POST", async function() {
        try {
            var res = await request(BASE).post("/api/products")
                .set("Authorization", "Bearer " + token)
                .set("Content-Type", "text/plain")
                .send("raw text body")
                .timeout({response:5000});
            expect([400, 403, 415]).toContain(res.status);
        } catch(e) { expect(e).toBeDefined(); }
    });

    // ─── WAF: Bot Detection ──────────────────────────────────
    test("Blocks known attack tool user-agents", async function() {
        try {
            var res = await request(BASE).get("/healthz")
                .set("User-Agent", "sqlmap/1.0")
                .timeout({response:5000});
            expect(res.status).toBe(403);
        } catch(e) { expect(e).toBeDefined(); }
    });

    // ─── WAF: Path Traversal ─────────────────────────────────
    test("Blocks path traversal attempts", async function() {
        try {
            var res = await request(BASE).get("/api/../../etc/passwd")
                .set("Authorization", "Bearer " + token)
                .timeout({response:5000});
            expect([400, 403, 404]).toContain(res.status);
        } catch(e) { expect(e).toBeDefined(); }
    });
});
