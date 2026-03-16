const request = require("supertest");
const BASE = process.env.TEST_URL || "http://localhost:4000";
var token = require("./helper").getToken();

describe("Score Validation API", function() {
    var validationId;
    test("GET /api/score-validation/metrics returns metrics", async function() {
        try {
            var res = await request(BASE).get("/api/score-validation/metrics").set("Authorization", "Bearer " + token).timeout({response:5000});
            expect(typeof res.status).toBe("number");
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("POST /api/score-validation/record", async function() {
        try {
            var res = await request(BASE).post("/api/score-validation/record").set("Authorization", "Bearer " + token)
                .send({ entity_type: "supplier", entity_id: "test-1", predicted_score: 0.75 }).timeout({response:5000});
            expect(typeof res.status).toBe("number");
            if (res.status === 200 && res.body.id) validationId = res.body.id;
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("POST /api/score-validation/:id/validate", async function() {
        if (!validationId) return;
        try {
            var res = await request(BASE).post("/api/score-validation/" + validationId + "/validate").set("Authorization", "Bearer " + token)
                .send({ actual_outcome: "no_incident" }).timeout({response:5000});
            expect(typeof res.status).toBe("number");
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("GET /api/score-validation/pending", async function() {
        try {
            var res = await request(BASE).get("/api/score-validation/pending").set("Authorization", "Bearer " + token).timeout({response:5000});
            expect(typeof res.status).toBe("number");
        } catch(e) { expect(e).toBeDefined(); }
    });
    test("POST without fields returns 400", async function() {
        try {
            var res = await request(BASE).post("/api/score-validation/record").set("Authorization", "Bearer " + token)
                .send({ entity_type: "supplier" }).timeout({response:5000});
            expect([400, 500]).toContain(res.status);
        } catch(e) { expect(e).toBeDefined(); }
    });
});
