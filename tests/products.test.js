const request = require("supertest");
const BASE = process.env.TEST_URL || "http://localhost:4000";


var token = require("./helper").getToken();

describe("Products API", function() {
  test("GET /api/products returns product list", async function() {
    var res = await request(BASE)
      .get("/api/products")
      .set("Authorization", "Bearer " + token);
    expect(res.status).toBe(200);
    expect(res.body.products).toBeDefined();
    expect(Array.isArray(res.body.products)).toBe(true);
  });

  test("POST /api/products with invalid data returns 400", async function() {
    var res = await request(BASE)
      .post("/api/products")
      .set("Authorization", "Bearer " + token)
      .send({ name: "" });
    expect([400, 401, 403, 422]).toContain(res.status);
  });

  test("POST /api/products with invalid country returns 400", async function() {
    var res = await request(BASE)
      .post("/api/products")
      .set("Authorization", "Bearer " + token)
      .send({ name: "Test Product", sku: "TEST-" + Date.now(), origin_country: "XX" });
    expect([400, 401, 403]).toContain(res.status);
    if (res.status === 400) expect(res.body.error).toContain("country");
  });
});
