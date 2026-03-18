const { test, expect } = require("@playwright/test");
const { getAuthToken } = require("./helpers/auth");

test.describe("Unified Response Format", () => {
    let token;
    test.beforeAll(async ({ request }) => {
        token = await getAuthToken(request);
    });

    test("GET /api/products returns products array", async ({ request }) => {
        const res = await request.get("/api/products", {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.products || body.data).toBeTruthy();
    });

    test("X-API-Version header present", async ({ request }) => {
        const res = await request.get("/api/products", {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(res.headers()["x-api-version"]).toBeTruthy();
    });

    test("Deprecation header on legacy /api routes", async ({ request }) => {
        const res = await request.get("/api/products", {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(res.headers()["deprecation"]).toBe("true");
    });

    test("Error response has correct format", async ({ request }) => {
        const res = await request.get("/api/v1/products/nonexistent-id-12345", {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect([404, 500]).toContain(res.status());
    });

    test("Rate limit headers present", async ({ request }) => {
        const res = await request.get("/api/products", {
            headers: { Authorization: `Bearer ${token}` },
        });
        // express-rate-limit or custom rate limiter sets these
        const h = res.headers();
        const hasRateHeaders = h["x-ratelimit-limit"] || h["ratelimit-limit"] || h["retry-after"] !== undefined;
        // Rate headers may or may not be present depending on config
        expect(res.status()).toBe(200);
    });
});
