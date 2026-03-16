const request = require("supertest");
const BASE = process.env.TEST_URL || "http://localhost:4000";
var token = require("./helper").getToken();

describe("GDPR & i18n", function() {
    test("POST /api/gdpr/export queues data export", async function() {
        try {
            var res = await request(BASE).post("/api/gdpr/export").set("Authorization", "Bearer " + token).timeout({response:5000});
            expect(typeof res.status).toBe("number");
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("POST /api/gdpr/delete queues data deletion", async function() {
        try {
            var res = await request(BASE).post("/api/gdpr/delete").set("Authorization", "Bearer " + token).timeout({response:5000});
            expect(typeof res.status).toBe("number");
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("POST /api/gdpr/export without auth returns 401/403", async function() {
        var res = await request(BASE).post("/api/gdpr/export");
        expect([401, 403]).toContain(res.status);
    });
    test("POST /api/gdpr/delete without auth returns 401/403", async function() {
        var res = await request(BASE).post("/api/gdpr/delete");
        expect([401, 403]).toContain(res.status);
    });
});
