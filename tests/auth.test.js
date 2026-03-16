const request = require("supertest");
const BASE = process.env.TEST_URL || "http://localhost:4000";

describe("Authentication", function() {
    test("POST /api/auth/login with valid credentials returns token", async function() {
        var res = await request(BASE).post("/api/auth/login")
            .send({ email: "owner@tonyisking.com", password: "123qaz12" });
        expect([200, 429]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body.token).toBeDefined();
            expect(res.body.token.length).toBeGreaterThan(50);
        }
    });
    test("POST /api/auth/login with wrong password returns 401", async function() {
        var res = await request(BASE).post("/api/auth/login")
            .send({ email: "owner@tonyisking.com", password: "wrongpass" });
        expect([401, 429]).toContain(res.status);
    });
    test("GET /api/products without token returns 401/403", async function() {
        var res = await request(BASE).get("/api/products");
        expect([401, 403]).toContain(res.status);
    });
});
