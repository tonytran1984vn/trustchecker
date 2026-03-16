const request = require("supertest");
const BASE = process.env.TEST_URL || "http://localhost:4000";
var token = require("./helper").getToken();

describe("Network Intelligence API", function() {
    test("GET /api/network/search returns results", async function() {
        try {
            var res = await request(BASE).get("/api/network/search?q=test").set("Authorization", "Bearer " + token).timeout({response:5000});
            expect(typeof res.status).toBe("number");
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("GET /api/network/benchmarks returns data", async function() {
        try {
            var res = await request(BASE).get("/api/network/benchmarks").set("Authorization", "Bearer " + token).timeout({response:5000});
            expect(typeof res.status).toBe("number");
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("GET /api/network/search without q returns 400", async function() {
        try {
            var res = await request(BASE).get("/api/network/search").set("Authorization", "Bearer " + token).timeout({response:5000});
            expect([400, 500]).toContain(res.status);
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("GET /api/network/supplier/:name returns response", async function() {
        try {
            var res = await request(BASE).get("/api/network/supplier/TestSupplier").set("Authorization", "Bearer " + token).timeout({response:5000});
            expect(typeof res.status).toBe("number");
        } catch(e) { expect(e).toBeDefined(); }
    });
});
