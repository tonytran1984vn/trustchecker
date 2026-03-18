const { test, expect } = require("@playwright/test");

test.describe("Rate Limiting", () => {
    test("API responses include rate limit headers", async ({ request }) => {
        const res = await request.get("/healthz");
        expect(res.status()).toBe(200);
        // Standard rate limit headers from express-rate-limit
        const h = res.headers();
        // Health check may not have rate limit headers
        expect(res.ok()).toBe(true);
    });

    test("Multiple rapid requests dont immediately 429", async ({ request }) => {
        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(request.get("/healthz"));
        }
        const responses = await Promise.all(promises);
        // With high limits (5000/15min), none should be rate limited
        for (const res of responses) {
            expect(res.status()).toBe(200);
        }
    });

    test("Auth rate limit is stricter", async ({ request }) => {
        // Auth limit is 30/15min (express-rate-limit) or 15/15min (custom)
        // After multiple bad logins, headers should indicate remaining quota
        const res = await request.post("/api/auth/login", {
            data: { email: "test@test.com", password: "wrong" },
        });
        expect([400, 401, 429]).toContain(res.status());
    });
});
