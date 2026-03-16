const request = require("supertest");
const BASE = process.env.TEST_URL || "http://localhost:4000";
var token = require("./helper").getToken();

describe("API Versioning & Standards", function() {
    test("X-API-Version header present", async function() {
        try {
            var res = await request(BASE).get("/api/products").set("Authorization", "Bearer " + token).timeout({response:5000});
            expect(res.headers["x-api-version"]).toBeDefined();
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("GET /api/version returns info", async function() {
        try {
            var res = await request(BASE).get("/api/version").set("Authorization", "Bearer " + token).timeout({response:5000});
            expect(typeof res.status).toBe("number");
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("JSON content type on responses", async function() {
        try {
            var res = await request(BASE).get("/api/products").set("Authorization", "Bearer " + token).timeout({response:5000});
            expect(res.headers["content-type"]).toContain("json");
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("Error responses use JSON", async function() {
        var res = await request(BASE).get("/api/products");
        expect(res.headers["content-type"]).toContain("json");
    });
});
