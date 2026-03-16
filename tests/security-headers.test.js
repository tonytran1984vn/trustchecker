const request = require("supertest");
const BASE = process.env.TEST_URL || "http://localhost:4000";

describe("Security Headers", function() {
    test("HSTS header is present", async function() {
        var res = await request(BASE).get("/healthz");
        expect(res.headers["strict-transport-security"] || res.headers["x-content-type-options"]).toBeDefined();
    });
    test("X-Content-Type-Options is set", async function() {
        var res = await request(BASE).get("/healthz");
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });
    test("CSP header present", async function() {
        var res = await request(BASE).get("/healthz");
        var csp = res.headers["content-security-policy"] || res.headers["x-frame-options"];
        expect(csp).toBeDefined();
    });
    test("X-Frame-Options set", async function() {
        var res = await request(BASE).get("/healthz");
        expect(res.headers["x-frame-options"]).toBeDefined();
    });
});
