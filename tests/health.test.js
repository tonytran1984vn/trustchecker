const request = require("supertest");
const BASE = process.env.TEST_URL || "http://localhost:4000";

describe("Health Check", () => {
  test("GET /healthz returns ok", async () => {
    const res = await request(BASE).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.version).toBeDefined();
  });

  test("GET /healthz/ready returns ready", async () => {
    const res = await request(BASE).get("/healthz/ready");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready");
    expect(res.body.checks.db).toBe(true);
  });
});
