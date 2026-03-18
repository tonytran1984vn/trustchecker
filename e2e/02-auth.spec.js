const { test, expect } = require("@playwright/test");
const { TEST_USER, getAuthToken } = require("./helpers/auth");

test.describe("Authentication", () => {
    test("Login endpoint responds", async ({ request }) => {
        const res = await request.post("/api/auth/login", {
            data: { email: "bad@test.com", password: "wrong" },
            timeout: 15000,
        });
        // Should get 400 or 401, not timeout
        expect([400, 401]).toContain(res.status());
    });

    test("Protected endpoint without token returns 401", async ({ request }) => {
        const res = await request.get("/api/v1/products");
        expect(res.status()).toBe(401);
    });

    test("Protected endpoint with token returns 200", async ({ request }) => {
        const token = await getAuthToken(request);
        expect(token).toBeTruthy();
        const res = await request.get("/api/v1/products", {
            headers: { Authorization: "Bearer " + token },
        });
        expect(res.status()).toBe(200);
    });
});
