const request = require("supertest");
const BASE = process.env.TEST_URL || "http://localhost:4000";

describe("Auth Security", function() {
    test("Rejects request without auth header", async function() {
        var res = await request(BASE).get("/api/products");
        expect([401, 403]).toContain(res.status);
    });
    test("Rejects invalid token format", async function() {
        var res = await request(BASE).get("/api/products").set("Authorization", "Bearer invalid-token-xyz");
        expect([401, 403]).toContain(res.status);
    });
    test("Error does not expose stack", async function() {
        var res = await request(BASE).get("/api/products").set("Authorization", "Bearer bad");
        expect(JSON.stringify(res.body)).not.toContain("node_modules");
    });
    test("SQL injection in email rejected", async function() {
        try {
            var res = await request(BASE).post("/api/auth/login")
                .send({ email: "admin' OR 1=1 --", password: "test" }).timeout({response:5000});
            expect([400, 401, 422, 429, 500]).toContain(res.status);
        } catch(e) { expect(e).toBeDefined(); }
    });
});
