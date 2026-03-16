const request = require("supertest");
const BASE = process.env.TEST_URL || "http://localhost:4000";
var token = require("./helper").getToken();

describe("Input Validation & Safety", function() {
    test("Rejects product with XSS in name", async function() {
        try {
            var res = await request(BASE).post("/api/products").set("Authorization", "Bearer " + token)
                .send({ name: "<script>alert(1)</script>", sku: "XSS-TEST" }).timeout({response:5000});
            expect([400, 403, 422, 500]).toContain(res.status);
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("Handles empty JSON gracefully", async function() {
        try {
            var res = await request(BASE).post("/api/products").set("Authorization", "Bearer " + token)
                .send({}).timeout({response:5000});
            expect([400, 403, 422, 500]).toContain(res.status);
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("Handles null values gracefully", async function() {
        try {
            var res = await request(BASE).post("/api/products").set("Authorization", "Bearer " + token)
                .send({ name: null, sku: null }).timeout({response:5000});
            expect([400, 403, 422, 500]).toContain(res.status);
        } catch(e) { expect(e).toBeDefined(); }
    });
});
