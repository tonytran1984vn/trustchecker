const request = require("supertest");
const BASE = process.env.TEST_URL || "http://localhost:4000";


var token = require("./helper").getToken();

describe("Incident State Machine", function() {
  test("Cannot close incident directly from open status", async function() {
    var createRes = await request(BASE)
      .post("/api/ops/data/incidents")
      .set("Authorization", "Bearer " + token)
      .send({ title: "Test Incident", severity: "low", module: "test" });

    if (createRes.status >= 200 && createRes.status < 500 && createRes.body.id) {
      var closeRes = await request(BASE)
        .patch("/api/ops/data/incidents/" + createRes.body.id)
        .set("Authorization", "Bearer " + token)
        .send({ status: "closed", resolution: "Test close" });
      expect(closeRes.status).toBe(400);
    }
  });
});
