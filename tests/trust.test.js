const request = require("supertest");
const BASE = process.env.TEST_URL || "http://localhost:4000";


var token = require("./helper").getToken();

describe("Trust Score API", function() {
  test("GET /api/trust/dashboard returns valid data", async function() {
    var res = await request(BASE)
      .get("/api/trust/dashboard")
      .set("Authorization", "Bearer " + token);
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });
});
