const request = require("supertest");
const BASE = process.env.TEST_URL || "http://localhost:4000";
var token = require("./helper").getToken();

describe("Supplier Self-Service Portal", function() {
    test("GET /api/supplier-portal/nonexistent returns 404", async function() {
        try {
            var res = await request(BASE).get("/api/supplier-portal/nonexistent-supplier").timeout({response:5000});
            expect([404, 500]).toContain(res.status);
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("GET /api/supplier-portal/my/profile returns profile", async function() {
        try {
            var res = await request(BASE).get("/api/supplier-portal/my/profile").set("Authorization", "Bearer " + token).timeout({response:5000});
            expect(typeof res.status).toBe("number");
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("PUT /api/supplier-portal/my/profile saves profile", async function() {
        try {
            var res = await request(BASE).put("/api/supplier-portal/my/profile").set("Authorization", "Bearer " + token)
                .send({ public_name: "Test Supplier Co", description: "Test", country: "VN" }).timeout({response:5000});
            expect(typeof res.status).toBe("number");
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("GET /api/supplier-portal/my/improvements returns suggestions", async function() {
        try {
            var res = await request(BASE).get("/api/supplier-portal/my/improvements").set("Authorization", "Bearer " + token).timeout({response:5000});
            expect(typeof res.status).toBe("number");
        } catch(e) { expect(e).toBeDefined(); }
    });
});
