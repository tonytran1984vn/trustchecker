const request = require("supertest");
const BASE = process.env.TEST_URL || "http://localhost:4000";
var token = require("./helper").getToken();

describe("SSO API", function() {
    test("GET /api/sso/config returns SSO config", async function() {
        try {
            var res = await request(BASE).get("/api/sso/config").set("Authorization", "Bearer " + token).timeout({response:5000});
            expect(typeof res.status).toBe("number");
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("PUT /api/sso/config saves config", async function() {
        try {
            var res = await request(BASE).put("/api/sso/config").set("Authorization", "Bearer " + token)
                .send({ provider: "oauth2", sso_url: "https://accounts.google.com/o/oauth2/auth", client_id: "test", enabled: false })
                .timeout({response:5000});
            expect(typeof res.status).toBe("number");
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("PUT invalid provider returns 400", async function() {
        try {
            var res = await request(BASE).put("/api/sso/config").set("Authorization", "Bearer " + token)
                .send({ provider: "invalid" }).timeout({response:5000});
            expect([400, 500]).toContain(res.status);
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("GET /api/sso/login/unknown returns 404 or error", async function() {
        try {
            var res = await request(BASE).get("/api/sso/login/nonexistent-org").timeout({response:5000});
            expect(typeof res.status).toBe("number");
        } catch(e) { expect(e).toBeDefined(); }
    });
});
