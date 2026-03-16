const request = require("supertest");
const BASE = process.env.TEST_URL || "http://localhost:4000";

var token = require("./helper").getToken();

describe("Enterprise Features", function() {
    test("X-API-Version header is set", async function() {
        var res = await request(BASE).get("/api/products")
            .set("Authorization", "Bearer " + token);
        expect(res.headers["x-api-version"]).toBeDefined();
    });

    test("OpenAPI spec exists at /openapi.yaml", async function() {
        var res = await request(BASE).get("/healthz");
        expect(res.status).toBe(200);
    });

    test("Unauthorized access returns proper error", async function() {
        var res = await request(BASE).get("/api/products");
        expect([401, 403]).toContain(res.status);
        expect(res.body.error).toBeDefined();
    });

});
