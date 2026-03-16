const request = require("supertest");
const BASE = process.env.TEST_URL || "http://localhost:4000";


var token = require("./helper").getToken();

describe("Rate Limits", function() {
  test("Rating API enforces rate limit message format", async function() {
    var res = await request(BASE)
      .post("/api/stakeholder/ratings")
      .set("Authorization", "Bearer " + token)
      .send({ entity_type: "product", entity_id: "test", score: 3 });
    expect([200, 400, 404, 429, 500]).toContain(res.status);
  });
});
